# MoonTV 项目上下文

## 项目概览
MoonTV 是一个基于 Next.js 14 构建的开源、跨平台影视聚合播放器。它提供了一个统一的界面，可以从多个资源站搜索和播放内容。

**核心特性：**
*   **多源聚合：** 统一搜索已配置的多个视频资源站。
*   **流畅播放：** 集成 ArtPlayer 和 HLS.js，支持流媒体播放。
*   **数据持久化：** 支持 LocalStorage、Redis 和 Cloudflare D1，用于同步收藏夹和播放记录。
*   **PWA 支持：** 支持渐进式 Web 应用，在移动端提供原生应用般的体验。
*   **响应式 UI：** 基于 Tailwind CSS 设计，完美适配桌面端和移动端。
*   **部署灵活：** 支持 Docker、Vercel 和 Cloudflare Pages 部署。

## 技术栈
*   **框架：** Next.js 14 (App Router)
*   **语言：** TypeScript 4+
*   **样式：** Tailwind CSS 3
*   **状态/存储：**
    *   客户端：LocalStorage
    *   服务端：Redis (通过 `@upstash/redis` 或 `redis`)、Cloudflare D1
*   **视频播放：** ArtPlayer、HLS.js、`@vidstack/react`
*   **图标：** `react-icons`、`@heroicons/react`、`lucide-react`
*   **规范/格式化：** ESLint、Prettier、Husky (Git Hooks)

## 项目结构
```
/
├── config.json          # 主要运行时配置（站点、缓存等）
├── next.config.js       # Next.js 配置（PWA、SVG、图片等）
├── tailwind.config.ts   # Tailwind 配置文件
├── scripts/             # 构建脚本（Manifest 生成、配置转换）
├── public/              # 静态资源文件
└── src/
    ├── app/             # Next.js App Router 页面和 API 路由
    │   ├── api/         # 后端 API 接口（管理、搜索、用户等）
    │   ├── admin/       # 管理员后台
    │   ├── play/        # 视频播放页面
    │   └── ...
    ├── components/      # React 组件（UI、Provider 等）
    ├── lib/             # 工具函数、数据库适配器、类型定义
    │   ├── types.ts     # 核心数据模型（播放记录、收藏等）
    │   ├── db.ts        # 数据库接口抽象层
    │   └── ...
    └── styles/          # 全局样式
```

## 构建与运行
**包管理器：** `pnpm`

*   **安装依赖：**
    ```bash
    pnpm install
    ```

*   **开发服务器：**
    ```bash
    pnpm dev
    ```
    *   运行于 `http://localhost:3000`。
    *   会自动运行 `gen:runtime` 和 `gen:manifest` 预处理脚本。

*   **生产环境构建：**
    ```bash
    pnpm build
    ```

*   **Cloudflare Pages 构建：**
    ```bash
    pnpm pages:build
    ```

*   **代码检查与格式化：**
    ```bash
    pnpm lint        # 运行 ESLint
    pnpm format      # 运行 Prettier
    pnpm typecheck   # 运行 TypeScript 类型检查
    ```

## 开发规范

*   **路径别名：** 使用 `@/*` 引用 `src/*` 下的内容。
*   **配置管理：**
    *   站点特定设置（视频源、缓存）位于 `config.json`。
    *   环境变量（如 `PASSWORD`、`REDIS_URL` 等敏感信息）通过环境变量管理。
    *   运行时配置通过 `src/app/layout.tsx` 注入到 `window.RUNTIME_CONFIG`。
*   **数据库抽象：**
    *   `src/lib/types.ts` 中的 `IStorage` 接口定义了数据访问规范。
    *   针对不同的存储类型（Redis、D1）有相应的具体实现。
*   **样式处理：** 使用 Tailwind CSS 的 Utility-first 模式。通过 `next-themes` 支持深色模式。
*   **提交规范：** 遵循 Conventional Commits 规范（由 `commitlint` 和 `husky` 强制执行）。

## 关键配置文件
*   **`config.json`**: 定义视频源 API (`api_site`)。
*   **`src/lib/types.ts`**: 定义数据模型的 TypeScript 接口。
*   **`src/lib/config.ts`**: 读取和解析配置的助手函数。