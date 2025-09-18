# 数据库迁移说明

## 概述

本项目使用MongoDB作为数据库，通过迁移脚本来管理数据库结构的变更和索引优化。

## 目录结构

```
migrations/
├── 001_initial_database_setup.js    # 初始数据库设置
├── 002_add_missing_models.js        # 添加缺失模型约束
├── migration-runner.js              # 迁移执行器
└── README.md                        # 说明文档
```

## 数据模型设计

### 核心业务表

1. **用户表 (users)**
   - 用户基本信息、VIP等级、积分余额
   - 地理位置信息、偏好设置
   - 支持多种用户类型：普通用户、商户、管理员

2. **店铺表 (stores)**
   - 店铺基本信息、营业时间、地理位置
   - 评分统计、收入记录
   - 支持全文搜索和地理位置查询

3. **包间表 (rooms)**
   - 包间信息、容量、价格
   - 状态管理、预订统计
   - 支持实时可用性查询

4. **订单表 (orders)**
   - 订单信息、支付状态、预订时间
   - 支持多种订单类型：包间预订、食品订单、套餐
   - 完整的订单生命周期管理

5. **菜品表 (dishes)**
   - 菜品信息、价格策略、库存管理
   - 支持VIP价格、营养信息
   - 全文搜索和分类管理

6. **评价表 (reviews)**
   - 用户评价、商户回复
   - 支持图片、标签、有用性标记
   - 多维度评价统计

7. **积分记录表 (pointrecords)**
   - 积分获得、使用、过期记录
   - 支持多种积分来源
   - 自动过期处理

### 索引设计原则

#### 1. 查询性能优化
- **唯一索引**：手机号、订单号等业务唯一字段
- **复合索引**：常用查询组合，如 `userId + status`
- **地理位置索引**：2dsphere索引支持地理位置查询
- **全文搜索索引**：支持店铺、菜品的全文搜索

#### 2. 索引覆盖策略
```javascript
// 用户查询索引
{ userId: 1, status: 1 }           // 覆盖用户订单查询
{ storeId: 1, isActive: 1 }        // 覆盖店铺菜品查询
{ location: '2dsphere' }           // 地理位置查询
```

#### 3. 排序优化
```javascript
{ createdAt: -1 }                  // 时间倒序排列
{ rating: -1, reviewCount: -1 }    // 评分排序
{ salesCount: -1 }                 // 销量排序
```

### 数据约束和验证

#### 1. 业务逻辑约束
- VIP价格不能高于普通价格
- 包间在同一时间段只能被一个订单预订
- 用户对同一订单只能评价一次
- 积分余额不能为负数

#### 2. 数据完整性
- 外键关系通过ObjectId引用
- 必填字段验证
- 数据类型和范围验证
- 唯一性约束

#### 3. 性能优化
- 后台索引创建，不阻塞操作
- 稀疏索引，节省存储空间
- 部分索引，只对符合条件的文档创建索引

## 使用方法

### 环境准备

```bash
# 设置MongoDB连接字符串
export MONGODB_URI="mongodb://localhost:27017/local-life-service"

# 或者在开发环境中
export MONGODB_URI="mongodb://localhost:27017/local-life-service-dev"
```

### 执行迁移

```bash
# 查看迁移状态
node migrations/migration-runner.js status

# 执行所有待执行的迁移
node migrations/migration-runner.js migrate

# 回滚最近的迁移
node migrations/migration-runner.js rollback

# 回滚最近的3个迁移
node migrations/migration-runner.js rollback 3
```

### 开发流程

1. **创建迁移文件**
   ```bash
   # 按照编号创建新的迁移文件
   touch migrations/003_add_new_feature.js
   ```

2. **编写迁移内容**
   ```javascript
   const migration = {
     name: '003_add_new_feature',
     description: '添加新功能相关的索引和约束',
     
     async up() {
       // 迁移逻辑
     },
     
     async down() {
       // 回滚逻辑
     }
   };
   
   module.exports = migration;
   ```

3. **测试迁移**
   ```bash
   # 执行迁移
   node migrations/migration-runner.js migrate
   
   # 验证结果
   node migrations/migration-runner.js status
   
   # 如果有问题，回滚
   node migrations/migration-runner.js rollback
   ```

## 索引监控

### 查看索引使用情况

```javascript
// 在MongoDB Shell中执行
db.users.getIndexes()              // 查看所有索引
db.users.stats().indexSizes        // 查看索引大小
db.users.explain().find(query)     // 分析查询计划
```

### 性能优化建议

1. **定期监控慢查询**
   ```javascript
   db.setProfilingLevel(2)         // 启用性能分析
   db.system.profile.find()        // 查看慢查询
   ```

2. **索引维护**
   ```javascript
   db.users.reIndex()              // 重建索引
   db.stats()                      // 查看数据库统计
   ```

3. **查询优化**
   - 使用复合索引覆盖查询
   - 避免不必要的排序操作
   - 限制返回字段数量
   - 合理使用分页查询

## 注意事项

1. **生产环境部署**
   - 在低峰期执行迁移
   - 备份数据库
   - 监控迁移过程
   - 准备回滚方案

2. **开发最佳实践**
   - 迁移文件一旦发布，不能修改
   - 每个迁移文件只做一件事
   - 提供完整的回滚逻辑
   - 充分测试迁移脚本

3. **性能考虑**
   - 大数据量迁移时分批处理
   - 使用后台索引创建
   - 避免在高峰期执行
   - 监控系统资源使用

## 故障排除

### 常见问题

1. **迁移失败**
   ```bash
   # 查看详细错误信息
   node migrations/migration-runner.js migrate
   
   # 手动修复数据后重试
   node migrations/migration-runner.js migrate
   ```

2. **索引创建失败**
   ```javascript
   // 检查索引冲突
   db.collection.getIndexes()
   
   // 删除有问题的索引
   db.collection.dropIndex("index_name")
   ```

3. **回滚失败**
   ```bash
   # 手动清理数据
   # 然后重新执行迁移
   node migrations/migration-runner.js migrate
   ```

### 紧急恢复

如果迁移导致严重问题：

1. 立即停止应用服务
2. 从备份恢复数据库
3. 检查和修复迁移脚本
4. 在测试环境验证修复
5. 重新部署到生产环境
