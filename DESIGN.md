# ZSXQ Exporter 详细设计文档

## 1. 项目概述

### 1.1 项目目标
基于 zsxq-sdk 构建一个 Web 应用，实现：
1. **数据导出**：按时间范围获取星球帖子，转换为 Markdown 文件，包含本地化图片
2. **内容分析**：利用 Claude AI 分析内容，生成复盘、年度总结
3. **风格写作**：学习原有内容风格，生成新内容

### 1.2 核心用户场景
- 星主/嘉宾：导出自己的星球内容，做年度复盘
- 成员：导出关注的精华内容，便于离线阅读
- 内容创作者：分析内容风格，辅助创作新帖

---

## 2. 技术选型

| 层级 | 技术 | 版本 | 理由 |
|------|------|------|------|
| **框架** | Next.js | 15.x | App Router、Server Actions、内置 API Routes |
| **UI** | Tailwind CSS | 3.x | 原子化 CSS，开发效率高 |
| **组件库** | Shadcn/ui | latest | 可定制、无运行时依赖 |
| **状态管理** | Zustand | 5.x | 轻量、TypeScript 友好 |
| **SDK** | zsxq-sdk | workspace | 知识星球 API 封装 |
| **AI** | @anthropic-ai/sdk | latest | Claude API 官方 SDK |
| **数据库** | better-sqlite3 | latest | 轻量嵌入式，无需外部服务 |
| **文件处理** | archiver | latest | ZIP 打包 |
| **图片下载** | axios | latest | HTTP 请求 |

---

## 3. 架构设计

### 3.1 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        Web Browser                           │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐         │
│  │ 首页    │  │ 导出    │  │ 分析    │  │ 生成    │         │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘         │
└───────┼────────────┼────────────┼────────────┼──────────────┘
        │            │            │            │
        ▼            ▼            ▼            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Next.js App Router                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                   Server Actions                      │   │
│  │  - fetchTopics()    - exportMarkdown()               │   │
│  │  - analyzeContent() - generateContent()              │   │
│  └──────────────────────────────────────────────────────┘   │
│                            │                                 │
│  ┌─────────────────────────┼─────────────────────────────┐  │
│  │                    Service Layer                       │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐            │  │
│  │  │ ZsxqSvc  │  │ExportSvc │  │  AISvc   │            │  │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘            │  │
│  └───────┼─────────────┼─────────────┼──────────────────┘  │
│          │             │             │                      │
└──────────┼─────────────┼─────────────┼──────────────────────┘
           │             │             │
           ▼             ▼             ▼
    ┌──────────┐  ┌──────────┐  ┌──────────┐
    │zsxq-sdk  │  │SQLite DB │  │Claude API│
    └──────────┘  └──────────┘  └──────────┘
```

### 3.2 目录结构

```
zsxq-exporter/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── layout.tsx                # 根布局
│   │   ├── page.tsx                  # 首页（星球列表）
│   │   ├── globals.css               # 全局样式
│   │   │
│   │   ├── export/
│   │   │   └── page.tsx              # 导出页面
│   │   │
│   │   ├── analyze/
│   │   │   └── page.tsx              # 分析页面
│   │   │
│   │   ├── generate/
│   │   │   └── page.tsx              # 生成页面
│   │   │
│   │   └── api/
│   │       ├── groups/route.ts       # 获取星球列表
│   │       ├── topics/route.ts       # 获取帖子
│   │       ├── export/route.ts       # 导出接口
│   │       ├── download/[id]/route.ts# 下载文件
│   │       └── ai/
│   │           ├── analyze/route.ts  # AI 分析
│   │           └── generate/route.ts # AI 生成
│   │
│   ├── components/
│   │   ├── ui/                       # Shadcn/ui 组件
│   │   ├── layout/
│   │   │   ├── header.tsx
│   │   │   ├── sidebar.tsx
│   │   │   └── footer.tsx
│   │   ├── groups/
│   │   │   ├── group-list.tsx
│   │   │   └── group-card.tsx
│   │   ├── export/
│   │   │   ├── date-range-picker.tsx
│   │   │   ├── export-options.tsx
│   │   │   └── progress-bar.tsx
│   │   ├── analyze/
│   │   │   ├── content-selector.tsx
│   │   │   └── analysis-result.tsx
│   │   └── generate/
│   │       ├── style-selector.tsx
│   │       └── content-editor.tsx
│   │
│   ├── lib/
│   │   ├── zsxq/
│   │   │   ├── client.ts             # zsxq-sdk 封装
│   │   │   └── types.ts              # 类型扩展
│   │   │
│   │   ├── export/
│   │   │   ├── topic-fetcher.ts      # 分页获取帖子
│   │   │   ├── markdown-converter.ts # Markdown 转换
│   │   │   ├── image-downloader.ts   # 图片下载
│   │   │   └── zip-builder.ts        # ZIP 打包
│   │   │
│   │   ├── ai/
│   │   │   ├── client.ts             # Claude SDK 封装
│   │   │   ├── prompts/
│   │   │   │   ├── analyze.ts        # 分析提示词
│   │   │   │   ├── summary.ts        # 总结提示词
│   │   │   │   └── style-write.ts    # 风格写作提示词
│   │   │   └── chunker.ts            # 长文本分片
│   │   │
│   │   ├── db/
│   │   │   ├── index.ts              # 数据库连接
│   │   │   ├── schema.ts             # 表结构定义
│   │   │   └── queries.ts            # 查询封装
│   │   │
│   │   └── utils/
│   │       ├── date.ts               # 日期处理
│   │       └── file.ts               # 文件操作
│   │
│   ├── hooks/
│   │   ├── use-groups.ts             # 星球列表 hook
│   │   ├── use-export.ts             # 导出流程 hook
│   │   └── use-ai.ts                 # AI 调用 hook
│   │
│   ├── store/
│   │   ├── auth-store.ts             # Token 存储
│   │   ├── export-store.ts           # 导出状态
│   │   └── ai-store.ts               # AI 状态
│   │
│   └── types/
│       ├── index.ts                  # 类型导出
│       ├── topic.ts                  # 帖子相关类型
│       ├── export.ts                 # 导出相关类型
│       └── ai.ts                     # AI 相关类型
│
├── public/
│   └── exports/                      # 导出文件临时存放
│
├── data/
│   └── cache.db                      # SQLite 缓存数据库
│
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.ts
├── components.json                   # Shadcn/ui 配置
├── .env.local.example                # 环境变量示例
├── DESIGN.md                         # 本设计文档
└── README.md
```

---

## 4. 数据模型

### 4.1 SQLite 表结构

```sql
-- 星球缓存
CREATE TABLE groups (
  id INTEGER PRIMARY KEY,
  group_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  owner_name TEXT,
  member_count INTEGER,
  topics_count INTEGER,
  created_at TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 帖子缓存
CREATE TABLE topics (
  id INTEGER PRIMARY KEY,
  topic_id TEXT UNIQUE NOT NULL,
  group_id TEXT NOT NULL,
  type TEXT NOT NULL,  -- talk, task, q&a, solution
  title TEXT,
  content TEXT,
  owner_id TEXT,
  owner_name TEXT,
  images TEXT,  -- JSON array
  files TEXT,   -- JSON array
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  reading_count INTEGER DEFAULT 0,
  digested INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  fetched_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES groups(group_id)
);

-- 导出记录
CREATE TABLE exports (
  id INTEGER PRIMARY KEY,
  export_id TEXT UNIQUE NOT NULL,
  group_id TEXT NOT NULL,
  group_name TEXT,
  start_date TEXT,
  end_date TEXT,
  topic_count INTEGER,
  image_count INTEGER,
  file_path TEXT,
  status TEXT DEFAULT 'pending',  -- pending, processing, completed, failed
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT
);

-- AI 分析记录
CREATE TABLE analyses (
  id INTEGER PRIMARY KEY,
  analysis_id TEXT UNIQUE NOT NULL,
  export_id TEXT,
  type TEXT NOT NULL,  -- review, summary, keywords
  input_summary TEXT,
  result TEXT,
  model TEXT,
  tokens_used INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (export_id) REFERENCES exports(export_id)
);

-- 索引
CREATE INDEX idx_topics_group_id ON topics(group_id);
CREATE INDEX idx_topics_created_at ON topics(created_at);
CREATE INDEX idx_exports_group_id ON exports(group_id);
```

### 4.2 TypeScript 类型定义

```typescript
// src/types/topic.ts
export interface CachedTopic {
  id: number;
  topic_id: string;
  group_id: string;
  type: 'talk' | 'task' | 'q&a' | 'solution';
  title?: string;
  content: string;
  owner_id: string;
  owner_name: string;
  images: string[];  // 图片 URL 列表
  files: FileInfo[];
  likes_count: number;
  comments_count: number;
  reading_count: number;
  digested: boolean;
  created_at: string;  // ISO 8601
  fetched_at: string;
}

export interface FileInfo {
  name: string;
  url: string;
  size: number;
}

// src/types/export.ts
export interface ExportTask {
  export_id: string;
  group_id: string;
  group_name: string;
  start_date: string;
  end_date: string;
  options: ExportOptions;
  status: 'pending' | 'fetching' | 'converting' | 'downloading_images' | 'zipping' | 'completed' | 'failed';
  progress: ExportProgress;
}

export interface ExportOptions {
  scope: 'all' | 'digests' | 'owner';
  include_images: boolean;
  include_comments: boolean;
  markdown_style: 'simple' | 'detailed';
}

export interface ExportProgress {
  total_topics: number;
  fetched_topics: number;
  converted_topics: number;
  downloaded_images: number;
  total_images: number;
  current_step: string;
}

// src/types/ai.ts
export interface AnalysisRequest {
  type: 'review' | 'summary' | 'keywords' | 'style';
  content: string;  // 或帖子 ID 列表
  options?: AnalysisOptions;
}

export interface AnalysisOptions {
  period?: 'week' | 'month' | 'quarter' | 'year';
  focus?: string[];  // 关注的方面
  language?: 'zh' | 'en';
}

export interface GenerateRequest {
  type: 'annual_summary' | 'monthly_review' | 'new_post';
  reference_content: string;
  style_reference?: string;  // 风格参考内容
  topic?: string;  // 主题
  instructions?: string;  // 额外指令
}
```

---

## 5. API 设计

### 5.1 REST API 端点

#### 星球相关
```
GET  /api/groups
     获取已加入的星球列表
     Response: { groups: Group[] }

GET  /api/groups/:groupId
     获取星球详情
     Response: { group: Group, statistics: GroupStats }
```

#### 帖子相关
```
GET  /api/topics
     获取帖子列表（支持分页和筛选）
     Query: groupId, startDate, endDate, scope, page, limit
     Response: { topics: Topic[], total: number, hasMore: boolean }

GET  /api/topics/:topicId
     获取单个帖子详情
     Response: { topic: Topic, comments?: Comment[] }
```

#### 导出相关
```
POST /api/export
     创建导出任务
     Body: { groupId, startDate, endDate, options: ExportOptions }
     Response: { exportId: string, status: 'pending' }

GET  /api/export/:exportId
     获取导出任务状态
     Response: { task: ExportTask }

GET  /api/export/:exportId/stream
     SSE 流式获取导出进度
     Response: Server-Sent Events

GET  /api/download/:exportId
     下载导出的 ZIP 文件
     Response: application/zip
```

#### AI 相关
```
POST /api/ai/analyze
     内容分析
     Body: { type, content, options }
     Response: { analysisId, result: string } (或 SSE 流)

POST /api/ai/generate
     内容生成
     Body: { type, reference_content, style_reference, topic, instructions }
     Response: { content: string } (或 SSE 流)
```

### 5.2 Server Actions（推荐使用）

```typescript
// src/app/actions/export.ts
'use server'

export async function createExportTask(
  groupId: string,
  startDate: string,
  endDate: string,
  options: ExportOptions
): Promise<{ exportId: string }> {
  // 实现导出逻辑
}

export async function getExportProgress(
  exportId: string
): Promise<ExportProgress> {
  // 获取进度
}

// src/app/actions/ai.ts
'use server'

export async function analyzeContent(
  request: AnalysisRequest
): Promise<StreamableValue<string>> {
  // 流式返回分析结果
}

export async function generateContent(
  request: GenerateRequest
): Promise<StreamableValue<string>> {
  // 流式返回生成内容
}
```

---

## 6. 核心流程

### 6.1 导出流程

```
用户选择星球和时间范围
         │
         ▼
┌─────────────────────┐
│ 1. 创建导出任务     │
│    生成 exportId    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 2. 分页获取帖子     │◄─────┐
│    调用 zsxq-sdk    │      │
│    topics.list()    │      │
└──────────┬──────────┘      │
           │                 │
           ▼                 │
     hasMore? ───────────────┘
           │ No
           ▼
┌─────────────────────┐
│ 3. 缓存到 SQLite    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 4. 转换 Markdown    │
│    - 解析内容       │
│    - 提取图片链接   │
│    - 生成 .md 文件  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 5. 下载图片         │
│    - 并发下载       │
│    - 保存到 images/ │
│    - 替换链接       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 6. 打包 ZIP         │
│    - markdown/      │
│    - images/        │
│    - index.md       │
└──────────┬──────────┘
           │
           ▼
    返回下载链接
```

### 6.2 Markdown 转换规则

#### 帖子模板
```markdown
---
title: {{title}}
author: {{owner_name}}
date: {{created_at}}
type: {{type}}
likes: {{likes_count}}
comments: {{comments_count}}
digested: {{digested}}
topic_id: {{topic_id}}
---

# {{title}}

{{content}}

## 图片

{{#each images}}
![图片{{@index}}](./images/{{filename}})
{{/each}}

## 附件

{{#each files}}
- [{{name}}]({{url}})
{{/each}}

---
*导出时间: {{export_time}}*
```

#### 目录结构
```
export-2024-01-01-2024-12-31/
├── index.md              # 目录索引
├── topics/
│   ├── 2024-01/
│   │   ├── 2024-01-05-xxxxx.md
│   │   └── 2024-01-10-yyyyy.md
│   └── 2024-02/
│       └── ...
├── images/
│   ├── topic-xxxxx/
│   │   ├── 1.jpg
│   │   └── 2.png
│   └── topic-yyyyy/
│       └── 1.gif
└── metadata.json         # 导出元数据
```

### 6.3 AI 分析流程

```
用户选择内容范围
         │
         ▼
┌─────────────────────┐
│ 1. 获取内容         │
│    从缓存或导出     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 2. 内容预处理       │
│    - 清理格式       │
│    - 提取关键信息   │
│    - 统计数据       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 3. 长文本分片       │
│    超过 token 限制  │
│    分批处理         │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 4. 调用 Claude API  │
│    使用专用提示词   │
│    流式返回         │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 5. 结果整合         │
│    - 合并分片结果   │
│    - 格式化输出     │
│    - 保存记录       │
└──────────┬──────────┘
           │
           ▼
    展示给用户
```

---

## 7. AI 提示词设计

### 7.1 内容复盘提示词

```typescript
// src/lib/ai/prompts/analyze.ts
export const REVIEW_PROMPT = `
你是一位专业的内容分析师，擅长帮助知识星球创作者做内容复盘。

## 任务
分析以下时间段内的星球帖子内容，生成一份详细的内容复盘报告。

## 输入信息
- 时间范围: {{period}}
- 帖子数量: {{count}}
- 总互动数: {{total_interactions}}

## 帖子内容
{{content}}

## 要求
请从以下维度分析并输出报告：

### 1. 内容概览
- 本期发布的内容主题分布
- 内容类型占比（分享/问答/作业等）
- 发布频率分析

### 2. 热门内容
- 互动最高的 TOP 5 帖子及原因分析
- 精华内容的共同特点

### 3. 内容趋势
- 本期内容与往期的变化
- 成员关注点的转移

### 4. 改进建议
- 内容方向建议
- 互动提升建议
- 运营优化建议

## 输出格式
使用 Markdown 格式，层次清晰，数据支撑观点。
`;
```

### 7.2 年度总结提示词

```typescript
export const ANNUAL_SUMMARY_PROMPT = `
你是一位专业的内容策划师，擅长撰写知识星球年度总结。

## 任务
基于以下一年的星球运营数据和内容，撰写一份精彩的年度总结文章。

## 输入数据
- 年份: {{year}}
- 帖子总数: {{total_topics}}
- 精华数量: {{digest_count}}
- 总互动: {{total_interactions}}
- 活跃成员: {{active_members}}

## 内容摘要
{{content_summary}}

## 写作要求
1. **开篇回顾**: 用一段话总结这一年的整体情况
2. **数据亮点**: 用数据说话，突出关键成绩
3. **精选内容**: 回顾年度最受欢迎的内容
4. **成长故事**: 选取 2-3 个有代表性的成员成长案例
5. **感谢致辞**: 感谢成员的支持与陪伴
6. **展望未来**: 新一年的计划与期待

## 语气风格
- 真诚、温暖、有感染力
- 数据与故事结合
- 保持与星球原有风格一致

## 输出
直接输出完整的年度总结文章，使用 Markdown 格式。
`;
```

### 7.3 风格写作提示词

```typescript
export const STYLE_WRITE_PROMPT = `
你是一位专业的 AI 写作助手，擅长学习和模仿特定的写作风格。

## 任务
学习以下参考内容的写作风格，并按照指定主题创作新内容。

## 参考内容（风格样本）
{{style_samples}}

## 写作风格分析
请先分析参考内容的以下特征：
1. 语言风格（正式/口语化/幽默等）
2. 句式结构（长短句、段落组织）
3. 常用表达（口头禅、惯用语）
4. 内容结构（开头、展开、结尾模式）
5. 情感基调（热情/理性/轻松等）

## 创作要求
- 主题: {{topic}}
- 目标长度: {{target_length}}
- 额外要求: {{instructions}}

## 输出
1. 先简要说明你对风格的理解（2-3句话）
2. 然后输出符合该风格的新内容

请确保新内容：
- 保持原有风格的核心特征
- 内容新颖，不是简单复制
- 符合主题要求
`;
```

---

## 8. 环境变量配置

```bash
# .env.local.example

# 知识星球 Token（从浏览器获取）
ZSXQ_TOKEN=your_zsxq_token_here

# Claude API
ANTHROPIC_API_KEY=your_anthropic_api_key

# 可选：Claude 模型配置
CLAUDE_MODEL=claude-sonnet-4-20250514
CLAUDE_MAX_TOKENS=4096

# 应用配置
NEXT_PUBLIC_APP_NAME=ZSXQ Exporter
EXPORT_DIR=./public/exports
DATA_DIR=./data
```

---

## 9. 安全考虑

### 9.1 Token 安全
- ZSXQ_TOKEN 仅在服务端使用，不暴露给前端
- 支持用户通过 UI 输入 Token（存储在 localStorage，仅用于当前会话）
- Token 不持久化到数据库

### 9.2 API 安全
- 使用 Next.js 中间件限制 API 调用频率
- 导出文件使用随机 ID，防止枚举攻击
- 定期清理过期的导出文件

### 9.3 数据安全
- SQLite 数据库文件权限控制
- 敏感内容不记录日志
- 支持用户删除已导出的数据

---

## 10. 开发计划

### 阶段一：项目初始化（Day 1-2）
- [ ] 初始化 Next.js 项目
- [ ] 配置 TypeScript、ESLint、Prettier
- [ ] 集成 Tailwind CSS 和 Shadcn/ui
- [ ] 设置 SQLite 数据库
- [ ] 创建基础布局组件

### 阶段二：数据获取（Day 3-5）
- [ ] 集成 zsxq-sdk
- [ ] 实现星球列表页面
- [ ] 实现帖子分页获取
- [ ] 实现数据缓存逻辑

### 阶段三：导出功能（Day 6-8）
- [ ] 实现时间范围选择器
- [ ] 实现 Markdown 转换
- [ ] 实现图片下载
- [ ] 实现 ZIP 打包
- [ ] 实现导出进度显示

### 阶段四：AI 集成（Day 9-11）
- [ ] 集成 Claude SDK
- [ ] 实现内容分析功能
- [ ] 实现年度总结生成
- [ ] 实现风格写作功能
- [ ] 实现流式输出

### 阶段五：优化完善（Day 12-14）
- [ ] UI/UX 优化
- [ ] 错误处理完善
- [ ] 性能优化
- [ ] 文档编写
- [ ] 测试覆盖

---

## 11. 参考资源

- [zsxq-sdk 文档](../zsxq-sdk/README.md)
- [Next.js 文档](https://nextjs.org/docs)
- [Shadcn/ui 组件](https://ui.shadcn.com)
- [Claude API 文档](https://docs.anthropic.com)
- [better-sqlite3 文档](https://github.com/WiseLibs/better-sqlite3)

---

*文档版本: 1.0*
*更新时间: 2024-01-09*
