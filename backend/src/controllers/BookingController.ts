import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Order, OrderStatus } from '@/models/Order';
import { Store } from '@/models/Store';
import { Room } from '@/models/Room';
import { User } from '@/models/User';
import { PointRecord, PointType, PointSource } from '@/models/PointRecord';
import { createError } from '@/middleware/errorHandler';
import { BusinessLogger } from '@/utils/logger';
import { catchAsync } from '@/middleware/errorHandler';
import { ApiResponse, PaginatedResponse } from '@/types';

/**
 * 预订管理控制器
 */
export class BookingController {
  /**
   * 创建预订
   */
  static createBooking = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id;
    const { storeId, roomId, startTime, endTime, guestCount, specialRequests } = req.body;

    if (!userId) {
      throw createError.unauthorized('需要登录', 'NOT_AUTHENTICATED');
    }

    // 验证店铺存在
    const store = await Store.findById(storeId);
    if (!store) {
      throw createError.notFound('店铺不存在', 'STORE_NOT_FOUND');
    }

    if (store.status !== 'active') {
      throw createError.badRequest('店铺暂停营业', 'STORE_UNAVAILABLE');
    }

    // 验证包间
    const room = await Room.findById(roomId);
    if (!room) {
      throw createError.notFound('包间不存在', 'ROOM_NOT_FOUND');
    }

    if (room.storeId.toString() !== storeId) {
      throw createError.badRequest('包间与店铺不匹配', 'ROOM_STORE_MISMATCH');
    }

    // 检查容量
    if (guestCount > room.capacity) {
      throw createError.badRequest(`包间容量最多${room.capacity}人`, 'CAPACITY_EXCEEDED');
    }

    // 检查时间可用性
    const isAvailable = await room.isAvailableAt(new Date(startTime), new Date(endTime));
    if (!isAvailable) {
      throw createError.conflict('该时间段已被预订', 'TIME_SLOT_UNAVAILABLE');
    }

    // 获取用户信息检查VIP状态
    const user = await User.findById(userId);
    if (!user) {
      throw createError.notFound('用户不存在', 'USER_NOT_FOUND');
    }

    const isVip = user.vipLevel > 0 && (!user.vipExpireAt || user.vipExpireAt > new Date());

    // 计算价格和押金
    const duration = (new Date(endTime).getTime() - new Date(startTime).getTime()) / (1000 * 60 * 60);
    const subtotal = room.price * duration;
    const deposit = isVip ? 0 : (room.deposit || room.price * 0.3); // VIP免押金

    // 开始事务
    const session = await mongoose.startSession();
    
    try {
      await session.withTransaction(async () => {
        // 创建预订订单
        const order = new Order({
          userId,
          storeId,
          roomId,
          type: 'room_booking',
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          guestCount,
          items: [{
            dishId: roomId, // 使用roomId作为商品ID
            name: `${room.name} - ${duration}小时`,
            price: room.price,
            quantity: duration,
            subtotal: subtotal
          }],
          subtotal,
          deposit,
          totalAmount: subtotal + deposit,
          actualAmount: subtotal + deposit,
          contactPhone: user.phone,
          specialRequests,
          status: OrderStatus.PENDING
        });

        await order.save({ session });

        // 更新包间状态
        await Room.findByIdAndUpdate(
          roomId,
          { status: 'reserved' },
          { session }
        );

        // 记录业务日志
        BusinessLogger.info('创建预订', {
          userId,
          orderId: order._id,
          storeId,
          roomId,
          isVipBooking: isVip,
          deposit,
          startTime,
          endTime
        });

        res.status(201).json({
          success: true,
          message: isVip ? 'VIP预订创建成功，无需押金' : '预订创建成功',
          data: {
            order,
            vipPrivileges: isVip ? ['免押金预订', '优先处理', '专属客服'] : null
          }
        });
      });
    } finally {
      await session.endSession();
    }
  });

  /**
   * 取消预订
   */
  static cancelBooking = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id;
    const { orderId } = req.params;
    const { reason } = req.body;

    if (!userId) {
      throw createError.unauthorized('需要登录', 'NOT_AUTHENTICATED');
    }

    const order = await Order.findById(orderId);
    if (!order) {
      throw createError.notFound('订单不存在', 'ORDER_NOT_FOUND');
    }

    // 权限检查
    if (order.userId.toString() !== userId && req.user?.userType !== 'admin') {
      throw createError.forbidden('无权取消此订单', 'INSUFFICIENT_PERMISSIONS');
    }

    if (!order.canCancel()) {
      throw createError.badRequest('当前状态下无法取消订单', 'CANNOT_CANCEL');
    }

    // 检查取消时间限制
    const now = new Date();
    const startTime = new Date(order.startTime!);
    const timeDiff = startTime.getTime() - now.getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);

    // VIP用户可以在预订时间前1小时取消，普通用户需要2小时
    const user = await User.findById(userId);
    const isVip = user?.vipLevel > 0 && (!user.vipExpireAt || user.vipExpireAt > new Date());
    const minCancelHours = isVip ? 1 : 2;

    if (hoursDiff < minCancelHours) {
      throw createError.badRequest(
        `距离预订时间不足${minCancelHours}小时，无法取消`,
        'CANCEL_TOO_LATE'
      );
    }

    const session = await mongoose.startSession();
    
    try {
      await session.withTransaction(async () => {
        // 取消订单
        await order.cancel(reason);

        // 恢复包间状态
        if (order.roomId) {
          await Room.findByIdAndUpdate(
            order.roomId,
            { status: 'available' },
            { session }
          );
        }

        // 记录业务日志
        BusinessLogger.info('取消预订', {
          userId,
          orderId: order._id,
          cancelReason: reason,
          refundAmount: order.actualAmount
        });
      });
    } finally {
      await session.endSession();
    }

    res.json({
      success: true,
      message: '预订已取消，退款将在1-3个工作日内到账',
      data: { orderId }
    });
  });

  /**
   * 核销预订
   */
  static verifyBooking = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { orderId, verificationCode } = req.body;
    const merchantId = req.user?.id;

    if (!merchantId) {
      throw createError.unauthorized('需要登录', 'NOT_AUTHENTICATED');
    }

    // 检查商户权限
    if (req.user?.userType !== 'merchant' && req.user?.userType !== 'admin') {
      throw createError.forbidden('只有商户可以核销预订', 'INSUFFICIENT_PERMISSIONS');
    }

    const order = await Order.findById(orderId).populate('storeId');
    if (!order) {
      throw createError.notFound('订单不存在', 'ORDER_NOT_FOUND');
    }

    // 检查商户权限（商户只能核销自己店铺的订单）
    if (req.user?.userType === 'merchant' && order.storeId.ownerId.toString() !== merchantId) {
      throw createError.forbidden('只能核销自己店铺的订单', 'INSUFFICIENT_PERMISSIONS');
    }

    if (order.status !== OrderStatus.PAID) {
      throw createError.badRequest('只有已支付的订单才能核销', 'INVALID_ORDER_STATUS');
    }

    // 验证核销码（简单实现：orderId的后6位）
    const expectedCode = order._id.toString().slice(-6);
    if (verificationCode !== expectedCode) {
      throw createError.badRequest('核销码错误', 'INVALID_VERIFICATION_CODE');
    }

    // 检查时间是否合理（不能太早或太晚到店）
    const now = new Date();
    const startTime = new Date(order.startTime!);
    const endTime = new Date(order.endTime!);
    
    const earlyArrival = startTime.getTime() - now.getTime();
    const lateArrival = now.getTime() - endTime.getTime();
    
    if (earlyArrival > 30 * 60 * 1000) { // 提前30分钟以上
      throw createError.badRequest('预订时间未到，请稍后核销', 'TOO_EARLY');
    }
    
    if (lateArrival > 60 * 60 * 1000) { // 迟到1小时以上
      throw createError.badRequest('预订已过期', 'TOO_LATE');
    }

    const session = await mongoose.startSession();
    
    try {
      await session.withTransaction(async () => {
        // 更新订单状态
        order.status = OrderStatus.CONFIRMED;
        order.confirmedAt = new Date();
        await order.save({ session });

        // 更新包间状态
        if (order.roomId) {
          await Room.findByIdAndUpdate(
            order.roomId,
            { status: 'occupied' },
            { session }
          );
        }

        // 获取用户信息以发放积分
        const user = await User.findById(order.userId);
        if (user) {
          // 消费返积分（消费金额的5%，VIP用户翻倍）
          const pointsRate = user.vipLevel > 0 ? 0.1 : 0.05;
          const earnedPoints = Math.floor(order.actualAmount * pointsRate);
          
          if (earnedPoints > 0) {
            await PointRecord.createEarnRecord(
              order.userId.toString(),
              earnedPoints,
              PointSource.ORDER,
              `预订消费返积分 - 订单${order.orderNumber}`,
              { orderId: order._id }
            );
          }
        }

        // 记录业务日志
        BusinessLogger.info('核销预订', {
          orderId: order._id,
          merchantId,
          verificationTime: new Date(),
          actualStartTime: now
        });
      });
    } finally {
      await session.endSession();
    }

    res.json({
      success: true,
      message: '核销成功，客户可以开始使用包间',
      data: {
        orderId,
        customerPhone: order.contactPhone,
        guestCount: order.guestCount,
        duration: `${order.startTime} - ${order.endTime}`,
        specialRequests: order.specialRequests
      }
    });
  });

  /**
   * 获取用户预订列表
   */
  static getUserBookings = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id;
    const { status, page = 1, limit = 10 } = req.query;

    if (!userId) {
      throw createError.unauthorized('需要登录', 'NOT_AUTHENTICATED');
    }

    const query: any = { 
      userId,
      type: 'room_booking'
    };
    
    if (status) {
      query.status = status;
    }

    const skip = (Number(page) - 1) * Number(limit);
    
    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('storeId', 'name address phone')
        .populate('roomId', 'name capacity')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Order.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / Number(limit));

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages
        }
      }
    });
  });

  /**
   * 获取商户预订列表
   */
  static getMerchantBookings = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const merchantId = req.user?.id;
    const { status, date, page = 1, limit = 20 } = req.query;

    if (!merchantId) {
      throw createError.unauthorized('需要登录', 'NOT_AUTHENTICATED');
    }

    // 检查商户权限
    if (req.user?.userType !== 'merchant' && req.user?.userType !== 'admin') {
      throw createError.forbidden('只有商户可以查看预订', 'INSUFFICIENT_PERMISSIONS');
    }

    // 获取商户的店铺
    const stores = await Store.findByOwner(merchantId);
    const storeIds = stores.map(store => store._id);

    if (storeIds.length === 0) {
      return res.json({
        success: true,
        data: { orders: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } }
      });
    }

    const query: any = { 
      storeId: { $in: storeIds },
      type: 'room_booking'
    };
    
    if (status) {
      query.status = status;
    }

    if (date) {
      const startDate = new Date(date as string);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
      
      query.startTime = {
        $gte: startDate,
        $lt: endDate
      };
    }

    const skip = (Number(page) - 1) * Number(limit);
    
    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('userId', 'nickname phone vipLevel')
        .populate('storeId', 'name')
        .populate('roomId', 'name capacity')
        .sort({ startTime: 1 })
        .skip(skip)
        .limit(Number(limit)),
      Order.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / Number(limit));

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages
        }
      }
    });
  });

  /**
   * 获取预订详情
   */
  static getBookingDetail = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { orderId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw createError.unauthorized('需要登录', 'NOT_AUTHENTICATED');
    }

    const order = await Order.findById(orderId)
      .populate('userId', 'nickname phone vipLevel')
      .populate('storeId', 'name address phone businessHours')
      .populate('roomId', 'name capacity amenities images');

    if (!order) {
      throw createError.notFound('订单不存在', 'ORDER_NOT_FOUND');
    }

    // 权限检查
    const isOwner = order.userId._id.toString() === userId;
    const isMerchant = req.user?.userType === 'merchant' && 
                      order.storeId.ownerId.toString() === userId;
    const isAdmin = req.user?.userType === 'admin';

    if (!isOwner && !isMerchant && !isAdmin) {
      throw createError.forbidden('无权查看此订单', 'INSUFFICIENT_PERMISSIONS');
    }

    res.json({
      success: true,
      data: { order }
    });
  });
}
