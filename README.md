# ZSXQ Exporter

知识星球内容导出与 AI 分析工具。

## 功能特性

- **内容导出**：按时间范围导出星球帖子为 Markdown 文件，包含本地化图片
- **内容分析**：使用 Claude AI 分析内容，生成复盘报告、关键词提取
- **智能生成**：学习历史内容风格，生成年度总结、月度复盘或新帖子

## 技术栈

- **框架**: Next.js 16 (App Router)
- **UI**: Tailwind CSS + Shadcn/ui
- **状态**: Zustand
- **SDK**: zsxq-sdk（本地链接）
- **AI**: Claude API (@anthropic-ai/sdk)
- **数据库**: SQLite (better-sqlite3)

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

复制环境变量示例文件：

```bash
cp .env.local.example .env.local
```

编辑 `.env.local`，填入你的配置：

```bash
# 知识星球 Token（可选，也可以通过 UI 输入）
ZSXQ_TOKEN=your_zsxq_token_here

# Claude API Key（用于 AI 功能）
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

### 3. 获取知识星球 Token

1. 登录 [知识星球网页版](https://wx.zsxq.com)
2. 打开浏览器开发者工具（F12）
3. 切换到 Application / Storage 标签
4. 找到 Cookies 中的 `zsxq_access_token` 值

### 4. 启动开发服务器

```bash
pnpm dev
```

访问 http://localhost:3000

## 项目结构

```
src/
├── app/                    # Next.js App Router
│   ├── page.tsx           # 首页
│   ├── export/            # 导出页面
│   ├── analyze/           # 分析页面
│   ├── generate/          # 生成页面
│   └── api/               # API 路由
├── components/            # UI 组件
│   ├── ui/               # Shadcn/ui 组件
│   └── layout/           # 布局组件
├── lib/                   # 核心库
│   ├── zsxq/             # zsxq-sdk 封装
│   ├── export/           # 导出逻辑
│   ├── ai/               # Claude 集成
│   └── db/               # 数据库
├── store/                 # Zustand 状态
└── types/                 # TypeScript 类型
```

## 开发进度

- [x] 项目初始化
- [x] 基础 UI 框架
- [x] 星球列表获取
- [x] 帖子分页获取
- [x] 帖子数据缓存
- [x] 导出任务管理
- [x] Markdown 转换
- [x] 图片下载
- [x] ZIP 打包
- [ ] AI 分析功能
- [ ] 内容生成功能

## 相关项目

- [zsxq-sdk](https://github.com/yiancode/zsxq-sdk) - 知识星球 TypeScript SDK

## GitHub

https://github.com/yiancode/zsxq-exporter

## License

MIT
