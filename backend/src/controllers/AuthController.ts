import { Request, Response, NextFunction } from 'express';
import { User } from '@/models/User';
import { generateToken, generateRefreshToken, verifyRefreshToken, blacklistToken } from '@/middleware/auth';
import { createError } from '@/middleware/errorHandler';
import { cache } from '@/config/redis';
import { BusinessLogger, logger } from '@/utils/logger';
import { catchAsync } from '@/middleware/errorHandler';
import { ApiResponse, TokenInfo, LoginCredentials, RegisterInfo } from '@/types';

/**
 * 认证控制器
 */
export class AuthController {
  /**
   * 用户注册
   */
  static register = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { phone, password, verificationCode, inviteCode }: RegisterInfo = req.body;

    // 验证短信验证码
    const cacheKey = `sms_code:register:${phone}`;
    const cachedCode = await cache.get(cacheKey);
    
    if (!cachedCode || cachedCode !== verificationCode) {
      throw createError.badRequest('验证码错误或已过期', 'INVALID_VERIFICATION_CODE');
    }

    // 检查手机号是否已注册
    const existingUser = await User.findByPhone(phone);
    if (existingUser) {
      throw createError.conflict('手机号已注册', 'PHONE_ALREADY_EXISTS');
    }

    // 创建用户
    const userData: any = {
      phone,
      password,
      isVerified: true,
    };

    // 处理邀请码逻辑
    if (inviteCode) {
      // 可以在这里实现邀请码奖励逻辑
      userData.invitedBy = inviteCode;
    }

    const user = new User(userData);
    await user.save();

    // 清除验证码缓存
    await cache.del(cacheKey);

    // 生成Token
    const token = generateToken({
      id: user._id,
      phone: user.phone,
      userType: user.userType,
      vipLevel: user.vipLevel,
    });

    const refreshToken = generateRefreshToken(user._id);

    // 缓存刷新Token
    await cache.set(`refresh_token:${user._id}`, refreshToken, 7 * 24 * 60 * 60); // 7天

    // 记录注册日志  
    logger.info('用户注册成功', {
      userId: user._id,
      phone,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      inviteCode,
    });

    // 返回响应
    const response: ApiResponse<{ user: any; tokens: TokenInfo }> = {
      success: true,
      message: '注册成功',
      data: {
        user: {
          id: user._id,
          phone: user.phone,
          nickname: user.nickname,
          avatar: user.avatar,
          userType: user.userType,
          vipLevel: user.vipLevel,
          balance: user.balance,
          isVip: user.isVip,
        },
        tokens: {
          token,
          refreshToken,
          expiresIn: 24 * 60 * 60, // 24小时
        },
      },
      timestamp: new Date().toISOString(),
    };

    res.status(201).json(response);
  });

  /**
   * 用户登录
   */
  static login = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { phone, password }: LoginCredentials = req.body;

    // 查找用户
    const user = await User.findByPhone(phone);
    if (!user) {
      throw createError.unauthorized('用户不存在或密码错误', 'INVALID_CREDENTIALS');
    }

    // 验证密码
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      // 记录登录失败
      BusinessLogger.securityEvent(
        'LOGIN_FAILED',
        req.ip,
        user._id,
        { phone, reason: 'invalid_password' }
      );
      
      throw createError.unauthorized('用户不存在或密码错误', 'INVALID_CREDENTIALS');
    }

    // 检查用户状态
    if (!user.isActive) {
      throw createError.forbidden('账户已被禁用', 'ACCOUNT_DISABLED');
    }

    // 更新最后登录时间
    await user.updateLastLogin();

    // 生成Token
    const token = generateToken({
      id: user._id,
      phone: user.phone,
      userType: user.userType,
      vipLevel: user.vipLevel,
      storeId: user.userType === 'merchant' ? user.storeId : undefined,
    });

    const refreshToken = generateRefreshToken(user._id);

    // 缓存刷新Token（覆盖旧的）
    await cache.set(`refresh_token:${user._id}`, refreshToken, 7 * 24 * 60 * 60); // 7天

    // 记录登录日志
    BusinessLogger.userLogin(user._id, phone, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });

    // 返回响应
    const response: ApiResponse<{ user: any; tokens: TokenInfo }> = {
      success: true,
      message: '登录成功',
      data: {
        user: {
          id: user._id,
          phone: user.phone,
          nickname: user.nickname,
          avatar: user.avatar,
          userType: user.userType,
          vipLevel: user.vipLevel,
          balance: user.balance,
          isVip: user.isVip,
          lastLoginAt: user.lastLoginAt,
        },
        tokens: {
          token,
          refreshToken,
          expiresIn: 24 * 60 * 60, // 24小时
        },
      },
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  });

  /**
   * 刷新Token
   */
  static refreshToken = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw createError.badRequest('缺少刷新Token', 'MISSING_REFRESH_TOKEN');
    }

    // 验证刷新Token
    const decoded = verifyRefreshToken(refreshToken);
    const { userId } = decoded;

    // 检查缓存中的刷新Token
    const cachedToken = await cache.get(`refresh_token:${userId}`);
    if (!cachedToken || cachedToken !== refreshToken) {
      throw createError.unauthorized('刷新Token无效', 'INVALID_REFRESH_TOKEN');
    }

    // 获取用户信息
    const user = await User.findById(userId);
    if (!user || !user.isActive) {
      throw createError.unauthorized('用户不存在或已被禁用', 'USER_NOT_FOUND');
    }

    // 生成新的Token
    const newToken = generateToken({
      id: user._id,
      phone: user.phone,
      userType: user.userType,
      vipLevel: user.vipLevel,
      storeId: user.userType === 'merchant' ? user.storeId : undefined,
    });

    const newRefreshToken = generateRefreshToken(user._id);

    // 更新缓存中的刷新Token
    await cache.set(`refresh_token:${userId}`, newRefreshToken, 7 * 24 * 60 * 60); // 7天

    // 返回响应
    const response: ApiResponse<TokenInfo> = {
      success: true,
      message: 'Token刷新成功',
      data: {
        token: newToken,
        refreshToken: newRefreshToken,
        expiresIn: 24 * 60 * 60, // 24小时
      },
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  });

  /**
   * 退出登录
   */
  static logout = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id;
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (userId) {
      // 删除刷新Token
      await cache.del(`refresh_token:${userId}`);

      // 将当前Token加入黑名单
      if (token) {
        await blacklistToken(userId, 24 * 60 * 60); // 24小时
      }

      // 记录退出日志
      BusinessLogger.userAction(userId, 'LOGOUT', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });
    }

    const response: ApiResponse = {
      success: true,
      message: '退出成功',
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  });

  /**
   * 发送短信验证码
   */
  static sendSmsCode = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { phone, type } = req.body;

    // 检查是否需要验证用户是否存在
    if (type === 'login' || type === 'reset_password') {
      const user = await User.findByPhone(phone);
      if (!user) {
        throw createError.notFound('手机号未注册', 'PHONE_NOT_REGISTERED');
      }
    } else if (type === 'register') {
      const user = await User.findByPhone(phone);
      if (user) {
        throw createError.conflict('手机号已注册', 'PHONE_ALREADY_EXISTS');
      }
    }

    // 生成6位验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // 缓存验证码，有效期5分钟
    const cacheKey = `sms_code:${type}:${phone}`;
    await cache.set(cacheKey, code, 5 * 60);

    // 这里应该调用短信服务发送验证码
    // await smsService.sendCode(phone, code, type);

    // 开发环境下直接返回验证码（生产环境应该删除）
    const isDevelopment = process.env.NODE_ENV === 'development';

    const response: ApiResponse<{ code?: string }> = {
      success: true,
      message: '验证码发送成功',
      data: isDevelopment ? { code } : undefined,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  });

  /**
   * 验证短信验证码
   */
  static verifySmsCode = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { phone, code, type } = req.body;

    const cacheKey = `sms_code:${type}:${phone}`;
    const cachedCode = await cache.get(cacheKey);

    if (!cachedCode || cachedCode !== code) {
      throw createError.badRequest('验证码错误或已过期', 'INVALID_VERIFICATION_CODE');
    }

    // 验证成功后删除缓存
    await cache.del(cacheKey);

    const response: ApiResponse = {
      success: true,
      message: '验证码验证成功',
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  });

  /**
   * 重置密码
   */
  static resetPassword = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { phone, verificationCode, newPassword } = req.body;

    // 验证短信验证码
    const cacheKey = `sms_code:reset_password:${phone}`;
    const cachedCode = await cache.get(cacheKey);

    if (!cachedCode || cachedCode !== verificationCode) {
      throw createError.badRequest('验证码错误或已过期', 'INVALID_VERIFICATION_CODE');
    }

    // 查找用户
    const user = await User.findByPhone(phone);
    if (!user) {
      throw createError.notFound('用户不存在', 'USER_NOT_FOUND');
    }

    // 更新密码
    user.password = newPassword;
    await user.save();

    // 清除验证码缓存
    await cache.del(cacheKey);

    // 清除所有刷新Token（强制重新登录）
    await cache.del(`refresh_token:${user._id}`);

    // 记录密码重置日志
    BusinessLogger.userAction(user._id, 'PASSWORD_RESET', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      phone,
    });

    const response: ApiResponse = {
      success: true,
      message: '密码重置成功，请重新登录',
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  });

  /**
   * 获取当前用户信息
   */
  static getProfile = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      throw createError.unauthorized('未登录', 'NOT_AUTHENTICATED');
    }

    const user = await User.findById(userId).populate('preferredStores', 'name address');
    if (!user) {
      throw createError.notFound('用户不存在', 'USER_NOT_FOUND');
    }

    const response: ApiResponse = {
      success: true,
      message: '获取用户信息成功',
      data: {
        id: user._id,
        phone: user.phone,
        nickname: user.nickname,
        avatar: user.avatar,
        userType: user.userType,
        vipLevel: user.vipLevel,
        vipStatus: user.vipStatus,
        balance: user.balance,
        totalSpent: user.totalSpent,
        preferredStores: user.preferredStores,
        location: user.location,
        isActive: user.isActive,
        isVerified: user.isVerified,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
      },
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  });

  /**
   * 更新用户信息
   */
  static updateProfile = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id;
    const { nickname, avatar, location } = req.body;

    if (!userId) {
      throw createError.unauthorized('未登录', 'NOT_AUTHENTICATED');
    }

    const user = await User.findById(userId);
    if (!user) {
      throw createError.notFound('用户不存在', 'USER_NOT_FOUND');
    }

    // 更新允许的字段
    if (nickname !== undefined) user.nickname = nickname;
    if (avatar !== undefined) user.avatar = avatar;
    if (location !== undefined) user.location = location;

    await user.save();

    const response: ApiResponse = {
      success: true,
      message: '用户信息更新成功',
      data: {
        id: user._id,
        phone: user.phone,
        nickname: user.nickname,
        avatar: user.avatar,
        location: user.location,
      },
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  });
}
