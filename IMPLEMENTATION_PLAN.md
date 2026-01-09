# ZSXQ Exporter 实现计划

## 项目概述

基于 zsxq-sdk 构建的知识星球内容导出与 AI 分析工具。

## 开发阶段

### 阶段一：项目初始化与基础架构 ✅ 完成

**完成时间**: 2026-01-09

**完成内容**:
- [x] 创建 Next.js 16 项目（使用 webpack 模式）
- [x] 配置 Tailwind CSS + Shadcn/ui（18个组件）
- [x] 集成 zsxq-sdk（本地链接）
- [x] 设置 SQLite 数据库（better-sqlite3）
- [x] 配置 Zustand 状态管理
- [x] 安装 Claude SDK (@anthropic-ai/sdk)
- [x] 创建基础页面结构
  - 首页（Token 输入、星球列表）
  - 导出页面（时间选择、进度显示）
  - 分析页面（占位）
  - 生成页面（占位）
- [x] 实现 API 路由
  - GET /api/groups - 获取星球列表
- [x] 构建验证通过

**关键文件**:
- `src/app/page.tsx` - 首页
- `src/app/export/page.tsx` - 导出页面
- `src/app/api/groups/route.ts` - 星球列表 API
- `src/lib/db/index.ts` - 数据库连接
- `src/lib/db/schema.ts` - 表结构定义
- `src/lib/zsxq/client.ts` - SDK 封装
- `src/store/auth-store.ts` - Token 状态管理
- `src/types/index.ts` - 类型定义

---

### 阶段二：帖子获取与导出功能 ✅ 完成

**完成时间**: 2026-01-09

**完成内容**:
- [x] 实现帖子分页获取 API
  - GET /api/topics - 查询缓存的帖子（支持分页）
  - POST /api/topics - 从 API 获取并缓存帖子
  - 支持 groupId, startDate, endDate, scope 参数
- [x] 帖子数据缓存到 SQLite
  - 自动转换 SDK Topic 为缓存格式
  - 批量插入/更新帖子
- [x] 实现导出任务管理
  - POST /api/export - 创建导出任务
  - GET /api/export - 获取任务状态或历史记录
  - 内存中存储活动任务进度
- [x] 前端进度显示（轮询方式）
  - 实时更新获取进度
  - 显示导出历史记录

**关键文件**:
- `src/lib/export/topic-fetcher.ts` - 帖子获取器
- `src/lib/db/queries.ts` - 数据库查询封装
- `src/app/api/topics/route.ts` - 帖子 API
- `src/app/api/export/route.ts` - 导出 API
- `src/app/export/page.tsx` - 导出页面（已更新）

---

### 阶段三：图片下载与 Markdown 生成 ✅ 完成

**完成时间**: 2026-01-09

**完成内容**:
- [x] 实现 Markdown 转换器
  - 帖子内容转 Markdown（支持精华、置顶标签）
  - 处理图片、文件链接（本地化引用）
  - 生成索引 README.md
- [x] 实现图片下载器
  - 并发下载图片（可配置并发数）
  - 支持重试机制（默认 3 次）
  - 进度回调
- [x] 实现 ZIP 打包
  - 使用 archiver 库，最高压缩级别
  - 包含 posts/ 和 images/ 目录
- [x] 下载接口
  - GET /api/download/:exportId
  - 验证导出状态和文件存在
- [x] 完整导出流程集成
  - 获取帖子 → 下载图片 → 转换 Markdown → 打包 ZIP
  - 临时文件清理
- [x] 前端下载功能
  - 导出历史显示下载按钮
  - 显示更多导出状态

**关键文件**:
- `src/lib/export/markdown-converter.ts` - Markdown 转换器
- `src/lib/export/image-downloader.ts` - 图片下载器
- `src/lib/export/zip-builder.ts` - ZIP 打包器
- `src/app/api/download/[id]/route.ts` - 下载 API
- `src/app/api/export/route.ts` - 完整导出流程
- `src/app/export/page.tsx` - 下载按钮

---

### 阶段四：Claude AI 集成 ✅ 完成

**完成时间**: 2026-01-09

**完成内容**:
- [x] Claude SDK 封装
  - 配置管理（API Key、模型选择）
  - 统一错误处理（401/429/500 等状态码）
  - 流式响应（onToken/onComplete 回调）
  - 便捷方法（ask/askStream）
- [x] 长文本分片处理
  - Token 估算（中文/英文混合）
  - 智能分片（段落/句子/标题边界）
  - 分片重叠保持上下文
  - 帖子格式化工具函数
- [x] 提示词模板
  - 内容分析（复盘/关键词/话题/洞察）
  - 年度/月度/季度总结
  - 风格学习与内容生成
  - 续写/改写功能

**关键文件**:
- `src/lib/ai/client.ts` - Claude SDK 封装
- `src/lib/ai/chunker.ts` - 长文本分片处理
- `src/lib/ai/prompts/analyze.ts` - 内容分析提示词
- `src/lib/ai/prompts/summary.ts` - 总结提示词
- `src/lib/ai/prompts/style-write.ts` - 风格学习提示词
- `src/lib/ai/index.ts` - 模块导出

---

### 阶段五A：AI 分析功能 ✅ 完成

**完成时间**: 2026-01-10

**完成内容**:
- [x] 分析页面完善
  - 内容选择器（星球选择、日期范围、内容范围）
  - 分析类型选择（复盘、关键词、话题、洞察）
  - 流式结果展示（实时输出、复制、下载）
- [x] API 实现
  - POST /api/ai/analyze（流式输出）
  - GET /api/ai/analyze（预览信息）
- [x] 长文本分片处理
  - 自动检测内容长度
  - 分片分析 + 汇总

**关键文件**:
- `src/app/api/ai/analyze/route.ts` - AI 分析 API
- `src/components/analyze/content-selector.tsx` - 内容选择器
- `src/components/analyze/analysis-type-selector.tsx` - 分析类型选择
- `src/components/analyze/analysis-result.tsx` - 结果展示组件
- `src/app/analyze/page.tsx` - 分析页面

---

### 阶段五B：内容生成功能 ✅ 完成

**完成时间**: 2026-01-10

**完成内容**:
- [x] 生成页面完善
  - 生成类型选择（总结、风格创作、续写、改写）
  - 内容来源选择（复用 ContentSelector）
  - 总结配置（年度/月度/季度、写作风格）
  - 创作配置（主题、关键词、长度、语气）
  - 续写/改写配置
- [x] API 实现
  - POST /api/ai/generate（流式输出）
  - GET /api/ai/generate（预览信息）
  - 风格学习 + 内容生成流程
  - 长文本分片处理
- [x] 流式输出展示
  - 实时内容显示
  - 状态提示
  - 复制/下载功能

**关键文件**:
- `src/app/api/ai/generate/route.ts` - 内容生成 API
- `src/components/generate/generate-type-selector.tsx` - 生成类型选择
- `src/components/generate/summary-options.tsx` - 总结配置
- `src/components/generate/content-options.tsx` - 创作配置
- `src/components/generate/rewrite-options.tsx` - 续写/改写配置
- `src/components/generate/generate-result.tsx` - 结果展示
- `src/app/generate/page.tsx` - 生成页面

---

### 阶段六：多 AI 服务支持 ✅ 完成

**完成时间**: 2026-01-10

**完成内容**:
- [x] 统一 AI 客户端接口
  - 支持 Anthropic (Claude) 和 DeepSeek
  - 自动检测可用的 AI 服务
  - 流式响应支持
- [x] 更新分析和生成 API
  - 支持 provider 参数选择 AI 服务
  - 返回使用的提供商和模型信息
- [x] 前端 AI 服务选择器
  - 分析页面可选择 AI 服务
  - 生成页面可选择 AI 服务
  - 显示各服务特点说明

**关键文件**:
- `src/lib/ai/client.ts` - 统一 AI 客户端（支持多提供商）
- `src/components/ai/provider-selector.tsx` - AI 服务选择组件
- `src/app/api/ai/analyze/route.ts` - 分析 API（已更新）
- `src/app/api/ai/generate/route.ts` - 生成 API（已更新）

---

## 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 框架 | Next.js | 16.1.1 |
| UI | Tailwind CSS | 4.x |
| 组件库 | Shadcn/ui | latest |
| 状态 | Zustand | 5.x |
| SDK | zsxq-sdk | 1.0.1 (本地链接) |
| AI | @anthropic-ai/sdk | 0.71.2 |
| AI | openai (DeepSeek) | 6.15.0 |
| 数据库 | better-sqlite3 | 12.5.0 |
| 打包 | archiver | 7.0.1 |

## 环境配置

```bash
# .env.local
ZSXQ_TOKEN=your_token

# AI 服务（至少配置一个）
DEEPSEEK_API_KEY=your_deepseek_key   # 推荐，便宜
ANTHROPIC_API_KEY=your_anthropic_key  # 可选，质量高
```

## 启动命令

```bash
pnpm dev      # 开发模式
pnpm build    # 构建
pnpm start    # 生产模式
```

---

*最后更新: 2026-01-10 - 阶段六完成（多 AI 服务支持）*
