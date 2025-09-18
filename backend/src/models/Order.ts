import mongoose, { Schema, Document, Model } from 'mongoose';
import { logger } from '@/utils/logger';

/**
 * 订单状态枚举
 */
export enum OrderStatus {
  PENDING = 'pending',           // 待支付
  PAID = 'paid',                // 已支付
  CONFIRMED = 'confirmed',       // 已确认
  IN_PROGRESS = 'in_progress',   // 进行中
  COMPLETED = 'completed',       // 已完成
  CANCELLED = 'cancelled',       // 已取消
  REFUNDED = 'refunded',         // 已退款
}

/**
 * 支付方式枚举
 */
export enum PaymentMethod {
  WECHAT = 'wechat',
  ALIPAY = 'alipay',
  BALANCE = 'balance',
}

/**
 * 订单项接口
 */
export interface OrderItem {
  dishId: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
  specialRequests?: string;
}

/**
 * 支付信息接口
 */
export interface PaymentInfo {
  method: PaymentMethod;
  transactionId?: string;
  paidAt?: Date;
  amount: number;
  platformFee?: number;
}

/**
 * 订单接口定义
 */
export interface IOrder extends Document {
  _id: string;
  orderNumber: string;
  userId: string;
  storeId: string;
  roomId?: string;
  type: 'room_booking' | 'food_order' | 'combo';
  
  // 预订信息
  startTime?: Date;
  endTime?: Date;
  guestCount?: number;
  
  // 订单项
  items: OrderItem[];
  
  // 价格信息
  subtotal: number;
  deposit: number;
  discount: number;
  totalAmount: number;
  actualAmount: number;
  
  // 支付信息
  paymentInfo?: PaymentInfo;
  
  // 状态信息
  status: OrderStatus;
  
  // 联系信息
  contactPhone: string;
  specialRequests?: string;
  
  // 评价信息
  isReviewed: boolean;
  reviewId?: string;
  
  // 时间戳
  confirmedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  expiredAt: Date;
  
  createdAt: Date;
  updatedAt: Date;
  
  // 实例方法
  calculateTotal(): void;
  pay(paymentInfo: PaymentInfo): Promise<void>;
  confirm(): Promise<void>;
  cancel(reason?: string): Promise<void>;
  complete(): Promise<void>;
  refund(amount?: number): Promise<void>;
  isExpired(): boolean;
  canCancel(): boolean;
}

/**
 * 订单模型接口
 */
export interface IOrderModel extends Model<IOrder> {
  generateOrderNumber(): string;
  findByUser(userId: string, status?: OrderStatus): Promise<IOrder[]>;
  findByStore(storeId: string, status?: OrderStatus): Promise<IOrder[]>;
  findExpiredOrders(): Promise<IOrder[]>;
  getRevenueStats(storeId: string, startDate: Date, endDate: Date): Promise<any>;
}

/**
 * 订单Schema定义
 */
const OrderSchema = new Schema<IOrder>(
  {
    orderNumber: {
      type: String,
      required: [true, '订单号不能为空'],
      unique: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, '用户不能为空'],
      index: true,
    },
    storeId: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: [true, '店铺不能为空'],
      index: true,
    },
    roomId: {
      type: Schema.Types.ObjectId,
      ref: 'Room',
      index: true,
    },
    type: {
      type: String,
      enum: {
        values: ['room_booking', 'food_order', 'combo'],
        message: '订单类型必须是room_booking、food_order或combo',
      },
      required: [true, '订单类型不能为空'],
      index: true,
    },
    startTime: {
      type: Date,
      validate: {
        validator: function(this: IOrder, v: Date) {
          return !v || v > new Date();
        },
        message: '开始时间必须晚于当前时间',
      },
    },
    endTime: {
      type: Date,
      validate: {
        validator: function(this: IOrder, v: Date) {
          return !v || !this.startTime || v > this.startTime;
        },
        message: '结束时间必须晚于开始时间',
      },
    },
    guestCount: {
      type: Number,
      min: [1, '客人数量至少为1'],
      max: [50, '客人数量不能超过50'],
    },
    items: [{
      dishId: {
        type: Schema.Types.ObjectId,
        ref: 'Dish',
        required: true,
      },
      name: {
        type: String,
        required: true,
        maxlength: [100, '菜品名称不能超过100个字符'],
      },
      price: {
        type: Number,
        required: true,
        min: [0, '价格不能为负数'],
        get: (v: number) => Math.round(v * 100) / 100,
        set: (v: number) => Math.round(v * 100) / 100,
      },
      quantity: {
        type: Number,
        required: true,
        min: [1, '数量至少为1'],
        max: [99, '数量不能超过99'],
      },
      subtotal: {
        type: Number,
        required: true,
        min: [0, '小计不能为负数'],
        get: (v: number) => Math.round(v * 100) / 100,
        set: (v: number) => Math.round(v * 100) / 100,
      },
      specialRequests: {
        type: String,
        maxlength: [200, '特殊要求不能超过200个字符'],
        trim: true,
      },
    }],
    subtotal: {
      type: Number,
      min: [0, '小计不能为负数'],
      default: 0,
      get: (v: number) => Math.round(v * 100) / 100,
      set: (v: number) => Math.round(v * 100) / 100,
    },
    deposit: {
      type: Number,
      min: [0, '押金不能为负数'],
      default: 0,
      get: (v: number) => Math.round(v * 100) / 100,
      set: (v: number) => Math.round(v * 100) / 100,
    },
    discount: {
      type: Number,
      min: [0, '折扣不能为负数'],
      default: 0,
      get: (v: number) => Math.round(v * 100) / 100,
      set: (v: number) => Math.round(v * 100) / 100,
    },
    totalAmount: {
      type: Number,
      min: [0, '总金额不能为负数'],
      default: 0,
      get: (v: number) => Math.round(v * 100) / 100,
      set: (v: number) => Math.round(v * 100) / 100,
    },
    actualAmount: {
      type: Number,
      min: [0, '实付金额不能为负数'],
      default: 0,
      get: (v: number) => Math.round(v * 100) / 100,
      set: (v: number) => Math.round(v * 100) / 100,
    },
    paymentInfo: {
      method: {
        type: String,
        enum: Object.values(PaymentMethod),
      },
      transactionId: {
        type: String,
        trim: true,
      },
      paidAt: {
        type: Date,
      },
      amount: {
        type: Number,
        min: [0, '支付金额不能为负数'],
        get: (v: number) => Math.round(v * 100) / 100,
        set: (v: number) => Math.round(v * 100) / 100,
      },
      platformFee: {
        type: Number,
        min: [0, '平台手续费不能为负数'],
        default: 0,
        get: (v: number) => Math.round(v * 100) / 100,
        set: (v: number) => Math.round(v * 100) / 100,
      },
    },
    status: {
      type: String,
      enum: Object.values(OrderStatus),
      default: OrderStatus.PENDING,
      index: true,
    },
    contactPhone: {
      type: String,
      required: [true, '联系电话不能为空'],
      match: [/^1[3-9]\d{9}$/, '请输入有效的手机号码'],
    },
    specialRequests: {
      type: String,
      maxlength: [500, '特殊要求不能超过500个字符'],
      trim: true,
    },
    isReviewed: {
      type: Boolean,
      default: false,
      index: true,
    },
    reviewId: {
      type: Schema.Types.ObjectId,
      ref: 'Review',
    },
    confirmedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    cancelledAt: {
      type: Date,
    },
    expiredAt: {
      type: Date,
      required: [true, '过期时间不能为空'],
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      getters: true,
      transform: function(doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      getters: true,
    },
  }
);

/**
 * 索引设置
 */
OrderSchema.index({ orderNumber: 1 }, { unique: true });
OrderSchema.index({ userId: 1, status: 1 });
OrderSchema.index({ storeId: 1, status: 1 });
OrderSchema.index({ roomId: 1, startTime: 1 });
OrderSchema.index({ status: 1, expiredAt: 1 });
OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ startTime: 1, endTime: 1 });

/**
 * 预保存中间件
 */
OrderSchema.pre('save', function(next) {
  // 生成订单号
  if (!this.orderNumber) {
    this.orderNumber = (this.constructor as IOrderModel).generateOrderNumber();
  }
  
  // 计算总价
  this.calculateTotal();
  
  // 设置过期时间（未支付订单15分钟后过期）
  if (!this.expiredAt && this.status === OrderStatus.PENDING) {
    this.expiredAt = new Date(Date.now() + 15 * 60 * 1000); // 15分钟
  }
  
  next();
});

/**
 * 实例方法
 */

// 计算总价
OrderSchema.methods.calculateTotal = function(): void {
  // 计算商品小计
  this.subtotal = this.items.reduce((total, item) => {
    item.subtotal = item.price * item.quantity;
    return total + item.subtotal;
  }, 0);
  
  // 计算总金额
  this.totalAmount = this.subtotal + this.deposit;
  
  // 计算实付金额
  this.actualAmount = this.totalAmount - this.discount;
  
  // 确保金额精度
  this.subtotal = Math.round(this.subtotal * 100) / 100;
  this.totalAmount = Math.round(this.totalAmount * 100) / 100;
  this.actualAmount = Math.round(this.actualAmount * 100) / 100;
};

// 支付
OrderSchema.methods.pay = async function(paymentInfo: PaymentInfo): Promise<void> {
  if (this.status !== OrderStatus.PENDING) {
    throw new Error('只有待支付订单才能进行支付');
  }
  
  if (this.isExpired()) {
    throw new Error('订单已过期，无法支付');
  }
  
  this.paymentInfo = {
    ...paymentInfo,
    paidAt: new Date(),
  };
  this.status = OrderStatus.PAID;
  
  await this.save();
  
  // 更新用户消费记录
  const User = mongoose.model('User');
  await User.findByIdAndUpdate(this.userId, {
    $inc: { totalSpent: this.actualAmount }
  });
  
  // 更新店铺收入
  const Store = mongoose.model('Store');
  const store = await Store.findById(this.storeId);
  if (store) {
    await store.addRevenue(this.actualAmount);
  }
};

// 确认订单
OrderSchema.methods.confirm = async function(): Promise<void> {
  if (this.status !== OrderStatus.PAID) {
    throw new Error('只有已支付订单才能确认');
  }
  
  this.status = OrderStatus.CONFIRMED;
  this.confirmedAt = new Date();
  
  await this.save();
};

// 取消订单
OrderSchema.methods.cancel = async function(reason?: string): Promise<void> {
  if (!this.canCancel()) {
    throw new Error('当前状态下无法取消订单');
  }
  
  this.status = OrderStatus.CANCELLED;
  this.cancelledAt = new Date();
  
  if (reason) {
    this.specialRequests = (this.specialRequests || '') + `\n取消原因: ${reason}`;
  }
  
  await this.save();
  
  // 如果已支付，需要退款
  if (this.paymentInfo?.paidAt) {
    await this.refund();
  }
};

// 完成订单
OrderSchema.methods.complete = async function(): Promise<void> {
  if (this.status !== OrderStatus.IN_PROGRESS) {
    throw new Error('只有进行中的订单才能完成');
  }
  
  this.status = OrderStatus.COMPLETED;
  this.completedAt = new Date();
  
  await this.save();
};

// 退款
OrderSchema.methods.refund = async function(amount?: number): Promise<void> {
  if (!this.paymentInfo?.paidAt) {
    throw new Error('订单未支付，无法退款');
  }
  
  const refundAmount = amount || this.actualAmount;
  
  if (refundAmount > this.actualAmount) {
    throw new Error('退款金额不能超过实付金额');
  }
  
  // 如果是余额支付，直接退回余额
  if (this.paymentInfo.method === PaymentMethod.BALANCE) {
    const User = mongoose.model('User');
    const user = await User.findById(this.userId);
    if (user) {
      await user.addBalance(refundAmount);
    }
  }
  
  this.status = OrderStatus.REFUNDED;
  
  await this.save();
  
  logger.info(`订单 ${this.orderNumber} 退款 ${refundAmount} 元`);
};

// 检查是否过期
OrderSchema.methods.isExpired = function(): boolean {
  return this.expiredAt && new Date() > this.expiredAt;
};

// 检查是否可以取消
OrderSchema.methods.canCancel = function(): boolean {
  const cancellableStatuses = [
    OrderStatus.PENDING,
    OrderStatus.PAID,
    OrderStatus.CONFIRMED
  ];
  
  return cancellableStatuses.includes(this.status);
};

/**
 * 静态方法
 */

// 生成订单号
OrderSchema.statics.generateOrderNumber = function(): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const hour = now.getHours().toString().padStart(2, '0');
  const minute = now.getMinutes().toString().padStart(2, '0');
  const second = now.getSeconds().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  
  return `${year}${month}${day}${hour}${minute}${second}${random}`;
};

// 根据用户查找订单
OrderSchema.statics.findByUser = function(userId: string, status?: OrderStatus): Promise<IOrder[]> {
  const query: any = { userId };
  if (status) {
    query.status = status;
  }
  
  return this.find(query)
    .populate('storeId', 'name address phone')
    .populate('roomId', 'name capacity')
    .sort({ createdAt: -1 });
};

// 根据店铺查找订单
OrderSchema.statics.findByStore = function(storeId: string, status?: OrderStatus): Promise<IOrder[]> {
  const query: any = { storeId };
  if (status) {
    query.status = status;
  }
  
  return this.find(query)
    .populate('userId', 'nickname phone')
    .populate('roomId', 'name capacity')
    .sort({ createdAt: -1 });
};

// 查找过期订单
OrderSchema.statics.findExpiredOrders = function(): Promise<IOrder[]> {
  return this.find({
    status: OrderStatus.PENDING,
    expiredAt: { $lt: new Date() }
  });
};

// 获取收入统计
OrderSchema.statics.getRevenueStats = function(
  storeId: string, 
  startDate: Date, 
  endDate: Date
): Promise<any> {
  return this.aggregate([
    {
      $match: {
        storeId: new mongoose.Types.ObjectId(storeId),
        status: { $in: [OrderStatus.COMPLETED, OrderStatus.PAID] },
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$actualAmount' },
        totalOrders: { $sum: 1 },
        avgOrderValue: { $avg: '$actualAmount' }
      }
    }
  ]);
};

/**
 * 虚拟字段
 */

// 订单持续时间（小时）
OrderSchema.virtual('duration').get(function() {
  if (!this.startTime || !this.endTime) return 0;
  return (this.endTime.getTime() - this.startTime.getTime()) / (1000 * 60 * 60);
});

// 订单状态描述
OrderSchema.virtual('statusText').get(function() {
  const statusMap = {
    [OrderStatus.PENDING]: '待支付',
    [OrderStatus.PAID]: '已支付',
    [OrderStatus.CONFIRMED]: '已确认',
    [OrderStatus.IN_PROGRESS]: '进行中',
    [OrderStatus.COMPLETED]: '已完成',
    [OrderStatus.CANCELLED]: '已取消',
    [OrderStatus.REFUNDED]: '已退款',
  };
  return statusMap[this.status] || '未知状态';
});

/**
 * 导出模型
 */
export const Order = mongoose.model<IOrder, IOrderModel>('Order', OrderSchema);
