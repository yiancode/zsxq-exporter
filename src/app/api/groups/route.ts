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

    const message = error instanceof Error ? error.message : '获取星球列表失败';

    // 根据错误类型返回不同状态码
    if (message.includes('Token') || message.includes('认证')) {
      return NextResponse.json({ error: 'Token 无效或已过期' }, { status: 401 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
