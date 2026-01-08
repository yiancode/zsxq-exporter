/**
 * 年度/月度总结提示词模板
 */

export interface SummaryOptions {
  type: 'annual' | 'monthly' | 'quarterly' | 'custom';
  year?: number;
  month?: number;
  quarter?: number;
  groupName?: string;
  authorName?: string;
  style?: 'formal' | 'casual' | 'storytelling';
}

/**
 * 获取系统提示词
 */
export function getSummarySystemPrompt(options: SummaryOptions): string {
  const { groupName, authorName, style = 'casual' } = options;

  const styleGuides: Record<string, string> = {
    formal: `
写作风格要求：
- 正式、专业的语言风格
- 结构清晰，逻辑严谨
- 使用书面语，避免口语化表达
- 适当使用数据和引用`,

    casual: `
写作风格要求：
- 轻松、亲切的语言风格
- 像朋友间的分享和交流
- 可以使用一些口语化表达
- 保持真诚和自然`,

    storytelling: `
写作风格要求：
- 叙事性强，娓娓道来
- 注重情感表达和故事性
- 使用生动的细节描写
- 让读者产生共鸣`,
  };

  return `你是一位擅长撰写总结回顾的内容创作者。
你的任务是为「${groupName || '知识星球'}」的${authorName ? `创作者${authorName}` : '用户'}撰写一份总结。

${styleGuides[style] || styleGuides.casual}

写作原则：
1. 基于提供的内容进行总结，不要编造
2. 突出重点和亮点
3. 保持积极正面的基调
4. 使用 Markdown 格式
5. 长度适中，避免过于冗长`;
}

/**
 * 获取时间段描述
 */
function getPeriodDescription(options: SummaryOptions): string {
  const { type, year, month, quarter } = options;

  switch (type) {
    case 'annual':
      return `${year || new Date().getFullYear()} 年度`;
    case 'monthly':
      return `${year || new Date().getFullYear()} 年 ${month || new Date().getMonth() + 1} 月`;
    case 'quarterly':
      return `${year || new Date().getFullYear()} 年第 ${quarter || Math.ceil((new Date().getMonth() + 1) / 3)} 季度`;
    default:
      return '这段时间';
  }
}

/**
 * 获取用户提示词
 */
export function getSummaryUserPrompt(
  content: string,
  options: SummaryOptions,
  stats?: {
    topicCount?: number;
    digestCount?: number;
    imageCount?: number;
  }
): string {
  const { type } = options;
  const period = getPeriodDescription(options);

  const statsText = stats
    ? `\n数据概览：共 ${stats.topicCount || 0} 条帖子${stats.digestCount ? `，其中精华 ${stats.digestCount} 条` : ''}${stats.imageCount ? `，包含 ${stats.imageCount} 张图片` : ''}。\n`
    : '';

  const templates: Record<string, string> = {
    annual: `请为以下 ${period} 的内容撰写一份年度总结。
${statsText}
年度总结应包含：
1. **年度概览** - 这一年的整体回顾
2. **重要里程碑** - 年度最重要的 5-10 个时刻
3. **成长与收获** - 这一年学到的和收获的
4. **精选内容** - 值得再次回顾的内容
5. **数据回顾** - 发布频率、主题分布等
6. **新年展望** - 对下一年的期待

语言要有年度总结的仪式感，让读者感受到这一年的充实和成长。`,

    monthly: `请为以下 ${period} 的内容撰写一份月度小结。
${statsText}
月度小结应包含：
1. **本月概览** - 这个月的主要内容
2. **精选回顾** - 本月最值得回顾的 3-5 条内容
3. **关键词** - 本月的核心主题
4. **小结感想** - 简短的月度感悟

保持简洁，突出重点，像一封给读者的月度信件。`,

    quarterly: `请为以下 ${period} 的内容撰写一份季度报告。
${statsText}
季度报告应包含：
1. **季度概览** - 本季度的整体情况
2. **核心主题** - 本季度关注的重点话题
3. **重要内容** - 本季度最重要的内容回顾
4. **趋势变化** - 与上季度相比的变化
5. **下季度预告** - 接下来的计划和方向`,

    custom: `请为以下 ${period} 的内容撰写一份总结。
${statsText}
总结应涵盖：
1. 内容概览和主要主题
2. 重点内容回顾
3. 值得关注的亮点
4. 简短的感想`,
  };

  return `${templates[type] || templates.custom}

---
以下是 ${period} 的帖子内容：

${content}
---

请根据以上内容撰写总结。`;
}

/**
 * 生成分片总结的汇总提示词
 */
export function getChunkMergePrompt(
  chunkSummaries: string[],
  options: SummaryOptions
): string {
  const period = getPeriodDescription(options);
  const { type } = options;

  const typeNames: Record<string, string> = {
    annual: '年度总结',
    monthly: '月度小结',
    quarterly: '季度报告',
    custom: '总结',
  };

  return `我已经对 ${period} 的内容进行了分段总结，以下是各段落的总结：

${chunkSummaries.map((s, i) => `### 第 ${i + 1} 部分\n${s}`).join('\n\n')}

请将以上分段总结整合为一份完整的${typeNames[type] || '总结'}。

要求：
1. 保持时间顺序的叙事流畅性
2. 整合重复的内容
3. 突出最重要的内容
4. 生成完整、连贯的${typeNames[type] || '总结'}
5. 结尾要有总结性的收束`;
}

export default {
  getSummarySystemPrompt,
  getSummaryUserPrompt,
  getChunkMergePrompt,
};
