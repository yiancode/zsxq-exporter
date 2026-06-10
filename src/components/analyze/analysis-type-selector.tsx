'use client';

import { cn } from '@/lib/utils';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { ClipboardList, Hash, MessageSquare, Lightbulb } from 'lucide-react';

export type AnalysisType = 'review' | 'keywords' | 'topics' | 'insights';

interface AnalysisTypeOption {
  type: AnalysisType;
  title: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
}

const analysisTypes: AnalysisTypeOption[] = [
  {
    type: 'review',
    title: '内容复盘',
    description: '生成结构化的复盘报告，回顾重点事项',
    icon: <ClipboardList className="h-6 w-6" />,
    features: ['总体概览', '重点回顾', '成果进展', '问题反思'],
  },
  {
    type: 'keywords',
    title: '关键词提取',
    description: '提取高频词汇和核心概念',
    icon: <Hash className="h-6 w-6" />,
    features: ['核心关键词', '高频词汇', '专业术语', '关键词云'],
  },
  {
    type: 'topics',
    title: '话题分析',
    description: '分析内容的话题分布和趋势',
    icon: <MessageSquare className="h-6 w-6" />,
    features: ['话题分类', '话题占比', '热门话题', '话题演变'],
  },
  {
    type: 'insights',
    title: '深度洞察',
    description: '挖掘有价值的规律和观点',
    icon: <Lightbulb className="h-6 w-6" />,
    features: ['核心洞察', '规律模式', '独特观点', '行动建议'],
  },
];

interface AnalysisTypeSelectorProps {
  value: AnalysisType | null;
  onChange: (type: AnalysisType) => void;
  disabled?: boolean;
}

export function AnalysisTypeSelector({
  value,
  onChange,
  disabled = false,
}: AnalysisTypeSelectorProps) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {analysisTypes.map((option) => {
        const active = value === option.type;
        return (
          <Card
            key={option.type}
            role="button"
            tabIndex={disabled ? -1 : 0}
            aria-pressed={active}
            aria-disabled={disabled}
            className={cn(
              'cursor-pointer p-6 text-center shadow-none transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              active ? 'border-primary ring-1 ring-primary' : 'hover:bg-muted/50',
              disabled && 'cursor-not-allowed opacity-50'
            )}
            onClick={() => !disabled && onChange(option.type)}
            onKeyDown={(e) => {
              if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                onChange(option.type);
              }
            }}
          >
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  'mb-4 flex size-12 items-center justify-center rounded-full transition-colors',
                  active ? 'bg-primary text-primary-foreground' : 'bg-accent text-primary'
                )}
              >
                {option.icon}
              </span>
              <CardTitle className="text-lg">{option.title}</CardTitle>
              <CardDescription className="mt-1.5 leading-relaxed">
                {option.description}
              </CardDescription>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
