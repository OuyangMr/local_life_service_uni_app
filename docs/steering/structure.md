# 项目结构指导文档 (Project Structure Steering Document)

## 📋 文档概述

**项目名称**: 本地生活服务应用  
**结构版本**: v1.0  
**最后更新**: 2025年9月9日  
**负责人**: 架构团队  

---

## 📂 项目总览 (Project Overview)

### 项目根目录结构

```
local-life-service-app/
├── 📱 frontend/                 # 前端应用 (uni-app)
│   ├── user-app/               # 用户端应用
│   ├── merchant-app/           # 商户端应用
│   └── admin-web/              # 管理后台 (Web)
│
├── ⚡ backend/                  # 后端服务 (Node.js)
│   ├── src/                    # 源代码
│   ├── tests/                  # 测试代码
│   ├── migrations/             # 数据库迁移
│   └── uploads/                # 文件上传目录
│
├── 🐳 docker/                   # 容器化配置
│   ├── mongodb/                # MongoDB配置
│   ├── redis/                  # Redis配置
│   └── nginx/                  # 反向代理配置
│
├── 📚 docs/                     # 项目文档
│   ├── api/                    # API文档
│   ├── design/                 # 设计文档
│   ├── spec/                   # 需求规格
│   └── steering/               # 指导文档
│
├── 🛠️ scripts/                 # 部署脚本
│   ├── setup-mongodb.sh       # 数据库安装
│   ├── deploy.sh               # 部署脚本
│   └── backup.sh               # 备份脚本
│
├── 🧪 tests/                    # 端到端测试
│   ├── e2e/                    # 端到端测试
│   ├── integration/            # 集成测试
│   └── performance/            # 性能测试
│
├── 📋 log.md                    # 开发日志
├── 📝 README.md                # 项目说明
└── ⚙️ .env.example             # 环境变量模板
```

### 技术栈组织

```
技术架构分层
├── 📱 表现层 (Presentation)
│   ├── uni-app (Vue3 + TypeScript)
│   ├── 用户端 + 商户端 + 管理端
│   └── 响应式设计 + PWA
│
├── 🚪 接口层 (API Gateway)
│   ├── Express.js RESTful API
│   ├── Socket.IO WebSocket
│   └── 中间件栈 (认证/限流/验证)
│
├── 🎯 业务层 (Business Logic)
│   ├── 控制器 (Controllers)
│   ├── 服务 (Services)
│   └── 业务规则引擎
│
├── 🗄️ 数据层 (Data Access)
│   ├── MongoDB + Mongoose
│   ├── Redis 缓存
│   └── 文件存储系统
│
└── 🏗️ 基础设施 (Infrastructure)
    ├── Docker 容器化
    ├── 监控日志系统
    └── CI/CD 流水线
```

---

## 🎯 后端架构 (Backend Architecture)

### 目录结构详解

```
backend/
├── 📁 src/                     # 源代码目录
│   ├── 🎮 controllers/         # 控制器层
│   │   ├── AuthController.ts   # 认证控制器
│   │   ├── UserController.ts   # 用户管理
│   │   ├── StoreController.ts  # 店铺管理
│   │   ├── OrderController.ts  # 订单管理
│   │   ├── BookingController.ts # 预订管理
│   │   ├── DishController.ts   # 菜品管理
│   │   ├── PaymentController.ts # 支付管理
│   │   ├── PointController.ts  # 积分管理
│   │   ├── NotificationController.ts # 通知管理
│   │   └── UploadController.ts # 文件上传
│   │
│   ├── 🛣️ routes/              # 路由定义
│   │   ├── auth.ts             # 认证路由
│   │   ├── store.ts            # 店铺路由
│   │   ├── order.ts            # 订单路由
│   │   ├── booking.ts          # 预订路由
│   │   ├── dish.ts             # 菜品路由
│   │   ├── payment.ts          # 支付路由
│   │   ├── point.ts            # 积分路由
│   │   ├── notification.ts     # 通知路由
│   │   └── upload.ts           # 上传路由
│   │
│   ├── 🗃️ models/              # 数据模型
│   │   ├── User.ts             # 用户模型
│   │   ├── Store.ts            # 店铺模型
│   │   ├── Room.ts             # 包间模型
│   │   ├── Order.ts            # 订单模型
│   │   ├── Dish.ts             # 菜品模型
│   │   ├── Review.ts           # 评价模型
│   │   └── PointRecord.ts      # 积分记录
│   │
│   ├── 🔧 services/            # 业务服务
│   │   ├── AuthService.ts      # 认证服务
│   │   ├── PaymentService.ts   # 支付服务
│   │   ├── NotificationService.ts # 通知服务
│   │   ├── FileService.ts      # 文件服务
│   │   └── AnalyticsService.ts # 数据分析
│   │
│   ├── ⚙️ middleware/          # 中间件
│   │   ├── auth.ts             # 认证中间件
│   │   ├── validation.ts       # 数据验证
│   │   ├── rateLimiter.ts      # 限流中间件
│   │   ├── errorHandler.ts     # 错误处理
│   │   └── logger.ts           # 日志中间件
│   │
│   ├── 🔧 config/              # 配置文件
│   │   ├── app.ts              # 应用配置
│   │   ├── database.ts         # 数据库配置
│   │   └── redis.ts            # Redis配置
│   │
│   ├── 🔌 websocket/           # WebSocket服务
│   │   ├── server.ts           # WebSocket服务器
│   │   ├── events.ts           # 事件定义
│   │   └── handlers.ts         # 消息处理
│   │
│   ├── 🛠️ utils/               # 工具函数
│   │   ├── logger.ts           # 日志工具
│   │   ├── crypto.ts           # 加密工具
│   │   ├── validate.ts         # 验证工具
│   │   └── helpers.ts          # 帮助函数
│   │
│   ├── 📝 types/               # TypeScript类型
│   │   ├── index.ts            # 通用类型
│   │   ├── auth.ts             # 认证类型
│   │   ├── user.ts             # 用户类型
│   │   ├── store.ts            # 店铺类型
│   │   ├── order.ts            # 订单类型
│   │   └── payment.ts          # 支付类型
│   │
│   └── 🚀 index.ts             # 应用入口
│
├── 🧪 tests/                   # 测试目录
│   ├── unit/                   # 单元测试
│   ├── integration/            # 集成测试
│   └── fixtures/               # 测试数据
│
├── 🗂️ migrations/              # 数据库迁移
│   ├── 001_initial_database_setup.js
│   ├── 002_add_missing_models.js
│   ├── migration-runner.js
│   └── README.md
│
├── 📁 uploads/                 # 文件上传
│   ├── avatar/                 # 头像文件
│   ├── store/                  # 店铺图片
│   ├── dish/                   # 菜品图片
│   └── review/                 # 评价图片
│
├── 📜 logs/                    # 日志文件
│   ├── app.log                 # 应用日志
│   ├── error.log               # 错误日志
│   └── access.log              # 访问日志
│
├── 📦 package.json             # 项目依赖
├── 🔧 tsconfig.json            # TypeScript配置
├── 🎯 jest.config.js           # 测试配置
├── 📋 .eslintrc.js             # 代码规范
├── 🌍 .env.example             # 环境变量
└── 📖 README.md                # 项目说明
```

### 模块架构设计

#### 1. 分层架构
```typescript
// 四层架构模式
interface LayeredArchitecture {
  presentation: {
    description: '表现层 - 处理HTTP请求响应';
    components: ['Controllers', 'Routes', 'Middleware'];
    responsibilities: ['请求验证', '数据转换', '错误处理'];
  };
  
  business: {
    description: '业务层 - 核心业务逻辑';
    components: ['Services', 'Business Rules', 'Domain Logic'];
    responsibilities: ['业务规则', '数据处理', '逻辑计算'];
  };
  
  persistence: {
    description: '持久层 - 数据访问';
    components: ['Models', 'Repositories', 'Data Access'];
    responsibilities: ['数据查询', '数据存储', '缓存管理'];
  };
  
  infrastructure: {
    description: '基础设施层 - 技术支撑';
    components: ['Database', 'Cache', 'External APIs'];
    responsibilities: ['数据库连接', '第三方集成', '系统配置'];
  };
}
```

#### 2. 依赖关系
```typescript
// 依赖注入模式
class OrderController {
  constructor(
    private orderService: OrderService,
    private paymentService: PaymentService,
    private notificationService: NotificationService
  ) {}
}

class OrderService {
  constructor(
    private orderRepository: OrderRepository,
    private userRepository: UserRepository,
    private storeRepository: StoreRepository
  ) {}
}

// 依赖关系图
/*
Controllers
    ↓
Services  ←→  Services
    ↓
Models/Repositories
    ↓
Database/Cache
*/
```

### 核心模块说明

#### 1. 认证授权模块 (Auth)
```typescript
// 认证授权架构
interface AuthModule {
  controllers: {
    AuthController: '登录注册、密码重置';
  };
  
  services: {
    AuthService: 'JWT生成验证、权限检查';
    UserService: '用户信息管理';
  };
  
  middleware: {
    authenticate: '请求认证中间件';
    authorize: '权限控制中间件';
  };
  
  models: {
    User: '用户数据模型';
    Session: '会话数据模型';
  };
}

// 文件组织
auth/
├── AuthController.ts      # 认证控制器
├── AuthService.ts         # 认证服务
├── auth.middleware.ts     # 认证中间件
├── auth.routes.ts         # 认证路由
├── auth.types.ts          # 认证类型
└── auth.validation.ts     # 认证验证
```

#### 2. 预订管理模块 (Booking)
```typescript
// 预订模块架构
interface BookingModule {
  controllers: {
    BookingController: '预订CRUD、核销验证';
  };
  
  services: {
    BookingService: '预订业务逻辑';
    AvailabilityService: '可用性检查';
    VipService: 'VIP权益处理';
  };
  
  models: {
    Order: '订单模型';
    Room: '包间模型';
    Store: '店铺模型';
  };
  
  utils: {
    TimeSlotHelper: '时间段处理';
    PricingCalculator: '价格计算';
  };
}

// 业务流程
/*
用户发起预订
    ↓
检查登录状态
    ↓
验证店铺和包间
    ↓
检查时间可用性
    ↓
计算价格(VIP优惠)
    ↓
创建订单
    ↓
返回预订结果
*/
```

#### 3. 支付集成模块 (Payment)
```typescript
// 支付模块架构
interface PaymentModule {
  controllers: {
    PaymentController: '支付创建、回调处理、退款';
  };
  
  services: {
    PaymentService: '支付业务逻辑';
    WechatPayService: '微信支付集成';
    AlipayService: '支付宝集成';
    BalanceService: '余额支付';
  };
  
  processors: {
    PaymentProcessor: '支付处理器基类';
    WechatProcessor: '微信支付处理器';
    AlipayProcessor: '支付宝处理器';
  };
  
  validators: {
    PaymentValidator: '支付数据验证';
    SignatureValidator: '签名验证';
  };
}

// 支付流程
/*
创建支付订单
    ↓
选择支付方式
    ↓
调用对应支付处理器
    ↓
生成支付参数
    ↓
等待支付回调
    ↓
验证回调签名
    ↓
更新订单状态
    ↓
发送通知
*/
```

#### 4. 实时通信模块 (WebSocket)
```typescript
// WebSocket模块架构
interface WebSocketModule {
  server: {
    WebSocketServer: 'WebSocket服务器';
    ConnectionManager: '连接管理器';
  };
  
  handlers: {
    UserEventHandler: '用户事件处理';
    MerchantEventHandler: '商户事件处理';
    OrderEventHandler: '订单事件处理';
  };
  
  services: {
    NotificationService: '通知服务';
    BroadcastService: '广播服务';
  };
  
  types: {
    MessageType: '消息类型定义';
    EventData: '事件数据定义';
  };
}

// 实时通信流程
/*
客户端连接
    ↓
身份认证
    ↓
加入对应房间
    ↓
监听事件
    ↓
处理消息
    ↓
广播通知
    ↓
断开连接
*/
```

---

## 📱 前端架构 (Frontend Architecture)

### 总体结构

```
frontend/
├── 📱 user-app/                # 用户端应用
│   ├── src/
│   │   ├── pages/              # 页面组件
│   │   ├── components/         # 公共组件
│   │   ├── store/              # 状态管理
│   │   ├── api/                # API接口
│   │   ├── utils/              # 工具函数
│   │   └── types/              # 类型定义
│   │
│   ├── static/                 # 静态资源
│   ├── unpackage/              # 编译输出
│   ├── manifest.json           # 应用配置
│   ├── pages.json              # 页面配置
│   └── package.json            # 项目依赖
│
├── 🏪 merchant-app/            # 商户端应用
│   ├── src/
│   │   ├── pages/              # 页面组件
│   │   ├── components/         # 公共组件
│   │   ├── store/              # 状态管理
│   │   └── ...                 # 其他目录结构同用户端
│   │
│   └── ...                     # 配置文件同用户端
│
└── 🌐 admin-web/               # 管理后台 (Web)
    ├── src/
    │   ├── views/              # 页面视图
    │   ├── components/         # 公共组件
    │   ├── router/             # 路由配置
    │   ├── store/              # 状态管理
    │   └── api/                # API接口
    │
    ├── public/                 # 公共资源
    ├── dist/                   # 构建输出
    └── package.json            # 项目依赖
```

### uni-app 应用结构

#### 1. 用户端应用结构
```
user-app/src/
├── 📄 pages/                   # 页面目录
│   ├── index/                  # 首页
│   │   ├── index.vue
│   │   └── index.scss
│   │
│   ├── search/                 # 搜索页
│   │   ├── search.vue
│   │   └── components/
│   │       ├── SearchBar.vue
│   │       └── FilterPanel.vue
│   │
│   ├── store/                  # 店铺相关
│   │   ├── detail.vue          # 店铺详情
│   │   ├── list.vue            # 店铺列表
│   │   └── booking.vue         # 预订页面
│   │
│   ├── order/                  # 订单相关
│   │   ├── list.vue            # 订单列表
│   │   ├── detail.vue          # 订单详情
│   │   └── payment.vue         # 支付页面
│   │
│   ├── user/                   # 用户相关
│   │   ├── profile.vue         # 个人资料
│   │   ├── settings.vue        # 设置页面
│   │   └── vip.vue             # VIP中心
│   │
│   └── scan/                   # 扫码功能
│       ├── scanner.vue         # 扫码页面
│       └── menu.vue            # 扫码点单
│
├── 🧩 components/              # 公共组件
│   ├── common/                 # 通用组件
│   │   ├── NavBar.vue          # 导航栏
│   │   ├── TabBar.vue          # 底部标签
│   │   ├── Loading.vue         # 加载组件
│   │   └── Empty.vue           # 空状态
│   │
│   ├── business/               # 业务组件
│   │   ├── StoreCard.vue       # 店铺卡片
│   │   ├── OrderItem.vue       # 订单项
│   │   ├── RoomCard.vue        # 包间卡片
│   │   └── PaymentPanel.vue    # 支付面板
│   │
│   └── form/                   # 表单组件
│       ├── FormInput.vue       # 输入框
│       ├── FormPicker.vue      # 选择器
│       └── FormUpload.vue      # 文件上传
│
├── 🗄️ store/                   # 状态管理
│   ├── index.ts                # 主store
│   ├── modules/
│   │   ├── user.ts             # 用户状态
│   │   ├── store.ts            # 店铺状态
│   │   ├── order.ts            # 订单状态
│   │   └── cart.ts             # 购物车状态
│   │
│   └── types.ts                # 状态类型
│
├── 🔌 api/                     # API接口
│   ├── request.ts              # 请求封装
│   ├── auth.ts                 # 认证接口
│   ├── store.ts                # 店铺接口
│   ├── order.ts                # 订单接口
│   └── payment.ts              # 支付接口
│
├── 🛠️ utils/                   # 工具函数
│   ├── index.ts                # 通用工具
│   ├── auth.ts                 # 认证工具
│   ├── storage.ts              # 存储工具
│   ├── format.ts               # 格式化工具
│   └── validate.ts             # 验证工具
│
├── 📝 types/                   # 类型定义
│   ├── api.ts                  # API类型
│   ├── store.ts                # 店铺类型
│   ├── order.ts                # 订单类型
│   └── user.ts                 # 用户类型
│
├── 🎨 styles/                  # 样式文件
│   ├── common.scss             # 通用样式
│   ├── variables.scss          # 样式变量
│   └── mixins.scss             # 样式混入
│
└── 📁 static/                  # 静态资源
    ├── images/                 # 图片资源
    ├── icons/                  # 图标资源
    └── fonts/                  # 字体资源
```

#### 2. 状态管理架构
```typescript
// Pinia状态管理结构
interface StoreStructure {
  user: {
    state: 'userInfo, token, vipLevel';
    actions: 'login, logout, updateProfile';
    getters: 'isLogin, isVip, vipBenefits';
  };
  
  store: {
    state: 'storeList, currentStore, categories';
    actions: 'fetchStores, searchStores';
    getters: 'nearbyStores, filteredStores';
  };
  
  order: {
    state: 'orderList, currentOrder, cart';
    actions: 'createOrder, payOrder, cancelOrder';
    getters: 'pendingOrders, completedOrders';
  };
  
  global: {
    state: 'loading, toast, modal';
    actions: 'showLoading, showToast, showModal';
    getters: 'isLoading';
  };
}

// 状态持久化
const userStore = defineStore('user', {
  state: () => ({
    userInfo: null as UserInfo | null,
    token: uni.getStorageSync('token') || '',
    vipLevel: 0
  }),
  
  actions: {
    async login(credentials: LoginCredentials) {
      const { data } = await authApi.login(credentials);
      this.userInfo = data.user;
      this.token = data.token;
      uni.setStorageSync('token', data.token);
    }
  },
  
  persist: {
    storage: {
      getItem: uni.getStorageSync,
      setItem: uni.setStorageSync
    }
  }
});
```

#### 3. 组件设计原则
```typescript
// 组件分类
interface ComponentTypes {
  atoms: {
    description: '原子组件 - 最小不可分割';
    examples: ['Button', 'Input', 'Icon', 'Text'];
    principles: ['单一职责', '高度复用', '无业务逻辑'];
  };
  
  molecules: {
    description: '分子组件 - 原子组件组合';
    examples: ['SearchBar', 'FormItem', 'Card'];
    principles: ['功能完整', '可配置', '业务无关'];
  };
  
  organisms: {
    description: '有机体组件 - 完整功能模块';
    examples: ['StoreList', 'OrderForm', 'PaymentPanel'];
    principles: ['业务相关', '功能完整', '可独立使用'];
  };
  
  templates: {
    description: '模板组件 - 页面布局结构';
    examples: ['ListTemplate', 'DetailTemplate'];
    principles: ['定义布局', '不含数据', '可复用结构'];
  };
  
  pages: {
    description: '页面组件 - 完整页面';
    examples: ['HomePage', 'StoreDetail', 'OrderList'];
    principles: ['完整功能', '数据获取', '路由入口'];
  };
}

// 组件设计示例
// 原子组件
<template>
  <button 
    :class="buttonClass" 
    :disabled="disabled"
    @click="handleClick"
  >
    <slot />
  </button>
</template>

// 分子组件
<template>
  <view class="search-bar">
    <Input 
      v-model="keyword" 
      placeholder="搜索店铺、美食"
      @confirm="handleSearch"
    />
    <Button @click="handleSearch">搜索</Button>
  </view>
</template>

// 有机体组件
<template>
  <view class="store-list">
    <SearchBar @search="handleSearch" />
    <StoreCard 
      v-for="store in stores" 
      :key="store.id"
      :store="store"
      @click="navigateToDetail"
    />
  </view>
</template>
```

---

## 🗄️ 数据架构 (Data Architecture)

### 数据模型设计

#### 1. 核心实体关系图
```
用户 (User)
    ├── 一对多 → 订单 (Order)
    ├── 一对多 → 积分记录 (PointRecord)
    ├── 一对多 → 评价 (Review)
    └── 多对多 → 店铺 (收藏关系)

店铺 (Store)
    ├── 一对多 → 包间 (Room)
    ├── 一对多 → 菜品 (Dish)
    ├── 一对多 → 订单 (Order)
    └── 一对多 → 评价 (Review)

订单 (Order)
    ├── 多对一 → 用户 (User)
    ├── 多对一 → 店铺 (Store)
    ├── 多对一 → 包间 (Room)
    └── 一对多 → 订单项 (OrderItem)

包间 (Room)
    ├── 多对一 → 店铺 (Store)
    └── 一对多 → 订单 (Order)

菜品 (Dish)
    ├── 多对一 → 店铺 (Store)
    └── 一对多 → 订单项 (OrderItem)
```

#### 2. 数据模型文件组织
```typescript
// models/index.ts - 模型导出
export { User, IUser, IUserModel } from './User';
export { Store, IStore, IStoreModel } from './Store';
export { Order, IOrder, IOrderModel } from './Order';
export { Room, IRoom, IRoomModel } from './Room';
export { Dish, IDish, IDishModel } from './Dish';
export { Review, IReview, IReviewModel } from './Review';
export { PointRecord, IPointRecord, IPointRecordModel } from './PointRecord';

// 模型设计模式
interface ModelStructure {
  interface: 'I[ModelName] - 文档接口定义';
  model: 'I[ModelName]Model - 模型静态方法';
  schema: '[ModelName]Schema - Mongoose Schema';
  class: '[ModelName] - 导出的模型类';
}

// User模型示例
interface IUser extends Document {
  // 实例属性
  phone: string;
  name: string;
  vipLevel: number;
  
  // 实例方法
  checkPassword(password: string): Promise<boolean>;
  upgradeVip(): Promise<void>;
}

interface IUserModel extends Model<IUser> {
  // 静态方法
  findByPhone(phone: string): Promise<IUser | null>;
  getVipUsers(): Promise<IUser[]>;
}

const UserSchema = new Schema<IUser, IUserModel>({
  phone: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  vipLevel: { type: Number, default: 0 }
});

// 实例方法
UserSchema.methods.checkPassword = function(password: string) {
  return bcrypt.compare(password, this.password);
};

// 静态方法
UserSchema.statics.findByPhone = function(phone: string) {
  return this.findOne({ phone });
};

export const User = model<IUser, IUserModel>('User', UserSchema);
```

### 数据库设计原则

#### 1. MongoDB 集合设计
```javascript
// 集合设计原则
const CollectionDesign = {
  // 嵌入 vs 引用
  embedded: {
    use_when: [
      '数据较小且不经常变化',
      '一对一或一对少量关系',
      '需要原子性操作'
    ],
    examples: [
      '用户地址信息',
      '订单商品项',
      '店铺营业时间'
    ]
  },
  
  referenced: {
    use_when: [
      '数据较大或经常变化',
      '一对多或多对多关系',
      '需要独立查询'
    ],
    examples: [
      '用户订单关系',
      '店铺包间关系',
      '商品分类关系'
    ]
  }
};

// 实际设计示例
// 嵌入设计 - 订单包含商品项
{
  _id: ObjectId,
  userId: ObjectId,
  storeId: ObjectId,
  items: [                    // 嵌入设计
    {
      dishId: ObjectId,
      name: "宫保鸡丁",
      price: 28,
      quantity: 2,
      subtotal: 56
    }
  ],
  totalAmount: 156,
  status: "paid"
}

// 引用设计 - 用户和订单分离
// Users Collection
{
  _id: ObjectId,
  phone: "13800138000",
  name: "张三",
  vipLevel: 1
}

// Orders Collection
{
  _id: ObjectId,
  userId: ObjectId,          // 引用设计
  storeId: ObjectId,
  totalAmount: 156
}
```

#### 2. 索引策略
```javascript
// 索引设计规范
const IndexStrategy = {
  // 查询频率决定索引优先级
  high_frequency: [
    '用户手机号查询',
    '店铺地理位置查询',
    '订单状态查询',
    '包间可用性查询'
  ],
  
  // 复合索引顺序
  compound_rules: [
    '查询频率高的字段在前',
    '选择性高的字段在前',
    '排序字段在最后'
  ],
  
  // 索引创建
  indexes: {
    users: [
      { phone: 1 },                              // 唯一索引
      { vipLevel: 1, status: 1 },                // 复合索引
      { location: '2dsphere' }                   // 地理位置索引
    ],
    stores: [
      { location: '2dsphere' },                  // 地理位置索引
      { category: 1, isActive: 1, rating: -1 }, // 复合查询索引
      { name: 'text', description: 'text' }      // 全文搜索索引
    ],
    orders: [
      { userId: 1, status: 1, createdAt: -1 },  // 用户订单查询
      { storeId: 1, startTime: 1 },              // 店铺预订查询
      { orderNumber: 1 }                         // 订单号查询
    ]
  }
};
```

### 缓存架构设计

#### 1. 缓存层次结构
```typescript
// 多级缓存策略
interface CacheArchitecture {
  l1_memory: {
    description: '应用内存缓存';
    use_cases: ['热点数据', '计算结果', '会话数据'];
    ttl: '5-30分钟';
    size_limit: '100MB';
  };
  
  l2_redis: {
    description: '分布式缓存';
    use_cases: ['用户会话', '限流计数', '临时数据'];
    ttl: '1小时-1天';
    size_limit: '1GB';
  };
  
  l3_cdn: {
    description: '边缘缓存';
    use_cases: ['静态资源', '图片文件', 'API响应'];
    ttl: '1天-1周';
    size_limit: '10GB+';
  };
}

// 缓存键命名规范
const CacheKeyPattern = {
  user: 'user:{id}',
  user_orders: 'user:{id}:orders',
  store_detail: 'store:{id}',
  store_rooms: 'store:{id}:rooms',
  hot_stores: 'hot:stores:{city}',
  rate_limit: 'rate:{ip}:{endpoint}',
  session: 'session:{token}'
};

// 缓存失效策略
class CacheInvalidation {
  // 用户信息更新时
  async invalidateUser(userId: string) {
    await Promise.all([
      this.cache.del(`user:${userId}`),
      this.cache.del(`user:${userId}:orders`),
      this.cache.del(`user:${userId}:profile`)
    ]);
  }
  
  // 店铺信息更新时
  async invalidateStore(storeId: string) {
    await Promise.all([
      this.cache.del(`store:${storeId}`),
      this.cache.del(`store:${storeId}:rooms`),
      this.cache.del(`store:${storeId}:menu`),
      this.cache.delPattern(`hot:stores:*`) // 清除热门店铺缓存
    ]);
  }
}
```

---

## 🔧 配置管理 (Configuration Management)

### 环境配置

#### 1. 环境分离
```typescript
// 环境配置结构
interface EnvironmentConfig {
  development: {
    database: 'local MongoDB';
    redis: 'local Redis';
    logging: 'debug level';
    features: 'all features enabled';
  };
  
  staging: {
    database: 'staging MongoDB cluster';
    redis: 'staging Redis cluster';
    logging: 'info level';
    features: 'production features only';
  };
  
  production: {
    database: 'production MongoDB cluster';
    redis: 'production Redis cluster';
    logging: 'warn level';
    features: 'stable features only';
  };
}

// 配置文件组织
config/
├── app.ts                    # 应用主配置
├── database.ts               # 数据库配置
├── redis.ts                  # Redis配置
├── auth.ts                   # 认证配置
├── payment.ts                # 支付配置
├── upload.ts                 # 上传配置
└── environments/
    ├── development.ts        # 开发环境
    ├── staging.ts            # 测试环境
    └── production.ts         # 生产环境
```

#### 2. 配置加载机制
```typescript
// 配置加载器
class ConfigLoader {
  private static instance: ConfigLoader;
  private config: AppConfig;
  
  constructor() {
    this.loadConfig();
  }
  
  private loadConfig() {
    const env = process.env.NODE_ENV || 'development';
    const baseConfig = require('./base');
    const envConfig = require(`./environments/${env}`);
    
    this.config = {
      ...baseConfig,
      ...envConfig,
      env
    };
    
    this.validateConfig();
  }
  
  private validateConfig() {
    const required = [
      'JWT_SECRET',
      'MONGODB_URI',
      'REDIS_URL'
    ];
    
    required.forEach(key => {
      if (!process.env[key]) {
        throw new Error(`Missing required environment variable: ${key}`);
      }
    });
  }
  
  get<T>(key: string): T {
    return this.config[key];
  }
}

// 使用示例
const config = ConfigLoader.getInstance();
const jwtSecret = config.get<string>('JWT_SECRET');
const dbConfig = config.get<DatabaseConfig>('database');
```

### 安全配置

#### 1. 密钥管理
```typescript
// 密钥配置
interface SecurityConfig {
  jwt: {
    secret: 'JWT签名密钥';
    refreshSecret: 'Refresh Token密钥';
    expiresIn: 'Token过期时间';
  };
  
  encryption: {
    algorithm: 'AES-256-GCM';
    key: '数据加密密钥';
    iv: '初始化向量';
  };
  
  password: {
    saltRounds: 'bcrypt盐轮数';
    minLength: '最小密码长度';
    complexity: '密码复杂度要求';
  };
}

// 环境变量示例
const securityEnv = {
  JWT_SECRET: 'your-super-secret-jwt-key-min-32-chars',
  JWT_REFRESH_SECRET: 'your-refresh-secret-key-min-32-chars',
  ENCRYPT_KEY: 'your-encryption-key-for-sensitive-data',
  BCRYPT_ROUNDS: '12',
  SESSION_SECRET: 'your-session-secret-change-in-production'
};
```

#### 2. 第三方服务配置
```typescript
// 第三方服务配置
interface ThirdPartyConfig {
  wechat: {
    appId: '微信小程序AppID';
    appSecret: '微信小程序AppSecret';
    mchId: '微信商户号';
    apiKey: '微信API密钥';
  };
  
  alipay: {
    appId: '支付宝应用ID';
    privateKey: '应用私钥';
    publicKey: '支付宝公钥';
    gateway: '支付宝网关';
  };
  
  sms: {
    provider: '短信服务商';
    accessKeyId: '访问密钥ID';
    accessKeySecret: '访问密钥Secret';
    signName: '短信签名';
  };
}
```

---

## 📋 开发规范 (Development Standards)

### 代码组织规范

#### 1. 文件命名规范
```typescript
// 文件命名约定
interface NamingConvention {
  files: {
    components: 'PascalCase.vue (UserProfile.vue)';
    services: 'camelCase.ts (userService.ts)';
    utilities: 'camelCase.ts (dateHelper.ts)';
    types: 'camelCase.ts (userTypes.ts)';
    constants: 'UPPER_SNAKE_CASE.ts (API_ENDPOINTS.ts)';
  };
  
  directories: {
    pages: 'kebab-case (user-profile)';
    components: 'kebab-case (common-button)';
    modules: 'camelCase (userManagement)';
  };
  
  variables: {
    constants: 'UPPER_SNAKE_CASE (MAX_RETRY_COUNT)';
    functions: 'camelCase (getUserById)';
    classes: 'PascalCase (UserService)';
    interfaces: 'PascalCase with I prefix (IUser)';
  };
}
```

#### 2. 目录结构规范
```typescript
// 功能模块组织
const ModuleStructure = {
  // 按功能分组
  feature_based: {
    structure: `
    src/
    ├── features/
    │   ├── auth/
    │   │   ├── components/
    │   │   ├── services/
    │   │   ├── types/
    │   │   └── index.ts
    │   ├── booking/
    │   └── payment/
    `,
    advantages: ['功能内聚', '易于维护', '团队协作']
  },
  
  // 按技术分层
  layer_based: {
    structure: `
    src/
    ├── components/
    ├── services/
    ├── types/
    ├── utils/
    └── pages/
    `,
    advantages: ['结构清晰', '技术统一', '代码复用']
  }
};
```

### 编码规范

#### 1. TypeScript 规范
```typescript
// 类型定义规范
// ✅ 好的实践
interface User {
  readonly id: string;
  name: string;
  email: string;
  vipLevel: VipLevel;
  createdAt: Date;
  updatedAt?: Date;
}

enum VipLevel {
  NORMAL = 0,
  VIP1 = 1,
  VIP2 = 2,
  VIP3 = 3
}

type ApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
  code?: string;
};

// ❌ 避免的实践
interface BadUser {
  id: any;                    // 避免使用 any
  name: string | object;      // 避免过于宽泛的联合类型
  data: {};                   // 避免空对象类型
}
```

#### 2. 错误处理规范
```typescript
// 统一错误处理
class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR',
    public isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

// 错误处理装饰器
function HandleErrors(target: any, propertyName: string, descriptor: PropertyDescriptor) {
  const method = descriptor.value;
  
  descriptor.value = async function (...args: any[]) {
    try {
      return await method.apply(this, args);
    } catch (error) {
      logger.error(`Error in ${target.constructor.name}.${propertyName}:`, error);
      throw error;
    }
  };
}

// 使用示例
class UserService {
  @HandleErrors
  async createUser(userData: CreateUserRequest): Promise<User> {
    // 业务逻辑
  }
}
```

### 测试规范

#### 1. 测试组织结构
```
tests/
├── unit/                     # 单元测试
│   ├── controllers/
│   ├── services/
│   ├── models/
│   └── utils/
│
├── integration/              # 集成测试
│   ├── api/
│   ├── database/
│   └── external/
│
├── e2e/                      # 端到端测试
│   ├── user-flows/
│   ├── admin-flows/
│   └── merchant-flows/
│
├── fixtures/                 # 测试数据
│   ├── users.json
│   ├── stores.json
│   └── orders.json
│
└── helpers/                  # 测试帮助函数
    ├── setup.ts
    ├── teardown.ts
    └── factories.ts
```

#### 2. 测试编写规范
```typescript
// 测试命名规范
describe('UserService', () => {
  describe('createUser', () => {
    it('should create user with valid data', async () => {
      // Given
      const userData = {
        phone: '13800138000',
        name: '张三',
        password: 'Password123!'
      };
      
      // When
      const user = await userService.createUser(userData);
      
      // Then
      expect(user).toBeDefined();
      expect(user.phone).toBe(userData.phone);
      expect(user.id).toBeDefined();
    });
    
    it('should throw error for duplicate phone', async () => {
      // Given
      const userData = { phone: '13800138000', name: '张三' };
      await userService.createUser(userData);
      
      // When & Then
      await expect(
        userService.createUser(userData)
      ).rejects.toThrow('Phone already exists');
    });
  });
});

// Mock 和 Stub 使用
jest.mock('../services/PaymentService');
const mockPaymentService = PaymentService as jest.Mocked<typeof PaymentService>;

beforeEach(() => {
  mockPaymentService.processPayment.mockResolvedValue({
    success: true,
    transactionId: 'tx_123'
  });
});
```

---

## 🚀 部署架构 (Deployment Architecture)

### 容器化部署

#### 1. Docker 配置
```dockerfile
# 多阶段构建 Dockerfile
# 构建阶段
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY . .
RUN npm run build

# 运行阶段
FROM node:18-alpine AS runner

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["npm", "start"]
```

#### 2. Docker Compose 编排
```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: 
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongodb:27017/locallife
      - REDIS_URL=redis://redis:6379
    depends_on:
      - mongodb
      - redis
    restart: unless-stopped
    networks:
      - app-network

  mongodb:
    image: mongo:7.0
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
      MONGO_INITDB_DATABASE: locallife
    volumes:
      - mongodb_data:/data/db
      - ./docker/mongodb/init-scripts:/docker-entrypoint-initdb.d
    restart: unless-stopped
    networks:
      - app-network

  redis:
    image: redis:7.0-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    restart: unless-stopped
    networks:
      - app-network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./docker/nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./docker/nginx/ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped
    networks:
      - app-network

volumes:
  mongodb_data:
  redis_data:

networks:
  app-network:
    driver: bridge
```

### 监控配置

#### 1. 应用监控
```typescript
// 监控中间件
class MonitoringMiddleware {
  static requestLogger() {
    return (req: Request, res: Response, next: NextFunction) => {
      const start = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - start;
        
        // 记录请求指标
        metrics.increment('http_requests_total', {
          method: req.method,
          route: req.route?.path || req.path,
          status_code: res.statusCode.toString()
        });
        
        metrics.histogram('http_request_duration_ms', duration, {
          method: req.method,
          route: req.route?.path || req.path
        });
      });
      
      next();
    };
  }
}

// 健康检查端点
class HealthController {
  static async checkHealth(req: Request, res: Response) {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: await this.checkDatabase(),
        redis: await this.checkRedis(),
        external_apis: await this.checkExternalAPIs()
      }
    };
    
    const isHealthy = Object.values(health.services)
      .every(service => service.status === 'healthy');
    
    res.status(isHealthy ? 200 : 503).json(health);
  }
}
```

---

*本文档为项目结构指导文档，用于指导代码组织、模块架构和开发规范。文档会根据项目发展和团队需求定期更新。*
