'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from 'lucide-react';

export type SummaryType = 'annual' | 'monthly' | 'quarterly' | 'custom';
export type SummaryStyle = 'formal' | 'casual' | 'storytelling';

export interface SummaryOptionsData {
  type: SummaryType;
  style: SummaryStyle;
  year?: number;
  month?: number;
  quarter?: number;
}

interface SummaryOptionsProps {
  value: SummaryOptionsData;
  onChange: (options: SummaryOptionsData) => void;
}

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
const months = [
  { value: 1, label: '1月' },
  { value: 2, label: '2月' },
  { value: 3, label: '3月' },
  { value: 4, label: '4月' },
  { value: 5, label: '5月' },
  { value: 6, label: '6月' },
  { value: 7, label: '7月' },
  { value: 8, label: '8月' },
  { value: 9, label: '9月' },
  { value: 10, label: '10月' },
  { value: 11, label: '11月' },
  { value: 12, label: '12月' },
];
const quarters = [
  { value: 1, label: '第一季度 (1-3月)' },
  { value: 2, label: '第二季度 (4-6月)' },
  { value: 3, label: '第三季度 (7-9月)' },
  { value: 4, label: '第四季度 (10-12月)' },
];

export function SummaryOptions({ value, onChange }: SummaryOptionsProps) {
  const updateField = <K extends keyof SummaryOptionsData>(
    field: K,
    fieldValue: SummaryOptionsData[K]
  ) => {
    onChange({ ...value, [field]: fieldValue });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          总结配置
        </CardTitle>
        <CardDescription>
          设置总结的类型和时间范围
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          {/* 总结类型 */}
          <div className="space-y-2">
            <Label>总结类型</Label>
            <Select
              value={value.type}
              onValueChange={(v) => updateField('type', v as SummaryType)}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择总结类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="annual">年度总结</SelectItem>
                <SelectItem value="monthly">月度小结</SelectItem>
                <SelectItem value="quarterly">季度报告</SelectItem>
                <SelectItem value="custom">自定义范围</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 写作风格 */}
          <div className="space-y-2">
            <Label>写作风格</Label>
            <Select
              value={value.style}
              onValueChange={(v) => updateField('style', v as SummaryStyle)}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择写作风格" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="casual">轻松随意</SelectItem>
                <SelectItem value="formal">正式专业</SelectItem>
                <SelectItem value="storytelling">故事叙述</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 根据类型显示不同的时间选择器 */}
        {value.type === 'annual' && (
          <div className="space-y-2">
            <Label>选择年份</Label>
            <Select
              value={String(value.year || currentYear)}
              onValueChange={(v) => updateField('year', parseInt(v))}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="选择年份" />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    {year} 年
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {value.type === 'monthly' && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>选择年份</Label>
              <Select
                value={String(value.year || currentYear)}
                onValueChange={(v) => updateField('year', parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择年份" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      {year} 年
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>选择月份</Label>
              <Select
                value={String(value.month || new Date().getMonth() + 1)}
                onValueChange={(v) => updateField('month', parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择月份" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((m) => (
                    <SelectItem key={m.value} value={String(m.value)}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {value.type === 'quarterly' && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>选择年份</Label>
              <Select
                value={String(value.year || currentYear)}
                onValueChange={(v) => updateField('year', parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择年份" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      {year} 年
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>选择季度</Label>
              <Select
                value={String(value.quarter || Math.ceil((new Date().getMonth() + 1) / 3))}
                onValueChange={(v) => updateField('quarter', parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择季度" />
                </SelectTrigger>
                <SelectContent>
                  {quarters.map((q) => (
                    <SelectItem key={q.value} value={String(q.value)}>
                      {q.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {value.type === 'custom' && (
          <p className="text-sm text-muted-foreground">
            自定义范围模式将使用上方内容选择器中设置的日期范围生成总结。
          </p>
        )}
      </CardContent>
    </Card>
  );
}
