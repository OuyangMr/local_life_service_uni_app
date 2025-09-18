import { createClient, RedisClientType } from 'redis';
import { config } from './app';
import { logger } from '@/utils/logger';

// Redis客户端实例
let redisClient: RedisClientType;

/**
 * 连接Redis
 */
export const connectRedis = async (): Promise<void> => {
  try {
    redisClient = createClient({
      socket: {
        host: config.redis.host,
        port: config.redis.port,
      },
      password: config.redis.password,
      database: config.redis.db,
    });

    redisClient.on('error', (error) => {
      logger.error('❌ Redis连接错误:', error);
    });

    redisClient.on('connect', () => {
      logger.info('🔄 Redis正在连接...');
    });

    redisClient.on('ready', () => {
      logger.info('✅ Redis连接就绪');
    });

    await redisClient.connect();
  } catch (error) {
    logger.error('❌ Redis连接失败:', error);
    throw error;
  }
};

/**
 * 获取Redis客户端
 */
export const getRedisClient = (): RedisClientType => {
  if (!redisClient) {
    throw new Error('Redis客户端未初始化');
  }
  return redisClient;
};

/**
 * 关闭Redis连接
 */
export const closeRedis = async (): Promise<void> => {
  try {
    if (redisClient) {
      await redisClient.quit();
      logger.info('✅ Redis连接已关闭');
    }
  } catch (error) {
    logger.error('❌ 关闭Redis连接失败:', error);
    throw error;
  }
};

/**
 * Redis缓存工具类
 */
export class RedisCache {
  private client: RedisClientType | null = null;

  private getClient(): RedisClientType {
    if (!this.client) {
      this.client = getRedisClient();
    }
    return this.client;
  }

  /**
   * 设置缓存
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    const client = this.getClient();
    const serializedValue = JSON.stringify(value);
    if (ttl) {
      await client.setEx(key, ttl, serializedValue);
    } else {
      await client.set(key, serializedValue);
    }
  }

  /**
   * 获取缓存
   */
  async get<T>(key: string): Promise<T | null> {
    const client = this.getClient();
    const value = await client.get(key);
    if (!value) return null;
    
    try {
      return JSON.parse(value);
    } catch (error) {
      logger.error('Redis缓存数据解析失败:', error);
      return null;
    }
  }

  /**
   * 删除缓存
   */
  async del(key: string): Promise<void> {
    const client = this.getClient();
    await client.del(key);
  }

  /**
   * 检查键是否存在
   */
  async exists(key: string): Promise<boolean> {
    const client = this.getClient();
    const result = await client.exists(key);
    return result === 1;
  }

  /**
   * 设置过期时间
   */
  async expire(key: string, ttl: number): Promise<void> {
    const client = this.getClient();
    await client.expire(key, ttl);
  }

  /**
   * 获取剩余过期时间
   */
  async ttl(key: string): Promise<number> {
    const client = this.getClient();
    return await client.ttl(key);
  }

  /**
   * 增量操作
   */
  async incr(key: string): Promise<number> {
    const client = this.getClient();
    return await client.incr(key);
  }

  /**
   * 按照指定值增量
   */
  async incrBy(key: string, increment: number): Promise<number> {
    const client = this.getClient();
    return await client.incrBy(key, increment);
  }

  /**
   * 获取匹配模式的所有键
   */
  async keys(pattern: string): Promise<string[]> {
    const client = this.getClient();
    return await client.keys(pattern);
  }

  /**
   * 清空数据库
   */
  async flushDb(): Promise<void> {
    const client = this.getClient();
    await client.flushDb();
  }

  /**
   * List操作 - 左推入
   */
  async lpush(key: string, ...values: string[]): Promise<number> {
    const client = this.getClient();
    return await client.lPush(key, values);
  }

  /**
   * List操作 - 获取长度
   */
  async llen(key: string): Promise<number> {
    const client = this.getClient();
    return await client.lLen(key);
  }

  /**
   * List操作 - 范围获取
   */
  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    const client = this.getClient();
    return await client.lRange(key, start, stop);
  }

  /**
   * List操作 - 修剪
   */
  async ltrim(key: string, start: number, stop: number): Promise<void> {
    const client = this.getClient();
    await client.lTrim(key, start, stop);
  }
}

// 导出缓存实例
export const cache = new RedisCache();
