import { NextRequest, NextResponse } from 'next/server';
import { AIClient, type AIProvider } from '@/lib/ai/client';
import { queryTopics } from '@/lib/db/queries';
import { chunkText, formatTopicsForAnalysis, estimateTokens } from '@/lib/ai/chunker';
import {
  getSummarySystemPrompt,
  getSummaryUserPrompt,
  getChunkMergePrompt,
  type SummaryOptions,
} from '@/lib/ai/prompts/summary';
import {
  getStyleAnalysisSystemPrompt,
  getStyleAnalysisUserPrompt,
  getGenerateSystemPrompt,
  getGenerateUserPrompt,
  getContinuationPrompt,
  getRewritePrompt,
  type StyleAnalysisOptions,
  type GenerateOptions,
} from '@/lib/ai/prompts/style-write';

export const runtime = 'nodejs';
export const maxDuration = 300;

interface GenerateRequest {
  type: 'summary' | 'generate' | 'continuation' | 'rewrite';
  // 内容来源
  groupId: string;
  startDate?: string;
  endDate?: string;
  scope?: 'all' | 'digests';
  // 总结类型参数
  summaryType?: 'annual' | 'monthly' | 'quarterly' | 'custom';
  summaryStyle?: 'formal' | 'casual' | 'storytelling';
  year?: number;
  month?: number;
  quarter?: number;
  // 生成参数
  generateType?: 'post' | 'reply' | 'continuation';
  topic?: string;
  keywords?: string[];
  length?: 'short' | 'medium' | 'long';
  tone?: 'professional' | 'casual' | 'humorous' | 'inspiring';
  includeEmoji?: boolean;
  // 续写/改写参数
  originalContent?: string;
  direction?: string;
  rewriteGoal?: 'polish' | 'simplify' | 'expand' | 'style';
  // 通用参数
  groupName?: string;
  authorName?: string;
  // AI 提供商
  provider?: AIProvider;
}

interface TopicData {
  topic_id: string;
  content: string;
  create_time: string;
  is_digest: boolean;
  author_name?: string | null;
  images: string[];
}

/**
 * POST /api/ai/generate - 流式内容生成
 */
export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json();
    const { type, groupId, startDate, endDate, scope = 'all', provider } = body;

    if (!groupId) {
      return NextResponse.json(
        { error: '缺少 groupId 参数' },
        { status: 400 }
      );
    }

    // 查询帖子
    const topics = queryTopics({
      groupId,
      startDate,
      endDate,
      scope,
      limit: 1000,
    });

    if (topics.length === 0) {
      return NextResponse.json(
        { error: '未找到符合条件的帖子' },
        { status: 404 }
      );
    }

    // 转换为统一格式
    const topicData: TopicData[] = topics.map(t => ({
      topic_id: t.topic_id,
      content: t.content,
      create_time: t.created_at,
      is_digest: t.digested,
      author_name: t.owner_name,
      images: t.images,
    }));

    // 创建 SSE 响应
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: string, data: unknown) => {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        };

        try {
          const client = new AIClient({ provider });

          // 发送元信息
          sendEvent('status', {
            message: '正在准备...',
            provider: client.getProvider(),
            model: client.getModel(),
          });

          switch (type) {
            case 'summary':
              await handleSummaryGeneration(client, topicData, body, sendEvent);
              break;
            case 'generate':
              await handleContentGeneration(client, topicData, body, sendEvent);
              break;
            case 'continuation':
              await handleContinuation(client, topicData, body, sendEvent);
              break;
            case 'rewrite':
              await handleRewrite(client, body, sendEvent);
              break;
            default:
              sendEvent('error', { message: '不支持的生成类型' });
          }

          sendEvent('done', { success: true });
        } catch (error) {
          console.error('[generate] 生成失败:', error);
          sendEvent('error', {
            message: error instanceof Error ? error.message : '生成失败',
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('[generate] 请求失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '请求失败' },
      { status: 500 }
    );
  }
}

/**
 * 处理总结生成
 */
async function handleSummaryGeneration(
  client: AIClient,
  topics: TopicData[],
  body: GenerateRequest,
  sendEvent: (event: string, data: unknown) => void
) {
  const {
    summaryType = 'custom',
    summaryStyle = 'casual',
    year,
    month,
    quarter,
    groupName,
    authorName,
  } = body;

  const summaryOptions: SummaryOptions = {
    type: summaryType,
    year,
    month,
    quarter,
    groupName,
    authorName,
    style: summaryStyle,
  };

  const systemPrompt = getSummarySystemPrompt(summaryOptions);
  const stats = {
    topicCount: topics.length,
    digestCount: topics.filter(t => t.is_digest).length,
    imageCount: topics.reduce((sum, t) => sum + t.images.length, 0),
  };

  // 格式化帖子内容
  const formattedContent = formatTopicsForAnalysis(
    topics.map(t => ({
      content: t.content,
      create_time: t.create_time,
      digested: t.is_digest,
    }))
  );

  // 估算 token 数量
  const totalTokens = estimateTokens(formattedContent);
  const MAX_SINGLE_REQUEST_TOKENS = 80000;

  if (totalTokens <= MAX_SINGLE_REQUEST_TOKENS) {
    // 单次处理
    const userPrompt = getSummaryUserPrompt(formattedContent, summaryOptions, stats);

    await client.askStream(userPrompt, {
      onToken: (token) => sendEvent('token', { content: token }),
    }, {
      system: systemPrompt,
      maxTokens: 8192,
    });
  } else {
    // 分片处理
    const chunkResult = chunkText(formattedContent, {
      maxChunkSize: 40000,
      overlapSize: 500,
    });

    sendEvent('status', { message: `内容较多，分 ${chunkResult.totalChunks} 批处理...` });

    const chunkSummaries: string[] = [];

    for (let i = 0; i < chunkResult.chunks.length; i++) {
      sendEvent('status', { message: `处理第 ${i + 1}/${chunkResult.totalChunks} 批...` });

      const chunk = chunkResult.chunks[i];
      const chunkPrompt = getSummaryUserPrompt(
        chunk.content,
        { ...summaryOptions, type: 'custom' },
        { topicCount: Math.ceil(topics.length / chunkResult.totalChunks) }
      );

      let chunkResultText = '';
      await client.askStream(chunkPrompt, {
        onToken: (token) => {
          chunkResultText += token;
        },
      }, {
        system: systemPrompt,
        maxTokens: 4096,
      });

      chunkSummaries.push(chunkResultText);
    }

    // 汇总分片结果
    sendEvent('status', { message: '正在汇总...' });
    const mergePrompt = getChunkMergePrompt(chunkSummaries, summaryOptions);

    await client.askStream(mergePrompt, {
      onToken: (token) => sendEvent('token', { content: token }),
    }, {
      system: systemPrompt,
      maxTokens: 8192,
    });
  }
}

/**
 * 处理内容生成（风格学习 + 生成）
 */
async function handleContentGeneration(
  client: AIClient,
  topics: TopicData[],
  body: GenerateRequest,
  sendEvent: (event: string, data: unknown) => void
) {
  const {
    generateType = 'post',
    topic,
    keywords = [],
    length = 'medium',
    tone = 'casual',
    includeEmoji = false,
    groupName,
    authorName,
  } = body;

  // 步骤1：风格分析
  sendEvent('status', { message: '正在分析写作风格...' });

  // 选取有代表性的样本（最多10篇，优先精华）
  const samples = topics
    .sort((a, b) => {
      if (a.is_digest !== b.is_digest) return b.is_digest ? 1 : -1;
      return new Date(b.create_time).getTime() - new Date(a.create_time).getTime();
    })
    .slice(0, 10)
    .map(t => t.content);

  const styleOptions: StyleAnalysisOptions = {
    groupName,
    authorName,
    sampleCount: samples.length,
  };

  const styleSystemPrompt = getStyleAnalysisSystemPrompt();
  const styleUserPrompt = getStyleAnalysisUserPrompt(samples, styleOptions);

  let styleProfile = '';
  await client.askStream(styleUserPrompt, {
    onToken: (token) => {
      styleProfile += token;
    },
  }, {
    system: styleSystemPrompt,
    maxTokens: 4096,
  });

  // 步骤2：生成内容
  sendEvent('status', { message: '正在生成内容...' });

  const generateOptions: GenerateOptions = {
    type: generateType,
    topic,
    keywords,
    length,
    tone,
    includeEmoji,
  };

  const generateSystemPrompt = getGenerateSystemPrompt(styleProfile, generateOptions);
  const generateUserPrompt = getGenerateUserPrompt(generateOptions);

  await client.askStream(generateUserPrompt, {
    onToken: (token) => sendEvent('token', { content: token }),
  }, {
    system: generateSystemPrompt,
    maxTokens: 4096,
  });
}

/**
 * 处理续写
 */
async function handleContinuation(
  client: AIClient,
  topics: TopicData[],
  body: GenerateRequest,
  sendEvent: (event: string, data: unknown) => void
) {
  const {
    originalContent,
    direction,
    length = 'medium',
    groupName,
    authorName,
  } = body;

  if (!originalContent) {
    sendEvent('error', { message: '缺少原始内容' });
    return;
  }

  // 先分析风格
  sendEvent('status', { message: '正在分析风格...' });

  const samples = topics
    .sort((a, b) => (b.is_digest ? 1 : 0) - (a.is_digest ? 1 : 0))
    .slice(0, 5)
    .map(t => t.content);

  const styleSystemPrompt = getStyleAnalysisSystemPrompt();
  const styleUserPrompt = getStyleAnalysisUserPrompt(samples, { groupName, authorName });

  let styleProfile = '';
  await client.askStream(styleUserPrompt, {
    onToken: (token) => {
      styleProfile += token;
    },
  }, {
    system: styleSystemPrompt,
    maxTokens: 2048,
  });

  // 续写
  sendEvent('status', { message: '正在续写...' });
  const continuationPrompt = getContinuationPrompt(originalContent, styleProfile, {
    direction,
    length,
  });

  await client.askStream(continuationPrompt, {
    onToken: (token) => sendEvent('token', { content: token }),
  }, {
    system: '你是一位内容创作助手，请按照给定的风格续写内容。',
    maxTokens: 4096,
  });
}

/**
 * 处理改写
 */
async function handleRewrite(
  client: AIClient,
  body: GenerateRequest,
  sendEvent: (event: string, data: unknown) => void
) {
  const { originalContent, rewriteGoal = 'polish' } = body;

  if (!originalContent) {
    sendEvent('error', { message: '缺少原始内容' });
    return;
  }

  sendEvent('status', { message: '正在改写...' });

  const rewritePrompt = getRewritePrompt(originalContent, '', {
    goal: rewriteGoal,
    preserveLength: true,
  });

  await client.askStream(rewritePrompt, {
    onToken: (token) => sendEvent('token', { content: token }),
  }, {
    system: '你是一位专业的文字编辑，请按照要求改写内容。',
    maxTokens: 4096,
  });
}

/**
 * GET /api/ai/generate - 获取生成预览信息
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const groupId = searchParams.get('groupId');
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const scope = (searchParams.get('scope') as 'all' | 'digests') || 'all';

    if (!groupId) {
      return NextResponse.json(
        { error: '缺少 groupId 参数' },
        { status: 400 }
      );
    }

    // 查询帖子统计
    const topics = queryTopics({
      groupId,
      startDate,
      endDate,
      scope,
      limit: 10000,
    });

    const stats = {
      topicCount: topics.length,
      digestCount: topics.filter(t => t.digested).length,
      imageCount: topics.reduce((sum, t) => sum + t.images.length, 0),
      dateRange: topics.length > 0
        ? {
            earliest: topics[topics.length - 1].created_at,
            latest: topics[0].created_at,
          }
        : null,
    };

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('[generate] 获取预览失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取预览失败' },
      { status: 500 }
    );
  }
}
