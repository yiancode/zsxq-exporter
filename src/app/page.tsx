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
import { Download, BarChart3, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface Group {
  group_id: string;
  name: string;
  description?: string;
  member_count?: number;
  topics_count?: number;
}

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
    <div className="container py-8">
      {/* Token 输入区域 - mounted 前显示骨架屏避免 hydration 不匹配 */}
      {!mounted ? (
        <Card className="mb-8">
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-20" />
            </div>
          </CardContent>
        </Card>
      ) : !isLoggedIn ? (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>连接知识星球</CardTitle>
            <CardDescription>
              请输入你的知识星球 Token 以开始使用。
              <a
                href="https://github.com/your-repo/zsxq-exporter#get-token"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-1 text-primary hover:underline"
              >
                如何获取 Token?
              </a>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="token" className="sr-only">
                  Token
                </Label>
                <Input
                  id="token"
                  type="password"
                  placeholder="请输入知识星球 Token"
                  value={inputToken}
                  onChange={(e) => setInputToken(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
                />
              </div>
              <Button onClick={handleConnect} disabled={loading}>
                {loading ? '连接中...' : '连接'}
              </Button>
            </div>
            {error && (
              <p className="mt-2 text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {error}
              </p>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* 已连接状态 */}
      {isLoggedIn && (
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
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

      {/* 功能入口 */}
      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Link href="/export">
          <Card className="h-full cursor-pointer transition-colors hover:bg-accent">
            <CardHeader>
              <Download className="h-8 w-8 mb-2 text-primary" />
              <CardTitle>导出内容</CardTitle>
              <CardDescription>
                选择时间范围，将星球帖子导出为 Markdown 文件，包含图片
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/analyze">
          <Card className="h-full cursor-pointer transition-colors hover:bg-accent">
            <CardHeader>
              <BarChart3 className="h-8 w-8 mb-2 text-primary" />
              <CardTitle>内容分析</CardTitle>
              <CardDescription>
                使用 AI 分析内容，生成复盘报告、关键词提取、趋势分析
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/generate">
          <Card className="h-full cursor-pointer transition-colors hover:bg-accent">
            <CardHeader>
              <Sparkles className="h-8 w-8 mb-2 text-primary" />
              <CardTitle>智能生成</CardTitle>
              <CardDescription>
                基于历史内容风格，生成年度总结、月度复盘或新帖子
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>

      {/* 星球列表 */}
      {isLoggedIn && (
        <div>
          <h2 className="text-xl font-semibold mb-4">我的星球</h2>
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-full mt-2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : groups.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {groups.map((group) => (
                <Link key={group.group_id} href={`/export?groupId=${group.group_id}`}>
                  <Card className="h-full cursor-pointer transition-colors hover:bg-accent hover:shadow-md">
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
                          <Badge variant="secondary">{group.member_count} 成员</Badge>
                        )}
                        {group.topics_count !== undefined && (
                          <Badge variant="outline">{group.topics_count} 帖子</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                暂无星球数据，请检查 Token 是否有效
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
