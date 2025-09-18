import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import sharp from 'sharp';
import { createError } from '@/middleware/errorHandler';
import { BusinessLogger } from '@/utils/logger';
import { catchAsync } from '@/middleware/errorHandler';
import { ApiResponse } from '@/types';
import { cache } from '@/config/redis';

/**
 * 文件类型配置
 */
const FILE_TYPES = {
  avatar: {
    maxSize: 2 * 1024 * 1024, // 2MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    dimensions: { width: 200, height: 200 },
    quality: 80
  },
  store: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    dimensions: { width: 800, height: 600 },
    quality: 85
  },
  room: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    dimensions: { width: 800, height: 600 },
    quality: 85
  },
  dish: {
    maxSize: 3 * 1024 * 1024, // 3MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    dimensions: { width: 600, height: 600 },
    quality: 80
  },
  review: {
    maxSize: 3 * 1024 * 1024, // 3MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    dimensions: { width: 600, height: 400 },
    quality: 75
  }
};

/**
 * 文件上传控制器
 */
export class UploadController {
  /**
   * 创建存储配置
   */
  private static createStorage(uploadType: string) {
    return multer.diskStorage({
      destination: async (req, file, cb) => {
        const uploadDir = path.join(process.cwd(), 'uploads', uploadType);
        try {
          await fs.mkdir(uploadDir, { recursive: true });
          cb(null, uploadDir);
        } catch (error) {
          cb(error, '');
        }
      },
      filename: (req, file, cb) => {
        const timestamp = Date.now();
        const randomString = crypto.randomBytes(6).toString('hex');
        const ext = path.extname(file.originalname);
        const filename = `${uploadType}_${timestamp}_${randomString}${ext}`;
        cb(null, filename);
      }
    });
  }

  /**
   * 创建文件过滤器
   */
  private static createFileFilter(uploadType: string) {
    return (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
      const config = FILE_TYPES[uploadType as keyof typeof FILE_TYPES];
      if (!config) {
        return cb(new Error('不支持的上传类型'));
      }

      if (!config.allowedTypes.includes(file.mimetype)) {
        return cb(new Error(`只支持以下文件类型: ${config.allowedTypes.join(', ')}`));
      }

      cb(null, true);
    };
  }

  /**
   * 上传头像
   */
  static uploadAvatar = (() => {
    const upload = multer({
      storage: this.createStorage('avatar'),
      fileFilter: this.createFileFilter('avatar'),
      limits: { fileSize: FILE_TYPES.avatar.maxSize }
    }).single('avatar');

    return catchAsync(async (req: Request, res: Response): Promise<void> => {
      const userId = req.user?.id;

      if (!userId) {
        throw createError.unauthorized('需要登录', 'NOT_AUTHENTICATED');
      }

      upload(req, res, async (err) => {
        if (err) {
          if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
              throw createError.badRequest('文件大小超过限制（2MB）', 'FILE_TOO_LARGE');
            }
          }
          throw createError.badRequest(err.message, 'UPLOAD_ERROR');
        }

        if (!req.file) {
          throw createError.badRequest('没有选择文件', 'NO_FILE_SELECTED');
        }

        try {
          // 处理图片
          const processedFile = await this.processImage(req.file, 'avatar');
          
          // 删除原始文件
          await fs.unlink(req.file.path);

          // 记录业务日志
          BusinessLogger.info('头像上传', {
            userId,
            filename: processedFile.filename,
            originalName: req.file.originalname,
            size: processedFile.size
          });

          res.json({
            success: true,
            message: '头像上传成功',
            data: {
              url: processedFile.url,
              filename: processedFile.filename,
              size: processedFile.size
            }
          });
        } catch (error) {
          // 清理文件
          if (req.file) {
            await fs.unlink(req.file.path).catch(() => {});
          }
          throw error;
        }
      });
    });
  })();

  /**
   * 上传店铺图片
   */
  static uploadStoreImage = (() => {
    const upload = multer({
      storage: this.createStorage('store'),
      fileFilter: this.createFileFilter('store'),
      limits: { fileSize: FILE_TYPES.store.maxSize }
    }).array('images', 10); // 最多10张图片

    return catchAsync(async (req: Request, res: Response): Promise<void> => {
      const userId = req.user?.id;

      if (!userId) {
        throw createError.unauthorized('需要登录', 'NOT_AUTHENTICATED');
      }

      // 检查商户权限
      if (req.user?.userType !== 'merchant' && req.user?.userType !== 'admin') {
        throw createError.forbidden('只有商户可以上传店铺图片', 'INSUFFICIENT_PERMISSIONS');
      }

      upload(req, res, async (err) => {
        if (err) {
          if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
              throw createError.badRequest('文件大小超过限制（5MB）', 'FILE_TOO_LARGE');
            }
            if (err.code === 'LIMIT_FILE_COUNT') {
              throw createError.badRequest('最多只能上传10张图片', 'TOO_MANY_FILES');
            }
          }
          throw createError.badRequest(err.message, 'UPLOAD_ERROR');
        }

        const files = req.files as Express.Multer.File[];
        if (!files || files.length === 0) {
          throw createError.badRequest('没有选择文件', 'NO_FILE_SELECTED');
        }

        try {
          const processedFiles = [];

          // 处理所有图片
          for (const file of files) {
            const processedFile = await this.processImage(file, 'store');
            processedFiles.push(processedFile);
            
            // 删除原始文件
            await fs.unlink(file.path);
          }

          // 记录业务日志
          BusinessLogger.info('店铺图片上传', {
            userId,
            fileCount: processedFiles.length,
            totalSize: processedFiles.reduce((sum, file) => sum + file.size, 0)
          });

          res.json({
            success: true,
            message: '图片上传成功',
            data: {
              images: processedFiles.map(file => ({
                url: file.url,
                filename: file.filename,
                size: file.size
              }))
            }
          });
        } catch (error) {
          // 清理所有文件
          if (files) {
            for (const file of files) {
              await fs.unlink(file.path).catch(() => {});
            }
          }
          throw error;
        }
      });
    });
  })();

  /**
   * 上传菜品图片
   */
  static uploadDishImage = (() => {
    const upload = multer({
      storage: this.createStorage('dish'),
      fileFilter: this.createFileFilter('dish'),
      limits: { fileSize: FILE_TYPES.dish.maxSize }
    }).array('images', 5); // 最多5张图片

    return catchAsync(async (req: Request, res: Response): Promise<void> => {
      const userId = req.user?.id;

      if (!userId) {
        throw createError.unauthorized('需要登录', 'NOT_AUTHENTICATED');
      }

      // 检查商户权限
      if (req.user?.userType !== 'merchant' && req.user?.userType !== 'admin') {
        throw createError.forbidden('只有商户可以上传菜品图片', 'INSUFFICIENT_PERMISSIONS');
      }

      upload(req, res, async (err) => {
        if (err) {
          if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
              throw createError.badRequest('文件大小超过限制（3MB）', 'FILE_TOO_LARGE');
            }
            if (err.code === 'LIMIT_FILE_COUNT') {
              throw createError.badRequest('最多只能上传5张图片', 'TOO_MANY_FILES');
            }
          }
          throw createError.badRequest(err.message, 'UPLOAD_ERROR');
        }

        const files = req.files as Express.Multer.File[];
        if (!files || files.length === 0) {
          throw createError.badRequest('没有选择文件', 'NO_FILE_SELECTED');
        }

        try {
          const processedFiles = [];

          for (const file of files) {
            const processedFile = await this.processImage(file, 'dish');
            processedFiles.push(processedFile);
            
            await fs.unlink(file.path);
          }

          BusinessLogger.info('菜品图片上传', {
            userId,
            fileCount: processedFiles.length
          });

          res.json({
            success: true,
            message: '菜品图片上传成功',
            data: {
              images: processedFiles.map(file => ({
                url: file.url,
                filename: file.filename,
                size: file.size
              }))
            }
          });
        } catch (error) {
          if (files) {
            for (const file of files) {
              await fs.unlink(file.path).catch(() => {});
            }
          }
          throw error;
        }
      });
    });
  })();

  /**
   * 上传评价图片
   */
  static uploadReviewImage = (() => {
    const upload = multer({
      storage: this.createStorage('review'),
      fileFilter: this.createFileFilter('review'),
      limits: { fileSize: FILE_TYPES.review.maxSize }
    }).array('images', 9); // 最多9张图片

    return catchAsync(async (req: Request, res: Response): Promise<void> => {
      const userId = req.user?.id;

      if (!userId) {
        throw createError.unauthorized('需要登录', 'NOT_AUTHENTICATED');
      }

      upload(req, res, async (err) => {
        if (err) {
          if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
              throw createError.badRequest('文件大小超过限制（3MB）', 'FILE_TOO_LARGE');
            }
            if (err.code === 'LIMIT_FILE_COUNT') {
              throw createError.badRequest('最多只能上传9张图片', 'TOO_MANY_FILES');
            }
          }
          throw createError.badRequest(err.message, 'UPLOAD_ERROR');
        }

        const files = req.files as Express.Multer.File[];
        if (!files || files.length === 0) {
          throw createError.badRequest('没有选择文件', 'NO_FILE_SELECTED');
        }

        try {
          const processedFiles = [];

          for (const file of files) {
            const processedFile = await this.processImage(file, 'review');
            processedFiles.push(processedFile);
            
            await fs.unlink(file.path);
          }

          BusinessLogger.info('评价图片上传', {
            userId,
            fileCount: processedFiles.length
          });

          res.json({
            success: true,
            message: '评价图片上传成功',
            data: {
              images: processedFiles.map(file => ({
                url: file.url,
                filename: file.filename,
                size: file.size
              }))
            }
          });
        } catch (error) {
          if (files) {
            for (const file of files) {
              await fs.unlink(file.path).catch(() => {});
            }
          }
          throw error;
        }
      });
    });
  })();

  /**
   * 处理图片
   */
  private static async processImage(file: Express.Multer.File, type: string) {
    const config = FILE_TYPES[type as keyof typeof FILE_TYPES];
    const processedDir = path.join(path.dirname(file.path), 'processed');
    
    // 创建处理后的文件目录
    await fs.mkdir(processedDir, { recursive: true });
    
    const processedPath = path.join(processedDir, file.filename);
    
    // 使用sharp处理图片
    const pipeline = sharp(file.path);
    
    // 获取图片信息
    const metadata = await pipeline.metadata();
    
    // 调整尺寸（如果需要）
    if (config.dimensions) {
      const { width, height } = config.dimensions;
      pipeline.resize(width, height, {
        fit: 'cover',
        position: 'center'
      });
    }
    
    // 压缩质量
    if (metadata.format === 'jpeg') {
      pipeline.jpeg({ quality: config.quality });
    } else if (metadata.format === 'png') {
      pipeline.png({ quality: config.quality });
    } else if (metadata.format === 'webp') {
      pipeline.webp({ quality: config.quality });
    }
    
    // 保存处理后的图片
    await pipeline.toFile(processedPath);
    
    // 获取文件信息
    const stats = await fs.stat(processedPath);
    
    // 生成访问URL
    const relativePath = path.relative(process.cwd(), processedPath);
    const url = `/${relativePath.replace(/\\/g, '/')}`;
    
    return {
      filename: file.filename,
      url,
      size: stats.size,
      path: processedPath
    };
  }

  /**
   * 删除文件
   */
  static deleteFile = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { filename } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw createError.unauthorized('需要登录', 'NOT_AUTHENTICATED');
    }

    if (!filename) {
      throw createError.badRequest('文件名不能为空', 'FILENAME_REQUIRED');
    }

    try {
      // 查找文件
      const uploadTypes = Object.keys(FILE_TYPES);
      let filePath = '';
      let found = false;

      for (const type of uploadTypes) {
        const typePath = path.join(process.cwd(), 'uploads', type, 'processed', filename);
        try {
          await fs.access(typePath);
          filePath = typePath;
          found = true;
          break;
        } catch {
          // 文件不存在，继续查找
        }
      }

      if (!found) {
        throw createError.notFound('文件不存在', 'FILE_NOT_FOUND');
      }

      // 删除文件
      await fs.unlink(filePath);

      BusinessLogger.info('删除文件', {
        userId,
        filename,
        filePath
      });

      res.json({
        success: true,
        message: '文件删除成功'
      });
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw createError.notFound('文件不存在', 'FILE_NOT_FOUND');
      }
      throw error;
    }
  });

  /**
   * 获取文件信息
   */
  static getFileInfo = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { filename } = req.params;

    if (!filename) {
      throw createError.badRequest('文件名不能为空', 'FILENAME_REQUIRED');
    }

    try {
      // 查找文件
      const uploadTypes = Object.keys(FILE_TYPES);
      let fileInfo = null;

      for (const type of uploadTypes) {
        const typePath = path.join(process.cwd(), 'uploads', type, 'processed', filename);
        try {
          const stats = await fs.stat(typePath);
          const relativePath = path.relative(process.cwd(), typePath);
          const url = `/${relativePath.replace(/\\/g, '/')}`;
          
          fileInfo = {
            filename,
            type,
            size: stats.size,
            url,
            createdAt: stats.birthtime,
            modifiedAt: stats.mtime
          };
          break;
        } catch {
          // 文件不存在，继续查找
        }
      }

      if (!fileInfo) {
        throw createError.notFound('文件不存在', 'FILE_NOT_FOUND');
      }

      res.json({
        success: true,
        data: fileInfo
      });
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw createError.notFound('文件不存在', 'FILE_NOT_FOUND');
      }
      throw error;
    }
  });

  /**
   * 获取上传配置
   */
  static getUploadConfig = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const config = Object.entries(FILE_TYPES).reduce((acc, [type, typeConfig]) => {
      acc[type] = {
        maxSize: typeConfig.maxSize,
        maxSizeMB: Math.round(typeConfig.maxSize / (1024 * 1024) * 10) / 10,
        allowedTypes: typeConfig.allowedTypes,
        dimensions: typeConfig.dimensions,
        quality: typeConfig.quality
      };
      return acc;
    }, {} as any);

    res.json({
      success: true,
      data: config
    });
  });

  /**
   * 清理过期文件（管理员）
   */
  static cleanupExpiredFiles = catchAsync(async (req: Request, res: Response): Promise<void> => {
    if (req.user?.userType !== 'admin') {
      throw createError.forbidden('只有管理员可以清理文件', 'INSUFFICIENT_PERMISSIONS');
    }

    const { days = 30 } = req.query;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - Number(days));

    let deletedCount = 0;
    let totalSize = 0;

    try {
      const uploadTypes = Object.keys(FILE_TYPES);
      
      for (const type of uploadTypes) {
        const typeDir = path.join(process.cwd(), 'uploads', type, 'processed');
        
        try {
          const files = await fs.readdir(typeDir);
          
          for (const filename of files) {
            const filePath = path.join(typeDir, filename);
            const stats = await fs.stat(filePath);
            
            if (stats.mtime < cutoffDate) {
              await fs.unlink(filePath);
              deletedCount++;
              totalSize += stats.size;
            }
          }
        } catch (error) {
          // 目录不存在，跳过
        }
      }

      BusinessLogger.info('清理过期文件', {
        adminId: req.user?.id,
        deletedCount,
        totalSize,
        cutoffDays: Number(days)
      });

      res.json({
        success: true,
        message: `清理完成，删除了${deletedCount}个文件`,
        data: {
          deletedCount,
          totalSizeMB: Math.round(totalSize / (1024 * 1024) * 100) / 100,
          cutoffDays: Number(days)
        }
      });
    } catch (error) {
      BusinessLogger.error('清理文件失败', {
        adminId: req.user?.id,
        error: error.message
      });
      throw error;
    }
  });
}
