'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, ArrowLeft, Construction } from 'lucide-react';
import Link from 'next/link';

export default function GeneratePage() {
  return (
    <div className="container py-8">
      <div className="mb-6">
        <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-1 h-4 w-4" />
          返回首页
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            智能生成
          </CardTitle>
          <CardDescription>
            基于历史内容风格，使用 AI 生成年度总结、月度复盘或新帖子
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Construction className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">功能开发中</h3>
            <p className="text-muted-foreground mb-4">
              智能生成功能正在开发中，敬请期待！
            </p>
            <p className="text-sm text-muted-foreground">
              计划功能：年度总结、月度复盘、风格学习、新内容生成
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
