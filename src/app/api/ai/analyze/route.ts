import { NextRequest } from 'next/server';
import { AIClient, type AIProvider } from '@/lib/ai/client';
import { chunkText, formatTopicsForAnalysis, estimateTokens } from '@/lib/ai/chunker';
import {
  getAnalyzeSystemPrompt,
  getAnalyzeUserPrompt,
  getChunkSummaryPrompt,
  type AnalyzeOptions,
} from '@/lib/ai/prompts/analyze';
import { queryTopics, countTopics, getGroup } from '@/lib/db/queries';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface AnalyzeRequest {
  groupId: string;
  startDate?: string;
  endDate?: string;
  scope?: 'all' | 'digests';
  type: 'review' | 'keywords' | 'topics' | 'insights';
  provider?: AIProvider;
}

/**
 * 流式 AI 分析 API
 * POST /api/ai/analyze
 */
export async function POST(request: NextRequest) {
  try {
    const body: AnalyzeRequest = await request.json();
    const { groupId, startDate, endDate, scope = 'all', type, provider } = body;

    if (!groupId || !type) {
      return Response.json({ error: '缺少必要参数: groupId, type' }, { status: 400 });
    }

    // 获取星球信息
    const group = getGroup(groupId);
    const groupName = group?.name || '知识星球';

    // 获取帖子数量
    const topicCount = countTopics({ groupId, startDate, endDate, scope });
    if (topicCount === 0) {
      return Response.json({ error: '没有找到符合条件的帖子' }, { status: 404 });
    }

    // 获取所有帖子（用于分析）
    const topics = queryTopics({
      groupId,
      startDate,
      endDate,
      scope,
      limit: 1000,  // 最多分析 1000 条
      offset: 0,
    });

    // 格式化帖子内容
    const formattedContent = formatTopicsForAnalysis(
      topics.map(t => ({
        content: t.content,
        create_time: t.created_at,
        type: t.type,
        digested: t.digested,
      }))
    );

    // 计算时间段描述
    const period = startDate && endDate
      ? `${startDate.slice(0, 7)} 至 ${endDate.slice(0, 7)}`
      : startDate
      ? `${startDate.slice(0, 7)} 至今`
      : endDate
      ? `至 ${endDate.slice(0, 7)}`
      : '全部时间';

    const analyzeOptions: AnalyzeOptions = {
      type,
      period,
      groupName,
      topicCount: topics.length,
    };

    // 初始化 AI 客户端（支持选择提供商）
    const aiClient = new AIClient({ provider });
    const systemPrompt = getAnalyzeSystemPrompt(analyzeOptions);

    // 估算 token 数量决定是否需要分片
    const totalTokens = estimateTokens(formattedContent);
    const MAX_SINGLE_REQUEST_TOKENS = 100000; // 单次请求最大 token 数

    // 创建流式响应
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendChunk = (data: string) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: data })}\n\n`));
        };

        const sendMeta = (meta: object) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ meta })}\n\n`));
        };

        try {
          // 发送元信息（包括使用的 AI 提供商）
          sendMeta({
            topicCount: topics.length,
            period,
            groupName,
            type,
            estimatedTokens: totalTokens,
            needsChunking: totalTokens > MAX_SINGLE_REQUEST_TOKENS,
            provider: aiClient.getProvider(),
            model: aiClient.getModel(),
          });

          if (totalTokens <= MAX_SINGLE_REQUEST_TOKENS) {
            // 内容不大，直接进行流式分析
            const userPrompt = getAnalyzeUserPrompt(formattedContent, analyzeOptions);

            await aiClient.askStream(userPrompt, {
              onToken: (token) => {
                sendChunk(token);
              },
              onComplete: () => {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
                controller.close();
              },
              onError: (error) => {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: error.message })}\n\n`));
                controller.close();
              },
            }, {
              system: systemPrompt,
              maxTokens: 8192,
            });
          } else {
            // 内容过长，需要分片处理
            sendChunk('\n> 内容较多，正在分片分析中...\n\n');

            const chunkResult = chunkText(formattedContent, {
              maxChunkSize: 40000,
              overlapSize: 500,
            });

            const chunkAnalyses: string[] = [];

            // 逐个分片分析
            for (let i = 0; i < chunkResult.chunks.length; i++) {
              const chunk = chunkResult.chunks[i];
              sendChunk(`\n### 正在分析第 ${i + 1}/${chunkResult.totalChunks} 部分...\n\n`);

              const chunkPrompt = getAnalyzeUserPrompt(chunk.content, {
                ...analyzeOptions,
                topicCount: undefined,  // 分片时不显示总数
              });

              let chunkResult_i = '';
              await aiClient.askStream(chunkPrompt, {
                onToken: (token) => {
                  chunkResult_i += token;
                  sendChunk(token);
                },
              }, {
                system: systemPrompt,
                maxTokens: 4096,
              });

              chunkAnalyses.push(chunkResult_i);
              sendChunk('\n\n---\n');
            }

            // 汇总分析
            sendChunk('\n### 正在生成综合分析...\n\n');

            const summaryPrompt = getChunkSummaryPrompt(chunkAnalyses, analyzeOptions);
            await aiClient.askStream(summaryPrompt, {
              onToken: (token) => {
                sendChunk(token);
              },
              onComplete: () => {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
                controller.close();
              },
              onError: (error) => {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: error.message })}\n\n`));
                controller.close();
              },
            }, {
              system: systemPrompt,
              maxTokens: 8192,
            });
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : '分析失败';
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '请求处理失败';
    return Response.json({ error: message }, { status: 500 });
  }
}

/**
 * 获取分析预览信息
 * GET /api/ai/analyze?groupId=xxx&startDate=xxx&endDate=xxx&scope=all
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const groupId = searchParams.get('groupId');
  const startDate = searchParams.get('startDate') || undefined;
  const endDate = searchParams.get('endDate') || undefined;
  const scope = (searchParams.get('scope') as 'all' | 'digests') || 'all';

  if (!groupId) {
    return Response.json({ error: '缺少 groupId 参数' }, { status: 400 });
  }

  try {
    // 获取星球信息
    const group = getGroup(groupId);

    // 获取帖子数量
    const topicCount = countTopics({ groupId, startDate, endDate, scope });

    // 获取少量帖子用于预览
    const previewTopics = queryTopics({
      groupId,
      startDate,
      endDate,
      scope,
      limit: 5,
      offset: 0,
    });

    // 估算总 token 数（基于平均每条帖子的长度）
    const avgContentLength = previewTopics.length > 0
      ? previewTopics.reduce((sum, t) => sum + (t.content?.length || 0), 0) / previewTopics.length
      : 200;
    const estimatedTotalTokens = Math.ceil(estimateTokens(
      previewTopics.map(t => t.content).join('\n')
    ) * (topicCount / Math.max(previewTopics.length, 1)));

    return Response.json({
      groupId,
      groupName: group?.name || '未知星球',
      topicCount,
      scope,
      startDate,
      endDate,
      estimatedTokens: estimatedTotalTokens,
      previewTopics: previewTopics.map(t => ({
        id: t.topic_id,
        title: t.title,
        content: t.content?.slice(0, 100) + (t.content && t.content.length > 100 ? '...' : ''),
        date: t.created_at?.slice(0, 10),
        digested: t.digested,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '获取预览失败';
    return Response.json({ error: message }, { status: 500 });
  }
}
