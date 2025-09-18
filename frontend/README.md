# 前端应用

本目录包含所有前端应用的源代码。

## 目录结构

```
frontend/
├── user-app/              # 用户端应用 (uni-app)
│   ├── src/               # 源代码
│   ├── static/            # 静态资源
│   ├── pages.json         # 页面配置
│   ├── manifest.json      # 应用配置
│   └── package.json       # 项目依赖
│
├── merchant-app/          # 商户端应用 (uni-app)
│   ├── src/               # 源代码
│   ├── static/            # 静态资源
│   ├── pages.json         # 页面配置
│   ├── manifest.json      # 应用配置
│   └── package.json       # 项目依赖
│
└── admin-web/             # 管理后台 (Vue3 Web)
    ├── src/               # 源代码
    ├── public/            # 公共资源
    ├── index.html         # HTML模板
    ├── vite.config.ts     # 构建配置
    └── package.json       # 项目依赖
```

## 技术栈

### 用户端应用 (user-app)
- **框架**: uni-app (Vue 3 + TypeScript)
- **状态管理**: Pinia
- **UI库**: uni-ui
- **构建工具**: Vite
- **目标平台**: 微信小程序、H5、App

### 商户端应用 (merchant-app)
- **框架**: uni-app (Vue 3 + TypeScript)
- **状态管理**: Pinia
- **UI库**: uni-ui
- **构建工具**: Vite
- **目标平台**: 微信小程序、H5、App

### 管理后台 (admin-web)
- **框架**: Vue 3 + TypeScript
- **状态管理**: Pinia
- **UI库**: Element Plus
- **路由**: Vue Router
- **构建工具**: Vite
- **目标平台**: Web浏览器

## 开发指南

### 环境要求
- Node.js >= 18
- pnpm >= 8 (推荐)
- HBuilderX (uni-app开发)

### 快速开始

```bash
# 安装依赖
cd frontend/user-app
pnpm install

# 开发模式
pnpm dev

# 构建生产版本
pnpm build
```

### 开发规范
1. 遵循 Vue 3 Composition API 风格
2. 使用 TypeScript 严格模式
3. 遵循 ESLint 和 Prettier 代码规范
4. 组件采用原子设计模式
5. 状态管理使用 Pinia
6. API调用统一使用封装的请求函数

### 目录说明

每个应用的 `src/` 目录结构如下：

```
src/
├── pages/                 # 页面组件
├── components/            # 公共组件
├── store/                 # 状态管理
├── api/                   # API接口
├── utils/                 # 工具函数
├── types/                 # 类型定义
├── styles/                # 样式文件
└── static/                # 静态资源
```

## 部署

每个应用都支持独立部署，具体部署方式请参考各应用目录下的 README.md 文件。
