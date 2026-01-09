import { NextRequest, NextResponse } from 'next/server';
import { createZsxqClient } from '@/lib/zsxq/client';

export async function GET(request: NextRequest) {
  try {
    // 从请求头获取 token
    const token = request.headers.get('X-ZSXQ-Token') || process.env.ZSXQ_TOKEN;

    if (!token) {
      return NextResponse.json(
        { error: '未提供 Token' },
        { status: 401 }
      );
    }

    const client = createZsxqClient(token);
    const groups = await client.groups.list();

    // 转换为简化格式
    const simplifiedGroups = groups.map((group) => ({
      group_id: String(group.group_id),
      name: group.name,
      description: group.description,
      member_count: group.member_count,
    }));

    return NextResponse.json({ groups: simplifiedGroups });
  } catch (error) {
    console.error('获取星球列表失败:', error);

    // 检查是否是 zsxq-sdk 的错误
    const zsxqError = error as { code?: number; message?: string };

    // 常见的认证相关错误码
    // 1059: 内部错误（通常是 Token 无效）
    // 401: 未授权
    // 1001: Token 过期
    const authErrorCodes = [1059, 401, 1001, 1002];

    if (zsxqError.code && authErrorCodes.includes(zsxqError.code)) {
      return NextResponse.json(
        { error: 'Token 无效或已过期，请重新获取 Token' },
        { status: 401 }
      );
    }

    const message = error instanceof Error ? error.message : '获取星球列表失败';

    // 根据错误消息判断
    if (message.includes('Token') || message.includes('认证') || message.includes('内部错误')) {
      return NextResponse.json({ error: 'Token 无效或已过期，请重新获取 Token' }, { status: 401 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
