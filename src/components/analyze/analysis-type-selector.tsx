'use client';

import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
    <div className="grid gap-4 sm:grid-cols-2">
      {analysisTypes.map((option) => (
        <Card
          key={option.type}
          className={cn(
            'cursor-pointer transition-all hover:shadow-md',
            value === option.type && 'ring-2 ring-primary',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          onClick={() => !disabled && onChange(option.type)}
        >
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div className={cn(
                'p-2 rounded-lg',
                value === option.type ? 'bg-primary text-primary-foreground' : 'bg-muted'
              )}>
                {option.icon}
              </div>
              {value === option.type && (
                <div className="h-2 w-2 rounded-full bg-primary" />
              )}
            </div>
            <CardTitle className="text-lg">{option.title}</CardTitle>
            <CardDescription>{option.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {option.features.map((feature, i) => (
                <span
                  key={i}
                  className="text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground"
                >
                  {feature}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
