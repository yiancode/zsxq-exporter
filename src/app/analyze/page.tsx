'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth-store';
import { toast } from 'sonner';
import {
  ContentSelector,
  AnalysisTypeSelector,
  AnalysisResult,
  type ContentSelection,
  type AnalysisType,
} from '@/components/analyze';
import { ProviderSelector, type AIProvider } from '@/components/ai/provider-selector';

interface Group {
  group_id: string;
  name: string;
}

export default function AnalyzePage() {
  const { token, isAuthenticated } = useAuthStore();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [selection, setSelection] = useState<ContentSelection | null>(null);
  const [analysisType, setAnalysisType] = useState<AnalysisType | null>(null);
  const [analysisKey, setAnalysisKey] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [provider, setProvider] = useState<AIProvider>('deepseek');

  // 确保客户端 hydration 完成
  useEffect(() => {
    setMounted(true);
  }, []);

  // 获取星球列表
  useEffect(() => {
    if (mounted && isAuthenticated() && token) {
      fetchGroups();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/groups', {
        headers: { 'X-ZSXQ-Token': token! },
      });
      if (response.ok) {
        const data = await response.json();
        setGroups(data.groups || []);
      } else {
        toast.error('获取星球列表失败');
      }
    } catch {
      toast.error('网络错误');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectionChange = useCallback((newSelection: ContentSelection | null) => {
    setSelection(newSelection);
  }, []);

  const handleAnalysisTypeChange = (type: AnalysisType) => {
    setAnalysisType(type);
    // 重置分析结果
    setAnalysisKey(prev => prev + 1);
  };

  const handleStartAnalysis = () => {
    if (!selection) {
      toast.error('请先选择要分析的内容');
      return;
    }
    if (!analysisType) {
      toast.error('请选择分析类型');
      return;
    }
    // 触发新的分析
    setAnalysisKey(prev => prev + 1);
  };

  // 用于条件渲染的认证状态（仅在客户端 mounted 后才检查）
  const isLoggedIn = mounted && isAuthenticated();

  // 未 mounted 时显示加载状态避免 hydration 不匹配
  if (!mounted) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-12">
        <Card className="shadow-none">
          <CardContent className="py-8 text-center">
            <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">加载中...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 未认证状态
  if (!isLoggedIn) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-12">
        <Card className="shadow-none">
          <CardContent className="py-8 text-center">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="mb-4 text-muted-foreground">请先连接知识星球</p>
            <Link href="/">
              <Button>返回首页</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const canStartAnalysis = selection && analysisType;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-12 px-6 py-12">
      {/* 居中页头 */}
      <header className="text-center">
        <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">内容分析</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          深度解析知识星球内容，提炼核心价值
        </p>
      </header>

      {/* 分析能力卡（选择分析类型） */}
      <AnalysisTypeSelector value={analysisType} onChange={handleAnalysisTypeChange} />

      {/* 分析设置：内容来源 + AI 服务 + 开始分析 */}
      <Card className="shadow-none">
        <CardHeader className="border-b">
          <CardTitle className="text-xl">分析设置</CardTitle>
          <CardDescription>选择要分析的星球内容与 AI 服务</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ContentSelector
            groups={groups}
            onSelectionChange={handleSelectionChange}
            disabled={loading}
          />
          <ProviderSelector value={provider} onChange={setProvider} />
          <Button
            size="lg"
            className="w-full"
            disabled={!canStartAnalysis}
            onClick={handleStartAnalysis}
          >
            <BarChart3 className="mr-2 h-4 w-4" />
            开始分析
          </Button>
        </CardContent>
      </Card>

      {/* 结果文章 */}
      <AnalysisResult
        key={analysisKey}
        selection={selection}
        analysisType={analysisType}
        provider={provider}
      />
    </div>
  );
}
