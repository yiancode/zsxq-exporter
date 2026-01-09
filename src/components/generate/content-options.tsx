'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Sparkles, X } from 'lucide-react';
import { useState } from 'react';

export type ContentType = 'post' | 'reply';
export type ContentLength = 'short' | 'medium' | 'long';
export type ContentTone = 'professional' | 'casual' | 'humorous' | 'inspiring';

export interface ContentOptionsData {
  type: ContentType;
  topic: string;
  keywords: string[];
  length: ContentLength;
  tone: ContentTone;
  includeEmoji: boolean;
}

interface ContentOptionsProps {
  value: ContentOptionsData;
  onChange: (options: ContentOptionsData) => void;
}

export function ContentOptions({ value, onChange }: ContentOptionsProps) {
  const [keywordInput, setKeywordInput] = useState('');

  const updateField = <K extends keyof ContentOptionsData>(
    field: K,
    fieldValue: ContentOptionsData[K]
  ) => {
    onChange({ ...value, [field]: fieldValue });
  };

  const addKeyword = () => {
    const keyword = keywordInput.trim();
    if (keyword && !value.keywords.includes(keyword)) {
      updateField('keywords', [...value.keywords, keyword]);
      setKeywordInput('');
    }
  };

  const removeKeyword = (keyword: string) => {
    updateField('keywords', value.keywords.filter(k => k !== keyword));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addKeyword();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          创作配置
        </CardTitle>
        <CardDescription>
          设置生成内容的主题、风格和长度
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 内容类型和长度 */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>内容类型</Label>
            <Select
              value={value.type}
              onValueChange={(v) => updateField('type', v as ContentType)}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择内容类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="post">帖子/文章</SelectItem>
                <SelectItem value="reply">回复/评论</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>内容长度</Label>
            <Select
              value={value.length}
              onValueChange={(v) => updateField('length', v as ContentLength)}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择内容长度" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="short">简短 (100-200字)</SelectItem>
                <SelectItem value="medium">中等 (300-500字)</SelectItem>
                <SelectItem value="long">较长 (800-1500字)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 语气 */}
        <div className="space-y-2">
          <Label>语气风格</Label>
          <Select
            value={value.tone}
            onValueChange={(v) => updateField('tone', v as ContentTone)}
          >
            <SelectTrigger>
              <SelectValue placeholder="选择语气风格" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="casual">轻松随意</SelectItem>
              <SelectItem value="professional">专业严谨</SelectItem>
              <SelectItem value="humorous">幽默风趣</SelectItem>
              <SelectItem value="inspiring">励志鼓舞</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 主题 */}
        <div className="space-y-2">
          <Label>主题/话题</Label>
          <Input
            placeholder="输入你想要创作的主题..."
            value={value.topic}
            onChange={(e) => updateField('topic', e.target.value)}
          />
        </div>

        {/* 关键词 */}
        <div className="space-y-2">
          <Label>关键词 (可选)</Label>
          <div className="flex gap-2">
            <Input
              placeholder="输入关键词，按 Enter 添加"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          {value.keywords.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {value.keywords.map((keyword) => (
                <Badge key={keyword} variant="secondary" className="gap-1">
                  {keyword}
                  <button
                    onClick={() => removeKeyword(keyword)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Emoji 开关 */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>使用 Emoji</Label>
            <p className="text-sm text-muted-foreground">
              生成内容时是否包含表情符号
            </p>
          </div>
          <Switch
            checked={value.includeEmoji}
            onCheckedChange={(checked) => updateField('includeEmoji', checked)}
          />
        </div>
      </CardContent>
    </Card>
  );
}
