import mongoose from 'mongoose';
import { config } from './app';
import { logger } from '@/utils/logger';

/**
 * MongoDB 连接选项
 */
const mongoOptions = {
  // 连接池配置
  maxPoolSize: 10,
  minPoolSize: 2,
  maxIdleTimeMS: 30000,
  serverSelectionTimeoutMS: 5000,
  
  // 重连配置
  retryWrites: true,
  retryReads: true,
  
  // 其他配置
  bufferCommands: false,
  
  // 认证配置 - 移除authSource，让MongoDB自动处理
  // authSource: 'admin'
};

/**
 * 连接 MongoDB 数据库
 */
export const connectDatabase = async (): Promise<void> => {
  try {
    // 设置 Mongoose 配置
    mongoose.set('strictQuery', true);
    
    // 连接数据库
    await mongoose.connect(config.database.uri, mongoOptions);
    
    logger.info('✅ MongoDB 连接成功', {
      host: config.database.host,
      database: config.database.database,
      connectionState: mongoose.connection.readyState
    });

    // 监听连接事件
    mongoose.connection.on('error', (error) => {
      logger.error('❌ MongoDB 连接错误:', error);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('⚠️ MongoDB 连接断开');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('🔄 MongoDB 重新连接成功');
    });

  } catch (error) {
    logger.error('❌ MongoDB 连接失败:', error);
    throw error;
  }
};

/**
 * 关闭数据库连接
 */
export const closeDatabase = async (): Promise<void> => {
  try {
    await mongoose.connection.close();
    logger.info('✅ MongoDB 连接已关闭');
  } catch (error) {
    logger.error('❌ 关闭 MongoDB 连接失败:', error);
    throw error;
  }
};

/**
 * 获取数据库连接状态
 */
export const getDatabaseStatus = () => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  return {
    state: states[mongoose.connection.readyState as keyof typeof states],
    host: mongoose.connection.host,
    port: mongoose.connection.port,
    database: mongoose.connection.name,
    isConnected: mongoose.connection.readyState === 1
  };
};

/**
 * 健康检查
 */
export const healthCheck = async (): Promise<{
  status: 'healthy' | 'unhealthy';
  details: any;
}> => {
  try {
    // 执行简单的 ping 操作
    await mongoose.connection.db.admin().ping();
    
    const dbStatus = getDatabaseStatus();
    
    return {
      status: 'healthy',
      details: {
        ...dbStatus,
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      details: {
        error: error.message,
        timestamp: new Date().toISOString()
      }
    };
  }
};

// 导出 mongoose 实例以供其他模块使用
export { mongoose };