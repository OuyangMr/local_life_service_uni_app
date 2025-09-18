import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Order, OrderStatus } from '@/models/Order';
import { Store } from '@/models/Store';
import { Room } from '@/models/Room';
import { User } from '@/models/User';
import { createError } from '@/middleware/errorHandler';
import { BusinessLogger } from '@/utils/logger';
import { catchAsync } from '@/middleware/errorHandler';
import { ApiResponse, PaginatedResponse } from '@/types';
import { OrderCreateParams, OrderUpdateParams, OrderSearchParams } from '@/types/order';

/**
 * 订单管理控制器
 */
export class OrderController {
  /**
   * 创建订单
   */
  static createOrder = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id;
    const orderData: OrderCreateParams = req.body;

    if (!userId) {
      throw createError.unauthorized('需要登录', 'NOT_AUTHENTICATED');
    }

    // 验证店铺存在
    const store = await Store.findById(orderData.storeId);
    if (!store) {
      throw createError.notFound('店铺不存在', 'STORE_NOT_FOUND');
    }

    if (store.status !== 'active') {
      throw createError.badRequest('店铺暂停营业', 'STORE_UNAVAILABLE');
    }

    // 验证包间（如果是包间预订）
    let room = null;
    if (orderData.roomId) {
      room = await Room.findById(orderData.roomId);
      if (!room) {
        throw createError.notFound('包间不存在', 'ROOM_NOT_FOUND');
      }

      if (room.storeId.toString() !== orderData.storeId) {
        throw createError.badRequest('包间与店铺不匹配', 'ROOM_STORE_MISMATCH');
      }

      // 检查包间可用性
      if (orderData.startTime && orderData.endTime) {
        const isAvailable = await room.isAvailableAt(orderData.startTime, orderData.endTime);
        if (!isAvailable) {
          throw createError.conflict('包间在此时间段不可用', 'ROOM_NOT_AVAILABLE');
        }
      }

      // 检查容量
      if (orderData.guestCount && orderData.guestCount > room.capacity) {
        throw createError.badRequest('客人数量超过包间容量', 'CAPACITY_EXCEEDED');
      }
    }

    // 获取用户信息
    const user = await User.findById(userId);
    if (!user) {
      throw createError.notFound('用户不存在', 'USER_NOT_FOUND');
    }

    // 计算订单金额
    let subtotal = 0;
    let deposit = 0;

    // 计算商品小计
    for (const item of orderData.items || []) {
      item.subtotal = item.price * item.quantity;
      subtotal += item.subtotal;
    }

    // 计算押金（VIP用户可能免押金）
    if (room && room.deposit && user.vipLevel < 3) {
      deposit = room.deposit;
    }

    // 计算折扣（VIP用户享有折扣）
    let discount = 0;
    if (user.vipLevel > 0) {
      const discountRate = Math.min(user.vipLevel * 0.02, 0.1); // 最多10%折扣
      discount = Math.round(subtotal * discountRate * 100) / 100;
    }

    // 创建订单
    const order = new Order({
      userId,
      storeId: orderData.storeId,
      roomId: orderData.roomId,
      type: orderData.type,
      startTime: orderData.startTime,
      endTime: orderData.endTime,
      guestCount: orderData.guestCount,
      items: orderData.items || [],
      subtotal,
      deposit,
      discount,
      contactPhone: orderData.contactPhone,
      specialRequests: orderData.specialRequests,
      status: OrderStatus.PENDING,
      expiredAt: new Date(Date.now() + 15 * 60 * 1000), // 15分钟后过期
    });

    // 计算总金额
    order.calculateTotal();

    await order.save();

    // 记录业务日志
    BusinessLogger.userAction(userId, 'ORDER_CREATE', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      storeId: orderData.storeId,
      roomId: orderData.roomId,
      totalAmount: order.totalAmount,
    });

    const response: ApiResponse = {
      success: true,
      message: '订单创建成功',
      data: {
        id: order._id,
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount,
        actualAmount: order.actualAmount,
        status: order.status,
        expiredAt: order.expiredAt,
        createdAt: order.createdAt,
      },
      timestamp: new Date().toISOString(),
    };

    res.status(201).json(response);
  });

  /**
   * 获取订单列表
   */
  static getOrders = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id;
    const {
      page = 1,
      limit = 20,
      status,
      type,
      startDate,
      endDate,
      storeId,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query as any;

    if (!userId) {
      throw createError.unauthorized('需要登录', 'NOT_AUTHENTICATED');
    }

    let query: any = {};

    // 根据用户类型设置查询条件
    if (req.user?.userType === 'user') {
      query.userId = userId;
    } else if (req.user?.userType === 'merchant') {
      // 商户只能查看自己店铺的订单
      const userStores = await Store.findByOwner(userId);
      const storeIds = userStores.map(store => store._id);
      query.storeId = { $in: storeIds };
    }
    // 管理员可以查看所有订单

    // 状态筛选
    if (status) {
      query.status = status;
    }

    // 类型筛选
    if (type) {
      query.type = type;
    }

    // 日期范围筛选
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // 店铺筛选
    if (storeId) {
      query.storeId = storeId;
    }

    // 排序
    let sort: any = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [orders, total] = await Promise.all([
      Order.find(query)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .populate('userId', 'nickname phone')
        .populate('storeId', 'name address phone')
        .populate('roomId', 'name capacity')
        .lean(),
      Order.countDocuments(query)
    ]);

    const response: PaginatedResponse = {
      success: true,
      message: '获取订单列表成功',
      data: orders,
      pagination: {
        current: parseInt(page),
        pageSize: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
        hasNext: parseInt(page) * parseInt(limit) < total,
        hasPrev: parseInt(page) > 1,
      },
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  });

  /**
   * 获取订单详情
   */
  static getOrderById = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw createError.unauthorized('需要登录', 'NOT_AUTHENTICATED');
    }

    const order = await Order.findById(id)
      .populate('userId', 'nickname phone vipLevel')
      .populate('storeId', 'name address phone businessHours')
      .populate('roomId', 'name capacity amenities')
      .lean();

    if (!order) {
      throw createError.notFound('订单不存在', 'ORDER_NOT_FOUND');
    }

    // 权限检查
    const hasPermission = 
      req.user?.userType === 'admin' ||
      order.userId._id.toString() === userId ||
      (req.user?.userType === 'merchant' && 
       order.storeId && 
       await Store.findOne({ _id: order.storeId._id, ownerId: userId }));

    if (!hasPermission) {
      throw createError.forbidden('无权查看此订单', 'INSUFFICIENT_PERMISSIONS');
    }

    const response: ApiResponse = {
      success: true,
      message: '获取订单详情成功',
      data: order,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  });

  /**
   * 更新订单状态
   */
  static updateOrderStatus = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { status, reason } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      throw createError.unauthorized('需要登录', 'NOT_AUTHENTICATED');
    }

    const order = await Order.findById(id);
    if (!order) {
      throw createError.notFound('订单不存在', 'ORDER_NOT_FOUND');
    }

    // 权限检查
    let hasPermission = false;
    if (req.user?.userType === 'admin') {
      hasPermission = true;
    } else if (req.user?.userType === 'merchant') {
      const store = await Store.findOne({ _id: order.storeId, ownerId: userId });
      hasPermission = !!store;
    } else if (req.user?.userType === 'user' && order.userId.toString() === userId) {
      // 用户只能取消自己的订单
      hasPermission = status === OrderStatus.CANCELLED;
    }

    if (!hasPermission) {
      throw createError.forbidden('无权操作此订单', 'INSUFFICIENT_PERMISSIONS');
    }

    // 状态流转验证
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [OrderStatus.PAID, OrderStatus.CANCELLED],
      [OrderStatus.PAID]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
      [OrderStatus.CONFIRMED]: [OrderStatus.IN_PROGRESS, OrderStatus.CANCELLED],
      [OrderStatus.IN_PROGRESS]: [OrderStatus.COMPLETED],
      [OrderStatus.COMPLETED]: [],
      [OrderStatus.CANCELLED]: [],
      [OrderStatus.REFUNDED]: [],
    };

    if (!validTransitions[order.status].includes(status)) {
      throw createError.badRequest(
        `订单状态不能从${order.status}变更为${status}`,
        'INVALID_STATUS_TRANSITION'
      );
    }

    // 执行状态变更
    const oldStatus = order.status;
    order.status = status;

    if (status === OrderStatus.CONFIRMED) {
      order.confirmedAt = new Date();
    } else if (status === OrderStatus.COMPLETED) {
      order.completedAt = new Date();
      
      // 更新店铺和包间收入
      if (order.storeId) {
        const store = await Store.findById(order.storeId);
        if (store) {
          await store.addRevenue(order.actualAmount);
        }
      }
      
      if (order.roomId) {
        const room = await Room.findById(order.roomId);
        if (room) {
          await room.addRevenue(order.actualAmount);
        }
      }
    } else if (status === OrderStatus.CANCELLED) {
      order.cancelledAt = new Date();
      if (reason) {
        order.specialRequests = (order.specialRequests || '') + `\n取消原因: ${reason}`;
      }
    }

    await order.save();

    // 记录业务日志
    BusinessLogger.userAction(userId, 'ORDER_STATUS_UPDATE', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      oldStatus,
      newStatus: status,
      reason,
    });

    const response: ApiResponse = {
      success: true,
      message: `订单状态已更新为${order.statusText}`,
      data: {
        id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        statusText: order.statusText,
        updatedAt: new Date(),
      },
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  });

  /**
   * 取消订单
   */
  static cancelOrder = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      throw createError.unauthorized('需要登录', 'NOT_AUTHENTICATED');
    }

    const order = await Order.findById(id);
    if (!order) {
      throw createError.notFound('订单不存在', 'ORDER_NOT_FOUND');
    }

    // 权限检查：用户只能取消自己的订单
    if (order.userId.toString() !== userId && req.user?.userType !== 'admin') {
      throw createError.forbidden('无权取消此订单', 'INSUFFICIENT_PERMISSIONS');
    }

    // 检查是否可以取消
    if (!order.canCancel()) {
      throw createError.badRequest('订单当前状态无法取消', 'CANNOT_CANCEL_ORDER');
    }

    await order.cancel(reason);

    // 记录业务日志
    BusinessLogger.userAction(userId, 'ORDER_CANCEL', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      reason,
    });

    const response: ApiResponse = {
      success: true,
      message: '订单已取消',
      data: {
        id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        cancelledAt: order.cancelledAt,
      },
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  });

  /**
   * 获取订单统计
   */
  static getOrderStats = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id;
    const { storeId, startDate, endDate } = req.query as any;

    if (!userId) {
      throw createError.unauthorized('需要登录', 'NOT_AUTHENTICATED');
    }

    let matchQuery: any = {};

    // 根据用户类型设置查询条件
    if (req.user?.userType === 'merchant') {
      // 商户只能查看自己店铺的统计
      const userStores = await Store.findByOwner(userId);
      const storeIds = userStores.map(store => store._id);
      matchQuery.storeId = { $in: storeIds };
    } else if (req.user?.userType === 'admin' && storeId) {
      matchQuery.storeId = new mongoose.Types.ObjectId(storeId);
    } else if (req.user?.userType === 'user') {
      throw createError.forbidden('用户无权查看统计数据', 'INSUFFICIENT_PERMISSIONS');
    }

    // 日期范围
    if (startDate || endDate) {
      matchQuery.createdAt = {};
      if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
      if (endDate) matchQuery.createdAt.$lte = new Date(endDate);
    }

    const stats = await Order.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$actualAmount' },
          averageOrderValue: { $avg: '$actualAmount' },
          pendingOrders: {
            $sum: { $cond: [{ $eq: ['$status', OrderStatus.PENDING] }, 1, 0] }
          },
          completedOrders: {
            $sum: { $cond: [{ $eq: ['$status', OrderStatus.COMPLETED] }, 1, 0] }
          },
          cancelledOrders: {
            $sum: { $cond: [{ $eq: ['$status', OrderStatus.CANCELLED] }, 1, 0] }
          },
        }
      }
    ]);

    const result = stats[0] || {
      totalOrders: 0,
      totalRevenue: 0,
      averageOrderValue: 0,
      pendingOrders: 0,
      completedOrders: 0,
      cancelledOrders: 0,
    };

    // 计算完成率和取消率
    if (result.totalOrders > 0) {
      result.completionRate = Math.round((result.completedOrders / result.totalOrders) * 100) / 100;
      result.cancellationRate = Math.round((result.cancelledOrders / result.totalOrders) * 100) / 100;
    } else {
      result.completionRate = 0;
      result.cancellationRate = 0;
    }

    const response: ApiResponse = {
      success: true,
      message: '获取订单统计成功',
      data: result,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  });
}
