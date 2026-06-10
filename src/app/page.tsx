'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/store/auth-store';
import { toast } from 'sonner';
import {
  Download,
  BarChart3,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

interface Group {
  group_id: string;
  name: string;
  description?: string;
  member_count?: number;
  topics_count?: number;
}

// 功能入口配置（导出 / 分析 / 生成）
const FEATURES = [
  {
    href: '/export',
    icon: Download,
    title: '导出内容',
    description: '选择时间范围，将星球帖子导出为 Markdown 文件，包含图片',
  },
  {
    href: '/analyze',
    icon: BarChart3,
    title: '内容分析',
    description: '使用 AI 分析内容，生成复盘报告、关键词提取、趋势分析',
  },
  {
    href: '/generate',
    icon: Sparkles,
    title: '智能生成',
    description: '基于历史内容风格，生成年度总结、月度复盘或新帖子',
  },
] as const;

export default function HomePage() {
  const { token, setToken, isAuthenticated, clearToken } = useAuthStore();
  const [inputToken, setInputToken] = useState('');
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // 确保客户端 hydration 完成后再渲染依赖认证状态的内容
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleConnect = async () => {
    if (!inputToken.trim()) {
      toast.error('请输入 Token');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/groups', {
        headers: {
          'X-ZSXQ-Token': inputToken,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '连接失败');
      }

      const data = await response.json();
      setGroups(data.groups || []);
      setToken(inputToken);
      toast.success('连接成功！');
    } catch (err) {
      const message = err instanceof Error ? err.message : '连接失败';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    if (!token) return;

    setLoading(true);
    try {
      const response = await fetch('/api/groups', {
        headers: {
          'X-ZSXQ-Token': token,
        },
      });

      if (!response.ok) {
        throw new Error('获取星球列表失败');
      }

      const data = await response.json();
      setGroups(data.groups || []);
    } catch {
      toast.error('获取星球列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 如果已经有 token，自动获取星球列表
  useEffect(() => {
    if (isAuthenticated()) {
      fetchGroups();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 用于条件渲染的认证状态（仅在客户端 mounted 后才检查）
  const isLoggedIn = mounted && isAuthenticated();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-12 px-6 py-12">
      <h1 className="sr-only">ZSXQ Exporter — 连接、导出与分析你的知识星球</h1>

      {/* 顶部状态区：未连接显示连接卡，已连接显示连接状态条 */}
      {!mounted ? (
        <Card className="shadow-none">
          <CardHeader>
            <Skeleton className="h-7 w-40" />
            <Skeleton className="mt-2 h-4 w-72" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-10 w-28" />
          </CardContent>
        </Card>
      ) : !isLoggedIn ? (
        <Card className="shadow-none md:py-8">
          <CardHeader>
            <CardTitle className="text-2xl">连接知识星球</CardTitle>
            <CardDescription className="text-base leading-relaxed">
              输入你的知识星球 Token 以安全访问并导出星球数据。数据仅在本地处理，不会上传至任何服务器。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="token" className="sr-only">
                Token
              </Label>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="token"
                  type="password"
                  placeholder="请输入知识星球 Token"
                  value={inputToken}
                  onChange={(e) => setInputToken(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
                  className="h-12 pl-10 text-base"
                />
              </div>
              <a
                href="https://github.com/your-repo/zsxq-exporter#get-token"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-primary"
              >
                如何获取 Token?
              </a>
            </div>
            {error && (
              <p className="flex items-center gap-1 text-sm text-destructive">
                <AlertCircle className="size-4" />
                {error}
              </p>
            )}
            <Button
              onClick={handleConnect}
              disabled={loading}
              className="w-full md:w-auto"
            >
              {loading ? (
                '连接中...'
              ) : (
                <>
                  连接
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="flex items-center justify-between rounded-xl border bg-card px-5 py-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-5 text-primary" />
            <span className="text-sm text-muted-foreground">已连接知识星球</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              clearToken();
              setGroups([]);
            }}
          >
            断开连接
          </Button>
        </div>
      )}

      {/* 功能入口：圆形图标徽章 + 衬线标题，hover 背景微移（不抬升） */}
      <section className="grid gap-6 md:grid-cols-3">
        {FEATURES.map(({ href, icon: Icon, title, description }) => (
          <Link
            key={href}
            href={href}
            className="group rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Card className="h-full cursor-pointer shadow-none transition-colors group-hover:bg-muted/50">
              <CardHeader className="gap-4">
                <span className="flex size-11 items-center justify-center rounded-full bg-accent text-primary transition-transform duration-200 group-hover:scale-110">
                  <Icon className="size-5" />
                </span>
                <div className="space-y-1.5">
                  <CardTitle className="text-xl">{title}</CardTitle>
                  <CardDescription className="leading-relaxed">
                    {description}
                  </CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </section>

      {/* 我的星球：常驻区块，未连接时显示淡化占位 */}
      <section className="space-y-5">
        <h2 className="font-serif text-2xl font-semibold tracking-tight">我的星球</h2>

        {!isLoggedIn ? (
          <>
            <div className="pointer-events-none grid gap-4 opacity-50 md:grid-cols-2">
              {[1, 2].map((i) => (
                <Card key={i} className="shadow-none">
                  <CardHeader>
                    <Skeleton className="size-12 rounded-full" />
                    <Skeleton className="mt-2 h-6 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Skeleton className="h-6 w-16 rounded-full" />
                      <Skeleton className="h-6 w-16 rounded-full" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <p className="text-center text-sm text-muted-foreground">
              连接 Token 后将在此处显示你加入的星球
            </p>
          </>
        ) : loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2].map((i) => (
              <Card key={i} className="shadow-none">
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="mt-2 h-4 w-full" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : groups.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {groups.map((group) => (
              <Link
                key={group.group_id}
                href={`/export?groupId=${group.group_id}`}
                className="group rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <Card className="h-full cursor-pointer shadow-none transition-colors group-hover:bg-muted/50">
                  <CardHeader>
                    <CardTitle className="text-lg">{group.name}</CardTitle>
                    {group.description && (
                      <CardDescription className="line-clamp-2">
                        {group.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      {group.member_count !== undefined && (
                        <Badge className="border-transparent bg-accent text-accent-foreground">
                          {group.member_count} 成员
                        </Badge>
                      )}
                      {group.topics_count !== undefined && (
                        <Badge className="border-transparent bg-ochre/12 text-ochre">
                          {group.topics_count} 帖子
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="shadow-none">
            <CardContent className="py-8 text-center text-muted-foreground">
              暂无星球数据，请检查 Token 是否有效
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
