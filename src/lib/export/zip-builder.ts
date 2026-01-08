// ZIP 打包器 - 将导出内容打包为 ZIP 文件

import archiver from 'archiver';
import fs from 'fs';
import path from 'path';
import type { CachedTopic } from '@/types';
import {
  topicToMarkdown,
  generateFileName,
  generateIndexMarkdown,
  type ConvertOptions,
} from './markdown-converter';

export interface ZipOptions {
  /** 输出路径 */
  outputPath: string;
  /** 星球名称 */
  groupName: string;
  /** 开始日期 */
  startDate?: string;
  /** 结束日期 */
  endDate?: string;
  /** Markdown 转换选项 */
  convertOptions?: Partial<ConvertOptions>;
  /** 图片目录（如果已下载） */
  imagesDir?: string;
  /** 进度回调 */
  onProgress?: (progress: ZipProgress) => void;
}

export interface ZipProgress {
  stage: 'converting' | 'adding_posts' | 'adding_images' | 'finalizing';
  current: number;
  total: number;
  message: string;
}

export interface ZipResult {
  success: boolean;
  filePath: string;
  fileSize: number;
  postsCount: number;
  imagesCount: number;
  error?: string;
}

/**
 * 创建导出 ZIP 文件
 */
export async function createExportZip(
  topics: CachedTopic[],
  options: ZipOptions
): Promise<ZipResult> {
  const {
    outputPath,
    groupName,
    startDate,
    endDate,
    convertOptions = {},
    imagesDir,
    onProgress,
  } = options;

  // 确保输出目录存在
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  return new Promise((resolve) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', {
      zlib: { level: 9 }, // 最高压缩级别
    });

    let imagesCount = 0;

    output.on('close', () => {
      resolve({
        success: true,
        filePath: outputPath,
        fileSize: archive.pointer(),
        postsCount: topics.length,
        imagesCount,
      });
    });

    archive.on('error', (err) => {
      resolve({
        success: false,
        filePath: outputPath,
        fileSize: 0,
        postsCount: 0,
        imagesCount: 0,
        error: err.message,
      });
    });

    archive.pipe(output);

    // 1. 添加索引文件
    onProgress?.({
      stage: 'converting',
      current: 0,
      total: topics.length,
      message: '生成索引文件...',
    });

    const indexContent = generateIndexMarkdown(topics, groupName, startDate, endDate);
    archive.append(indexContent, { name: 'README.md' });

    // 2. 添加帖子 Markdown 文件
    const mdOptions: Partial<ConvertOptions> = {
      ...convertOptions,
      imagePathPrefix: '../images',
    };

    for (let i = 0; i < topics.length; i++) {
      const topic = topics[i];
      const fileName = generateFileName(topic);
      const content = topicToMarkdown(topic, mdOptions);

      archive.append(content, { name: `posts/${fileName}` });

      if ((i + 1) % 10 === 0 || i === topics.length - 1) {
        onProgress?.({
          stage: 'adding_posts',
          current: i + 1,
          total: topics.length,
          message: `处理帖子 ${i + 1}/${topics.length}`,
        });
      }
    }

    // 3. 添加图片（如果有图片目录）
    if (imagesDir && fs.existsSync(imagesDir)) {
      onProgress?.({
        stage: 'adding_images',
        current: 0,
        total: 1,
        message: '添加图片...',
      });

      const imageFiles = fs.readdirSync(imagesDir);
      imagesCount = imageFiles.length;

      for (const imageFile of imageFiles) {
        const imagePath = path.join(imagesDir, imageFile);
        if (fs.statSync(imagePath).isFile()) {
          archive.file(imagePath, { name: `images/${imageFile}` });
        }
      }
    }

    // 4. 完成打包
    onProgress?.({
      stage: 'finalizing',
      current: 1,
      total: 1,
      message: '完成打包...',
    });

    archive.finalize();
  });
}

/**
 * 生成 ZIP 文件名
 */
export function generateZipFileName(
  groupName: string,
  startDate?: string,
  endDate?: string
): string {
  const safeName = groupName.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, '_');
  const dateRange = startDate && endDate
    ? `_${startDate.slice(0, 10)}_${endDate.slice(0, 10)}`
    : '';
  const timestamp = new Date().toISOString().slice(0, 10);
  return `${safeName}${dateRange}_${timestamp}.zip`;
}

/**
 * 获取导出目录
 */
export function getExportDir(): string {
  const exportDir = process.env.EXPORT_DIR || './data/exports';
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }
  return exportDir;
}
