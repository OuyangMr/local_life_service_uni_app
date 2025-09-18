# Requirements Document

## Introduction

本地生活服务小程序是一个面向本地生活服务的微信小程序平台，仿照美团本地生活模式，提供精确到包间、卡座级别的在线状态查看和预订服务。平台集成了预订系统和扫码点单系统，为用户提供完整的从预订到消费的闭环体验。

核心价值：
- **用户价值**：精准预订体验，实时查看包间/卡座状态，视频预览空间环境，扫码点单便捷消费
- **商户价值**：数字化空间管理，提升预订转化率，提高点单效率，降低人力成本
- **平台价值**：连接本地生活服务供需，构建完整的预订-消费-返利生态闭环

## Alignment with Product Vision

该功能支持以下产品目标：
- 构建本地生活服务数字化平台，从KTV、茶楼、咖啡厅开始，逐步扩展到全品类
- 通过视频预览和实时状态提升用户预订体验
- 通过扫码点单系统优化到店消费流程
- 建立积分返利体系，提高用户粘性和复购率

## Requirements

### Requirement 1: 商户类目与店铺管理

**User Story:** 作为一个用户，我希望能够浏览不同类目的本地生活服务商户，以便找到适合我需求的店铺。

#### Acceptance Criteria

1. WHEN 用户打开小程序 THEN 系统 SHALL 显示三大类目：KTV、茶楼、咖啡厅
2. WHEN 用户选择类目 THEN 系统 SHALL 显示该类目下的店铺列表，默认按距离排序
3. WHEN 用户查看店铺详情 THEN 系统 SHALL 显示店铺名称、地址、营业时间、环境图片和整体介绍视频
4. IF 店铺处于营业时间 THEN 系统 SHALL 显示"营业中"状态并允许预订
5. WHEN 用户点击地址 THEN 系统 SHALL 提供地图导航功能

### Requirement 2: 空间状态管理与视频预览

**User Story:** 作为一个预订用户，我希望能够查看包间/卡座的实时状态和环境视频，以便选择最适合的空间。

#### Acceptance Criteria

1. WHEN 用户进入店铺详情 THEN 系统 SHALL 显示所有包间/卡座的实时状态（空闲可预订/已预订/使用中/维护中）
2. WHEN 用户点击包间/卡座 THEN 系统 SHALL 播放该空间的20秒实拍视频
3. WHEN 用户查看空间信息 THEN 系统 SHALL 显示容纳人数、设施标签、价格规则
4. IF 空间状态为"使用中"或"已预订" THEN 系统 SHALL 禁用预订按钮
5. WHEN 商户端更新空间状态 THEN 系统 SHALL 在3秒内同步到用户端

### Requirement 3: 用户等级与会员体系

**User Story:** 作为一个平台运营方，我希望建立用户等级体系，为不同等级用户提供差异化服务，以提升用户忠诚度。

#### Acceptance Criteria

1. WHEN 用户注册成功 THEN 系统 SHALL 自动设置用户等级为"普通用户"
2. WHEN 用户累计消费达到设定阈值 THEN 系统 SHALL 自动升级用户等级（银卡/金卡/钻石卡/VIP）
3. WHEN 用户查看个人中心 THEN 系统 SHALL 显示当前等级、等级权益、升级进度
4. IF 用户为VIP等级 THEN 系统 SHALL 在用户界面显示VIP标识和专享权益
5. WHEN 用户等级发生变化 THEN 系统 SHALL 发送升级通知并更新权益

### Requirement 4: 精准预订系统（分级处理）

**User Story:** 作为一个用户，我希望根据我的会员等级享受不同的预订政策，VIP用户无需支付定金即可预订。

#### Acceptance Criteria

1. WHEN 普通用户选择可用空间并点击预订 THEN 系统 SHALL 要求支付订金并提供人数、时段选择
2. WHEN VIP用户选择可用空间并点击预订 THEN 系统 SHALL 允许免订金直接预订，仅需确认人数和时段
3. WHEN 用户确认预订信息 THEN 系统 SHALL 根据用户等级显示相应的订金金额（VIP显示￥0）和积分抵扣选项
4. WHEN 用户完成预订流程 THEN 系统 SHALL 生成预订码（二维码/数字码）并发送确认通知
5. IF 预订成功 THEN 系统 SHALL 立即锁定该空间状态为"已预订"
6. WHEN 用户到店 THEN 商户 SHALL 能够扫码核销确认并开启空间使用
7. IF VIP用户未按时到店（超过预订时间30分钟） THEN 系统 SHALL 自动释放空间并记录爽约次数
8. IF VIP用户爽约次数达到3次 THEN 系统 SHALL 暂时取消其免订金权益30天

### Requirement 5: 扫码点单系统

**User Story:** 作为一个在包间内的用户，我希望能够扫描二维码进入点单页面，快速浏览和订购商品，无需等待服务员。

#### Acceptance Criteria

1. WHEN 用户扫描包间/卡座二维码 THEN 系统 SHALL 自动识别位置并进入该空间的点单页面
2. WHEN 用户浏览商品 THEN 系统 SHALL 按分类显示商品（酒水、小食、服务等），包含图片、名称、价格、库存状态
3. WHEN VIP用户浏览商品 THEN 系统 SHALL 显示会员专享价格和VIP标识
4. WHEN 用户添加商品到购物车 THEN 系统 SHALL 支持数量选择、规格选择和特殊备注
5. WHEN 用户确认订单 THEN 系统 SHALL 显示配送位置、预估送达时间、优惠券和积分抵扣选项
6. WHEN 用户完成支付 THEN 系统 SHALL 生成订单并立即推送到商户端、后厨和服务员端

### Requirement 6: 订单状态管理

**User Story:** 作为一个点单用户，我希望能够实时追踪订单状态，了解制作和配送进度。

#### Acceptance Criteria

1. WHEN 订单支付成功 THEN 系统 SHALL 将订单状态设为"已支付"并推送到商户端
2. WHEN 商户确认接单 THEN 系统 SHALL 更新状态为"已接单"并分配制作任务
3. WHEN 后厨开始制作 THEN 系统 SHALL 更新状态为"制作中"并显示预估完成时间
4. WHEN 服务员开始配送 THEN 系统 SHALL 更新状态为"配送中"
5. WHEN 商品送达 THEN 系统 SHALL 更新状态为"已送达"并通知用户确认收货
6. IF 订单状态变更 THEN 系统 SHALL 实时推送微信通知给用户
7. IF 用户为VIP等级 THEN 系统 SHALL 优先处理其订单，缩短制作和配送时间

### Requirement 7: 积分返利系统

**User Story:** 作为一个消费用户，我希望能够获得消费返利积分，并在后续预订中使用积分抵扣费用。

#### Acceptance Criteria

1. WHEN 用户完成消费 THEN 商户 SHALL 能够设置返利比例并确认消费金额
2. WHEN 商户确认返利 THEN 系统 SHALL 按设定比例和用户等级倍率计算积分并实时入账
3. WHEN VIP用户消费 THEN 系统 SHALL 提供2倍积分返利倍率
4. WHEN 用户进行新预订 THEN 系统 SHALL 显示可用积分余额和抵扣选项
5. IF 用户选择积分抵扣 THEN 系统 SHALL 按比例计算抵扣金额并更新订金
6. WHEN 积分使用后 THEN 系统 SHALL 实时更新积分余额并记录使用明细

### Requirement 8: 商户端管理系统

**User Story:** 作为一个商户管理员，我希望能够管理店铺信息、空间状态、商品目录和订单处理。

#### Acceptance Criteria

1. WHEN 商户登录管理后台 THEN 系统 SHALL 显示店铺概况、今日订单、空间状态总览
2. WHEN 商户更新空间状态 THEN 系统 SHALL 立即同步到用户端并记录变更日志
3. WHEN 商户管理商品目录 THEN 系统 SHALL 支持分类管理、价格设置（含会员价）、库存更新、图片上传
4. WHEN 收到新的点单订单 THEN 系统 SHALL 推送声音和弹窗提醒，显示订单详情和用户等级
5. WHEN 商户确认订单 THEN 系统 SHALL 支持快速接单/拒单，并自动分配给后厨和服务员
6. WHEN 商户查看VIP用户预订 THEN 系统 SHALL 标识VIP用户并显示免订金预订记录

### Requirement 9: 二维码管理系统

**User Story:** 作为一个商户，我希望能够为每个包间/卡座生成和管理二维码，方便用户扫码点单。

#### Acceptance Criteria

1. WHEN 商户创建新空间 THEN 系统 SHALL 自动生成包含店铺ID、空间ID的唯一二维码
2. WHEN 商户需要打印二维码 THEN 系统 SHALL 提供标准尺寸的打印模板
3. WHEN 用户扫描二维码 THEN 系统 SHALL 验证二维码有效性并防止跨店使用
4. IF 商户需要更换二维码 THEN 系统 SHALL 支持重新生成并保持历史记录
5. WHEN 二维码失效或损坏 THEN 商户 SHALL 能够批量更新和重新打印

## Non-Functional Requirements

### Code Architecture and Modularity
- **Single Responsibility Principle**: 预订模块、点单模块、用户等级模块、商户模块各自独立
- **Modular Design**: 支付服务、通知服务、状态同步服务、等级计算服务可复用
- **Dependency Management**: 最小化业务模块间的依赖关系
- **Clear Interfaces**: 定义清晰的API接口和数据传输协议

### Performance
- 首屏加载时间 < 2秒
- 扫码进入点单页面 < 1.5秒
- 商品目录加载 < 1秒
- 支付响应时间 < 3秒
- 订单状态同步延迟 < 3秒
- 用户等级计算响应 < 1秒
- 支持同时1000用户在线，500用户同时点单

### Security
- 用户隐私保护，最小化权限申请
- 微信支付安全保障，采用官方SDK
- 数据传输采用HTTPS加密
- 防止恶意扫码和跨店使用
- 订单数据完整性验证
- VIP权益防刷机制

### Reliability
- 系统可用性 ≥ 99.9%
- 数据备份与恢复机制
- 支付失败重试机制
- 订单异常处理流程
- 等级升级异常回滚机制

### Usability
- 界面简洁直观，符合微信小程序设计规范
- 操作流程简单，预订和点单各不超过5步
- VIP用户享有更简化的操作流程
- 支持老人和视力不佳用户的无障碍访问
- 提供操作引导和帮助说明