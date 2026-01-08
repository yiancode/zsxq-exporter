import Anthropic from '@anthropic-ai/sdk';

export interface AIClientConfig {
  apiKey?: string;
  model?: string;
  maxTokens?: number;
}

export interface StreamCallbacks {
  onStart?: () => void;
  onToken?: (token: string) => void;
  onComplete?: (fullText: string) => void;
  onError?: (error: Error) => void;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const DEFAULT_MODEL = 'claude-sonnet-4-20250514';
const DEFAULT_MAX_TOKENS = 4096;

/**
 * Claude AI 客户端封装
 */
export class AIClient {
  private client: Anthropic;
  private model: string;
  private maxTokens: number;

  constructor(config: AIClientConfig = {}) {
    const apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      throw new Error('未配置 ANTHROPIC_API_KEY');
    }

    this.client = new Anthropic({ apiKey });
    this.model = config.model || DEFAULT_MODEL;
    this.maxTokens = config.maxTokens || DEFAULT_MAX_TOKENS;
  }

  /**
   * 发送单次请求（非流式）
   */
  async chat(
    messages: Message[],
    options?: {
      system?: string;
      maxTokens?: number;
      temperature?: number;
    }
  ): Promise<string> {
    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: options?.maxTokens || this.maxTokens,
        temperature: options?.temperature ?? 0.7,
        system: options?.system,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
      });

      const textBlock = response.content.find(block => block.type === 'text');
      return textBlock?.type === 'text' ? textBlock.text : '';
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * 发送流式请求
   */
  async chatStream(
    messages: Message[],
    callbacks: StreamCallbacks,
    options?: {
      system?: string;
      maxTokens?: number;
      temperature?: number;
    }
  ): Promise<void> {
    try {
      callbacks.onStart?.();

      const stream = this.client.messages.stream({
        model: this.model,
        max_tokens: options?.maxTokens || this.maxTokens,
        temperature: options?.temperature ?? 0.7,
        system: options?.system,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
      });

      let fullText = '';

      for await (const event of stream) {
        if (event.type === 'content_block_delta') {
          const delta = event.delta;
          if ('text' in delta) {
            fullText += delta.text;
            callbacks.onToken?.(delta.text);
          }
        }
      }

      callbacks.onComplete?.(fullText);
    } catch (error) {
      const err = this.handleError(error);
      callbacks.onError?.(err);
      throw err;
    }
  }

  /**
   * 简单问答（便捷方法）
   */
  async ask(
    prompt: string,
    options?: {
      system?: string;
      maxTokens?: number;
      temperature?: number;
    }
  ): Promise<string> {
    return this.chat([{ role: 'user', content: prompt }], options);
  }

  /**
   * 流式问答（便捷方法）
   */
  async askStream(
    prompt: string,
    callbacks: StreamCallbacks,
    options?: {
      system?: string;
      maxTokens?: number;
      temperature?: number;
    }
  ): Promise<void> {
    return this.chatStream([{ role: 'user', content: prompt }], callbacks, options);
  }

  /**
   * 统一错误处理
   */
  private handleError(error: unknown): Error {
    if (error instanceof Anthropic.APIError) {
      const status = error.status;
      const message = error.message;

      if (status === 401) {
        return new Error('API Key 无效或已过期');
      }
      if (status === 429) {
        return new Error('请求过于频繁，请稍后重试');
      }
      if (status === 500 || status === 503) {
        return new Error('Claude API 服务暂时不可用');
      }

      return new Error(`Claude API 错误: ${message}`);
    }

    if (error instanceof Error) {
      return error;
    }

    return new Error('未知错误');
  }

  /**
   * 获取当前模型名称
   */
  getModel(): string {
    return this.model;
  }

  /**
   * 设置模型
   */
  setModel(model: string): void {
    this.model = model;
  }
}

// 导出单例（使用环境变量配置）
let defaultClient: AIClient | null = null;

export function getAIClient(config?: AIClientConfig): AIClient {
  if (!defaultClient || config) {
    defaultClient = new AIClient(config);
  }
  return defaultClient;
}

export default AIClient;
