'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Calendar as CalendarIcon, FileText, Star, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface ContentSelection {
  groupId: string;
  groupName: string;
  startDate?: string;
  endDate?: string;
  scope: 'all' | 'digests';
}

interface GroupOption {
  group_id: string;
  name: string;
}

interface PreviewData {
  topicCount: number;
  estimatedTokens: number;
  previewTopics: Array<{
    id: string;
    title?: string;
    content: string;
    date: string;
    digested: boolean;
  }>;
}

interface ContentSelectorProps {
  groups: GroupOption[];
  onSelectionChange: (selection: ContentSelection | null) => void;
  disabled?: boolean;
}

export function ContentSelector({
  groups,
  onSelectionChange,
  disabled = false,
}: ContentSelectorProps) {
  const [groupId, setGroupId] = useState<string>('');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [scope, setScope] = useState<'all' | 'digests'>('all');
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(false);

  const selectedGroup = groups.find(g => g.group_id === groupId);

  // 获取预览数据
  const fetchPreview = useCallback(async () => {
    if (!groupId) {
      setPreview(null);
      onSelectionChange(null);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({ groupId, scope });
      if (startDate) {
        params.set('startDate', format(startDate, 'yyyy-MM-dd'));
      }
      if (endDate) {
        params.set('endDate', format(endDate, 'yyyy-MM-dd'));
      }

      const res = await fetch(`/api/ai/analyze?${params}`);
      if (!res.ok) throw new Error('获取预览失败');

      const data = await res.json();
      setPreview({
        topicCount: data.topicCount,
        estimatedTokens: data.estimatedTokens,
        previewTopics: data.previewTopics,
      });

      onSelectionChange({
        groupId,
        groupName: selectedGroup?.name || '',
        startDate: startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
        endDate: endDate ? format(endDate, 'yyyy-MM-dd') : undefined,
        scope,
      });
    } catch {
      setPreview(null);
      onSelectionChange(null);
    } finally {
      setLoading(false);
    }
  }, [groupId, startDate, endDate, scope, selectedGroup, onSelectionChange]);

  useEffect(() => {
    const timer = setTimeout(fetchPreview, 300);
    return () => clearTimeout(timer);
  }, [fetchPreview]);

  return (
    <div className="space-y-4">
      {/* 星球选择 */}
      <div className="space-y-2">
        <Label>选择星球</Label>
        <Select value={groupId} onValueChange={setGroupId} disabled={disabled}>
          <SelectTrigger>
            <SelectValue placeholder="请选择要分析的星球" />
          </SelectTrigger>
          <SelectContent>
            {groups.map(group => (
              <SelectItem key={group.group_id} value={group.group_id}>
                {group.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 日期范围 */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>开始日期</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !startDate && 'text-muted-foreground'
                )}
                disabled={disabled}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, 'yyyy-MM-dd', { locale: zhCN }) : '不限'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={setStartDate}
                disabled={(date) => date > new Date()}
                initialFocus
              />
              {startDate && (
                <div className="p-2 border-t">
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={() => setStartDate(undefined)}
                  >
                    清除
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label>结束日期</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !endDate && 'text-muted-foreground'
                )}
                disabled={disabled}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, 'yyyy-MM-dd', { locale: zhCN }) : '不限'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={setEndDate}
                disabled={(date) => date > new Date() || (startDate ? date < startDate : false)}
                initialFocus
              />
              {endDate && (
                <div className="p-2 border-t">
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={() => setEndDate(undefined)}
                  >
                    清除
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* 内容范围 */}
      <div className="space-y-2">
        <Label>内容范围</Label>
        <Select value={scope} onValueChange={(v) => setScope(v as 'all' | 'digests')} disabled={disabled}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                全部帖子
              </div>
            </SelectItem>
            <SelectItem value="digests">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4" />
                仅精华帖子
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 预览信息 */}
      {groupId && (
        <Card>
          <CardContent className="pt-4">
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-40" />
              </div>
            ) : preview ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">符合条件的帖子</span>
                  <span className="font-medium">{preview.topicCount} 条</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">预估 Token 数</span>
                  <span className="font-medium">{preview.estimatedTokens.toLocaleString()}</span>
                </div>
                {preview.topicCount > 0 && (
                  <div className="pt-2 border-t">
                    <p className="text-sm text-muted-foreground mb-2">内容预览：</p>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {preview.previewTopics.map((topic, i) => (
                        <div key={i} className="text-xs p-2 bg-muted rounded">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-muted-foreground">{topic.date}</span>
                            {topic.digested && (
                              <span className="text-yellow-600 flex items-center gap-0.5">
                                <Star className="h-3 w-3" />
                                精华
                              </span>
                            )}
                          </div>
                          <p className="line-clamp-2">{topic.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {preview.topicCount === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    没有找到符合条件的帖子
                  </p>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center py-4 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                加载中...
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
