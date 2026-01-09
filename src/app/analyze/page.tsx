'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';
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
      <div className="container py-8">
        <Card>
          <CardContent className="py-8 text-center">
            <Loader2 className="h-12 w-12 mx-auto text-muted-foreground mb-4 animate-spin" />
            <p className="text-muted-foreground">加载中...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 未认证状态
  if (!isLoggedIn) {
    return (
      <div className="container py-8">
        <Card>
          <CardContent className="py-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">请先连接知识星球</p>
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
    <div className="container py-8">
      <div className="mb-6">
        <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-1 h-4 w-4" />
          返回首页
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          内容分析
        </h1>
        <p className="text-muted-foreground mt-1">
          使用 AI 分析导出的内容，生成复盘报告、关键词提取等
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* 左侧：设置面板 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 内容选择 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">1. 选择内容</CardTitle>
              <CardDescription>选择要分析的星球和时间范围</CardDescription>
            </CardHeader>
            <CardContent>
              <ContentSelector
                groups={groups}
                onSelectionChange={handleSelectionChange}
                disabled={loading}
              />
            </CardContent>
          </Card>

          {/* 分析类型 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">2. 选择分析类型</CardTitle>
              <CardDescription>选择你想要的分析方式</CardDescription>
            </CardHeader>
            <CardContent>
              <AnalysisTypeSelector
                value={analysisType}
                onChange={handleAnalysisTypeChange}
                disabled={!selection}
              />
            </CardContent>
          </Card>

          {/* AI 服务选择 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">3. 选择 AI 服务</CardTitle>
              <CardDescription>选择用于分析的 AI 模型</CardDescription>
            </CardHeader>
            <CardContent>
              <ProviderSelector
                value={provider}
                onChange={setProvider}
                disabled={!selection}
              />
            </CardContent>
          </Card>

          {/* 开始分析按钮 */}
          <Button
            size="lg"
            className="w-full"
            disabled={!canStartAnalysis}
            onClick={handleStartAnalysis}
          >
            <BarChart3 className="mr-2 h-4 w-4" />
            开始分析
          </Button>
        </div>

        {/* 右侧：结果面板 */}
        <div className="lg:col-span-3">
          <AnalysisResult
            key={analysisKey}
            selection={selection}
            analysisType={analysisType}
            provider={provider}
          />
        </div>
      </div>
    </div>
  );
}
