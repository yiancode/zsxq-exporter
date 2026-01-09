'use client';

import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

export type AIProvider = 'anthropic' | 'deepseek';

interface ProviderInfo {
  name: string;
  model: string;
  description: string;
  envKey: string;
}

const PROVIDERS: Record<AIProvider, ProviderInfo> = {
  deepseek: {
    name: 'DeepSeek',
    model: 'deepseek-chat',
    description: '国内服务，速度快，价格便宜',
    envKey: 'DEEPSEEK_API_KEY',
  },
  anthropic: {
    name: 'Claude (Anthropic)',
    model: 'claude-sonnet-4',
    description: '质量高，支持长文本',
    envKey: 'ANTHROPIC_API_KEY',
  },
};

interface ProviderSelectorProps {
  value: AIProvider;
  onChange: (value: AIProvider) => void;
  disabled?: boolean;
}

export function ProviderSelector({
  value,
  onChange,
  disabled,
}: ProviderSelectorProps) {
  const currentProvider = PROVIDERS[value];

  return (
    <div className="space-y-2">
      <Label>AI 服务</Label>
      <Select
        value={value}
        onValueChange={(v) => onChange(v as AIProvider)}
        disabled={disabled}
      >
        <SelectTrigger>
          <SelectValue placeholder="选择 AI 服务" />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(PROVIDERS).map(([key, info]) => (
            <SelectItem key={key} value={key}>
              <div className="flex items-center gap-2">
                <span>{info.name}</span>
                <Badge variant="outline" className="text-xs">
                  {info.model}
                </Badge>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {currentProvider && (
        <p className="text-xs text-muted-foreground">
          {currentProvider.description}
        </p>
      )}
    </div>
  );
}

export { PROVIDERS };
