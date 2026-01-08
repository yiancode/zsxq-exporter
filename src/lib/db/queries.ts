// 数据库查询封装

import db, { toJson, fromJson } from './index';
import type { CachedTopic, ExportRecord, GroupInfo, FileInfo } from '@/types';
import type { Topic as SdkTopic } from 'zsxq-sdk';

// ============ 星球相关 ============

/**
 * 保存或更新星球信息
 */
export function upsertGroup(group: GroupInfo): void {
  const stmt = db.prepare(`
    INSERT INTO groups (group_id, name, description, owner_name, member_count, topics_count, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(group_id) DO UPDATE SET
      name = excluded.name,
      description = excluded.description,
      owner_name = excluded.owner_name,
      member_count = excluded.member_count,
      topics_count = excluded.topics_count,
      updated_at = CURRENT_TIMESTAMP
  `);
  stmt.run(
    group.group_id,
    group.name,
    group.description || null,
    group.owner_name || null,
    group.member_count || null,
    group.topics_count || null
  );
}

/**
 * 获取星球信息
 */
export function getGroup(groupId: string): GroupInfo | null {
  const stmt = db.prepare('SELECT * FROM groups WHERE group_id = ?');
  const row = stmt.get(groupId) as Record<string, unknown> | undefined;
  if (!row) return null;
  return {
    group_id: row.group_id as string,
    name: row.name as string,
    description: row.description as string | undefined,
    owner_name: row.owner_name as string | undefined,
    member_count: row.member_count as number | undefined,
    topics_count: row.topics_count as number | undefined,
  };
}

// ============ 帖子相关 ============

/**
 * 将 SDK 的 Topic 转换为缓存格式
 */
export function convertSdkTopic(sdkTopic: SdkTopic): Omit<CachedTopic, 'id' | 'fetched_at'> {
  // 从不同类型的内容中提取信息
  const content = sdkTopic.talk || sdkTopic.task || sdkTopic.question || sdkTopic.solution;
  const owner = content?.owner;

  // 提取文本内容
  let text = '';
  let title: string | undefined;

  if (sdkTopic.talk) {
    text = sdkTopic.talk.text || '';
    if (sdkTopic.talk.article) {
      title = sdkTopic.talk.article.title;
      // 如果有文章内容，追加到文本
      if (sdkTopic.talk.article.inline_content_html) {
        text = `${text}\n\n${sdkTopic.talk.article.inline_content_html}`;
      }
    }
  } else if (sdkTopic.task) {
    title = sdkTopic.task.title;
    text = sdkTopic.task.text || '';
  } else if (sdkTopic.question) {
    text = sdkTopic.question.text || '';
  } else if (sdkTopic.solution) {
    text = sdkTopic.solution.text || '';
  }

  // 提取图片 URL
  const images: string[] = [];
  if (sdkTopic.talk?.images) {
    for (const img of sdkTopic.talk.images) {
      if (img.original?.url) {
        images.push(img.original.url);
      } else if (img.large?.url) {
        images.push(img.large.url);
      }
    }
  }

  // 提取文件
  const files: FileInfo[] = [];
  if (sdkTopic.talk?.files) {
    for (const file of sdkTopic.talk.files) {
      files.push({
        name: file.name,
        url: file.url || '',
        size: file.size,
      });
    }
  }

  return {
    topic_id: String(sdkTopic.topic_id),
    group_id: String(sdkTopic.group.group_id),
    type: sdkTopic.type,
    title,
    content: text,
    owner_id: String(owner?.user_id || owner?.uid || ''),
    owner_name: owner?.name || '',
    images,
    files,
    likes_count: sdkTopic.likes_count || 0,
    comments_count: sdkTopic.comments_count || 0,
    reading_count: sdkTopic.reading_count || 0,
    digested: sdkTopic.digested || false,
    created_at: sdkTopic.create_time,
  };
}

/**
 * 批量保存帖子
 */
export function upsertTopics(topics: Omit<CachedTopic, 'id' | 'fetched_at'>[]): number {
  const stmt = db.prepare(`
    INSERT INTO topics (
      topic_id, group_id, type, title, content,
      owner_id, owner_name, images, files,
      likes_count, comments_count, reading_count, digested, created_at, fetched_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(topic_id) DO UPDATE SET
      type = excluded.type,
      title = excluded.title,
      content = excluded.content,
      owner_id = excluded.owner_id,
      owner_name = excluded.owner_name,
      images = excluded.images,
      files = excluded.files,
      likes_count = excluded.likes_count,
      comments_count = excluded.comments_count,
      reading_count = excluded.reading_count,
      digested = excluded.digested,
      fetched_at = CURRENT_TIMESTAMP
  `);

  const insertMany = db.transaction((items: typeof topics) => {
    let count = 0;
    for (const topic of items) {
      stmt.run(
        topic.topic_id,
        topic.group_id,
        topic.type,
        topic.title || null,
        topic.content,
        topic.owner_id,
        topic.owner_name,
        toJson(topic.images),
        toJson(topic.files),
        topic.likes_count,
        topic.comments_count,
        topic.reading_count,
        topic.digested ? 1 : 0,
        topic.created_at
      );
      count++;
    }
    return count;
  });

  return insertMany(topics);
}

/**
 * 查询帖子（支持时间范围和分页）
 */
export function queryTopics(params: {
  groupId: string;
  startDate?: string;
  endDate?: string;
  scope?: 'all' | 'digests';
  limit?: number;
  offset?: number;
}): CachedTopic[] {
  const { groupId, startDate, endDate, scope, limit = 100, offset = 0 } = params;

  let sql = 'SELECT * FROM topics WHERE group_id = ?';
  const args: (string | number)[] = [groupId];

  if (startDate) {
    sql += ' AND created_at >= ?';
    args.push(startDate);
  }
  if (endDate) {
    sql += ' AND created_at <= ?';
    args.push(endDate);
  }
  if (scope === 'digests') {
    sql += ' AND digested = 1';
  }

  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  args.push(limit, offset);

  const stmt = db.prepare(sql);
  const rows = stmt.all(...args) as Record<string, unknown>[];

  return rows.map(row => ({
    id: row.id as number,
    topic_id: row.topic_id as string,
    group_id: row.group_id as string,
    type: row.type as CachedTopic['type'],
    title: row.title as string | undefined,
    content: row.content as string,
    owner_id: row.owner_id as string,
    owner_name: row.owner_name as string,
    images: fromJson<string[]>(row.images as string) || [],
    files: fromJson<FileInfo[]>(row.files as string) || [],
    likes_count: row.likes_count as number,
    comments_count: row.comments_count as number,
    reading_count: row.reading_count as number,
    digested: Boolean(row.digested),
    created_at: row.created_at as string,
    fetched_at: row.fetched_at as string,
  }));
}

/**
 * 获取帖子数量
 */
export function countTopics(params: {
  groupId: string;
  startDate?: string;
  endDate?: string;
  scope?: 'all' | 'digests';
}): number {
  const { groupId, startDate, endDate, scope } = params;

  let sql = 'SELECT COUNT(*) as count FROM topics WHERE group_id = ?';
  const args: (string | number)[] = [groupId];

  if (startDate) {
    sql += ' AND created_at >= ?';
    args.push(startDate);
  }
  if (endDate) {
    sql += ' AND created_at <= ?';
    args.push(endDate);
  }
  if (scope === 'digests') {
    sql += ' AND digested = 1';
  }

  const stmt = db.prepare(sql);
  const row = stmt.get(...args) as { count: number };
  return row.count;
}

/**
 * 获取最新帖子时间
 */
export function getLatestTopicTime(groupId: string): string | null {
  const stmt = db.prepare(
    'SELECT MAX(created_at) as latest FROM topics WHERE group_id = ?'
  );
  const row = stmt.get(groupId) as { latest: string | null };
  return row.latest;
}

/**
 * 获取最早帖子时间
 */
export function getEarliestTopicTime(groupId: string): string | null {
  const stmt = db.prepare(
    'SELECT MIN(created_at) as earliest FROM topics WHERE group_id = ?'
  );
  const row = stmt.get(groupId) as { earliest: string | null };
  return row.earliest;
}

// ============ 导出记录相关 ============

/**
 * 创建导出记录
 */
export function createExport(exportRecord: Omit<ExportRecord, 'id' | 'created_at' | 'completed_at'>): void {
  const stmt = db.prepare(`
    INSERT INTO exports (
      export_id, group_id, group_name, start_date, end_date,
      topic_count, image_count, file_path, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    exportRecord.export_id,
    exportRecord.group_id,
    exportRecord.group_name,
    exportRecord.start_date,
    exportRecord.end_date,
    exportRecord.topic_count,
    exportRecord.image_count,
    exportRecord.file_path || null,
    exportRecord.status
  );
}

/**
 * 更新导出状态
 */
export function updateExportStatus(exportId: string, status: string, filePath?: string): void {
  if (status === 'completed' && filePath) {
    const stmt = db.prepare(`
      UPDATE exports
      SET status = ?, file_path = ?, completed_at = CURRENT_TIMESTAMP
      WHERE export_id = ?
    `);
    stmt.run(status, filePath, exportId);
  } else {
    const stmt = db.prepare('UPDATE exports SET status = ? WHERE export_id = ?');
    stmt.run(status, exportId);
  }
}

/**
 * 更新导出统计
 */
export function updateExportStats(exportId: string, topicCount: number, imageCount: number): void {
  const stmt = db.prepare(`
    UPDATE exports SET topic_count = ?, image_count = ? WHERE export_id = ?
  `);
  stmt.run(topicCount, imageCount, exportId);
}

/**
 * 获取导出记录
 */
export function getExport(exportId: string): ExportRecord | null {
  const stmt = db.prepare('SELECT * FROM exports WHERE export_id = ?');
  const row = stmt.get(exportId) as Record<string, unknown> | undefined;
  if (!row) return null;
  return {
    id: row.id as number,
    export_id: row.export_id as string,
    group_id: row.group_id as string,
    group_name: row.group_name as string,
    start_date: row.start_date as string,
    end_date: row.end_date as string,
    topic_count: row.topic_count as number,
    image_count: row.image_count as number,
    file_path: row.file_path as string | undefined,
    status: row.status as string,
    created_at: row.created_at as string,
    completed_at: row.completed_at as string | undefined,
  };
}

/**
 * 获取导出历史记录
 */
export function getExportHistory(groupId?: string, limit = 20): ExportRecord[] {
  let sql = 'SELECT * FROM exports';
  const args: (string | number)[] = [];

  if (groupId) {
    sql += ' WHERE group_id = ?';
    args.push(groupId);
  }

  sql += ' ORDER BY created_at DESC LIMIT ?';
  args.push(limit);

  const stmt = db.prepare(sql);
  const rows = stmt.all(...args) as Record<string, unknown>[];

  return rows.map(row => ({
    id: row.id as number,
    export_id: row.export_id as string,
    group_id: row.group_id as string,
    group_name: row.group_name as string,
    start_date: row.start_date as string,
    end_date: row.end_date as string,
    topic_count: row.topic_count as number,
    image_count: row.image_count as number,
    file_path: row.file_path as string | undefined,
    status: row.status as string,
    created_at: row.created_at as string,
    completed_at: row.completed_at as string | undefined,
  }));
}

/**
 * 删除导出记录
 */
export function deleteExport(exportId: string): void {
  const stmt = db.prepare('DELETE FROM exports WHERE export_id = ?');
  stmt.run(exportId);
}
