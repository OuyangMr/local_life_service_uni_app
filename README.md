# 本地生活服务应用

一个基于uni-app + Node.js的本地生活服务平台，支持用户预订、扫码点单、商户管理等功能。

## 📁 项目结构

```
local-life-service-app/
├── 📱 frontend/                 # 前端应用
│   ├── user-app/               # 用户端uni-app（微信小程序、H5、App）
│   ├── merchant-app/           # 商户端uni-app（移动管理端）
│   └── admin-web/              # 管理后台（Vue3 Web端）
│
├── ⚡ backend/                  # 后端服务
│   ├── src/                    # 源代码（Node.js + Express + TypeScript）
│   ├── tests/                  # 后端单元测试
│   └── migrations/             # 数据库迁移（MongoDB）
│
├── 🐳 docker/                   # 容器化配置
│   ├── mongodb/                # MongoDB配置
│   ├── redis/                  # Redis配置
│   └── nginx/                  # 反向代理配置
│
├── 📚 docs/                     # 项目文档
│   ├── api/                    # API接口文档
│   ├── design/                 # UI设计和原型
│   ├── spec/                   # 需求规格文档
│   └── steering/               # 项目指导文档
│
├── 🛠️ scripts/                 # 部署运维脚本
│   ├── setup-mongodb.sh       # MongoDB环境搭建
│   ├── deploy.sh               # 自动化部署
│   └── backup.sh               # 数据备份
│
├── 🧪 tests/                    # 端到端测试
│   ├── e2e/                    # 端到端测试
│   ├── integration/            # 集成测试
│   └── performance/            # 性能测试
│
└── 📋 log.md                    # 开发日志
```

## 🚀 快速开始

### 环境要求
- Node.js >= 18
- MongoDB >= 7.0
- Redis >= 7.0

### 后端服务
```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

### 用户端应用
```bash
cd frontend/user-app
npm install
npm run dev:mp-weixin  # 微信小程序
npm run dev:h5         # H5版本
```

### 数据库环境
```bash
# 使用Docker快速启动
./scripts/setup-mongodb.sh
```

## 📖 文档

- [产品指导文档](./docs/steering/product.md) - 产品愿景和业务目标
- [技术指导文档](./docs/steering/tech.md) - 技术架构和开发规范
- [项目结构文档](./docs/steering/structure.md) - 代码组织和目录结构
- [MongoDB使用指南](./docs/mongodb-guide.md) - 数据库部署和使用
- [API文档](./docs/api/) - 接口规范和调用说明

## 💻 技术栈

### 前端
- **uni-app** - 跨平台移动应用框架
- **Vue 3** - 渐进式JavaScript框架
- **TypeScript** - 类型安全的JavaScript
- **Pinia** - Vue状态管理库

### 后端
- **Node.js** - JavaScript运行时
- **Express.js** - Web应用框架
- **TypeScript** - 静态类型检查
- **MongoDB** - NoSQL文档数据库
- **Redis** - 内存数据库
- **Socket.IO** - 实时双向通信

### 基础设施
- **Docker** - 容器化部署
- **Nginx** - 反向代理和负载均衡
- **Jest** - 测试框架
- **Playwright** - 端到端测试

## 🎯 核心功能

- **🏪 商户管理** - 店铺信息、包间管理、营业状态
- **👥 用户系统** - 注册登录、VIP等级、积分体系
- **📅 预订系统** - 包间预订、VIP免押金、核销验证
- **🛒 扫码点单** - 二维码扫描、商品浏览、购物车管理
- **💳 支付集成** - 微信支付、支付宝、积分抵扣
- **📊 数据分析** - 经营数据、用户行为、收入统计
- **🔔 实时通知** - WebSocket推送、订单状态同步

## 🏢 部署

### 开发环境
```bash
# 启动所有服务
docker-compose up -d
npm run dev
```

### 生产环境
```bash
# 自动化部署
./scripts/deploy.sh production
```

## 📝 开发规范

- 遵循[技术指导文档](./docs/steering/tech.md)中的开发原则
- 使用TypeScript严格模式
- 采用原子设计模式组织组件
- 遵循RESTful API设计规范
- 保持测试覆盖率 >= 80%

## 📄 许可证

本项目仅供学习和研究使用。

## 🤝 贡献

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📞 联系

如有问题或建议，请通过以下方式联系：

- 📧 Email: [项目邮箱]
- 💬 Issues: [GitHub Issues]
- 📱 微信: [微信号]

---

⭐ 如果这个项目对你有帮助，请给我们一个star！
