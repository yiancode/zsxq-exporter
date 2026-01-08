/**
 * AI 模块导出
 */

// 客户端
export { AIClient, getAIClient } from './client';
export type { AIClientConfig, StreamCallbacks, Message } from './client';

// 文本分片
export {
  chunkText,
  estimateTokens,
  formatTopicsForAnalysis,
  groupTopicsByMonth,
} from './chunker';
export type { ChunkOptions, Chunk, ChunkResult } from './chunker';

// 提示词模板
export * as analyzePrompts from './prompts/analyze';
export * as summaryPrompts from './prompts/summary';
export * as stylePrompts from './prompts/style-write';
