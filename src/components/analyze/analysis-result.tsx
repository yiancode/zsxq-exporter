'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current && status === 'streaming') {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
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

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

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

      if (status !== 'completed') {
        setStatus('completed');
      }
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
      <Card className="h-full">
        <CardContent className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">准备开始分析</h3>
          <p className="text-muted-foreground text-sm max-w-sm">
            选择星球内容和分析类型后，AI 将自动开始分析并在这里展示结果
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-none pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              分析结果
              {status === 'loading' && (
                <Badge variant="secondary">
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  准备中
                </Badge>
              )}
              {status === 'streaming' && (
                <Badge variant="secondary">
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  分析中
                </Badge>
              )}
              {status === 'completed' && (
                <Badge variant="default" className="bg-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  完成
                </Badge>
              )}
              {status === 'error' && (
                <Badge variant="destructive">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  错误
                </Badge>
              )}
            </CardTitle>
            {meta && (
              <p className="text-sm text-muted-foreground mt-1">
                {meta.groupName} · {meta.period} · {meta.topicCount} 条帖子
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {content && (
              <>
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  <Copy className="h-4 w-4 mr-1" />
                  复制
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-1" />
                  下载
                </Button>
              </>
            )}
            {(status === 'completed' || status === 'error') && (
              <Button variant="outline" size="sm" onClick={handleRetry}>
                <RotateCcw className="h-4 w-4 mr-1" />
                重新分析
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden">
        {status === 'error' ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h3 className="text-lg font-medium mb-2">分析失败</h3>
            <p className="text-muted-foreground text-sm mb-4">{error}</p>
            <Button onClick={handleRetry}>
              <RotateCcw className="h-4 w-4 mr-2" />
              重试
            </Button>
          </div>
        ) : (
          <ScrollArea className="h-full" ref={scrollRef}>
            <div className="prose prose-sm dark:prose-invert max-w-none pr-4">
              {status === 'loading' && !content ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="whitespace-pre-wrap">{content}</div>
              )}
              {status === 'streaming' && (
                <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-0.5" />
              )}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
