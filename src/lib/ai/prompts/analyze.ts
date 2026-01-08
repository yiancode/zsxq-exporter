/**
 * 内容分析提示词模板
 */

export interface AnalyzeOptions {
  type: 'review' | 'keywords' | 'topics' | 'insights';
  period?: string;        // 如 "2024年1月" 或 "2024年"
  groupName?: string;     // 星球名称
  topicCount?: number;    // 帖子数量
}

/**
 * 获取系统提示词
 */
export function getAnalyzeSystemPrompt(options: AnalyzeOptions): string {
  const { type, groupName } = options;

  const basePrompt = `你是一位专业的内容分析师，擅长从大量文字内容中提取关键信息、发现规律和生成洞察。
你的任务是分析知识星球「${groupName || '用户'}」的帖子内容。

分析要求：
1. 保持客观中立，基于内容本身进行分析
2. 输出使用中文，格式清晰易读
3. 使用 Markdown 格式组织内容
4. 避免空泛的描述，给出具体的例子和数据`;

  const typePrompts: Record<string, string> = {
    review: `
重点关注：
- 这段时间的主要活动和成果
- 值得回顾的重要事件
- 取得的进步和成长
- 遇到的挑战和解决方案
- 对未来的启示`,

    keywords: `
重点关注：
- 高频出现的关键词和主题
- 核心概念和术语
- 人物、地点、工具等实体
- 情感倾向和态度词汇`,

    topics: `
重点关注：
- 主要讨论的话题分类
- 各话题的占比和趋势
- 话题之间的关联性
- 新兴话题和淡出话题`,

    insights: `
重点关注：
- 内容中隐含的规律和模式
- 创作者的思维方式和价值观
- 读者可能感兴趣的亮点
- 潜在的改进建议`,
  };

  return basePrompt + (typePrompts[type] || '');
}

/**
 * 获取用户提示词
 */
export function getAnalyzeUserPrompt(
  content: string,
  options: AnalyzeOptions
): string {
  const { type, period, topicCount } = options;

  const intro = period
    ? `以下是 ${period} 期间的 ${topicCount || ''} 条帖子内容：`
    : `以下是 ${topicCount || '一批'} 条帖子内容：`;

  const instructions: Record<string, string> = {
    review: `请对这些内容进行复盘分析，生成一份结构化的复盘报告。

报告应包含：
1. **总体概览** - 这段时间的整体情况
2. **重点回顾** - 最重要的 3-5 个事项
3. **成果与进展** - 取得的成绩
4. **问题与反思** - 遇到的困难和思考
5. **下一步计划** - 基于分析的建议`,

    keywords: `请从这些内容中提取关键词，按重要性排序。

输出格式：
1. **核心关键词**（最重要的 5-10 个）
2. **高频词汇**（出现次数最多的词）
3. **专业术语**（领域相关的专有名词）
4. **关键词云**（用文字描述主题分布）`,

    topics: `请分析这些内容的话题分布和主题趋势。

输出格式：
1. **话题分类** - 将内容归类到不同主题
2. **话题占比** - 各主题的大致比例
3. **热门话题** - 讨论最多的主题
4. **话题演变** - 主题随时间的变化趋势`,

    insights: `请深度分析这些内容，挖掘有价值的洞察。

输出格式：
1. **核心洞察** - 3-5 个最有价值的发现
2. **规律模式** - 内容中的共性和规律
3. **独特观点** - 值得关注的独特视角
4. **行动建议** - 基于分析的具体建议`,
  };

  return `${intro}

---
${content}
---

${instructions[type] || '请分析以上内容。'}`;
}

/**
 * 生成分片分析的汇总提示词
 */
export function getChunkSummaryPrompt(
  chunkAnalyses: string[],
  options: AnalyzeOptions
): string {
  const { type, period } = options;

  return `我已经对 ${period || '一段时间'} 的内容进行了分片分析，以下是各分片的分析结果：

${chunkAnalyses.map((a, i) => `### 分片 ${i + 1} 分析\n${a}`).join('\n\n')}

请综合以上分析结果，生成一份完整的${type === 'review' ? '复盘报告' : type === 'keywords' ? '关键词分析' : type === 'topics' ? '话题分析' : '洞察报告'}。

要求：
1. 整合各分片的共同发现
2. 去除重复内容
3. 补充整体性的分析视角
4. 确保报告完整、连贯`;
}

export default {
  getAnalyzeSystemPrompt,
  getAnalyzeUserPrompt,
  getChunkSummaryPrompt,
};
