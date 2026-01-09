import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

// AI 提供商类型
export type AIProvider = 'anthropic' | 'deepseek';

export interface AIClientConfig {
  provider?: AIProvider;
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  baseURL?: string;
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

// 默认配置
const PROVIDER_DEFAULTS: Record<AIProvider, { model: string; baseURL?: string }> = {
  anthropic: {
    model: 'claude-sonnet-4-20250514',
  },
  deepseek: {
    model: 'deepseek-chat',
    baseURL: 'https://api.deepseek.com',
  },
};

const DEFAULT_MAX_TOKENS = 4096;

/**
 * 统一 AI 客户端 - 支持多个提供商
 */
export class AIClient {
  private provider: AIProvider;
  private anthropicClient?: Anthropic;
  private openaiClient?: OpenAI;
  private model: string;
  private maxTokens: number;

  constructor(config: AIClientConfig = {}) {
    // 确定使用哪个提供商
    this.provider = config.provider || this.detectProvider();

    const defaults = PROVIDER_DEFAULTS[this.provider];
    this.model = config.model || defaults.model;
    this.maxTokens = config.maxTokens || DEFAULT_MAX_TOKENS;

    // 初始化对应的客户端
    if (this.provider === 'anthropic') {
      const apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error('未配置 ANTHROPIC_API_KEY');
      }
      this.anthropicClient = new Anthropic({ apiKey });
    } else if (this.provider === 'deepseek') {
      const apiKey = config.apiKey || process.env.DEEPSEEK_API_KEY;
      if (!apiKey) {
        throw new Error('未配置 DEEPSEEK_API_KEY');
      }
      this.openaiClient = new OpenAI({
        apiKey,
        baseURL: config.baseURL || defaults.baseURL,
      });
    }
  }

  /**
   * 自动检测使用哪个提供商（基于环境变量）
   */
  private detectProvider(): AIProvider {
    if (process.env.DEEPSEEK_API_KEY) {
      return 'deepseek';
    }
    if (process.env.ANTHROPIC_API_KEY) {
      return 'anthropic';
    }
    // 默认使用 DeepSeek（更便宜）
    return 'deepseek';
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
    if (this.provider === 'anthropic') {
      return this.chatAnthropic(messages, options);
    } else {
      return this.chatOpenAI(messages, options);
    }
  }

  /**
   * Anthropic 聊天实现
   */
  private async chatAnthropic(
    messages: Message[],
    options?: {
      system?: string;
      maxTokens?: number;
      temperature?: number;
    }
  ): Promise<string> {
    if (!this.anthropicClient) throw new Error('Anthropic client not initialized');

    try {
      const response = await this.anthropicClient.messages.create({
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
   * OpenAI 兼容聊天实现（DeepSeek）
   */
  private async chatOpenAI(
    messages: Message[],
    options?: {
      system?: string;
      maxTokens?: number;
      temperature?: number;
    }
  ): Promise<string> {
    if (!this.openaiClient) throw new Error('OpenAI client not initialized');

    try {
      const systemMessages: OpenAI.ChatCompletionMessageParam[] = options?.system
        ? [{ role: 'system', content: options.system }]
        : [];

      const response = await this.openaiClient.chat.completions.create({
        model: this.model,
        max_tokens: options?.maxTokens || this.maxTokens,
        temperature: options?.temperature ?? 0.7,
        messages: [
          ...systemMessages,
          ...messages.map(m => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          })),
        ],
      });

      return response.choices[0]?.message?.content || '';
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
    if (this.provider === 'anthropic') {
      return this.chatStreamAnthropic(messages, callbacks, options);
    } else {
      return this.chatStreamOpenAI(messages, callbacks, options);
    }
  }

  /**
   * Anthropic 流式实现
   */
  private async chatStreamAnthropic(
    messages: Message[],
    callbacks: StreamCallbacks,
    options?: {
      system?: string;
      maxTokens?: number;
      temperature?: number;
    }
  ): Promise<void> {
    if (!this.anthropicClient) throw new Error('Anthropic client not initialized');

    try {
      callbacks.onStart?.();

      const stream = this.anthropicClient.messages.stream({
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
   * OpenAI 兼容流式实现（DeepSeek）
   */
  private async chatStreamOpenAI(
    messages: Message[],
    callbacks: StreamCallbacks,
    options?: {
      system?: string;
      maxTokens?: number;
      temperature?: number;
    }
  ): Promise<void> {
    if (!this.openaiClient) throw new Error('OpenAI client not initialized');

    try {
      callbacks.onStart?.();

      const systemMessages: OpenAI.ChatCompletionMessageParam[] = options?.system
        ? [{ role: 'system', content: options.system }]
        : [];

      const stream = await this.openaiClient.chat.completions.create({
        model: this.model,
        max_tokens: options?.maxTokens || this.maxTokens,
        temperature: options?.temperature ?? 0.7,
        stream: true,
        messages: [
          ...systemMessages,
          ...messages.map(m => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          })),
        ],
      });

      let fullText = '';

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          fullText += content;
          callbacks.onToken?.(content);
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
    // Anthropic 错误
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
        return new Error('AI 服务暂时不可用');
      }

      return new Error(`AI API 错误: ${message}`);
    }

    // OpenAI 兼容错误（DeepSeek）
    if (error instanceof OpenAI.APIError) {
      const status = error.status;
      const message = error.message;

      if (status === 401) {
        return new Error('API Key 无效或已过期');
      }
      if (status === 429) {
        return new Error('请求过于频繁，请稍后重试');
      }
      if (status === 500 || status === 503) {
        return new Error('AI 服务暂时不可用');
      }

      return new Error(`AI API 错误: ${message}`);
    }

    if (error instanceof Error) {
      return error;
    }

    return new Error('未知错误');
  }

  /**
   * 获取当前提供商
   */
  getProvider(): AIProvider {
    return this.provider;
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

/**
 * 创建指定提供商的客户端
 */
export function createAIClient(provider: AIProvider, apiKey?: string): AIClient {
  return new AIClient({ provider, apiKey });
}

export default AIClient;
