# MongoDB 使用指南

## 📚 目录
1. [快速开始](#快速开始)
2. [环境搭建](#环境搭建)
3. [数据库操作](#数据库操作)
4. [索引管理](#索引管理)
5. [性能优化](#性能优化)
6. [备份恢复](#备份恢复)
7. [监控运维](#监控运维)
8. [故障排除](#故障排除)

## 🚀 快速开始

### 1. 启动 MongoDB 服务

```bash
# 使用 Docker Compose（推荐）
cd project-root
chmod +x scripts/setup-mongodb.sh
./scripts/setup-mongodb.sh

# 或者手动启动
docker-compose -f docker/mongodb/docker-compose.yml up -d
```

### 2. 验证连接

```bash
# 使用 mongosh 连接
mongosh "mongodb://app_user:app_password_123@localhost:27017/local-life-service"

# 验证连接
db.runCommand("ping")
```

### 3. 启动应用

```bash
# 后端服务
cd backend
npm install
cp .env.example .env
npm run dev
```

## 🛠️ 环境搭建

### 本地开发环境

#### Docker 方式（推荐）

```yaml
# docker/mongodb/docker-compose.yml
version: '3.8'
services:
  mongodb:
    image: mongo:7.0
    container_name: local-life-mongodb
    restart: always
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password123
      MONGO_INITDB_DATABASE: local-life-service
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    command: mongod --auth --bind_ip_all
```

#### 本机安装方式

```bash
# macOS
brew tap mongodb/brew
brew install mongodb-community

# Ubuntu
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# 启动服务
sudo systemctl start mongod
sudo systemctl enable mongod
```

### 生产环境

#### MongoDB Atlas（云服务）

1. **注册 MongoDB Atlas 账号**
   - 访问 [MongoDB Atlas](https://cloud.mongodb.com/)
   - 创建免费集群

2. **配置网络访问**
   ```bash
   # 添加 IP 白名单
   # 0.0.0.0/0 (开发环境)
   # 具体服务器IP (生产环境)
   ```

3. **创建数据库用户**
   ```javascript
   // 用户名: app_user
   // 密码: 复杂密码
   // 权限: readWrite
   ```

4. **获取连接字符串**
   ```bash
   mongodb+srv://app_user:<password>@cluster0.xxxxx.mongodb.net/local-life-service?retryWrites=true&w=majority
   ```

## 📊 数据库操作

### 基础操作

#### 1. 数据库管理

```javascript
// 连接数据库
use local-life-service

// 查看所有数据库
show dbs

// 查看当前数据库
db.getName()

// 查看集合
show collections

// 数据库统计
db.stats()
```

#### 2. 集合操作

```javascript
// 创建集合
db.createCollection("users")

// 查看集合信息
db.users.stats()

// 删除集合
db.users.drop()
```

#### 3. 文档操作

```javascript
// 插入文档
db.users.insertOne({
  name: "张三",
  phone: "13800138000",
  vipLevel: 1,
  createdAt: new Date()
})

// 批量插入
db.users.insertMany([
  { name: "李四", phone: "13800138001" },
  { name: "王五", phone: "13800138002" }
])

// 查询文档
db.users.find({ vipLevel: 1 })
db.users.findOne({ phone: "13800138000" })

// 更新文档
db.users.updateOne(
  { phone: "13800138000" },
  { $set: { vipLevel: 2, updatedAt: new Date() } }
)

// 删除文档
db.users.deleteOne({ phone: "13800138000" })
```

### 高级查询

#### 1. 聚合查询

```javascript
// 用户统计
db.users.aggregate([
  {
    $group: {
      _id: "$vipLevel",
      count: { $sum: 1 },
      avgBalance: { $avg: "$balance" }
    }
  },
  { $sort: { _id: 1 } }
])

// 店铺销售统计
db.orders.aggregate([
  {
    $match: {
      status: "completed",
      createdAt: {
        $gte: ISODate("2024-01-01"),
        $lt: ISODate("2024-02-01")
      }
    }
  },
  {
    $group: {
      _id: "$storeId",
      totalSales: { $sum: "$totalAmount" },
      orderCount: { $sum: 1 }
    }
  },
  {
    $lookup: {
      from: "stores",
      localField: "_id",
      foreignField: "_id",
      as: "store"
    }
  }
])
```

#### 2. 地理位置查询

```javascript
// 创建地理位置索引
db.stores.createIndex({ location: "2dsphere" })

// 查找附近的店铺
db.stores.find({
  location: {
    $near: {
      $geometry: {
        type: "Point",
        coordinates: [116.404, 39.915] // 经度, 纬度
      },
      $maxDistance: 5000 // 5公里内
    }
  }
})

// 指定区域内的店铺
db.stores.find({
  location: {
    $geoWithin: {
      $centerSphere: [
        [116.404, 39.915], // 中心点
        5 / 6378.1 // 半径（公里转弧度）
      ]
    }
  }
})
```

#### 3. 全文搜索

```javascript
// 创建全文搜索索引
db.dishes.createIndex({
  name: "text",
  description: "text",
  tags: "text"
}, {
  weights: {
    name: 10,
    description: 5,
    tags: 1
  }
})

// 搜索菜品
db.dishes.find({
  $text: {
    $search: "麻辣 火锅",
    $language: "chinese"
  }
}, {
  score: { $meta: "textScore" }
}).sort({ score: { $meta: "textScore" } })
```

## 🎯 索引管理

### 索引策略

#### 1. 常用索引类型

```javascript
// 单字段索引
db.users.createIndex({ phone: 1 })
db.orders.createIndex({ createdAt: -1 })

// 复合索引
db.orders.createIndex({ userId: 1, status: 1, createdAt: -1 })
db.dishes.createIndex({ storeId: 1, isActive: 1, salesCount: -1 })

// 唯一索引
db.users.createIndex({ phone: 1 }, { unique: true })
db.orders.createIndex({ orderNumber: 1 }, { unique: true })

// 稀疏索引（跳过null值）
db.users.createIndex({ email: 1 }, { sparse: true })

// 部分索引（条件索引）
db.orders.createIndex(
  { storeId: 1, status: 1 },
  { partialFilterExpression: { status: { $in: ["pending", "paid"] } } }
)

// TTL索引（自动过期）
db.sessions.createIndex(
  { createdAt: 1 },
  { expireAfterSeconds: 3600 } // 1小时后自动删除
)
```

#### 2. 地理位置索引

```javascript
// 2dsphere索引（推荐）
db.stores.createIndex({ location: "2dsphere" })

// 复合地理位置索引
db.stores.createIndex({ 
  location: "2dsphere", 
  category: 1, 
  isActive: 1 
})
```

#### 3. 全文搜索索引

```javascript
// 基础全文索引
db.stores.createIndex({
  name: "text",
  description: "text"
})

// 带权重的全文索引
db.dishes.createIndex({
  name: "text",
  description: "text",
  tags: "text"
}, {
  weights: { name: 10, description: 5, tags: 1 },
  name: "dish_search_index"
})
```

### 索引监控

```javascript
// 查看所有索引
db.collection.getIndexes()

// 查看索引使用统计
db.collection.aggregate([{ $indexStats: {} }])

// 查看查询执行计划
db.collection.explain("executionStats").find(query)

// 重建索引
db.collection.reIndex()
```

## ⚡ 性能优化

### 查询优化

#### 1. 使用 explain() 分析查询

```javascript
// 分析查询计划
db.orders.explain("executionStats").find({
  userId: ObjectId("..."),
  status: "completed"
}).sort({ createdAt: -1 }).limit(10)

// 关注以下指标：
// - executionTimeMillis: 执行时间
// - totalDocsExamined: 扫描文档数
// - totalDocsReturned: 返回文档数
// - indexesUsed: 使用的索引
```

#### 2. 查询优化建议

```javascript
// ✅ 好的查询（使用索引）
db.orders.find({ userId: ObjectId("..."), status: "paid" })
  .sort({ createdAt: -1 })
  .limit(20)

// ❌ 差的查询（全表扫描）
db.orders.find({ 
  $where: "this.totalAmount > this.discount" 
})

// ✅ 优化后
db.orders.find({
  $expr: { $gt: ["$totalAmount", "$discount"] }
})

// ✅ 使用投影减少网络传输
db.users.find(
  { vipLevel: { $gte: 1 } },
  { name: 1, phone: 1, vipLevel: 1, _id: 0 }
)
```

### 连接池优化

```javascript
// 应用代码中的连接配置
const mongoOptions = {
  maxPoolSize: 10,        // 最大连接数
  minPoolSize: 2,         // 最小连接数
  maxIdleTimeMS: 30000,   // 最大空闲时间
  serverSelectionTimeoutMS: 5000, // 服务器选择超时
  heartbeatFrequencyMS: 10000,    // 心跳频率
}
```

### 内存优化

```javascript
// 分页查询，避免一次加载大量数据
const pageSize = 20;
const skip = (page - 1) * pageSize;

db.orders.find({ status: "completed" })
  .sort({ createdAt: -1 })
  .skip(skip)
  .limit(pageSize)

// 使用游标分页（推荐）
const lastId = ObjectId("...");
db.orders.find({
  _id: { $gt: lastId },
  status: "completed"
}).sort({ _id: 1 }).limit(20)
```

## 💾 备份恢复

### 数据备份

#### 1. 使用 mongodump

```bash
# 备份整个数据库
mongodump --uri="mongodb://app_user:app_password_123@localhost:27017/local-life-service" --out=/backup/$(date +%Y%m%d)

# 备份指定集合
mongodump --uri="mongodb://app_user:app_password_123@localhost:27017/local-life-service" --collection=users --out=/backup/users

# 压缩备份
mongodump --uri="mongodb://app_user:app_password_123@localhost:27017/local-life-service" --gzip --out=/backup/compressed
```

#### 2. 自动备份脚本

```bash
#!/bin/bash
# backup-mongodb.sh

BACKUP_DIR="/backup/mongodb"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="local-life-service"
MONGO_URI="mongodb://app_user:app_password_123@localhost:27017"

# 创建备份目录
mkdir -p $BACKUP_DIR/$DATE

# 执行备份
mongodump --uri="$MONGO_URI/$DB_NAME" --gzip --out=$BACKUP_DIR/$DATE

# 压缩备份文件
tar -czf $BACKUP_DIR/${DB_NAME}_${DATE}.tar.gz -C $BACKUP_DIR $DATE

# 删除临时文件夹
rm -rf $BACKUP_DIR/$DATE

# 只保留最近7天的备份
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: ${DB_NAME}_${DATE}.tar.gz"
```

### 数据恢复

#### 1. 使用 mongorestore

```bash
# 恢复整个数据库
mongorestore --uri="mongodb://app_user:app_password_123@localhost:27017" --gzip /backup/20241209/

# 恢复指定集合
mongorestore --uri="mongodb://app_user:app_password_123@localhost:27017/local-life-service" --collection=users /backup/users/local-life-service/users.bson.gz

# 恢复并覆盖现有数据
mongorestore --uri="mongodb://app_user:app_password_123@localhost:27017" --drop --gzip /backup/20241209/
```

#### 2. 增量备份策略

```javascript
// 基于 oplog 的增量备份
mongodump --uri="mongodb://admin:password123@localhost:27017/local" --oplog --out=/backup/incremental/

// 恢复时应用 oplog
mongorestore --uri="mongodb://admin:password123@localhost:27017" --oplogReplay /backup/incremental/
```

## 📊 监控运维

### 性能监控

#### 1. 监控指标

```javascript
// 数据库状态
db.serverStatus()

// 当前操作
db.currentOp()

// 慢查询日志
db.setProfilingLevel(2) // 记录所有操作
db.setProfilingLevel(1, { slowms: 100 }) // 只记录慢查询

// 查看慢查询
db.system.profile.find().sort({ ts: -1 }).limit(5)
```

#### 2. 监控脚本

```bash
#!/bin/bash
# mongodb-monitor.sh

MONGO_URI="mongodb://admin:password123@localhost:27017/admin"

# 检查MongoDB状态
STATUS=$(mongosh --quiet --uri="$MONGO_URI" --eval "db.runCommand('ping').ok")

if [ "$STATUS" == "1" ]; then
    echo "MongoDB is running"
    
    # 获取连接数
    CONNECTIONS=$(mongosh --quiet --uri="$MONGO_URI" --eval "db.serverStatus().connections.current")
    echo "Current connections: $CONNECTIONS"
    
    # 获取内存使用
    MEMORY=$(mongosh --quiet --uri="$MONGO_URI" --eval "db.serverStatus().mem.resident")
    echo "Memory usage: ${MEMORY}MB"
    
else
    echo "MongoDB is down"
    exit 1
fi
```

### 日志管理

```javascript
// 设置日志级别
db.setLogLevel(1, "query") // 查询日志
db.setLogLevel(2, "command") // 命令日志

// 查看日志设置
db.getLogComponents()
```

## 🔧 故障排除

### 常见问题

#### 1. 连接问题

```bash
# 检查MongoDB是否运行
ps aux | grep mongod
netstat -tlnp | grep 27017

# 检查防火墙
sudo ufw status
sudo firewall-cmd --list-ports

# 检查认证
mongosh --uri="mongodb://localhost:27017" --eval "db.runCommand('ping')"
```

#### 2. 性能问题

```javascript
// 查看慢查询
db.system.profile.find({ millis: { $gt: 100 } }).sort({ ts: -1 })

// 查看索引使用情况
db.collection.aggregate([{ $indexStats: {} }])

// 查看锁状态
db.serverStatus().locks
```

#### 3. 存储问题

```bash
# 检查磁盘空间
df -h

# 查看数据库大小
mongosh --eval "db.stats()"

# 压缩数据库
mongosh --eval "db.runCommand({compact: 'collection_name'})"
```

### 紧急恢复步骤

1. **服务停止**
   ```bash
   sudo systemctl stop mongod
   ```

2. **数据备份**
   ```bash
   cp -r /var/lib/mongodb /backup/emergency/
   ```

3. **修复数据**
   ```bash
   mongod --repair --dbpath /var/lib/mongodb
   ```

4. **重启服务**
   ```bash
   sudo systemctl start mongod
   ```

5. **验证数据完整性**
   ```javascript
   db.runCommand({validate: "collection_name"})
   ```

## 📋 运维检查清单

### 日常检查

- [ ] MongoDB 服务状态
- [ ] 连接数监控
- [ ] 内存使用情况
- [ ] 磁盘空间检查
- [ ] 慢查询分析
- [ ] 备份任务执行状态

### 周期性维护

- [ ] 索引优化分析
- [ ] 数据压缩清理
- [ ] 日志文件轮转
- [ ] 性能基准测试
- [ ] 备份恢复测试

### 紧急响应

- [ ] 监控告警配置
- [ ] 故障恢复流程
- [ ] 联系人信息更新
- [ ] 文档版本更新
