'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, ArrowLeft, Construction } from 'lucide-react';
import Link from 'next/link';

export default function AnalyzePage() {
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
            <BarChart3 className="h-5 w-5" />
            内容分析
          </CardTitle>
          <CardDescription>
            使用 AI 分析导出的内容，生成复盘报告、关键词提取等
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Construction className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">功能开发中</h3>
            <p className="text-muted-foreground mb-4">
              内容分析功能正在开发中，敬请期待！
            </p>
            <p className="text-sm text-muted-foreground">
              计划功能：内容复盘、关键词提取、趋势分析、互动统计
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
