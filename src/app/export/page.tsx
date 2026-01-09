'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/store/auth-store';
import { toast } from 'sonner';
import { CalendarIcon, Download, Loader2, ArrowLeft, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import Link from 'next/link';

interface Group {
  group_id: string;
  name: string;
}

interface ExportRecord {
  export_id: string;
  group_name: string;
  start_date: string;
  end_date: string;
  topic_count: number;
  image_count: number;
  status: string;
  created_at: string;
  file_path?: string;
}

interface ExportTask {
  export_id: string;
  group_name: string;
  status: string;
  progress: {
    total_topics: number;
    fetched_topics: number;
    current_step: string;
  };
  error?: string;
}

function ExportPageContent() {
  const { token, isAuthenticated } = useAuthStore();
  const searchParams = useSearchParams();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [scope, setScope] = useState<'all' | 'digests'>('all');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [currentExportId, setCurrentExportId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [exportHistory, setExportHistory] = useState<ExportRecord[]>([]);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const [mounted, setMounted] = useState(false);

  // 确保客户端 hydration 完成
  useEffect(() => {
    setMounted(true);
  }, []);

  // 从 URL 参数获取预选的 groupId
  const preselectedGroupId = searchParams.get('groupId');

  useEffect(() => {
    if (mounted && isAuthenticated() && token) {
      fetchGroups();
      fetchExportHistory();
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  // 当 groups 加载完成且有预选 groupId 时，自动选中
  useEffect(() => {
    if (preselectedGroupId && groups.length > 0 && !selectedGroup) {
      const found = groups.find(g => g.group_id === preselectedGroupId);
      if (found) {
        setSelectedGroup(preselectedGroupId);
      }
    }
  }, [preselectedGroupId, groups, selectedGroup]);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/groups', {
        headers: { 'X-ZSXQ-Token': token! },
      });
      if (response.ok) {
        const data = await response.json();
        setGroups(data.groups || []);
      }
    } catch {
      toast.error('获取星球列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchExportHistory = async () => {
    try {
      const response = await fetch('/api/export');
      if (response.ok) {
        const data = await response.json();
        setExportHistory(data.history || []);
      }
    } catch {
      // 静默失败
    }
  };

  const pollExportStatus = async (exportId: string) => {
    try {
      const response = await fetch(`/api/export?exportId=${exportId}`);
      if (!response.ok) return;

      const data = await response.json();
      const task: ExportTask = data.task || data.record;

      if (!task) return;

      // 更新进度
      if (task.progress) {
        const fetched = task.progress.fetched_topics || 0;
        const total = task.progress.total_topics || 0;
        const percent = total > 0 ? Math.round((fetched / total) * 100) : 0;
        setProgress(percent);
        setProgressText(task.progress.current_step || '处理中...');
      }

      // 检查完成状态
      if (task.status === 'completed') {
        setExporting(false);
        setProgress(100);
        setProgressText('导出完成');
        toast.success(`导出完成！共获取 ${task.progress?.fetched_topics || 0} 条帖子`);
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
        fetchExportHistory();
      } else if (task.status === 'failed') {
        setExporting(false);
        setProgressText('导出失败');
        toast.error(task.error || '导出失败');
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      }
    } catch {
      // 静默失败
    }
  };

  const handleExport = async () => {
    if (!selectedGroup) {
      toast.error('请选择星球');
      return;
    }
    if (!startDate || !endDate) {
      toast.error('请选择时间范围');
      return;
    }
    if (startDate > endDate) {
      toast.error('开始日期不能晚于结束日期');
      return;
    }

    const selectedGroupObj = groups.find(g => g.group_id === selectedGroup);

    setExporting(true);
    setProgress(0);
    setProgressText('正在创建导出任务...');

    try {
      // 创建导出任务
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-ZSXQ-Token': token!,
        },
        body: JSON.stringify({
          groupId: selectedGroup,
          groupName: selectedGroupObj?.name,
          startDate: format(startDate, "yyyy-MM-dd'T'00:00:00.000'+0800'"),
          endDate: format(endDate, "yyyy-MM-dd'T'23:59:59.999'+0800'"),
          options: {
            scope,
            include_images: true,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '创建导出任务失败');
      }

      const data = await response.json();
      setCurrentExportId(data.exportId);
      setProgressText('正在获取帖子...');

      // 开始轮询进度
      pollRef.current = setInterval(() => {
        pollExportStatus(data.exportId);
      }, 1000);

    } catch (error) {
      toast.error(error instanceof Error ? error.message : '导出失败');
      setExporting(false);
      setProgress(0);
      setProgressText('');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return '已完成';
      case 'failed':
        return '失败';
      case 'pending':
        return '等待中';
      case 'fetching':
        return '获取中';
      case 'downloading_images':
        return '下载图片';
      case 'zipping':
        return '打包中';
      default:
        return status;
    }
  };

  const handleDownload = async (exportId: string) => {
    try {
      const response = await fetch(`/api/download/${exportId}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '下载失败');
      }

      // 获取文件名
      const contentDisposition = response.headers.get('Content-Disposition');
      let fileName = 'export.zip';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match) {
          fileName = decodeURIComponent(match[1]);
        }
      }

      // 下载文件
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('下载开始');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '下载失败');
    }
  };

  // 用于条件渲染的认证状态（仅在客户端 mounted 后才检查）
  const isLoggedIn = mounted && isAuthenticated();

  // 未 mounted 时显示加载状态避免 hydration 不匹配
  if (!mounted) {
    return (
      <div className="container py-8">
        <Card>
          <CardContent className="py-8 text-center">
            <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="container py-8">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground mb-4">请先连接知识星球</p>
            <Link href="/">
              <Button>返回首页</Button>
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

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 导出表单 */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                导出内容
              </CardTitle>
              <CardDescription>
                选择星球和时间范围，将帖子导出为 Markdown 文件
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 星球选择 */}
              <div className="space-y-2">
                <Label>选择星球</Label>
                <Select value={selectedGroup} onValueChange={setSelectedGroup} disabled={loading || exporting}>
                  <SelectTrigger>
                    <SelectValue placeholder={loading ? '加载中...' : '请选择星球'} />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((group) => (
                      <SelectItem key={group.group_id} value={group.group_id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 时间范围 */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>开始日期</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal" disabled={exporting}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, 'yyyy-MM-dd', { locale: zhCN }) : '选择日期'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        locale={zhCN}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>结束日期</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal" disabled={exporting}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, 'yyyy-MM-dd', { locale: zhCN }) : '选择日期'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        locale={zhCN}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* 导出范围 */}
              <div className="space-y-2">
                <Label>导出范围</Label>
                <Select value={scope} onValueChange={(v) => setScope(v as 'all' | 'digests')} disabled={exporting}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部帖子</SelectItem>
                    <SelectItem value="digests">仅精华</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 进度条 */}
              {exporting && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{progressText}</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} />
                </div>
              )}

              {/* 导出按钮 */}
              <Button onClick={handleExport} disabled={exporting} className="w-full">
                {exporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    导出中...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    开始导出
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* 导出历史 */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">导出历史</CardTitle>
            </CardHeader>
            <CardContent>
              {exportHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  暂无导出记录
                </p>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {exportHistory.map((record, index) => (
                      <div key={record.export_id}>
                        <div className="flex items-start gap-2">
                          {getStatusIcon(record.status)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{record.group_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {record.start_date?.slice(0, 10)} ~ {record.end_date?.slice(0, 10)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {record.topic_count} 条帖子 · {getStatusText(record.status)}
                            </p>
                            {record.status === 'completed' && record.file_path && (
                              <Button
                                variant="link"
                                size="sm"
                                className="h-auto p-0 text-xs"
                                onClick={() => handleDownload(record.export_id)}
                              >
                                <Download className="mr-1 h-3 w-3" />
                                下载
                              </Button>
                            )}
                          </div>
                        </div>
                        {index < exportHistory.length - 1 && <Separator className="mt-3" />}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// 加载骨架屏
function ExportPageSkeleton() {
  return (
    <div className="container py-8">
      <div className="mb-6">
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-64 mt-2" />
            </CardHeader>
            <CardContent className="space-y-6">
              <Skeleton className="h-10 w-full" />
              <div className="grid gap-4 md:grid-cols-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// 使用 Suspense 包装的导出组件
export default function ExportPage() {
  return (
    <Suspense fallback={<ExportPageSkeleton />}>
      <ExportPageContent />
    </Suspense>
  );
}
