/**
 * 数据库初始化迁移
 * 创建核心业务表和索引
 */

const mongoose = require('mongoose');

const migration = {
  name: '001_initial_database_setup',
  description: '创建核心业务表：用户、店铺、包间、订单等',
  
  async up() {
    console.log('开始执行数据库初始化迁移...');
    
    // 1. 创建用户表索引
    await this.createUserIndexes();
    
    // 2. 创建店铺表索引
    await this.createStoreIndexes();
    
    // 3. 创建包间表索引
    await this.createRoomIndexes();
    
    // 4. 创建订单表索引
    await this.createOrderIndexes();
    
    // 5. 创建菜品表索引
    await this.createDishIndexes();
    
    // 6. 创建评价表索引
    await this.createReviewIndexes();
    
    // 7. 创建积分记录表索引
    await this.createPointIndexes();
    
    console.log('数据库初始化迁移完成');
  },

  async down() {
    console.log('开始回滚数据库初始化迁移...');
    
    // 删除所有集合
    const collections = [
      'users', 'stores', 'rooms', 'orders', 
      'dishes', 'reviews', 'pointrecords'
    ];
    
    for (const collection of collections) {
      try {
        await mongoose.connection.db.dropCollection(collection);
        console.log(`删除集合: ${collection}`);
      } catch (error) {
        if (error.code !== 26) { // 26 = NamespaceNotFound
          throw error;
        }
      }
    }
    
    console.log('数据库初始化迁移回滚完成');
  },

  /**
   * 创建用户表索引
   */
  async createUserIndexes() {
    const db = mongoose.connection.db;
    const collection = db.collection('users');
    
    await collection.createIndexes([
      // 唯一索引
      { key: { phone: 1 }, unique: true, background: true },
      
      // 复合索引
      { key: { userType: 1, isActive: 1 }, background: true },
      { key: { vipLevel: 1, vipExpireAt: 1 }, background: true },
      
      // 地理位置索引
      { key: { 'location.coordinates': '2dsphere' }, background: true },
      
      // 单字段索引
      { key: { totalSpent: -1 }, background: true },
      { key: { lastLoginAt: -1 }, background: true },
      { key: { isActive: 1 }, background: true },
      { key: { isVerified: 1 }, background: true },
      { key: { createdAt: -1 }, background: true }
    ]);
    
    console.log('✅ 用户表索引创建完成');
  },

  /**
   * 创建店铺表索引
   */
  async createStoreIndexes() {
    const db = mongoose.connection.db;
    const collection = db.collection('stores');
    
    await collection.createIndexes([
      // 文本搜索索引
      { 
        key: { name: 'text', description: 'text', tags: 'text' },
        background: true,
        weights: { name: 10, tags: 5, description: 1 }
      },
      
      // 地理位置索引
      { key: { 'location.coordinates': '2dsphere' }, background: true },
      
      // 复合索引
      { key: { ownerId: 1, status: 1 }, background: true },
      { key: { status: 1, isVerified: 1 }, background: true },
      { key: { rating: -1, reviewCount: -1 }, background: true },
      
      // 单字段索引
      { key: { name: 1 }, background: true },
      { key: { status: 1 }, background: true },
      { key: { isVerified: 1 }, background: true },
      { key: { totalRevenue: -1 }, background: true },
      { key: { createdAt: -1 }, background: true }
    ]);
    
    console.log('✅ 店铺表索引创建完成');
  },

  /**
   * 创建包间表索引
   */
  async createRoomIndexes() {
    const db = mongoose.connection.db;
    const collection = db.collection('rooms');
    
    await collection.createIndexes([
      // 复合索引
      { key: { storeId: 1, status: 1 }, background: true },
      { key: { storeId: 1, isAvailable: 1 }, background: true },
      { key: { capacity: 1, isAvailable: 1 }, background: true },
      { key: { rating: -1, reviewCount: -1 }, background: true },
      
      // 单字段索引
      { key: { price: 1 }, background: true },
      { key: { bookingCount: -1 }, background: true },
      { key: { status: 1 }, background: true },
      { key: { isAvailable: 1 }, background: true }
    ]);
    
    console.log('✅ 包间表索引创建完成');
  },

  /**
   * 创建订单表索引
   */
  async createOrderIndexes() {
    const db = mongoose.connection.db;
    const collection = db.collection('orders');
    
    await collection.createIndexes([
      // 唯一索引
      { key: { orderNumber: 1 }, unique: true, background: true },
      
      // 复合索引
      { key: { userId: 1, status: 1 }, background: true },
      { key: { storeId: 1, status: 1 }, background: true },
      { key: { roomId: 1, startTime: 1 }, background: true },
      { key: { status: 1, expiredAt: 1 }, background: true },
      { key: { startTime: 1, endTime: 1 }, background: true },
      
      // 单字段索引
      { key: { status: 1 }, background: true },
      { key: { type: 1 }, background: true },
      { key: { createdAt: -1 }, background: true },
      { key: { expiredAt: 1 }, background: true },
      { key: { isReviewed: 1 }, background: true }
    ]);
    
    console.log('✅ 订单表索引创建完成');
  },

  /**
   * 创建菜品表索引
   */
  async createDishIndexes() {
    const db = mongoose.connection.db;
    const collection = db.collection('dishes');
    
    await collection.createIndexes([
      // 文本搜索索引
      { 
        key: { name: 'text', description: 'text', tags: 'text' },
        background: true,
        weights: { name: 10, tags: 5, description: 1 }
      },
      
      // 复合索引
      { key: { storeId: 1, category: 1 }, background: true },
      { key: { storeId: 1, isActive: 1 }, background: true },
      { key: { category: 1, isActive: 1 }, background: true },
      
      // 单字段索引
      { key: { storeId: 1 }, background: true },
      { key: { category: 1 }, background: true },
      { key: { isActive: 1 }, background: true },
      { key: { price: 1 }, background: true },
      { key: { salesCount: -1 }, background: true },
      { key: { rating: -1 }, background: true }
    ]);
    
    console.log('✅ 菜品表索引创建完成');
  },

  /**
   * 创建评价表索引
   */
  async createReviewIndexes() {
    const db = mongoose.connection.db;
    const collection = db.collection('reviews');
    
    await collection.createIndexes([
      // 复合索引
      { key: { storeId: 1, isActive: 1 }, background: true },
      { key: { roomId: 1, isActive: 1 }, background: true },
      { key: { userId: 1, createdAt: -1 }, background: true },
      { key: { rating: 1, createdAt: -1 }, background: true },
      
      // 单字段索引
      { key: { storeId: 1 }, background: true },
      { key: { roomId: 1 }, background: true },
      { key: { userId: 1 }, background: true },
      { key: { orderId: 1 }, background: true },
      { key: { isActive: 1 }, background: true },
      { key: { createdAt: -1 }, background: true }
    ]);
    
    console.log('✅ 评价表索引创建完成');
  },

  /**
   * 创建积分记录表索引
   */
  async createPointIndexes() {
    const db = mongoose.connection.db;
    const collection = db.collection('pointrecords');
    
    await collection.createIndexes([
      // 复合索引
      { key: { userId: 1, type: 1 }, background: true },
      { key: { userId: 1, createdAt: -1 }, background: true },
      { key: { type: 1, createdAt: -1 }, background: true },
      
      // 单字段索引
      { key: { userId: 1 }, background: true },
      { key: { orderId: 1 }, background: true },
      { key: { type: 1 }, background: true },
      { key: { createdAt: -1 }, background: true }
    ]);
    
    console.log('✅ 积分记录表索引创建完成');
  }
};

module.exports = migration;
