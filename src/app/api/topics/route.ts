import { NextRequest, NextResponse } from 'next/server';
import { queryTopics, countTopics, getLatestTopicTime, getEarliestTopicTime } from '@/lib/db/queries';
import { fetchAndCacheTopics } from '@/lib/export/topic-fetcher';

/**
 * GET /api/topics - 查询缓存的帖子
 *
 * Query params:
 * - groupId: 星球 ID（必需）
 * - startDate: 开始日期 (ISO 8601)
 * - endDate: 结束日期 (ISO 8601)
 * - scope: 范围 (all | digests)
 * - page: 页码（默认 1）
 * - pageSize: 每页数量（默认 20）
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const groupId = searchParams.get('groupId');

    if (!groupId) {
      return NextResponse.json(
        { error: '缺少 groupId 参数' },
        { status: 400 }
      );
    }

    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const scope = (searchParams.get('scope') as 'all' | 'digests') || 'all';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

    // 查询帖子
    const topics = queryTopics({
      groupId,
      startDate,
      endDate,
      scope,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });

    // 获取总数
    const total = countTopics({ groupId, startDate, endDate, scope });

    // 获取时间范围信息
    const latestTime = getLatestTopicTime(groupId);
    const earliestTime = getEarliestTopicTime(groupId);

    return NextResponse.json({
      topics,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
      timeRange: {
        earliest: earliestTime,
        latest: latestTime,
      },
    });
  } catch (error) {
    console.error('查询帖子失败:', error);
    const message = error instanceof Error ? error.message : '查询帖子失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/topics - 从 API 获取并缓存帖子
 *
 * Body:
 * - groupId: 星球 ID（必需）
 * - startDate: 开始日期 (ISO 8601)
 * - endDate: 结束日期 (ISO 8601)
 * - scope: 范围 (all | digests | by_owner)
 * - maxTopics: 最大获取数量（0 = 不限）
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
    const { groupId, startDate, endDate, scope = 'all', maxTopics = 0 } = body;

    if (!groupId) {
      return NextResponse.json(
        { error: '缺少 groupId 参数' },
        { status: 400 }
      );
    }

    // 开始获取帖子
    const result = await fetchAndCacheTopics(token, {
      groupId,
      startDate,
      endDate,
      scope,
      maxTopics,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, partial: { topicsCount: result.topicsCount, imagesCount: result.imagesCount } },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      topicsCount: result.topicsCount,
      imagesCount: result.imagesCount,
    });
  } catch (error) {
    console.error('获取帖子失败:', error);
    const message = error instanceof Error ? error.message : '获取帖子失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
