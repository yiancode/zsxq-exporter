// Markdown 转换器 - 将帖子转换为 Markdown 格式

import type { CachedTopic, FileInfo } from '@/types';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export interface ConvertOptions {
  /** Markdown 样式: simple(简洁) | detailed(详细) */
  style: 'simple' | 'detailed';
  /** 是否包含图片 */
  includeImages: boolean;
  /** 图片路径前缀（相对于 Markdown 文件） */
  imagePathPrefix: string;
  /** 是否包含元数据（点赞数、评论数等） */
  includeMetadata: boolean;
}

const defaultOptions: ConvertOptions = {
  style: 'detailed',
  includeImages: true,
  imagePathPrefix: './images',
  includeMetadata: true,
};

/**
 * 将单个帖子转换为 Markdown
 */
export function topicToMarkdown(
  topic: CachedTopic,
  options: Partial<ConvertOptions> = {}
): string {
  const opts = { ...defaultOptions, ...options };
  const lines: string[] = [];

  // 标题
  const title = topic.title || generateTitle(topic);
  lines.push(`# ${title}`);
  lines.push('');

  // 元数据
  if (opts.style === 'detailed') {
    lines.push('---');
    lines.push(`作者: ${topic.owner_name}`);
    lines.push(`日期: ${formatDate(topic.created_at)}`);
    lines.push(`类型: ${getTopicTypeName(topic.type)}`);
    if (topic.digested) {
      lines.push(`标签: 精华`);
    }
    if (opts.includeMetadata) {
      const stats: string[] = [];
      if (topic.likes_count > 0) stats.push(`${topic.likes_count} 赞`);
      if (topic.comments_count > 0) stats.push(`${topic.comments_count} 评论`);
      if (topic.reading_count > 0) stats.push(`${topic.reading_count} 阅读`);
      if (stats.length > 0) {
        lines.push(`统计: ${stats.join(' · ')}`);
      }
    }
    lines.push('---');
    lines.push('');
  }

  // 正文内容
  const content = processContent(topic.content);
  if (content) {
    lines.push(content);
    lines.push('');
  }

  // 图片
  if (opts.includeImages && topic.images.length > 0) {
    for (let i = 0; i < topic.images.length; i++) {
      const imageName = getImageFileName(topic.topic_id, i, topic.images[i]);
      lines.push(`![图片${i + 1}](${opts.imagePathPrefix}/${imageName})`);
    }
    lines.push('');
  }

  // 文件附件
  if (topic.files.length > 0) {
    lines.push('## 附件');
    lines.push('');
    for (const file of topic.files) {
      const sizeStr = file.size ? ` (${formatFileSize(file.size)})` : '';
      lines.push(`- [${file.name}](${file.url})${sizeStr}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * 批量转换帖子为 Markdown 文件内容
 */
export function topicsToMarkdownFiles(
  topics: CachedTopic[],
  options: Partial<ConvertOptions> = {}
): Map<string, string> {
  const files = new Map<string, string>();

  for (const topic of topics) {
    const fileName = generateFileName(topic);
    const content = topicToMarkdown(topic, options);
    files.set(fileName, content);
  }

  return files;
}

/**
 * 生成汇总 Markdown（目录）
 */
export function generateIndexMarkdown(
  topics: CachedTopic[],
  groupName: string,
  startDate?: string,
  endDate?: string
): string {
  const lines: string[] = [];

  // 标题
  lines.push(`# ${groupName} 内容导出`);
  lines.push('');

  // 导出信息
  lines.push('## 导出信息');
  lines.push('');
  lines.push(`- 导出时间: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss', { locale: zhCN })}`);
  if (startDate) {
    lines.push(`- 开始日期: ${startDate.slice(0, 10)}`);
  }
  if (endDate) {
    lines.push(`- 结束日期: ${endDate.slice(0, 10)}`);
  }
  lines.push(`- 帖子数量: ${topics.length}`);
  lines.push('');

  // 统计
  const stats = calculateStats(topics);
  lines.push('## 统计');
  lines.push('');
  lines.push(`- 总帖子数: ${stats.totalTopics}`);
  lines.push(`- 精华帖数: ${stats.digestedTopics}`);
  lines.push(`- 图片数量: ${stats.totalImages}`);
  lines.push(`- 总点赞数: ${stats.totalLikes}`);
  lines.push(`- 总评论数: ${stats.totalComments}`);
  lines.push('');

  // 目录
  lines.push('## 目录');
  lines.push('');

  // 按月份分组
  const byMonth = groupTopicsByMonth(topics);
  for (const [month, monthTopics] of byMonth) {
    lines.push(`### ${month}`);
    lines.push('');
    for (const topic of monthTopics) {
      const title = topic.title || generateTitle(topic);
      const fileName = generateFileName(topic);
      const digestMark = topic.digested ? ' ⭐' : '';
      lines.push(`- [${title}](./posts/${fileName})${digestMark}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * 生成帖子文件名
 */
export function generateFileName(topic: CachedTopic): string {
  const date = topic.created_at.slice(0, 10).replace(/-/g, '');
  const title = topic.title || generateTitle(topic);
  // 清理文件名中的特殊字符
  const safeTitle = title
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 50);
  return `${date}_${topic.topic_id}_${safeTitle}.md`;
}

/**
 * 生成图片文件名
 */
export function getImageFileName(topicId: string, index: number, url: string): string {
  // 尝试从 URL 中获取扩展名
  const urlPath = new URL(url).pathname;
  const ext = urlPath.split('.').pop()?.toLowerCase() || 'jpg';
  const validExt = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext) ? ext : 'jpg';
  return `${topicId}_${index + 1}.${validExt}`;
}

/**
 * 生成默认标题
 */
function generateTitle(topic: CachedTopic): string {
  // 从内容中提取前 30 个字符作为标题
  const content = topic.content.trim();
  if (!content) {
    return `${getTopicTypeName(topic.type)} - ${formatDate(topic.created_at)}`;
  }
  // 取第一行或前 30 个字符
  const firstLine = content.split('\n')[0];
  const title = firstLine.slice(0, 30);
  return title.length < firstLine.length ? `${title}...` : title;
}

/**
 * 处理内容（HTML 转 Markdown 等）
 */
function processContent(content: string): string {
  if (!content) return '';

  let result = content;

  // 简单的 HTML 标签处理
  result = result
    // 移除 HTML 标签（简单处理）
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<p>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<strong>/gi, '**')
    .replace(/<\/strong>/gi, '**')
    .replace(/<em>/gi, '*')
    .replace(/<\/em>/gi, '*')
    .replace(/<code>/gi, '`')
    .replace(/<\/code>/gi, '`')
    // 移除其他 HTML 标签
    .replace(/<[^>]+>/g, '')
    // 处理 HTML 实体
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    // 清理多余空行
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return result;
}

/**
 * 格式化日期
 */
function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return format(date, 'yyyy-MM-dd HH:mm', { locale: zhCN });
  } catch {
    return dateStr.slice(0, 16).replace('T', ' ');
  }
}

/**
 * 获取帖子类型名称
 */
function getTopicTypeName(type: CachedTopic['type']): string {
  const typeNames: Record<CachedTopic['type'], string> = {
    talk: '分享',
    task: '作业',
    'q&a': '提问',
    solution: '回答',
  };
  return typeNames[type] || type;
}

/**
 * 格式化文件大小
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * 计算统计信息
 */
function calculateStats(topics: CachedTopic[]) {
  return {
    totalTopics: topics.length,
    digestedTopics: topics.filter(t => t.digested).length,
    totalImages: topics.reduce((sum, t) => sum + t.images.length, 0),
    totalLikes: topics.reduce((sum, t) => sum + t.likes_count, 0),
    totalComments: topics.reduce((sum, t) => sum + t.comments_count, 0),
  };
}

/**
 * 按月份分组帖子
 */
function groupTopicsByMonth(topics: CachedTopic[]): Map<string, CachedTopic[]> {
  const byMonth = new Map<string, CachedTopic[]>();

  // 按时间倒序排列
  const sorted = [...topics].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  for (const topic of sorted) {
    const month = topic.created_at.slice(0, 7); // YYYY-MM
    const monthTopics = byMonth.get(month) || [];
    monthTopics.push(topic);
    byMonth.set(month, monthTopics);
  }

  return byMonth;
}
