'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Copy, Download, RefreshCw, Check, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface GenerateResultProps {
  isGenerating: boolean;
  content: string;
  status: string;
  error: string | null;
  onRetry?: () => void;
}

export function GenerateResult({
  isGenerating,
  content,
  status,
  error,
  onRetry,
}: GenerateResultProps) {
  const [copied, setCopied] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // 流式输出时自动滚动到底部
  useEffect(() => {
    if (isGenerating) {
      bottomRef.current?.scrollIntoView({ block: 'end' });
    }
  }, [content, isGenerating]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success('已复制到剪贴板');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('复制失败');
    }
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `generated-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('已下载');
  };

  // 未开始生成或没有内容
  if (!isGenerating && !content && !error) {
    return (
      <Card className="shadow-none">
        <CardContent className="flex min-h-[280px] flex-col items-center justify-center text-center">
          <span className="mb-4 flex size-12 items-center justify-center rounded-full bg-accent text-primary">
            <FileText className="size-6" />
          </span>
          <h3 className="mb-2 font-serif text-lg font-semibold">等待生成</h3>
          <p className="max-w-sm text-sm text-muted-foreground">
            配置好生成类型与内容来源后，点击「开始生成」，结果将在这里逐字呈现
          </p>
        </CardContent>
      </Card>
    );
  }

  // 错误状态
  if (error) {
    return (
      <Card className="border-destructive shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <FileText className="h-5 w-5" />
            生成失败
          </CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent>
          {onRetry && (
            <Button onClick={onRetry} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              重试
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-none">
      {/* 顶部状态栏 */}
      <CardHeader className="border-b">
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                {status || '正在生成中...'}
              </>
            ) : (
              <>
                <FileText className="h-4 w-4" />
                草稿生成完毕
              </>
            )}
          </span>
          {content && (
            <span className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
              {content.length} 字
            </span>
          )}
        </div>
      </CardHeader>

      {/* 正文 */}
      <CardContent className="md:px-8">
        {isGenerating && !content ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : (
          <div className="mx-auto max-w-2xl">
            <div className="text-base leading-relaxed break-words whitespace-pre-wrap text-foreground">
              {content}
              {isGenerating && (
                <span className="ml-0.5 inline-block h-4 w-2 animate-pulse bg-primary align-middle" />
              )}
            </div>
            {!isGenerating && content && (
              <p className="mt-10 flex items-center justify-center gap-1 text-sm text-muted-foreground">
                <Sparkles className="size-3.5" />
                由 Claude 生成
              </p>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </CardContent>

      {/* 底部工具栏（生成完成且有内容时显示） */}
      {content && !isGenerating && (
        <CardFooter className="flex-wrap justify-between gap-3 border-t">
          {onRetry ? (
            <Button variant="ghost" size="sm" onClick={onRetry}>
              <RefreshCw className="h-4 w-4" />
              重新生成
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCopy}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? '已复制' : '复制内容'}
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4" />
              导出为 Markdown
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
