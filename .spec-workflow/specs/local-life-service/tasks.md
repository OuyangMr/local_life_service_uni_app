# Tasks Document

## Phase 1: UI设计与原型

- [x] 1. 创建用户端UI设计稿
  - File: docs/design/ui-mockups/user-app/
  - 设计首页、店铺列表、详情页、预订流程、扫码点单等关键页面
  - 确保符合微信小程序设计规范和无障碍访问要求
  - Purpose: 确保界面设计满足用户需求并提供开发参考
  - _Leverage: 微信设计规范，用户体验最佳实践_
  - _Requirements: 所有用户端功能需求_

- [x] 2. 创建商户端UI设计稿
  - File: docs/design/ui-mockups/merchant-admin/
  - 设计管理后台、订单管理、商品管理、数据统计等页面
  - 考虑多设备适配（手机、平板、PC）
  - Purpose: 确保商户端界面易用性和功能完整性
  - _Leverage: 管理后台设计模式，响应式设计原则_
  - _Requirements: 8.1 (商户端管理系统)_

- [x] 3. 创建交互原型
  - File: docs/design/prototypes/
  - 制作可交互的高保真原型，演示关键用户流程
  - 包含预订流程、点单流程、支付流程的完整交互
  - Purpose: 验证用户体验设计的可行性
  - _Leverage: 原型设计工具，用户测试反馈_
  - _Requirements: 主要业务流程需求_

- [x] 4. 设计组件库规范
  - File: docs/design/component-library/
  - 定义统一的组件样式、颜色规范、字体规范
  - 建立设计系统确保界面一致性
  - Purpose: 提供前端开发的设计标准
  - _Leverage: 设计系统最佳实践_
  - _Requirements: 非功能需求 - 可用性_

## Phase 2: 后端API开发

- [x] 5. 搭建后端项目架构
  - File: backend/src/main.ts
  - 选择技术栈（Node.js + Express/Koa 或 Python + FastAPI 等）
  - 配置数据库（MySQL/PostgreSQL）、Redis缓存
  - Purpose: 建立后端服务基础架构
  - _Leverage: 企业级后端框架，数据库ORM_
  - _Requirements: 系统架构需求_

- [x] 6. 设计数据库结构
  - File: backend/migrations/
  - 创建用户、商户、店铺、空间、预订、订单等数据表
  - 设计索引、外键关系、数据约束
  - Purpose: 建立数据持久化基础
  - _Leverage: 数据库设计最佳实践_
  - _Requirements: 所有数据模型需求_

- [x] 7. 实现用户认证与授权API
  - File: backend/src/controllers/auth.ts
  - 微信小程序登录集成、JWT token管理
  - 用户等级权限验证、VIP权益控制
  - Purpose: 提供用户身份认证和权限管理
  - _Leverage: 微信开放平台API，JWT库_
  - _Requirements: 3.1 (用户等级与会员体系)_

- [x] 8. 实现商户管理API
  - File: backend/src/controllers/store.ts
  - 店铺CRUD操作、类目管理、地理位置查询
  - 空间状态管理、视频资源上传
  - Purpose: 提供商户和店铺数据管理API
  - _Leverage: 地理位置计算库，文件上传服务_
  - _Requirements: 1.1, 2.1, 8.1_

- [x] 9. 实现预订管理API
  - File: backend/src/controllers/booking.ts
  - 预订创建、状态管理、核销验证
  - VIP免订金预订逻辑、爽约记录管理
  - Purpose: 提供预订业务逻辑API
  - _Leverage: 事务处理，状态机模式_
  - _Requirements: 4.1 (精准预订系统分级处理)_

- [x] 10. 实现商品管理API
  - File: backend/src/controllers/product.ts
  - 商品CRUD、分类管理、库存同步
  - 价格策略（普通价、会员价）、促销管理
  - Purpose: 提供商品数据管理API
  - _Leverage: 缓存策略，库存并发控制_
  - _Requirements: 5.1, 8.1_

- [x] 11. 实现订单管理API
  - File: backend/src/controllers/order.ts
  - 订单创建、状态流转、配送管理
  - 实时状态推送、异常处理
  - Purpose: 提供订单业务逻辑API
  - _Leverage: 消息队列，WebSocket服务_
  - _Requirements: 5.1, 6.1_

- [x] 12. 实现支付集成API
  - File: backend/src/controllers/payment.ts
  - 微信支付集成、支付回调处理
  - 积分抵扣、退款处理
  - Purpose: 提供支付相关API
  - _Leverage: 微信支付SDK，支付安全机制_
  - _Requirements: 4.1, 5.1, 7.1_

- [x] 13. 实现积分系统API
  - File: backend/src/controllers/points.ts
  - 积分获取、使用、余额查询
  - 等级升级逻辑、返利计算
  - Purpose: 提供积分和会员等级管理API
  - _Leverage: 计算引擎，规则引擎_
  - _Requirements: 7.1 (积分返利系统)_

- [x] 14. 实现WebSocket服务
  - File: backend/src/websocket/server.ts
  - 建立WebSocket连接管理、消息分发
  - 订单状态实时推送、连接保活
  - Purpose: 提供实时通讯服务
  - _Leverage: WebSocket库，消息队列_
  - _Requirements: 6.1, 8.1_

- [x] 15. 实现文件上传服务
  - File: backend/src/services/upload.ts
  - 图片、视频上传处理、格式验证
  - 对接云存储（阿里云OSS/腾讯云COS）
  - Purpose: 提供多媒体文件管理服务
  - _Leverage: 云存储SDK，图片处理库_
  - _Requirements: 2.1, 8.1_

## Phase 3: 前端核心数据结构

- [x] 16. 创建核心数据类型定义
  - File: frontend/user-app/src/types/index.ts
  - 定义User、Store、Space、Booking、Product、Order等核心接口
  - 包含UserLevel、StoreCategory、SpaceStatus、BookingStatus、OrderStatus等枚举
  - Purpose: 建立全应用的类型安全基础
  - _Leverage: TypeScript严格模式，uni-app类型支持_
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1_

- [x] 17. 创建API响应类型定义
  - File: frontend/user-app/src/types/api.ts
  - 定义统一的API响应格式ApiResponse<T>、分页响应PaginatedResponse<T>
  - 定义各业务模块的请求和响应类型
  - Purpose: 确保API调用的类型安全
  - _Leverage: src/types/index.ts基础类型_
  - _Requirements: 所有API相关需求_

- [x] 18. 创建常量定义文件
  - File: frontend/user-app/src/constants/index.ts
  - 定义API端点、错误代码、默认配置等常量
  - 包含业务规则常量（VIP权益、积分规则等）
  - Purpose: 统一管理应用常量，避免魔法数字
  - _Leverage: TypeScript const assertions_
  - _Requirements: 所有功能需求_

## Phase 4: 前端服务层开发

- [x] 19. 实现API基础服务
  - File: frontend/user-app/src/services/api.ts
  - 封装uni.request，实现统一的请求拦截、响应处理、错误处理
  - 添加token认证、请求重试、超时处理
  - Purpose: 提供统一的API请求基础设施
  - _Leverage: uni-app网络API，TypeScript泛型_
  - _Requirements: 所有API调用需求_

- [x] 20. 实现用户服务
  - File: frontend/user-app/src/services/user.ts
  - 实现用户登录、获取用户信息、等级管理、积分查询等功能
  - 包含微信授权集成和用户状态管理
  - Purpose: 处理用户相关的所有业务逻辑
  - _Leverage: src/services/api.ts，微信小程序API_
  - _Requirements: 3.1, 7.1_

- [x] 21. 实现商户和店铺服务
  - File: frontend/user-app/src/services/store.ts
  - 实现店铺列表获取、详情查询、类目筛选、地理位置排序
  - 包含空间状态实时查询和视频资源管理
  - Purpose: 处理商户和店铺相关的业务逻辑
  - _Leverage: src/services/api.ts，uni-app地理位置API_
  - _Requirements: 1.1, 2.1_

- [x] 22. 实现预订服务
  - File: frontend/user-app/src/services/booking.ts
  - 实现预订创建、状态查询、核销验证等功能
  - 支持VIP用户免订金预订和普通用户分级处理
  - Purpose: 处理预订相关的所有业务逻辑
  - _Leverage: src/services/api.ts，src/services/user.ts_
  - _Requirements: 4.1_

- [x] 23. 实现商品和订单服务
  - File: frontend/user-app/src/services/product.ts, frontend/user-app/src/services/order.ts
  - 实现商品目录查询、订单创建、状态跟踪、配送管理
  - 包含库存实时同步和价格计算（含会员价）
  - Purpose: 处理扫码点单相关的业务逻辑
  - _Leverage: src/services/api.ts，WebSocket连接_
  - _Requirements: 5.1, 6.1_

- [x] 24. 实现支付服务
  - File: frontend/user-app/src/services/payment.ts
  - 集成微信支付，处理支付创建、状态查询、回调处理
  - 支持积分抵扣和混合支付方式
  - Purpose: 处理所有支付相关逻辑
  - _Leverage: 微信小程序支付API，src/services/api.ts_
  - _Requirements: 4.1, 5.1, 7.1_

## Phase 5: 前端状态管理

- [x] 25. 创建用户状态管理
  - File: frontend/user-app/src/stores/user.ts
  - 使用Pinia创建用户状态store，管理登录状态、用户信息、积分余额
  - 实现状态持久化和自动登录
  - Purpose: 管理用户相关的全局状态
  - _Leverage: Pinia状态管理，uni-app本地存储_
  - _Requirements: 3.1, 7.1_

- [x] 26. 创建购物车状态管理
  - File: frontend/user-app/src/stores/cart.ts
  - 管理购物车商品、数量、规格选择、优惠券应用
  - 实现本地存储和状态同步
  - Purpose: 管理购物车的全局状态
  - _Leverage: Pinia状态管理，本地存储API_
  - _Requirements: 5.1_

- [x] 27. 创建订单状态管理
  - File: frontend/user-app/src/stores/order.ts
  - 管理当前订单状态、历史订单、实时状态更新
  - 实现WebSocket连接的状态同步
  - Purpose: 管理订单相关的全局状态
  - _Leverage: Pinia状态管理，WebSocket服务_
  - _Requirements: 6.1_

## Phase 6: 核心功能组件开发

- [x] 28. 创建二维码扫描组件
  - File: frontend/user-app/src/components/QRScanner.vue
  - 封装扫码功能，支持权限处理和错误提示
  - 添加手动输入备选方案
  - Purpose: 提供统一的二维码扫描能力
  - _Leverage: uni.scanCode API，相机权限API_
  - _Requirements: 5.1, 9.1_

- [x] 29. 创建视频播放组件
  - File: frontend/user-app/src/components/VideoPlayer.vue
  - 实现视频播放、控制、自动播放等功能
  - 添加加载状态和错误处理
  - Purpose: 提供空间视频预览功能
  - _Leverage: uni-app video组件_
  - _Requirements: 2.1_

- [x] 30. 创建购物车组件
  - File: frontend/user-app/src/components/ShoppingCart.vue
  - 实现商品列表、数量调整、价格计算
  - 支持优惠券和积分抵扣预览
  - Purpose: 提供购物车管理界面
  - _Leverage: src/stores/cart.ts_
  - _Requirements: 5.1_

- [x] 31. 创建支付组件
  - File: frontend/user-app/src/components/PaymentForm.vue
  - 集成多种支付方式选择和处理
  - 实现支付状态跟踪和错误处理
  - Purpose: 提供统一的支付界面
  - _Leverage: src/services/payment.ts_
  - _Requirements: 4.1, 5.1_

- [x] 32. 创建实时状态组件
  - File: frontend/user-app/src/components/RealtimeStatus.vue
  - 实现WebSocket连接管理和状态显示
  - 添加连接状态指示和自动重连
  - Purpose: 提供实时状态同步功能
  - _Leverage: WebSocket API，状态管理_
  - _Requirements: 2.1, 6.1_

## Phase 7: 用户端核心页面开发

- [x] 33. 创建首页和类目选择
  - File: frontend/user-app/src/pages/index/index.vue
  - 根据UI设计稿实现类目展示、店铺推荐、用户快速入口
  - 添加地理位置获取和权限处理
  - Purpose: 应用入口页面，引导用户选择服务类目
  - _Leverage: uni-ui组件，地理位置API，UI设计稿_
  - _Requirements: 1.1_

- [x] 34. 创建店铺列表页面
  - File: frontend/user-app/src/pages/store/list.vue
  - 按照UI设计实现店铺列表展示、筛选排序、搜索功能
  - 添加距离计算和地图视图切换
  - Purpose: 展示指定类目下的店铺列表
  - _Leverage: src/services/store.ts，地图组件，UI设计稿_
  - _Requirements: 1.1_

- [x] 35. 创建店铺详情页面
  - File: frontend/user-app/src/pages/store/detail.vue
  - 根据设计稿展示店铺信息、空间列表、状态实时同步
  - 集成视频播放和预订入口
  - Purpose: 展示店铺详细信息和空间选择
  - _Leverage: src/services/store.ts，视频组件，UI设计稿_
  - _Requirements: 1.1, 2.1_

- [x] 36. 创建空间预览页面
  - File: frontend/user-app/src/pages/space/preview.vue
  - 按设计稿实现空间视频播放、详细信息展示、预订按钮
  - 根据用户等级显示不同的预订流程
  - Purpose: 提供空间详细预览和预订入口
  - _Leverage: 视频播放组件，src/services/booking.ts，UI设计稿_
  - _Requirements: 2.1, 4.1_

- [x] 37. 创建预订确认页面
  - File: frontend/user-app/src/pages/booking/confirm.vue
  - 按设计稿实现预订信息确认、积分抵扣选择、支付流程
  - 区分VIP用户和普通用户的不同流程
  - Purpose: 处理预订确认和支付
  - _Leverage: src/services/booking.ts，src/services/payment.ts，UI设计稿_
  - _Requirements: 4.1, 7.1_

- [x] 38. 创建扫码点单页面
  - File: src/pages/order/scan.vue
  - 按设计稿实现二维码扫描、空间定位、商品目录展示
  - 添加智能推荐和用户等级价格显示
  - Purpose: 扫码进入点单流程的入口页面
  - _Leverage: 扫码API，src/services/product.ts，UI设计稿_
  - _Requirements: 5.1, 9.1_

- [x] 39. 创建商品目录页面
  - File: src/pages/product/catalog.vue
  - 按设计稿实现商品分类浏览、搜索、加购功能
  - 支持规格选择和会员价格显示
  - Purpose: 展示商品目录和购物车管理
  - _Leverage: src/stores/cart.ts，src/services/product.ts，UI设计稿_
  - _Requirements: 5.1_

- [x] 40. 创建订单确认页面
  - File: src/pages/order/confirm.vue
  - 按设计稿实现订单确认、优惠券选择、积分抵扣、支付
  - 显示配送信息和预估时间
  - Purpose: 处理点单订单的确认和支付
  - _Leverage: src/services/order.ts，src/services/payment.ts，UI设计稿_
  - _Requirements: 5.1, 6.1_

## Phase 8: 用户端功能页面开发

- [x] 41. 创建用户中心页面
  - File: src/pages/user/profile.vue
  - 按设计稿展示用户信息、等级权益、积分余额、订单历史
  - 实现等级进度显示和权益说明
  - Purpose: 用户个人信息和等级管理中心
  - _Leverage: src/stores/user.ts，src/services/user.ts，UI设计稿_
  - _Requirements: 3.1, 7.1_

- [x] 42. 创建订单跟踪页面
  - File: src/pages/order/track.vue
  - 按设计稿实现订单状态实时跟踪、配送进度显示
  - 添加订单操作（确认收货、评价等）
  - Purpose: 提供订单状态实时跟踪功能
  - _Leverage: src/stores/order.ts，WebSocket连接，UI设计稿_
  - _Requirements: 6.1_

- [x] 43. 创建积分中心页面
  - File: src/pages/points/center.vue
  - 按设计稿展示积分余额、获取记录、使用记录
  - 实现积分规则说明和兑换功能
  - Purpose: 积分系统的用户界面
  - _Leverage: src/services/user.ts，积分服务，UI设计稿_
  - _Requirements: 7.1_

- [x] 44. 创建预订核销页面
  - File: src/pages/booking/verify.vue
  - 按设计稿生成和展示预订码、支持商户扫码核销
  - 显示预订状态和到店指引
  - Purpose: 提供预订核销功能
  - _Leverage: 二维码生成，src/services/booking.ts，UI设计稿_
  - _Requirements: 4.1_

## Phase 9: 商户端管理功能开发

- [x] 45. 创建商户登录页面
  - File: frontend/merchant-app/src/pages/login/index.vue
  - 按商户端UI设计实现商户账号登录和权限验证
  - 添加密码重置和账号申请入口
  - Purpose: 商户端登录入口
  - _Leverage: src/services/api.ts，表单验证，商户端UI设计稿_
  - _Requirements: 8.1_

- [x] 46. 创建商户管理后台
  - File: frontend/merchant-app/src/pages/dashboard/index.vue
  - 按设计稿展示店铺概况、今日数据、快速操作入口
  - 实现数据统计和图表展示
  - Purpose: 商户管理主界面
  - _Leverage: 图表组件，数据统计服务，商户端UI设计稿_
  - _Requirements: 8.1_

- [x] 47. 创建空间管理页面
  - File: frontend/merchant-app/src/pages/rooms/index.vue
  - 按设计稿实现空间状态管理、信息编辑、二维码生成
  - 支持批量操作和状态同步
  - Purpose: 商户空间管理功能
  - _Leverage: src/services/store.ts，二维码生成，商户端UI设计稿_
  - _Requirements: 8.1, 9.1_

- [x] 48. 创建订单管理页面
  - File: frontend/merchant-app/src/pages/orders/index.vue
  - 按设计稿实现订单接收、处理、状态更新
  - 添加订单筛选和批量操作
  - Purpose: 商户订单管理功能
  - _Leverage: src/services/order.ts，实时通知，商户端UI设计稿_
  - _Requirements: 8.1_

- [x] 49. 创建商品管理页面
  - File: frontend/merchant-app/src/pages/products/index.vue
  - 按设计稿实现商品目录管理、价格设置、库存管理
  - 支持商品分类和批量编辑
  - Purpose: 商户商品管理功能
  - _Leverage: src/services/product.ts，图片上传，商户端UI设计稿_
  - _Requirements: 8.1_

## Phase 10: 实时通讯与WebSocket集成

- [x] 50. 实现前端WebSocket连接服务
  - File: frontend/user-app/src/services/websocket.ts
  - 建立WebSocket连接、消息处理、自动重连
  - 实现消息分发和状态同步
  - Purpose: 提供实时通讯基础设施
  - _Leverage: uni.connectSocket API_
  - _Requirements: 6.1, 8.1_

- [x] 51. 实现订单状态实时同步
  - File: frontend/user-app/src/services/realtime.ts
  - 监听订单状态变化、推送通知处理
  - 实现离线消息缓存和同步
  - Purpose: 确保订单状态实时同步
  - _Leverage: src/services/websocket.ts_
  - _Requirements: 6.1_

## Phase 11: 应用配置与优化

- [ ] 52. 配置路由和页面结构
  - File: src/pages.json
  - 配置所有页面路由、标题、样式
  - 设置tabBar和导航结构
  - Purpose: 建立应用的页面导航结构
  - _Leverage: uni-app路由系统_
  - _Requirements: 所有页面相关需求_

- [ ] 53. 实现全局样式和主题
  - File: src/uni.scss, src/styles/theme.scss
  - 根据设计系统定义统一的颜色、字体、间距规范
  - 实现响应式布局和适配
  - Purpose: 建立统一的视觉风格
  - _Leverage: uni-app样式系统，Sass预处理，设计系统_
  - _Requirements: 非功能需求 - 可用性_

- [ ] 54. 配置构建和部署
  - File: vite.config.ts, manifest.json
  - 优化构建配置、添加代码分割
  - 配置小程序发布参数
  - Purpose: 优化应用性能和部署流程
  - _Leverage: Vite构建工具，uni-app发布系统_
  - _Requirements: 非功能需求 - 性能_

## Phase 12: 测试与质量保障

- [x] 55. 编写后端单元测试
  - File: backend/tests/unit/*.test.ts
  - 为所有service层和controller层方法编写单元测试
  - 测试边界情况和错误处理
  - Purpose: 确保后端代码质量和可靠性
  - _Leverage: Jest测试框架，测试工具_
  - _Requirements: 所有后端功能需求_

- [x] 56. 编写前端单元测试
  - File: frontend/user-app/tests/*.test.ts, frontend/merchant-app/tests/*.test.ts
  - 为所有前端service层方法编写单元测试
  - 测试组件行为和状态管理
  - Purpose: 确保前端代码质量和可靠性
  - _Leverage: Jest测试框架，Vue Test Utils_
  - _Requirements: 所有前端功能需求_

- [x] 57. 编写集成测试
  - File: tests/integration/*.test.ts
  - 测试前后端API集成、支付流程、状态同步
  - 验证业务流程的完整性
  - Purpose: 确保系统集成的正确性
  - _Leverage: 测试环境，Mock服务_
  - _Requirements: 主要业务流程_

- [x] 58. 实现E2E测试
  - File: tests/e2e/*.test.ts
  - 使用uni-automator测试完整用户流程
  - 覆盖预订、点单、支付等关键路径
  - Purpose: 验证用户完整体验流程
  - _Leverage: uni-automator，自动化测试工具_
  - _Requirements: 所有用户故事_

- [x] 59. 性能优化和监控
  - File: src/utils/performance.ts, backend/src/middleware/monitor.ts
  - 实现前后端性能监控、错误上报、用户行为统计
  - 优化首屏加载和API响应时间
  - Purpose: 确保应用性能达标
  - _Leverage: 性能监控SDK，数据统计服务_
  - _Requirements: 非功能需求 - 性能_

- [ ] 60. 最终集成和发布准备
  - File: 项目根目录配置文件
  - 集成所有功能模块，修复集成问题
  - 完善文档、准备发布材料
  - Purpose: 完成应用开发和发布准备
  - _Leverage: 全部已开发组件和服务_
  - _Requirements: 所有需求_