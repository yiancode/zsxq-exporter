// 图片下载器 - 并发下载图片到本地

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { getImageFileName } from './markdown-converter';
import type { CachedTopic } from '@/types';

export interface DownloadOptions {
  /** 目标目录 */
  outputDir: string;
  /** 并发数 */
  concurrency: number;
  /** 超时时间（毫秒） */
  timeout: number;
  /** 重试次数 */
  retries: number;
  /** 进度回调 */
  onProgress?: (progress: DownloadProgress) => void;
}

export interface DownloadProgress {
  total: number;
  downloaded: number;
  failed: number;
  current?: string;
}

export interface DownloadResult {
  success: boolean;
  totalImages: number;
  downloadedImages: number;
  failedImages: number;
  errors: string[];
}

interface ImageTask {
  topicId: string;
  index: number;
  url: string;
  fileName: string;
}

const defaultOptions: DownloadOptions = {
  outputDir: './exports/images',
  concurrency: 5,
  timeout: 30000,
  retries: 3,
};

/**
 * 从帖子中提取所有图片任务
 */
export function extractImageTasks(topics: CachedTopic[]): ImageTask[] {
  const tasks: ImageTask[] = [];

  for (const topic of topics) {
    for (let i = 0; i < topic.images.length; i++) {
      const url = topic.images[i];
      if (url) {
        tasks.push({
          topicId: topic.topic_id,
          index: i,
          url,
          fileName: getImageFileName(topic.topic_id, i, url),
        });
      }
    }
  }

  return tasks;
}

/**
 * 下载所有图片
 */
export async function downloadAllImages(
  topics: CachedTopic[],
  options: Partial<DownloadOptions> = {}
): Promise<DownloadResult> {
  const opts = { ...defaultOptions, ...options };
  const tasks = extractImageTasks(topics);
  const errors: string[] = [];

  if (tasks.length === 0) {
    return {
      success: true,
      totalImages: 0,
      downloadedImages: 0,
      failedImages: 0,
      errors: [],
    };
  }

  // 确保输出目录存在
  if (!fs.existsSync(opts.outputDir)) {
    fs.mkdirSync(opts.outputDir, { recursive: true });
  }

  let downloaded = 0;
  let failed = 0;

  // 使用并发池控制并发数
  const pool: Promise<void>[] = [];
  let taskIndex = 0;

  const processTask = async (task: ImageTask) => {
    const outputPath = path.join(opts.outputDir, task.fileName);

    // 如果文件已存在，跳过
    if (fs.existsSync(outputPath)) {
      downloaded++;
      opts.onProgress?.({
        total: tasks.length,
        downloaded,
        failed,
        current: task.fileName,
      });
      return;
    }

    let success = false;
    let lastError: Error | null = null;

    for (let retry = 0; retry < opts.retries && !success; retry++) {
      try {
        await downloadImage(task.url, outputPath, opts.timeout);
        success = true;
        downloaded++;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        // 等待后重试
        if (retry < opts.retries - 1) {
          await delay(1000 * (retry + 1));
        }
      }
    }

    if (!success) {
      failed++;
      errors.push(`${task.fileName}: ${lastError?.message || '下载失败'}`);
    }

    opts.onProgress?.({
      total: tasks.length,
      downloaded,
      failed,
      current: task.fileName,
    });
  };

  // 并发执行
  while (taskIndex < tasks.length || pool.length > 0) {
    // 填充并发池
    while (pool.length < opts.concurrency && taskIndex < tasks.length) {
      const task = tasks[taskIndex++];
      const promise = processTask(task).then(() => {
        const index = pool.indexOf(promise);
        if (index > -1) pool.splice(index, 1);
      });
      pool.push(promise);
    }

    // 等待任意一个完成
    if (pool.length > 0) {
      await Promise.race(pool);
    }
  }

  return {
    success: failed === 0,
    totalImages: tasks.length,
    downloadedImages: downloaded,
    failedImages: failed,
    errors,
  };
}

/**
 * 下载单个图片
 */
async function downloadImage(
  url: string,
  outputPath: string,
  timeout: number
): Promise<void> {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Referer': 'https://wx.zsxq.com/',
    },
  });

  await fs.promises.writeFile(outputPath, response.data);
}

/**
 * 延迟函数
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 获取图片 URL 到本地文件名的映射
 */
export function getImageMapping(topics: CachedTopic[]): Map<string, string> {
  const mapping = new Map<string, string>();

  for (const topic of topics) {
    for (let i = 0; i < topic.images.length; i++) {
      const url = topic.images[i];
      if (url) {
        const fileName = getImageFileName(topic.topic_id, i, url);
        mapping.set(url, fileName);
      }
    }
  }

  return mapping;
}
