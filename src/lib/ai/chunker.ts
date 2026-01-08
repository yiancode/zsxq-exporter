/**
 * 长文本分片处理器
 *
 * Claude 上下文窗口限制：
 * - claude-sonnet-4: 200K tokens
 * - claude-3-5-sonnet: 200K tokens
 *
 * 为了安全起见，我们按字符数估算 token 数（中文约 1:1.5，英文约 1:0.25）
 * 保守估计每 2 个中文字符 = 1 token
 */

export interface ChunkOptions {
  maxChunkSize?: number;      // 每个分片的最大字符数
  overlapSize?: number;       // 分片之间的重叠字符数
  splitByParagraph?: boolean; // 是否按段落分割
  preserveStructure?: boolean; // 保持 Markdown 结构
}

export interface Chunk {
  index: number;
  content: string;
  startChar: number;
  endChar: number;
  tokenEstimate: number;
}

export interface ChunkResult {
  chunks: Chunk[];
  totalChunks: number;
  totalChars: number;
  totalTokensEstimate: number;
}

const DEFAULT_MAX_CHUNK_SIZE = 50000;  // 约 25K tokens（保守估计）
const DEFAULT_OVERLAP_SIZE = 500;       // 重叠 500 字符保持上下文

/**
 * 估算文本的 token 数量
 * 简化估算：中文字符约 1.5 token，英文单词约 1 token
 */
export function estimateTokens(text: string): number {
  // 统计中文字符
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  // 统计其他字符
  const otherChars = text.length - chineseChars;

  // 中文约 1.5 token/字符，其他约 0.25 token/字符
  return Math.ceil(chineseChars * 1.5 + otherChars * 0.25);
}

/**
 * 将长文本分割成多个分片
 */
export function chunkText(text: string, options: ChunkOptions = {}): ChunkResult {
  const {
    maxChunkSize = DEFAULT_MAX_CHUNK_SIZE,
    overlapSize = DEFAULT_OVERLAP_SIZE,
    splitByParagraph = true,
    preserveStructure = true,
  } = options;

  const chunks: Chunk[] = [];
  const totalChars = text.length;

  if (totalChars <= maxChunkSize) {
    // 文本足够短，不需要分片
    return {
      chunks: [{
        index: 0,
        content: text,
        startChar: 0,
        endChar: totalChars,
        tokenEstimate: estimateTokens(text),
      }],
      totalChunks: 1,
      totalChars,
      totalTokensEstimate: estimateTokens(text),
    };
  }

  let currentPos = 0;
  let chunkIndex = 0;

  while (currentPos < totalChars) {
    let endPos = Math.min(currentPos + maxChunkSize, totalChars);

    // 如果不是最后一块，尝试在自然边界处分割
    if (endPos < totalChars) {
      const searchStart = Math.max(currentPos, endPos - 1000); // 在最后 1000 字符中寻找边界
      const segment = text.slice(searchStart, endPos);

      let breakPoint = -1;

      if (splitByParagraph) {
        // 优先在段落边界分割
        const paragraphBreak = segment.lastIndexOf('\n\n');
        if (paragraphBreak !== -1) {
          breakPoint = searchStart + paragraphBreak + 2;
        }
      }

      if (breakPoint === -1 && preserveStructure) {
        // 尝试在标题边界分割
        const headingMatch = segment.match(/\n#{1,6}\s[^\n]+$/);
        if (headingMatch && headingMatch.index !== undefined) {
          breakPoint = searchStart + headingMatch.index;
        }
      }

      if (breakPoint === -1) {
        // 在句子边界分割
        const sentenceBreak = findSentenceBreak(segment);
        if (sentenceBreak !== -1) {
          breakPoint = searchStart + sentenceBreak;
        }
      }

      if (breakPoint === -1) {
        // 在换行处分割
        const lineBreak = segment.lastIndexOf('\n');
        if (lineBreak !== -1) {
          breakPoint = searchStart + lineBreak + 1;
        }
      }

      if (breakPoint > currentPos) {
        endPos = breakPoint;
      }
    }

    const chunkContent = text.slice(currentPos, endPos);

    chunks.push({
      index: chunkIndex,
      content: chunkContent,
      startChar: currentPos,
      endChar: endPos,
      tokenEstimate: estimateTokens(chunkContent),
    });

    chunkIndex++;

    // 下一块从当前位置减去重叠量开始（但不能小于当前结束位置）
    currentPos = Math.max(endPos - overlapSize, endPos);

    // 防止无限循环
    if (currentPos <= chunks[chunks.length - 1].startChar) {
      currentPos = endPos;
    }
  }

  const totalTokensEstimate = chunks.reduce((sum, c) => sum + c.tokenEstimate, 0);

  return {
    chunks,
    totalChunks: chunks.length,
    totalChars,
    totalTokensEstimate,
  };
}

/**
 * 在文本中找到句子边界
 */
function findSentenceBreak(text: string): number {
  // 中文句号、英文句号、问号、感叹号
  const sentenceEnds = ['。', '！', '？', '. ', '! ', '? '];

  let lastBreak = -1;
  for (const end of sentenceEnds) {
    const pos = text.lastIndexOf(end);
    if (pos > lastBreak) {
      lastBreak = pos + end.length;
    }
  }

  return lastBreak;
}

/**
 * 将帖子列表转换为适合分析的文本
 */
export function formatTopicsForAnalysis(topics: Array<{
  content: string;
  create_time: string;
  type?: string;
  digested?: boolean;
}>): string {
  return topics.map((topic, index) => {
    const date = topic.create_time?.slice(0, 10) || '未知日期';
    const tags: string[] = [];
    if (topic.digested) tags.push('精华');
    if (topic.type === 'q&a') tags.push('问答');

    const tagStr = tags.length > 0 ? ` [${tags.join(', ')}]` : '';

    return `---\n### 帖子 ${index + 1}${tagStr}\n**日期**: ${date}\n\n${topic.content || '（无内容）'}\n`;
  }).join('\n');
}

/**
 * 按日期范围对帖子进行分组
 */
export function groupTopicsByMonth(topics: Array<{
  content: string;
  create_time: string;
  [key: string]: unknown;
}>): Map<string, typeof topics> {
  const groups = new Map<string, typeof topics>();

  for (const topic of topics) {
    const date = topic.create_time?.slice(0, 7) || '未知';
    if (!groups.has(date)) {
      groups.set(date, []);
    }
    groups.get(date)!.push(topic);
  }

  return groups;
}

export default {
  chunkText,
  estimateTokens,
  formatTopicsForAnalysis,
  groupTopicsByMonth,
};
