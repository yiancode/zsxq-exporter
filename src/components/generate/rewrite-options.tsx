'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Edit3, RefreshCw } from 'lucide-react';

export type RewriteGoal = 'polish' | 'simplify' | 'expand' | 'style';
export type ContentLength = 'short' | 'medium' | 'long';

export interface ContinuationOptionsData {
  originalContent: string;
  direction: string;
  length: ContentLength;
}

export interface RewriteOptionsData {
  originalContent: string;
  goal: RewriteGoal;
}

interface ContinuationOptionsProps {
  value: ContinuationOptionsData;
  onChange: (options: ContinuationOptionsData) => void;
}

interface RewriteOptionsProps {
  value: RewriteOptionsData;
  onChange: (options: RewriteOptionsData) => void;
}

export function ContinuationOptions({ value, onChange }: ContinuationOptionsProps) {
  const updateField = <K extends keyof ContinuationOptionsData>(
    field: K,
    fieldValue: ContinuationOptionsData[K]
  ) => {
    onChange({ ...value, [field]: fieldValue });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Edit3 className="h-5 w-5" />
          续写配置
        </CardTitle>
        <CardDescription>
          输入要续写的原始内容，AI 将按照学习到的风格继续创作
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>原始内容</Label>
          <Textarea
            placeholder="粘贴或输入你想要续写的内容..."
            className="min-h-[200px]"
            value={value.originalContent}
            onChange={(e) => updateField('originalContent', e.target.value)}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>续写方向 (可选)</Label>
            <Input
              placeholder="例如：展开讨论技术细节..."
              value={value.direction}
              onChange={(e) => updateField('direction', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>续写长度</Label>
            <Select
              value={value.length}
              onValueChange={(v) => updateField('length', v as ContentLength)}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择续写长度" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="short">简短 (100-200字)</SelectItem>
                <SelectItem value="medium">中等 (300-500字)</SelectItem>
                <SelectItem value="long">较长 (500-1000字)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function RewriteOptions({ value, onChange }: RewriteOptionsProps) {
  const updateField = <K extends keyof RewriteOptionsData>(
    field: K,
    fieldValue: RewriteOptionsData[K]
  ) => {
    onChange({ ...value, [field]: fieldValue });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          改写配置
        </CardTitle>
        <CardDescription>
          输入要改写的内容，选择改写目标
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>原始内容</Label>
          <Textarea
            placeholder="粘贴或输入你想要改写的内容..."
            className="min-h-[200px]"
            value={value.originalContent}
            onChange={(e) => updateField('originalContent', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>改写目标</Label>
          <Select
            value={value.goal}
            onValueChange={(v) => updateField('goal', v as RewriteGoal)}
          >
            <SelectTrigger>
              <SelectValue placeholder="选择改写目标" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="polish">润色优化 - 使表达更流畅精炼</SelectItem>
              <SelectItem value="simplify">简化内容 - 使其更加易懂</SelectItem>
              <SelectItem value="expand">扩展内容 - 增加细节和深度</SelectItem>
              <SelectItem value="style">风格调整 - 适配学习到的风格</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
