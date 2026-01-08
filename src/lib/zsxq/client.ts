import { ZsxqClientBuilder, ZsxqClient } from 'zsxq-sdk';

let clientInstance: ZsxqClient | null = null;

/**
 * 获取 ZSXQ 客户端实例
 * @param token 可选的 token，如果不传则使用环境变量
 */
export function getZsxqClient(token?: string): ZsxqClient {
  const authToken = token || process.env.ZSXQ_TOKEN;

  if (!authToken) {
    throw new Error('ZSXQ_TOKEN 未设置。请在 .env.local 中配置或通过参数传入。');
  }

  // 如果 token 变化或首次创建，重新实例化
  if (!clientInstance) {
    clientInstance = new ZsxqClientBuilder()
      .setToken(authToken)
      .setTimeout(15000)
      .setRetryCount(3)
      .build();
  }

  return clientInstance;
}

/**
 * 重置客户端（用于切换 token）
 */
export function resetZsxqClient(): void {
  clientInstance = null;
}

/**
 * 使用新 token 创建客户端
 */
export function createZsxqClient(token: string): ZsxqClient {
  return new ZsxqClientBuilder()
    .setToken(token)
    .setTimeout(15000)
    .setRetryCount(3)
    .build();
}
