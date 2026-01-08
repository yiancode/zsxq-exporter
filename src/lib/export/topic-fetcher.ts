// 帖子获取器 - 从知识星球 API 分页获取帖子

import { createZsxqClient } from '@/lib/zsxq/client';
import { convertSdkTopic, upsertTopics, upsertGroup } from '@/lib/db/queries';
import type { Topic as SdkTopic } from 'zsxq-sdk';

export interface FetchOptions {
  groupId: string;
  startDate?: string; // ISO 8601 格式
  endDate?: string; // ISO 8601 格式
  scope?: 'all' | 'digests' | 'by_owner';
  batchSize?: number; // 每批获取数量，默认 20
  maxTopics?: number; // 最大获取数量，0 表示不限
  onProgress?: (progress: FetchProgress) => void;
}

export interface FetchProgress {
  fetched: number;
  total: number | null; // null 表示未知
  currentBatch: number;
  isComplete: boolean;
  lastTopicTime?: string;
}

export interface FetchResult {
  success: boolean;
  topicsCount: number;
  imagesCount: number;
  error?: string;
}

/**
 * 分页获取并缓存帖子
 *
 * 知识星球 API 使用 end_time 作为游标进行分页：
 * - 首次请求不传 end_time，返回最新的帖子
 * - 后续请求传入上一批最后一条帖子的 create_time 作为 end_time
 * - 直到返回空数组或达到 start_date
 */
export async function fetchAndCacheTopics(
  token: string,
  options: FetchOptions
): Promise<FetchResult> {
  const {
    groupId,
    startDate,
    endDate,
    scope = 'all',
    batchSize = 20,
    maxTopics = 0,
    onProgress,
  } = options;

  const client = createZsxqClient(token);

  let totalFetched = 0;
  let totalImages = 0;
  let currentEndTime = endDate;
  let batchNumber = 0;
  let isComplete = false;

  try {
    // 首先获取并缓存星球信息
    const group = await client.groups.get(groupId);
    upsertGroup({
      group_id: String(group.group_id),
      name: group.name,
      description: group.description,
      owner_name: group.owner?.name,
      member_count: group.member_count,
    });

    while (!isComplete) {
      batchNumber++;

      // 构建请求参数
      const requestParams: Record<string, unknown> = {
        count: batchSize,
        scope: scope === 'by_owner' ? 'by_owner' : scope === 'digests' ? 'digests' : 'all',
      };

      if (currentEndTime) {
        requestParams.end_time = currentEndTime;
      }

      // 获取一批帖子
      const topics = await client.topics.list(groupId, requestParams);

      if (!topics || topics.length === 0) {
        isComplete = true;
        break;
      }

      // 检查是否超出时间范围
      const filteredTopics = filterByTimeRange(topics, startDate, endDate);

      if (filteredTopics.length > 0) {
        // 转换并保存到数据库
        const convertedTopics = filteredTopics.map(convertSdkTopic);
        upsertTopics(convertedTopics);

        // 统计图片数量
        for (const topic of convertedTopics) {
          totalImages += topic.images.length;
        }

        totalFetched += filteredTopics.length;
      }

      // 检查是否需要继续
      const lastTopic = topics[topics.length - 1];
      const lastTopicTime = lastTopic.create_time;

      // 检查终止条件
      if (startDate && lastTopicTime < startDate) {
        // 已经超出开始时间范围
        isComplete = true;
      } else if (maxTopics > 0 && totalFetched >= maxTopics) {
        // 已达到最大数量
        isComplete = true;
      } else if (topics.length < batchSize) {
        // 本批不足一批，说明没有更多了
        isComplete = true;
      } else {
        // 继续获取，使用最后一条帖子的时间作为下一批的 end_time
        currentEndTime = lastTopicTime;
      }

      // 报告进度
      if (onProgress) {
        onProgress({
          fetched: totalFetched,
          total: null,
          currentBatch: batchNumber,
          isComplete,
          lastTopicTime,
        });
      }

      // 添加小延迟避免请求过快
      if (!isComplete) {
        await delay(300);
      }
    }

    return {
      success: true,
      topicsCount: totalFetched,
      imagesCount: totalImages,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : '获取帖子失败';
    return {
      success: false,
      topicsCount: totalFetched,
      imagesCount: totalImages,
      error: message,
    };
  }
}

/**
 * 增量获取新帖子（从上次获取位置继续）
 */
export async function fetchNewTopics(
  token: string,
  groupId: string,
  lastFetchedTime?: string,
  onProgress?: (progress: FetchProgress) => void
): Promise<FetchResult> {
  return fetchAndCacheTopics(token, {
    groupId,
    startDate: lastFetchedTime,
    scope: 'all',
    onProgress,
  });
}

/**
 * 根据时间范围过滤帖子
 */
function filterByTimeRange(
  topics: SdkTopic[],
  startDate?: string,
  endDate?: string
): SdkTopic[] {
  return topics.filter(topic => {
    const createTime = topic.create_time;
    if (startDate && createTime < startDate) return false;
    if (endDate && createTime > endDate) return false;
    return true;
  });
}

/**
 * 延迟函数
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 估算获取帖子所需时间
 */
export function estimateFetchTime(
  topicCount: number,
  batchSize = 20,
  delayMs = 300
): number {
  const batches = Math.ceil(topicCount / batchSize);
  // 每批请求约 500ms + 延迟
  return batches * (500 + delayMs);
}
