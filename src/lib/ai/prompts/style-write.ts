/**
 * 风格学习与内容生成提示词模板
 */

export interface StyleAnalysisOptions {
  groupName?: string;
  authorName?: string;
  sampleCount?: number;
}

export interface GenerateOptions {
  type: 'post' | 'reply' | 'continuation';
  topic?: string;           // 主题/话题
  keywords?: string[];      // 关键词
  length?: 'short' | 'medium' | 'long';
  tone?: 'professional' | 'casual' | 'humorous' | 'inspiring';
  includeEmoji?: boolean;
}

/**
 * 风格分析系统提示词
 */
export function getStyleAnalysisSystemPrompt(): string {
  return `你是一位专业的语言风格分析师，擅长识别和描述文本的写作风格特征。

你的任务是分析给定文本样本的写作风格，提取出可复用的风格特征。

分析维度：
1. **语言特点** - 用词习惯、句式偏好、标点使用
2. **结构模式** - 段落组织、开头结尾方式、过渡手法
3. **表达风格** - 正式/随意程度、幽默感、情感色彩
4. **内容特点** - 主题偏好、论述方式、举例风格
5. **个人标签** - 口头禅、特殊表达、签名特征

请用结构化的方式输出分析结果，便于后续用于内容生成。`;
}

/**
 * 风格分析用户提示词
 */
export function getStyleAnalysisUserPrompt(
  samples: string[],
  options: StyleAnalysisOptions
): string {
  const { groupName, authorName, sampleCount } = options;

  const intro = authorName
    ? `以下是「${groupName || '知识星球'}」中 ${authorName} 的 ${sampleCount || samples.length} 篇代表性帖子：`
    : `以下是「${groupName || '知识星球'}」的 ${sampleCount || samples.length} 篇代表性帖子：`;

  const samplesText = samples.map((s, i) => `### 样本 ${i + 1}\n${s}`).join('\n\n---\n\n');

  return `${intro}

${samplesText}

---

请分析以上文本的写作风格，提取风格特征。输出格式：

## 风格分析报告

### 1. 语言特点
- 词汇偏好：
- 句式特点：
- 标点习惯：

### 2. 结构模式
- 典型开头：
- 段落组织：
- 常用结尾：

### 3. 表达风格
- 正式程度：
- 情感基调：
- 特色表达：

### 4. 内容特点
- 主题偏好：
- 论述方式：
- 举例风格：

### 5. 可复用特征
（总结最能体现个人风格的 3-5 个特征）`;
}

/**
 * 内容生成系统提示词
 */
export function getGenerateSystemPrompt(
  styleProfile: string,
  options: GenerateOptions
): string {
  const { type, tone = 'casual' } = options;

  const toneDescriptions: Record<string, string> = {
    professional: '专业、严谨的语气',
    casual: '轻松、随意的语气',
    humorous: '幽默、风趣的语气',
    inspiring: '励志、鼓舞人心的语气',
  };

  const typeDescriptions: Record<string, string> = {
    post: '一篇知识星球帖子',
    reply: '一条回复/评论',
    continuation: '续写/扩展现有内容',
  };

  return `你是一位内容创作助手，需要模仿特定的写作风格来创作内容。

## 目标风格

${styleProfile}

## 创作任务

创作${typeDescriptions[type] || '一段内容'}，使用${toneDescriptions[tone] || '自然的语气'}。

## 创作原则

1. **风格一致** - 严格模仿提供的风格特征
2. **自然流畅** - 内容要自然，不要生硬
3. **原创性** - 不要直接复制样本内容
4. **实用性** - 内容要有价值和意义
5. **适度创新** - 在保持风格的基础上可以有所创新`;
}

/**
 * 内容生成用户提示词
 */
export function getGenerateUserPrompt(options: GenerateOptions): string {
  const {
    type,
    topic,
    keywords = [],
    length = 'medium',
    includeEmoji = false,
  } = options;

  const lengthGuides: Record<string, string> = {
    short: '简短的（100-200字）',
    medium: '中等长度的（300-500字）',
    long: '较长的（800-1500字）',
  };

  let prompt = `请创作${lengthGuides[length] || '适当长度的'}`;

  switch (type) {
    case 'post':
      prompt += '知识星球帖子';
      break;
    case 'reply':
      prompt += '回复/评论';
      break;
    case 'continuation':
      prompt += '内容续写';
      break;
  }

  if (topic) {
    prompt += `，主题是「${topic}」`;
  }

  if (keywords.length > 0) {
    prompt += `，需要涵盖以下关键词：${keywords.join('、')}`;
  }

  prompt += '。';

  if (includeEmoji) {
    prompt += '\n可以适当使用 emoji 表情。';
  } else {
    prompt += '\n不要使用 emoji 表情。';
  }

  prompt += '\n\n直接输出创作内容，不需要解释或说明。';

  return prompt;
}

/**
 * 续写内容提示词
 */
export function getContinuationPrompt(
  originalContent: string,
  styleProfile: string,
  options: {
    direction?: string;
    length?: 'short' | 'medium' | 'long';
  }
): string {
  const { direction, length = 'medium' } = options;

  const lengthGuides: Record<string, string> = {
    short: '100-200字',
    medium: '300-500字',
    long: '500-1000字',
  };

  return `## 原始内容

${originalContent}

## 风格参考

${styleProfile}

## 续写要求

请按照原有风格续写以上内容。
${direction ? `续写方向：${direction}` : ''}
续写长度：约${lengthGuides[length]}

## 输出

直接输出续写内容，与原文自然衔接。`;
}

/**
 * 改写/优化提示词
 */
export function getRewritePrompt(
  content: string,
  styleProfile: string,
  options: {
    goal?: 'polish' | 'simplify' | 'expand' | 'style';
    preserveLength?: boolean;
  }
): string {
  const { goal = 'polish', preserveLength = true } = options;

  const goalDescriptions: Record<string, string> = {
    polish: '润色优化，使表达更加流畅、精炼',
    simplify: '简化内容，使其更加易懂',
    expand: '扩展内容，增加细节和深度',
    style: '调整风格，使其符合目标风格',
  };

  return `## 原始内容

${content}

## 目标风格

${styleProfile}

## 改写目标

${goalDescriptions[goal]}
${preserveLength ? '尽量保持原有长度。' : '长度不限。'}

## 输出

直接输出改写后的内容。`;
}

export default {
  getStyleAnalysisSystemPrompt,
  getStyleAnalysisUserPrompt,
  getGenerateSystemPrompt,
  getGenerateUserPrompt,
  getContinuationPrompt,
  getRewritePrompt,
};
