/**
 * 数据库迁移执行器
 * 用于执行和回滚数据库迁移
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

class MigrationRunner {
  constructor() {
    this.migrations = [];
    this.migrationCollection = null;
  }

  /**
   * 连接数据库
   */
  async connect(mongoUri) {
    try {
      await mongoose.connect(mongoUri);
      console.log('✅ 数据库连接成功');
      
      // 创建迁移记录集合
      this.migrationCollection = mongoose.connection.db.collection('migrations');
    } catch (error) {
      console.error('❌ 数据库连接失败:', error);
      process.exit(1);
    }
  }

  /**
   * 加载迁移文件
   */
  async loadMigrations() {
    const migrationDir = __dirname;
    const files = fs.readdirSync(migrationDir)
      .filter(file => file.endsWith('.js') && file !== 'migration-runner.js')
      .sort();

    for (const file of files) {
      try {
        const migration = require(path.join(migrationDir, file));
        this.migrations.push(migration);
        console.log(`📁 加载迁移文件: ${file}`);
      } catch (error) {
        console.error(`❌ 加载迁移文件失败 ${file}:`, error);
      }
    }

    console.log(`📊 共加载 ${this.migrations.length} 个迁移文件`);
  }

  /**
   * 获取已执行的迁移
   */
  async getExecutedMigrations() {
    try {
      const records = await this.migrationCollection.find({}).toArray();
      return records.map(record => record.name);
    } catch (error) {
      console.warn('⚠️  获取迁移记录失败，可能是首次执行:', error.message);
      return [];
    }
  }

  /**
   * 记录迁移执行
   */
  async recordMigration(migrationName) {
    await this.migrationCollection.insertOne({
      name: migrationName,
      executedAt: new Date()
    });
  }

  /**
   * 删除迁移记录
   */
  async removeMigrationRecord(migrationName) {
    await this.migrationCollection.deleteOne({ name: migrationName });
  }

  /**
   * 执行迁移
   */
  async migrate() {
    console.log('🚀 开始执行数据库迁移...\n');

    const executedMigrations = await this.getExecutedMigrations();
    let executedCount = 0;

    for (const migration of this.migrations) {
      if (executedMigrations.includes(migration.name)) {
        console.log(`⏭️  跳过已执行的迁移: ${migration.name}`);
        continue;
      }

      try {
        console.log(`🔄 执行迁移: ${migration.name}`);
        console.log(`📝 描述: ${migration.description}`);
        
        await migration.up.call(this);
        await this.recordMigration(migration.name);
        
        console.log(`✅ 迁移成功: ${migration.name}\n`);
        executedCount++;
      } catch (error) {
        console.error(`❌ 迁移失败: ${migration.name}`);
        console.error('错误详情:', error);
        process.exit(1);
      }
    }

    if (executedCount === 0) {
      console.log('✨ 所有迁移都已是最新状态');
    } else {
      console.log(`🎉 成功执行 ${executedCount} 个迁移`);
    }
  }

  /**
   * 回滚迁移
   */
  async rollback(steps = 1) {
    console.log(`🔄 开始回滚最近 ${steps} 个迁移...\n`);

    const executedMigrations = await this.getExecutedMigrations();
    const migrationsToRollback = executedMigrations
      .slice(-steps)
      .reverse();

    for (const migrationName of migrationsToRollback) {
      const migration = this.migrations.find(m => m.name === migrationName);
      
      if (!migration) {
        console.error(`❌ 找不到迁移文件: ${migrationName}`);
        continue;
      }

      try {
        console.log(`🔄 回滚迁移: ${migrationName}`);
        
        await migration.down.call(this);
        await this.removeMigrationRecord(migrationName);
        
        console.log(`✅ 回滚成功: ${migrationName}\n`);
      } catch (error) {
        console.error(`❌ 回滚失败: ${migrationName}`);
        console.error('错误详情:', error);
        process.exit(1);
      }
    }

    console.log('🎉 回滚完成');
  }

  /**
   * 显示迁移状态
   */
  async status() {
    console.log('📊 数据库迁移状态:\n');

    const executedMigrations = await this.getExecutedMigrations();

    for (const migration of this.migrations) {
      const status = executedMigrations.includes(migration.name) ? '✅ 已执行' : '⏸️  待执行';
      console.log(`${status} ${migration.name}`);
      console.log(`   📝 ${migration.description}\n`);
    }
  }

  /**
   * 断开数据库连接
   */
  async disconnect() {
    await mongoose.disconnect();
    console.log('🔌 数据库连接已断开');
  }

  /**
   * 辅助方法 - 创建索引
   */
  async createUserIndexes() {
    const db = mongoose.connection.db;
    const collection = db.collection('users');
    
    await collection.createIndexes([
      { key: { phone: 1 }, unique: true, background: true },
      { key: { userType: 1, isActive: 1 }, background: true },
      { key: { vipLevel: 1, vipExpireAt: 1 }, background: true },
      { key: { 'location.coordinates': '2dsphere' }, background: true },
      { key: { totalSpent: -1 }, background: true },
      { key: { lastLoginAt: -1 }, background: true },
      { key: { isActive: 1 }, background: true },
      { key: { isVerified: 1 }, background: true },
      { key: { createdAt: -1 }, background: true }
    ]);
  }

  async createStoreIndexes() {
    const db = mongoose.connection.db;
    const collection = db.collection('stores');
    
    await collection.createIndexes([
      { 
        key: { name: 'text', description: 'text', tags: 'text' },
        background: true,
        weights: { name: 10, tags: 5, description: 1 }
      },
      { key: { 'location.coordinates': '2dsphere' }, background: true },
      { key: { ownerId: 1, status: 1 }, background: true },
      { key: { status: 1, isVerified: 1 }, background: true },
      { key: { rating: -1, reviewCount: -1 }, background: true },
      { key: { name: 1 }, background: true },
      { key: { status: 1 }, background: true },
      { key: { isVerified: 1 }, background: true },
      { key: { totalRevenue: -1 }, background: true },
      { key: { createdAt: -1 }, background: true }
    ]);
  }

  async createRoomIndexes() {
    const db = mongoose.connection.db;
    const collection = db.collection('rooms');
    
    await collection.createIndexes([
      { key: { storeId: 1, status: 1 }, background: true },
      { key: { storeId: 1, isAvailable: 1 }, background: true },
      { key: { capacity: 1, isAvailable: 1 }, background: true },
      { key: { rating: -1, reviewCount: -1 }, background: true },
      { key: { price: 1 }, background: true },
      { key: { bookingCount: -1 }, background: true },
      { key: { status: 1 }, background: true },
      { key: { isAvailable: 1 }, background: true }
    ]);
  }

  async createOrderIndexes() {
    const db = mongoose.connection.db;
    const collection = db.collection('orders');
    
    await collection.createIndexes([
      { key: { orderNumber: 1 }, unique: true, background: true },
      { key: { userId: 1, status: 1 }, background: true },
      { key: { storeId: 1, status: 1 }, background: true },
      { key: { roomId: 1, startTime: 1 }, background: true },
      { key: { status: 1, expiredAt: 1 }, background: true },
      { key: { startTime: 1, endTime: 1 }, background: true },
      { key: { status: 1 }, background: true },
      { key: { type: 1 }, background: true },
      { key: { createdAt: -1 }, background: true },
      { key: { expiredAt: 1 }, background: true },
      { key: { isReviewed: 1 }, background: true }
    ]);
  }

  async createDishIndexes() {
    const db = mongoose.connection.db;
    const collection = db.collection('dishes');
    
    await collection.createIndexes([
      { 
        key: { name: 'text', description: 'text', tags: 'text' },
        background: true,
        weights: { name: 10, tags: 5, description: 1 }
      },
      { key: { storeId: 1, category: 1 }, background: true },
      { key: { storeId: 1, isActive: 1 }, background: true },
      { key: { category: 1, isActive: 1 }, background: true },
      { key: { storeId: 1 }, background: true },
      { key: { category: 1 }, background: true },
      { key: { isActive: 1 }, background: true },
      { key: { price: 1 }, background: true },
      { key: { salesCount: -1 }, background: true },
      { key: { rating: -1 }, background: true }
    ]);
  }

  async createReviewIndexes() {
    const db = mongoose.connection.db;
    const collection = db.collection('reviews');
    
    await collection.createIndexes([
      { key: { storeId: 1, isActive: 1 }, background: true },
      { key: { roomId: 1, isActive: 1 }, background: true },
      { key: { userId: 1, createdAt: -1 }, background: true },
      { key: { orderId: 1 }, unique: true, sparse: true, background: true },
      { key: { rating: 1, createdAt: -1 }, background: true },
      { key: { storeId: 1 }, background: true },
      { key: { roomId: 1 }, background: true },
      { key: { userId: 1 }, background: true },
      { key: { isActive: 1 }, background: true },
      { key: { createdAt: -1 }, background: true },
      { key: { helpfulCount: -1 }, background: true }
    ]);
  }

  async createPointIndexes() {
    const db = mongoose.connection.db;
    const collection = db.collection('pointrecords');
    
    await collection.createIndexes([
      { key: { userId: 1, type: 1 }, background: true },
      { key: { userId: 1, createdAt: -1 }, background: true },
      { key: { type: 1, createdAt: -1 }, background: true },
      { key: { expiredAt: 1, type: 1 }, background: true },
      { key: { isProcessed: 1, expiredAt: 1 }, background: true },
      { key: { userId: 1 }, background: true },
      { key: { orderId: 1 }, background: true },
      { key: { type: 1 }, background: true },
      { key: { source: 1, createdAt: -1 }, background: true },
      { key: { createdAt: -1 }, background: true }
    ]);
  }
}

// 命令行接口
async function main() {
  const command = process.argv[2];
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/local-life-service';
  
  const runner = new MigrationRunner();
  
  try {
    await runner.connect(mongoUri);
    await runner.loadMigrations();
    
    switch (command) {
      case 'migrate':
        await runner.migrate();
        break;
      case 'rollback':
        const steps = parseInt(process.argv[3]) || 1;
        await runner.rollback(steps);
        break;
      case 'status':
        await runner.status();
        break;
      default:
        console.log(`
🛠️  数据库迁移工具

用法:
  node migration-runner.js migrate     # 执行迁移
  node migration-runner.js rollback [steps]  # 回滚迁移
  node migration-runner.js status     # 查看状态

环境变量:
  MONGODB_URI  # MongoDB连接字符串 (默认: mongodb://localhost:27017/local-life-service)
        `);
    }
  } catch (error) {
    console.error('❌ 执行失败:', error);
    process.exit(1);
  } finally {
    await runner.disconnect();
  }
}

// 如果直接执行此文件
if (require.main === module) {
  main();
}

module.exports = MigrationRunner;
