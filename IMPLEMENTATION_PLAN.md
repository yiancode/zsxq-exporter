# ZSXQ Exporter 实现计划

## 项目概述

基于 zsxq-sdk 构建的知识星球内容导出与 AI 分析工具。

## 开发阶段

### 阶段一：项目初始化与基础架构 ✅ 完成

**完成时间**: 2025-01-09

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

**完成时间**: 2025-01-09

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

**完成时间**: 2025-01-09

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

### 阶段四：Claude AI 集成 ⏳ 待开发

**目标**: 封装 Claude API 调用

**待完成**:
- [ ] Claude SDK 封装
  - 配置管理
  - 错误处理
  - 流式响应
- [ ] 长文本分片处理
- [ ] 提示词模板
  - 内容复盘
  - 年度总结
  - 风格分析

**关键文件待创建**:
- `src/lib/ai/client.ts`
- `src/lib/ai/chunker.ts`
- `src/lib/ai/prompts/analyze.ts`
- `src/lib/ai/prompts/summary.ts`
- `src/lib/ai/prompts/style-write.ts`

---

### 阶段五：内容分析与生成功能 ⏳ 待开发

**目标**: 实现完整的 AI 分析和生成功能

**待完成**:
- [ ] 分析页面完善
  - 内容选择器
  - 分析类型选择
  - 结果展示
- [ ] 生成页面完善
  - 参考内容选择
  - 风格学习
  - 新内容生成
- [ ] API 实现
  - POST /api/ai/analyze
  - POST /api/ai/generate
- [ ] 流式输出展示

**关键文件待创建**:
- `src/app/api/ai/analyze/route.ts`
- `src/app/api/ai/generate/route.ts`
- `src/components/analyze/content-selector.tsx`
- `src/components/analyze/analysis-result.tsx`
- `src/components/generate/style-selector.tsx`
- `src/components/generate/content-editor.tsx`

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
| 数据库 | better-sqlite3 | 12.5.0 |
| 打包 | archiver | 7.0.1 |

## 环境配置

```bash
# .env.local
ZSXQ_TOKEN=your_token
ANTHROPIC_API_KEY=your_api_key
```

## 启动命令

```bash
pnpm dev      # 开发模式
pnpm build    # 构建
pnpm start    # 生产模式
```

---

*最后更新: 2025-01-09*
