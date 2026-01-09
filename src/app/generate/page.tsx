'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Sparkles, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth-store';
import { ContentSelector, type ContentSelection } from '@/components/analyze/content-selector';
import {
  GenerateTypeSelector,
  GenerateType,
  SummaryOptions,
  SummaryOptionsData,
  ContentOptions,
  ContentOptionsData,
  ContinuationOptions,
  ContinuationOptionsData,
  RewriteOptions,
  RewriteOptionsData,
  GenerateResult,
} from '@/components/generate';
import { ProviderSelector, type AIProvider } from '@/components/ai/provider-selector';

interface Group {
  group_id: string;
  name: string;
}

export default function GeneratePage() {
  const { token, isAuthenticated } = useAuthStore();

  // 基础状态
  const [groups, setGroups] = useState<Group[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [mounted, setMounted] = useState(false);

  // 确保客户端 hydration 完成
  useEffect(() => {
    setMounted(true);
  }, []);

  // 生成配置状态
  const [generateType, setGenerateType] = useState<GenerateType | null>(null);
  const [contentSelection, setContentSelection] = useState<ContentSelection | null>(null);

  // 各类型配置
  const [summaryOptions, setSummaryOptions] = useState<SummaryOptionsData>({
    type: 'monthly',
    style: 'casual',
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
  });

  const [contentOptions, setContentOptions] = useState<ContentOptionsData>({
    type: 'post',
    topic: '',
    keywords: [],
    length: 'medium',
    tone: 'casual',
    includeEmoji: false,
  });

  const [continuationOptions, setContinuationOptions] = useState<ContinuationOptionsData>({
    originalContent: '',
    direction: '',
    length: 'medium',
  });

  const [rewriteOptions, setRewriteOptions] = useState<RewriteOptionsData>({
    originalContent: '',
    goal: 'polish',
  });

  // AI 提供商
  const [provider, setProvider] = useState<AIProvider>('deepseek');

  // 生成状态
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');
  const [generationStatus, setGenerationStatus] = useState('');
  const [generationError, setGenerationError] = useState<string | null>(null);

  // 获取星球列表
  useEffect(() => {
    if (!mounted) return;

    if (!isAuthenticated()) {
      setLoadingGroups(false);
      return;
    }

    const fetchGroups = async () => {
      try {
        const response = await fetch('/api/groups', {
          headers: { 'X-ZSXQ-Token': token || '' },
        });
        if (response.ok) {
          const data = await response.json();
          setGroups(data.groups || []);
        }
      } catch {
        toast.error('获取星球列表失败');
      } finally {
        setLoadingGroups(false);
      }
    };

    fetchGroups();
  }, [mounted, isAuthenticated, token]);

  // 开始生成
  const handleGenerate = useCallback(async () => {
    if (!generateType) {
      toast.error('请选择生成类型');
      return;
    }

    if (!contentSelection?.groupId) {
      toast.error('请选择星球');
      return;
    }

    // 验证各类型的必填项
    if (generateType === 'continuation' && !continuationOptions.originalContent) {
      toast.error('请输入要续写的原始内容');
      return;
    }

    if (generateType === 'rewrite' && !rewriteOptions.originalContent) {
      toast.error('请输入要改写的原始内容');
      return;
    }

    if (generateType === 'generate' && !contentOptions.topic) {
      toast.error('请输入创作主题');
      return;
    }

    setIsGenerating(true);
    setGeneratedContent('');
    setGenerationError(null);
    setGenerationStatus('正在准备...');

    try {
      const requestBody: Record<string, unknown> = {
        type: generateType,
        groupId: contentSelection.groupId,
        groupName: contentSelection.groupName,
        startDate: contentSelection.startDate,
        endDate: contentSelection.endDate,
        scope: contentSelection.scope,
        provider,
      };

      // 根据类型添加特定参数
      if (generateType === 'summary') {
        Object.assign(requestBody, {
          summaryType: summaryOptions.type,
          summaryStyle: summaryOptions.style,
          year: summaryOptions.year,
          month: summaryOptions.month,
          quarter: summaryOptions.quarter,
        });
      } else if (generateType === 'generate') {
        Object.assign(requestBody, {
          generateType: contentOptions.type,
          topic: contentOptions.topic,
          keywords: contentOptions.keywords,
          length: contentOptions.length,
          tone: contentOptions.tone,
          includeEmoji: contentOptions.includeEmoji,
        });
      } else if (generateType === 'continuation') {
        Object.assign(requestBody, {
          originalContent: continuationOptions.originalContent,
          direction: continuationOptions.direction,
          length: continuationOptions.length,
        });
      } else if (generateType === 'rewrite') {
        Object.assign(requestBody, {
          originalContent: rewriteOptions.originalContent,
          rewriteGoal: rewriteOptions.goal,
        });
      }

      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-ZSXQ-Token': token || '',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '生成请求失败');
      }

      // 处理 SSE 流
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法读取响应流');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            const event = line.slice(7);
            const dataLine = lines[lines.indexOf(line) + 1];
            if (dataLine?.startsWith('data: ')) {
              try {
                const data = JSON.parse(dataLine.slice(6));

                if (event === 'token') {
                  setGeneratedContent(prev => prev + data.content);
                } else if (event === 'status') {
                  setGenerationStatus(data.message);
                } else if (event === 'error') {
                  setGenerationError(data.message);
                  setIsGenerating(false);
                  return;
                } else if (event === 'done') {
                  setIsGenerating(false);
                  toast.success('生成完成');
                  return;
                }
              } catch {
                // 忽略解析错误
              }
            }
          }
        }
      }

      setIsGenerating(false);
    } catch (error) {
      console.error('生成失败:', error);
      setGenerationError(error instanceof Error ? error.message : '生成失败');
      setIsGenerating(false);
    }
  }, [
    generateType,
    contentSelection,
    summaryOptions,
    contentOptions,
    continuationOptions,
    rewriteOptions,
    provider,
    token,
  ]);

  // 用于条件渲染的认证状态（仅在客户端 mounted 后才检查）
  const isLoggedIn = mounted && isAuthenticated();

  // 未 mounted 时显示加载状态避免 hydration 不匹配
  if (!mounted) {
    return (
      <div className="container py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // 未登录提示
  if (!isLoggedIn) {
    return (
      <div className="container py-8">
        <div className="mb-6">
          <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-1 h-4 w-4" />
            返回首页
          </Link>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">请先在首页连接知识星球</p>
            <Link href="/">
              <Button>去连接</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="mb-6">
        <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-1 h-4 w-4" />
          返回首页
        </Link>
      </div>

      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="h-6 w-6" />
          智能生成
        </h1>
        <p className="text-muted-foreground mt-1">
          基于历史内容风格，使用 AI 生成总结、新帖子或续写内容
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 左侧配置区 */}
        <div className="space-y-6">
          {/* 生成类型选择 */}
          <GenerateTypeSelector value={generateType} onChange={setGenerateType} />

          {/* 内容来源选择 */}
          {loadingGroups ? (
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ) : (
            <ContentSelector
              groups={groups}
              onSelectionChange={setContentSelection}
              disabled={isGenerating}
            />
          )}

          {/* 根据类型显示不同的配置面板 */}
          {generateType === 'summary' && (
            <SummaryOptions value={summaryOptions} onChange={setSummaryOptions} />
          )}

          {generateType === 'generate' && (
            <ContentOptions value={contentOptions} onChange={setContentOptions} />
          )}

          {generateType === 'continuation' && (
            <ContinuationOptions value={continuationOptions} onChange={setContinuationOptions} />
          )}

          {generateType === 'rewrite' && (
            <RewriteOptions value={rewriteOptions} onChange={setRewriteOptions} />
          )}

          {/* AI 服务选择 */}
          {generateType && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">AI 服务</CardTitle>
                <CardDescription>选择用于生成的 AI 模型</CardDescription>
              </CardHeader>
              <CardContent>
                <ProviderSelector
                  value={provider}
                  onChange={setProvider}
                  disabled={isGenerating}
                />
              </CardContent>
            </Card>
          )}

          {/* 生成按钮 */}
          {generateType && (
            <Button
              className="w-full"
              size="lg"
              onClick={handleGenerate}
              disabled={isGenerating || !contentSelection?.groupId}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  开始生成
                </>
              )}
            </Button>
          )}
        </div>

        {/* 右侧结果区 */}
        <div>
          <GenerateResult
            isGenerating={isGenerating}
            content={generatedContent}
            status={generationStatus}
            error={generationError}
            onRetry={handleGenerate}
          />
        </div>
      </div>
    </div>
  );
}
