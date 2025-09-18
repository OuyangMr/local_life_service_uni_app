import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

import { config } from '@/config/app';
import { logger } from '@/utils/logger';
import { connectDatabase } from '@/config/database';
import { connectRedis } from '@/config/redis';
import { 
  errorHandler, 
  notFoundHandler, 
  setupGlobalErrorHandlers 
} from '@/middleware/errorHandler';
import { expressRateLimit, speedLimiter } from '@/middleware/rateLimiter';
import { authMiddleware } from '@/middleware/auth';

// WebSocket服务
import { initWebSocketServer } from '@/websocket/server';

// 路由导入
import authRoutes from '@/routes/auth';
import storeRoutes from '@/routes/store';
import orderRoutes from '@/routes/order';
import bookingRoutes from '@/routes/booking';
import dishRoutes from '@/routes/dish';
import paymentRoutes from '@/routes/payment';
import pointRoutes from '@/routes/point';
import notificationRoutes from '@/routes/notification';
import uploadRoutes from '@/routes/upload';
// TODO: 其他路由待实现
// import qrcodeRoutes from '@/routes/qrcode';

class Application {
  public app: express.Application;
  public server: any;
  public io: SocketIOServer;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: config.cors.origins,
        credentials: config.cors.credentials
      }
    });

    // 设置全局异常处理
    setupGlobalErrorHandlers();
    
    // 信任代理
    this.app.set('trust proxy', true);

    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
    this.initializeSocket();
  }

  private initializeMiddleware(): void {
    // 安全中间件
    this.app.use(helmet());
    
    // CORS配置
    this.app.use(cors({
      origin: config.cors.origins,
      credentials: config.cors.credentials,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    }));

    // 压缩响应
    this.app.use(compression());

    // 请求日志
    this.app.use(morgan('combined', { 
      stream: { write: (message) => logger.info(message.trim()) }
    }));

    // 请求体解析
    this.app.use(express.json({ 
      limit: '10mb',
      verify: (req, res, buf) => {
        // 存储原始请求体以便签名验证
        (req as any).rawBody = buf;
      }
    }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // 限流
    this.app.use(expressRateLimit);
    this.app.use(speedLimiter);

    // 静态文件服务
    this.app.use('/uploads', express.static('uploads'));
  }

  private initializeRoutes(): void {
    // 健康检查
    this.app.get('/health', async (req, res) => {
      try {
        const healthCheck = {
          status: 'ok',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          environment: config.env,
          version: '1.0.0',
          database: 'connected', // 可以添加数据库连接检查
          redis: 'connected',     // 可以添加Redis连接检查
          memory: {
            used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          },
        };

        res.status(200).json(healthCheck);
      } catch (error) {
        logger.error('健康检查失败:', error);
        res.status(503).json({
          status: 'error',
          timestamp: new Date().toISOString(),
          error: '服务不可用',
        });
      }
    });

    // 根路由
    this.app.get('/', (req, res) => {
      res.json({
        success: true,
        message: '本地生活服务 API',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        environment: config.env,
      });
    });

    // API路由
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/stores', storeRoutes);
    this.app.use('/api/orders', orderRoutes);
    this.app.use('/api/bookings', bookingRoutes);
    this.app.use('/api/dishes', dishRoutes);
    this.app.use('/api/payments', paymentRoutes);
    this.app.use('/api/points', pointRoutes);
    this.app.use('/api/notifications', notificationRoutes);
    this.app.use('/api/upload', uploadRoutes);
    // TODO: 其他路由待实现
    // this.app.use('/api/qrcode', authMiddleware, qrcodeRoutes);

    // API文档（开发环境）
    if (config.env === 'development') {
      this.app.get('/api', (req, res) => {
        res.json({
          message: 'API Documentation',
          version: '1.0.0',
          endpoints: {
            auth: {
              'POST /api/auth/register': '用户注册',
              'POST /api/auth/login': '用户登录',
              'POST /api/auth/logout': '用户退出',
              'POST /api/auth/refresh': '刷新Token',
              'POST /api/auth/sms/send': '发送短信验证码',
              'POST /api/auth/sms/verify': '验证短信验证码',
              'POST /api/auth/reset-password': '重置密码',
              'GET /api/auth/profile': '获取用户信息',
              'PUT /api/auth/profile': '更新用户信息',
            },
            stores: {
              'POST /api/stores': '创建店铺',
              'GET /api/stores': '获取店铺列表',
              'GET /api/stores/:id': '获取店铺详情',
              'PUT /api/stores/:id': '更新店铺信息',
              'DELETE /api/stores/:id': '删除店铺',
              'GET /api/stores/my/list': '获取我的店铺',
              'PATCH /api/stores/:id/review': '审核店铺（管理员）',
              'GET /api/stores/nearby/search': '搜索附近店铺',
              'POST /api/stores/search': '搜索店铺',
              'GET /api/stores/top/rated': '获取热门店铺',
            },
            orders: {
              'POST /api/orders': '创建订单',
              'GET /api/orders': '获取订单列表',
              'GET /api/orders/:id': '获取订单详情',
              'PATCH /api/orders/:id/status': '更新订单状态',
              'POST /api/orders/:id/cancel': '取消订单',
              'GET /api/orders/stats/summary': '获取订单统计',
            },
            health: {
              'GET /health': '健康检查',
              'GET /': '根路由信息',
            }
          }
        });
      });
    }

    // 404处理
    this.app.use(notFoundHandler);
  }

  private initializeErrorHandling(): void {
    this.app.use(errorHandler);
  }

  private initializeSocket(): void {
    this.io.on('connection', (socket) => {
      logger.info(`客户端连接: ${socket.id}`);

      // 加入房间（按商户分组）
      socket.on('join-store', (storeId: string) => {
        socket.join(`store-${storeId}`);
        logger.info(`客户端 ${socket.id} 加入商户 ${storeId} 房间`);
      });

      // 监听订单状态更新
      socket.on('order-update', (data) => {
        socket.to(`store-${data.storeId}`).emit('order-status-changed', data);
      });

      // 监听包间状态更新
      socket.on('room-update', (data) => {
        socket.to(`store-${data.storeId}`).emit('room-status-changed', data);
      });

      socket.on('disconnect', () => {
        logger.info(`客户端断开连接: ${socket.id}`);
      });
    });
  }

  public async start(): Promise<void> {
    try {
      // 连接数据库
      await connectDatabase();
      logger.info('✅ 数据库连接成功');

      // 连接Redis
      await connectRedis();
      logger.info('✅ Redis连接成功');

      // 初始化WebSocket服务器
      initWebSocketServer(this.server);
      logger.info('✅ WebSocket服务器初始化成功');

      // 启动服务器
      const port = config.port;
      this.server.listen(port, () => {
        logger.info(`🚀 服务器运行在端口 ${port}`);
        logger.info(`🌍 环境: ${config.env}`);
        logger.info(`📍 URL: http://localhost:${port}`);
        logger.info(`📚 API文档: http://localhost:${port}/api`);
        logger.info(`💚 健康检查: http://localhost:${port}/health`);
        logger.info(`🔌 WebSocket: ws://localhost:${port}`);
      });

      // 优雅关闭
      this.setupGracefulShutdown();

    } catch (error) {
      logger.error('❌ 服务器启动失败:', error);
      process.exit(1);
    }
  }

  private setupGracefulShutdown(): void {
    const shutdown = (signal: string) => {
      logger.info(`📡 收到 ${signal} 信号，开始优雅关闭...`);
      
      this.server.close(() => {
        logger.info('✅ HTTP服务器已关闭');
        process.exit(0);
      });

      // 强制关闭超时
      setTimeout(() => {
        logger.error('❌ 强制关闭服务器');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }
}

// 启动应用
const application = new Application();
application.start();

export default application;
