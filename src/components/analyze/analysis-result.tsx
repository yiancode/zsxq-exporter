'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Copy,
  Download,
  Loader2,
  CheckCircle,
  AlertCircle,
  RotateCcw,
  FileText,
  Sparkles,
} from 'lucide-react';
import type { ContentSelection } from './content-selector';
import type { AnalysisType } from './analysis-type-selector';
import type { AIProvider } from '@/components/ai/provider-selector';

interface AnalysisResultProps {
  selection: ContentSelection | null;
  analysisType: AnalysisType | null;
  provider?: AIProvider;
  onRetry?: () => void;
}

interface MetaInfo {
  topicCount: number;
  period: string;
  groupName: string;
  type: string;
  estimatedTokens: number;
  needsChunking: boolean;
}

type Status = 'idle' | 'loading' | 'streaming' | 'completed' | 'error';

export function AnalysisResult({
  selection,
  analysisType,
  provider = 'deepseek',
  onRetry,
}: AnalysisResultProps) {
  const [status, setStatus] = useState<Status>('idle');
  const [content, setContent] = useState('');
  const [meta, setMeta] = useState<MetaInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 流式输出时自动滚动到底部
  useEffect(() => {
    if (status === 'streaming') {
      bottomRef.current?.scrollIntoView({ block: 'end' });
    }
  }, [content, status]);

  // 开始分析
  const startAnalysis = useCallback(async () => {
    if (!selection || !analysisType) return;

    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setStatus('loading');
    setContent('');
    setMeta(null);
    setError(null);

    try {
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: selection.groupId,
          startDate: selection.startDate,
          endDate: selection.endDate,
          scope: selection.scope,
          type: analysisType,
          provider,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '请求失败');
      }

      if (!response.body) {
        throw new Error('无法获取响应流');
      }

      setStatus('streaming');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // SSE 消息以双换行符分隔
        const messages = buffer.split('\n\n');
        buffer = messages.pop() || ''; // 保留不完整的消息

        for (const message of messages) {
          if (!message.trim()) continue;

          // 解析每条 SSE 消息
          const lines = message.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.meta) {
                  setMeta(data.meta);
                } else if (data.content) {
                  setContent(prev => prev + data.content);
                } else if (data.done) {
                  setStatus('completed');
                } else if (data.error) {
                  throw new Error(data.error);
                }
              } catch (e) {
                // 忽略 JSON 解析错误
                if (e instanceof SyntaxError) continue;
                throw e;
              }
            }
          }
        }
      }

      setStatus('completed');
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      setError(err instanceof Error ? err.message : '分析失败');
      setStatus('error');
    }
  }, [selection, analysisType, provider]);

  // 监听选择变化，自动开始分析
  useEffect(() => {
    if (selection && analysisType) {
      startAnalysis();
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [selection, analysisType, startAnalysis]);

  // 复制内容
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success('已复制到剪贴板');
    } catch {
      toast.error('复制失败');
    }
  };

  // 下载为 Markdown
  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `分析报告-${selection?.groupName || '未知'}-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('已下载');
  };

  // 重试
  const handleRetry = () => {
    startAnalysis();
    onRetry?.();
  };

  // 空状态
  if (status === 'idle' && !content) {
    return (
      <Card className="shadow-none">
        <CardContent className="flex min-h-[280px] flex-col items-center justify-center text-center">
          <span className="mb-4 flex size-12 items-center justify-center rounded-full bg-accent text-primary">
            <FileText className="size-6" />
          </span>
          <h3 className="mb-2 font-serif text-lg font-semibold">准备开始分析</h3>
          <p className="max-w-sm text-sm text-muted-foreground">
            选择分析类型与星球内容后，AI 将自动开始分析并在这里展示结果
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-none">
      <CardHeader className="border-b">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              分析结果
              {status === 'loading' && (
                <Badge variant="secondary">
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  准备中
                </Badge>
              )}
              {status === 'streaming' && (
                <Badge variant="secondary">
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  分析中
                </Badge>
              )}
              {status === 'completed' && (
                <Badge>
                  <CheckCircle className="mr-1 h-3 w-3" />
                  完成
                </Badge>
              )}
              {status === 'error' && (
                <Badge variant="destructive">
                  <AlertCircle className="mr-1 h-3 w-3" />
                  错误
                </Badge>
              )}
            </CardTitle>
            {meta && (
              <p className="mt-1.5 text-sm text-muted-foreground">
                {meta.groupName} · {meta.period} · {meta.topicCount} 条帖子
              </p>
            )}
          </div>
          <div className="flex shrink-0 gap-2">
            {content && (
              <>
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  <Copy className="h-4 w-4" />
                  复制
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="h-4 w-4" />
                  下载
                </Button>
              </>
            )}
            {(status === 'completed' || status === 'error') && (
              <Button variant="outline" size="sm" onClick={handleRetry}>
                <RotateCcw className="h-4 w-4" />
                重新分析
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="md:px-8">
        {status === 'error' ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="mb-4 h-12 w-12 text-destructive" />
            <h3 className="mb-2 text-lg font-medium">分析失败</h3>
            <p className="mb-4 text-sm text-muted-foreground">{error}</p>
            <Button onClick={handleRetry}>
              <RotateCcw className="mr-2 h-4 w-4" />
              重试
            </Button>
          </div>
        ) : status === 'loading' && !content ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="text-base leading-relaxed break-words whitespace-pre-wrap text-foreground">
            {content}
            {status === 'streaming' && (
              <span className="ml-0.5 inline-block h-4 w-2 animate-pulse bg-primary align-middle" />
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </CardContent>

      {content && status !== 'error' && (
        <CardFooter className="border-t text-sm text-muted-foreground">
          <span className="ml-auto flex items-center gap-1">
            <Sparkles className="size-3.5" />
            由 Claude 生成
          </span>
        </CardFooter>
      )}
    </Card>
  );
}
