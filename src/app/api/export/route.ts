import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import {
  createExport,
  updateExportStatus,
  updateExportStats,
  getExport,
  getExportHistory,
  queryTopics,
  getGroup,
} from '@/lib/db/queries';
import { fetchAndCacheTopics } from '@/lib/export/topic-fetcher';
import { downloadAllImages } from '@/lib/export/image-downloader';
import { createExportZip, generateZipFileName, getExportDir } from '@/lib/export/zip-builder';
import type { ExportTask, ExportProgress, ExportOptions } from '@/types';

// 内存中存储活动导出任务的进度
const activeExports = new Map<string, ExportTask>();

/**
 * GET /api/export - 获取导出历史或单个任务状态
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const exportId = searchParams.get('exportId');
    const groupId = searchParams.get('groupId') || undefined;
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    // 获取单个导出任务
    if (exportId) {
      // 先检查内存中的活动任务
      const activeTask = activeExports.get(exportId);
      if (activeTask) {
        return NextResponse.json({ task: activeTask });
      }

      // 查询数据库记录
      const record = getExport(exportId);
      if (!record) {
        return NextResponse.json(
          { error: '导出任务不存在' },
          { status: 404 }
        );
      }

      return NextResponse.json({ record });
    }

    // 获取历史记录
    const history = getExportHistory(groupId, limit);
    return NextResponse.json({ history });
  } catch (error) {
    console.error('获取导出信息失败:', error);
    const message = error instanceof Error ? error.message : '获取导出信息失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/export - 创建新的导出任务
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('X-ZSXQ-Token') || process.env.ZSXQ_TOKEN;

    if (!token) {
      return NextResponse.json(
        { error: '未提供 Token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { groupId, groupName, startDate, endDate, options } = body;

    if (!groupId) {
      return NextResponse.json(
        { error: '缺少 groupId 参数' },
        { status: 400 }
      );
    }

    // 获取星球名称（如果未提供）
    let finalGroupName = groupName;
    if (!finalGroupName) {
      const group = getGroup(groupId);
      finalGroupName = group?.name || `星球 ${groupId}`;
    }

    // 创建导出任务
    const exportId = uuidv4();
    const defaultOptions: ExportOptions = {
      scope: 'all',
      include_images: true,
      include_comments: false,
      markdown_style: 'detailed',
      ...options,
    };

    const initialProgress: ExportProgress = {
      total_topics: 0,
      fetched_topics: 0,
      converted_topics: 0,
      downloaded_images: 0,
      total_images: 0,
      current_step: '初始化',
    };

    const task: ExportTask = {
      export_id: exportId,
      group_id: groupId,
      group_name: finalGroupName,
      start_date: startDate,
      end_date: endDate,
      options: defaultOptions,
      status: 'pending',
      progress: initialProgress,
    };

    // 保存到内存
    activeExports.set(exportId, task);

    // 创建数据库记录
    createExport({
      export_id: exportId,
      group_id: groupId,
      group_name: finalGroupName,
      start_date: startDate,
      end_date: endDate,
      topic_count: 0,
      image_count: 0,
      status: 'pending',
    });

    // 异步开始完整导出流程
    startFullExportProcess(exportId, token, task).catch(error => {
      console.error(`导出任务 ${exportId} 失败:`, error);
      // 检查是否是 zsxq-sdk 的错误
      const zsxqError = error as { code?: number; message?: string };
      if (zsxqError.code) {
        console.error(`错误码: ${zsxqError.code}, 消息: ${zsxqError.message}`);
      }
    });

    return NextResponse.json({
      success: true,
      exportId,
      message: '导出任务已创建',
    });
  } catch (error) {
    console.error('创建导出任务失败:', error);
    const message = error instanceof Error ? error.message : '创建导出任务失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * 完整导出流程
 */
async function startFullExportProcess(
  exportId: string,
  token: string,
  task: ExportTask
): Promise<void> {
  try {
    // ========== 阶段 1: 获取帖子 ==========
    task.status = 'fetching';
    task.progress.current_step = '正在获取帖子...';
    updateExportStatus(exportId, 'fetching');

    const fetchResult = await fetchAndCacheTopics(token, {
      groupId: task.group_id,
      startDate: task.start_date,
      endDate: task.end_date,
      scope: task.options.scope === 'owner' ? 'by_owner' : task.options.scope === 'digests' ? 'digests' : 'all',
      onProgress: (progress) => {
        task.progress.fetched_topics = progress.fetched;
        task.progress.current_step = `已获取 ${progress.fetched} 条帖子...`;
      },
    });

    if (!fetchResult.success) {
      throw new Error(fetchResult.error || '获取帖子失败');
    }

    task.progress.total_topics = fetchResult.topicsCount;
    task.progress.fetched_topics = fetchResult.topicsCount;
    task.progress.total_images = fetchResult.imagesCount;
    updateExportStats(exportId, fetchResult.topicsCount, fetchResult.imagesCount);

    // 从数据库查询帖子
    const topics = queryTopics({
      groupId: task.group_id,
      startDate: task.start_date,
      endDate: task.end_date,
      scope: task.options.scope === 'digests' ? 'digests' : 'all',
      limit: 10000, // 获取所有
    });

    if (topics.length === 0) {
      task.status = 'completed';
      task.progress.current_step = '没有找到帖子';
      updateExportStatus(exportId, 'completed');
      scheduleCleanup(exportId);
      return;
    }

    // ========== 阶段 2: 下载图片 ==========
    const exportDir = getExportDir();
    const imagesDir = path.join(exportDir, exportId, 'images');

    if (task.options.include_images && fetchResult.imagesCount > 0) {
      task.status = 'downloading_images';
      task.progress.current_step = '正在下载图片...';
      updateExportStatus(exportId, 'downloading_images');

      const downloadResult = await downloadAllImages(topics, {
        outputDir: imagesDir,
        concurrency: 5,
        onProgress: (progress) => {
          task.progress.downloaded_images = progress.downloaded;
          task.progress.current_step = `下载图片 ${progress.downloaded}/${progress.total}...`;
        },
      });

      task.progress.downloaded_images = downloadResult.downloadedImages;

      if (downloadResult.errors.length > 0) {
        console.warn(`图片下载警告 (${exportId}):`, downloadResult.errors.slice(0, 5));
      }
    }

    // ========== 阶段 3: 转换 Markdown 并打包 ==========
    task.status = 'zipping';
    task.progress.current_step = '正在打包...';
    updateExportStatus(exportId, 'zipping');

    const zipFileName = generateZipFileName(task.group_name, task.start_date, task.end_date);
    const zipPath = path.join(exportDir, zipFileName);

    const zipResult = await createExportZip(topics, {
      outputPath: zipPath,
      groupName: task.group_name,
      startDate: task.start_date,
      endDate: task.end_date,
      convertOptions: {
        style: task.options.markdown_style,
        includeImages: task.options.include_images,
      },
      imagesDir: fs.existsSync(imagesDir) ? imagesDir : undefined,
      onProgress: (progress) => {
        task.progress.converted_topics = progress.current;
        task.progress.current_step = progress.message;
      },
    });

    if (!zipResult.success) {
      throw new Error(zipResult.error || '打包失败');
    }

    // 清理临时图片目录
    const tempDir = path.join(exportDir, exportId);
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }

    // ========== 完成 ==========
    task.status = 'completed';
    task.progress.current_step = '导出完成';
    task.progress.converted_topics = topics.length;
    updateExportStatus(exportId, 'completed', zipPath);

    scheduleCleanup(exportId);

  } catch (error) {
    console.error(`[导出任务 ${exportId}] 执行出错:`, error);
    // 检查是否是 zsxq-sdk 的错误
    const zsxqError = error as { code?: number; message?: string };
    let errorMessage = error instanceof Error ? error.message : '导出过程出错';
    if (zsxqError.code === 1059) {
      errorMessage = 'Token 无效或已过期，请重新连接';
    } else if (zsxqError.code) {
      errorMessage = `错误码 ${zsxqError.code}: ${zsxqError.message || '未知错误'}`;
    }
    task.status = 'failed';
    task.error = errorMessage;
    task.progress.current_step = '导出失败';
    updateExportStatus(exportId, 'failed');
    scheduleCleanup(exportId);
  }
}

/**
 * 安排清理内存中的任务
 */
function scheduleCleanup(exportId: string): void {
  setTimeout(() => {
    activeExports.delete(exportId);
  }, 10 * 60 * 1000); // 10 分钟后清理
}
