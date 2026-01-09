'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { FileText, Calendar, Sparkles, Edit3, RefreshCw } from 'lucide-react';

export type GenerateType = 'summary' | 'generate' | 'continuation' | 'rewrite';

interface GenerateTypeSelectorProps {
  value: GenerateType | null;
  onChange: (type: GenerateType) => void;
}

const generateTypes = [
  {
    type: 'summary' as const,
    title: '内容总结',
    description: '生成年度/月度/季度总结，回顾精彩内容',
    icon: Calendar,
  },
  {
    type: 'generate' as const,
    title: '风格创作',
    description: '学习写作风格，生成新的帖子内容',
    icon: Sparkles,
  },
  {
    type: 'continuation' as const,
    title: '内容续写',
    description: '基于现有内容，按风格继续延伸',
    icon: Edit3,
  },
  {
    type: 'rewrite' as const,
    title: '内容改写',
    description: '优化、简化或扩展现有内容',
    icon: RefreshCw,
  },
];

export function GenerateTypeSelector({ value, onChange }: GenerateTypeSelectorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          选择生成类型
        </CardTitle>
        <CardDescription>
          选择你想要生成的内容类型
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-2">
          {generateTypes.map(({ type, title, description, icon: Icon }) => (
            <button
              key={type}
              onClick={() => onChange(type)}
              className={cn(
                'flex items-start gap-3 rounded-lg border p-4 text-left transition-colors',
                value === type
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50 hover:bg-accent'
              )}
            >
              <div
                className={cn(
                  'rounded-md p-2',
                  value === type ? 'bg-primary text-primary-foreground' : 'bg-muted'
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <div className="font-medium">{title}</div>
                <div className="text-sm text-muted-foreground">{description}</div>
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
