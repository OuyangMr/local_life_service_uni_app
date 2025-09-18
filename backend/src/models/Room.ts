import mongoose, { Schema, Document, Model } from 'mongoose';
import { logger } from '@/utils/logger';

/**
 * 包间状态枚举
 */
export enum RoomStatus {
  AVAILABLE = 'available',
  OCCUPIED = 'occupied',
  RESERVED = 'reserved',
  MAINTENANCE = 'maintenance',
  DISABLED = 'disabled',
}

/**
 * 包间接口定义
 */
export interface IRoom extends Document {
  _id: string;
  storeId: string;
  name: string;
  description?: string;
  capacity: number;
  price: number;
  deposit?: number;
  amenities: string[];
  images: string[];
  status: RoomStatus;
  isAvailable: boolean;
  features: string[];
  equipment: string[];
  bookingCount: number;
  revenue: number;
  rating: number;
  reviewCount: number;
  lastCleanedAt?: Date;
  maintenanceNotes?: string;
  createdAt: Date;
  updatedAt: Date;
  
  // 实例方法
  updateStatus(status: RoomStatus): Promise<void>;
  addRevenue(amount: number): Promise<void>;
  updateRating(): Promise<void>;
  isAvailableAt(startTime: Date, endTime: Date): Promise<boolean>;
}

/**
 * 包间模型接口
 */
export interface IRoomModel extends Model<IRoom> {
  findByStore(storeId: string): Promise<IRoom[]>;
  findAvailableRooms(storeId: string, startTime: Date, endTime: Date, guestCount?: number): Promise<IRoom[]>;
  findByStatus(status: RoomStatus): Promise<IRoom[]>;
  getStoreStats(storeId: string): Promise<any>;
}

/**
 * 包间Schema定义
 */
const RoomSchema = new Schema<IRoom>(
  {
    storeId: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: [true, '店铺ID不能为空'],
      index: true,
    },
    name: {
      type: String,
      required: [true, '包间名称不能为空'],
      minlength: [1, '包间名称至少1个字符'],
      maxlength: [30, '包间名称不能超过30个字符'],
      trim: true,
    },
    description: {
      type: String,
      maxlength: [200, '描述不能超过200个字符'],
      trim: true,
    },
    capacity: {
      type: Number,
      required: [true, '容量不能为空'],
      min: [1, '容量至少为1'],
      max: [50, '容量不能超过50'],
    },
    price: {
      type: Number,
      required: [true, '价格不能为空'],
      min: [0, '价格不能为负数'],
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
    amenities: [{
      type: String,
      maxlength: [30, '设施名称不能超过30个字符'],
      trim: true,
    }],
    images: [{
      type: String,
      validate: {
        validator: function(v: string) {
          return /^https?:\/\/.+/.test(v);
        },
        message: '图片必须是有效的URL',
      },
    }],
    status: {
      type: String,
      enum: {
        values: Object.values(RoomStatus),
        message: '包间状态必须是available、occupied、reserved、maintenance或disabled',
      },
      default: RoomStatus.AVAILABLE,
      index: true,
    },
    isAvailable: {
      type: Boolean,
      default: true,
      index: true,
    },
    features: [{
      type: String,
      maxlength: [50, '特色服务不能超过50个字符'],
      trim: true,
    }],
    equipment: [{
      type: String,
      maxlength: [30, '设备名称不能超过30个字符'],
      trim: true,
    }],
    bookingCount: {
      type: Number,
      min: [0, '预订次数不能为负数'],
      default: 0,
    },
    revenue: {
      type: Number,
      min: [0, '收入不能为负数'],
      default: 0,
      get: (v: number) => Math.round(v * 100) / 100,
      set: (v: number) => Math.round(v * 100) / 100,
    },
    rating: {
      type: Number,
      min: [0, '评分不能小于0'],
      max: [5, '评分不能大于5'],
      default: 0,
      get: (v: number) => Math.round(v * 10) / 10,
      set: (v: number) => Math.round(v * 10) / 10,
    },
    reviewCount: {
      type: Number,
      min: [0, '评价数量不能为负数'],
      default: 0,
    },
    lastCleanedAt: {
      type: Date,
    },
    maintenanceNotes: {
      type: String,
      maxlength: [500, '维护说明不能超过500个字符'],
      trim: true,
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
RoomSchema.index({ storeId: 1, status: 1 });
RoomSchema.index({ storeId: 1, isAvailable: 1 });
RoomSchema.index({ capacity: 1, isAvailable: 1 });
RoomSchema.index({ price: 1 });
RoomSchema.index({ rating: -1, reviewCount: -1 });
RoomSchema.index({ bookingCount: -1 });

/**
 * 验证中间件
 */
RoomSchema.pre('save', function(next) {
  // 如果包间状态为维护或禁用，则设为不可用
  if (this.status === RoomStatus.MAINTENANCE || this.status === RoomStatus.DISABLED) {
    this.isAvailable = false;
  } else if (this.status === RoomStatus.AVAILABLE) {
    this.isAvailable = true;
  }
  
  next();
});

/**
 * 实例方法
 */

// 更新状态
RoomSchema.methods.updateStatus = async function(status: RoomStatus): Promise<void> {
  this.status = status;
  
  // 根据状态自动设置可用性
  if (status === RoomStatus.MAINTENANCE || status === RoomStatus.DISABLED) {
    this.isAvailable = false;
  } else if (status === RoomStatus.AVAILABLE) {
    this.isAvailable = true;
  }
  
  await this.save();
};

// 添加收入
RoomSchema.methods.addRevenue = async function(amount: number): Promise<void> {
  if (amount <= 0) {
    throw new Error('收入金额必须大于0');
  }
  
  this.revenue += amount;
  this.bookingCount += 1;
  await this.save();
};

// 更新评分
RoomSchema.methods.updateRating = async function(): Promise<void> {
  try {
    const Review = mongoose.model('Review');
    const result = await Review.aggregate([
      { $match: { roomId: this._id, isActive: true } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' },
          count: { $sum: 1 }
        }
      }
    ]);
    
    if (result.length > 0) {
      this.rating = result[0].avgRating || 0;
      this.reviewCount = result[0].count || 0;
    } else {
      this.rating = 0;
      this.reviewCount = 0;
    }
    
    await this.save();
  } catch (error) {
    logger.error('更新包间评分失败:', error);
  }
};

// 检查时间段是否可用
RoomSchema.methods.isAvailableAt = async function(startTime: Date, endTime: Date): Promise<boolean> {
  if (!this.isAvailable || this.status !== RoomStatus.AVAILABLE) {
    return false;
  }
  
  try {
    const Order = mongoose.model('Order');
    const conflictingOrders = await Order.countDocuments({
      roomId: this._id,
      status: { $in: ['paid', 'confirmed', 'in_progress'] },
      $or: [
        {
          startTime: { $lt: endTime },
          endTime: { $gt: startTime }
        }
      ]
    });
    
    return conflictingOrders === 0;
  } catch (error) {
    logger.error('检查包间可用性失败:', error);
    return false;
  }
};

/**
 * 静态方法
 */

// 根据店铺查找包间
RoomSchema.statics.findByStore = function(storeId: string): Promise<IRoom[]> {
  return this.find({ storeId }).sort({ name: 1 });
};

// 查找可用包间
RoomSchema.statics.findAvailableRooms = async function(
  storeId: string,
  startTime: Date,
  endTime: Date,
  guestCount?: number
): Promise<IRoom[]> {
  let query: any = {
    storeId,
    isAvailable: true,
    status: RoomStatus.AVAILABLE
  };
  
  // 根据客人数量筛选
  if (guestCount) {
    query.capacity = { $gte: guestCount };
  }
  
  const rooms = await this.find(query).sort({ capacity: 1, price: 1 });
  
  // 检查时间冲突
  const availableRooms: IRoom[] = [];
  for (const room of rooms) {
    const isAvailable = await room.isAvailableAt(startTime, endTime);
    if (isAvailable) {
      availableRooms.push(room);
    }
  }
  
  return availableRooms;
};

// 根据状态查找包间
RoomSchema.statics.findByStatus = function(status: RoomStatus): Promise<IRoom[]> {
  return this.find({ status }).populate('storeId', 'name address');
};

// 获取店铺包间统计
RoomSchema.statics.getStoreStats = function(storeId: string): Promise<any> {
  return this.aggregate([
    { $match: { storeId: new mongoose.Types.ObjectId(storeId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalRevenue: { $sum: '$revenue' },
        totalBookings: { $sum: '$bookingCount' },
        avgRating: { $avg: '$rating' }
      }
    }
  ]);
};

/**
 * 虚拟字段
 */

// 使用率
RoomSchema.virtual('utilizationRate').get(function() {
  if (this.bookingCount === 0) return 0;
  // 这里可以根据实际业务计算使用率
  return Math.min(this.bookingCount / 30, 1); // 假设30次预订为满负荷
});

// 平均每次消费
RoomSchema.virtual('averageRevenue').get(function() {
  if (this.bookingCount === 0) return 0;
  return this.revenue / this.bookingCount;
});

// 状态描述
RoomSchema.virtual('statusText').get(function() {
  const statusMap = {
    [RoomStatus.AVAILABLE]: '可用',
    [RoomStatus.OCCUPIED]: '使用中',
    [RoomStatus.RESERVED]: '已预订',
    [RoomStatus.MAINTENANCE]: '维护中',
    [RoomStatus.DISABLED]: '已禁用',
  };
  return statusMap[this.status] || '未知状态';
});

/**
 * 中间件钩子
 */

// 删除包间时的清理工作
RoomSchema.pre('remove', async function() {
  try {
    const Order = mongoose.model('Order');
    const Review = mongoose.model('Review');
    
    // 更新相关订单
    await Order.updateMany(
      { roomId: this._id },
      { $set: { roomId: null, roomDeleted: true } }
    );
    
    // 删除相关评价
    await Review.deleteMany({ roomId: this._id });
    
    logger.info(`包间 ${this.name} 相关数据已清理`);
  } catch (error) {
    logger.error('删除包间时清理数据失败:', error);
  }
});

/**
 * 导出模型
 */
export const Room = mongoose.model<IRoom, IRoomModel>('Room', RoomSchema);


