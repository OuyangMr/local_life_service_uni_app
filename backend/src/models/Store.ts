import mongoose, { Schema, Document, Model } from 'mongoose';
import { logger } from '@/utils/logger';

/**
 * 营业时间接口
 */
export interface BusinessHours {
  open: string;  // HH:mm 格式
  close: string; // HH:mm 格式
  isClosed?: boolean; // 是否停业
}

/**
 * 店铺接口定义
 */
export interface IStore extends Document {
  _id: string;
  name: string;
  description?: string;
  ownerId: string;
  phone: string;
  address: string;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  businessHours: BusinessHours;
  images: string[];
  tags: string[];
  rating: number;
  reviewCount: number;
  totalRevenue: number;
  monthlyRevenue: number;
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  isVerified: boolean;
  verifiedAt?: Date;
  licenseNumber?: string;
  licenseImages?: string[];
  amenities: string[];
  priceRange: {
    min: number;
    max: number;
  };
  capacity: number;
  roomCount: number;
  features: string[];
  createdAt: Date;
  updatedAt: Date;
  
  // 实例方法
  updateRating(): Promise<void>;
  addRevenue(amount: number): Promise<void>;
  isOpen(time?: Date): boolean;
  getDistance(longitude: number, latitude: number): number;
}

/**
 * 店铺模型接口
 */
export interface IStoreModel extends Model<IStore> {
  findByOwner(ownerId: string): Promise<IStore[]>;
  findNearby(longitude: number, latitude: number, maxDistance?: number): Promise<IStore[]>;
  findByStatus(status: string): Promise<IStore[]>;
  search(query: string, filters?: any): Promise<IStore[]>;
  getTopRated(limit?: number): Promise<IStore[]>;
}

/**
 * 店铺Schema定义
 */
const StoreSchema = new Schema<IStore>(
  {
    name: {
      type: String,
      required: [true, '店铺名称不能为空'],
      minlength: [2, '店铺名称至少2个字符'],
      maxlength: [50, '店铺名称不能超过50个字符'],
      trim: true,
      index: true,
    },
    description: {
      type: String,
      maxlength: [500, '描述不能超过500个字符'],
      trim: true,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, '店主不能为空'],
      index: true,
    },
    phone: {
      type: String,
      required: [true, '联系电话不能为空'],
      match: [/^1[3-9]\d{9}$/, '请输入有效的手机号码'],
    },
    address: {
      type: String,
      required: [true, '详细地址不能为空'],
      minlength: [5, '详细地址至少5个字符'],
      maxlength: [200, '详细地址不能超过200个字符'],
      trim: true,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
        required: true,
      },
      coordinates: {
        type: [Number],
        required: [true, '坐标不能为空'],
        validate: {
          validator: function(v: number[]) {
            return v.length === 2 && 
                   v[0] >= -180 && v[0] <= 180 && // longitude
                   v[1] >= -90 && v[1] <= 90;     // latitude
          },
          message: '坐标格式错误',
        },
        index: '2dsphere',
      },
    },
    businessHours: {
      open: {
        type: String,
        required: [true, '营业开始时间不能为空'],
        match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, '时间格式错误'],
      },
      close: {
        type: String,
        required: [true, '营业结束时间不能为空'],
        match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, '时间格式错误'],
      },
      isClosed: {
        type: Boolean,
        default: false,
      },
    },
    images: [{
      type: String,
      validate: {
        validator: function(v: string) {
          return /^https?:\/\/.+/.test(v);
        },
        message: '图片必须是有效的URL',
      },
    }],
    tags: [{
      type: String,
      maxlength: [20, '标签不能超过20个字符'],
      trim: true,
    }],
    rating: {
      type: Number,
      min: [0, '评分不能小于0'],
      max: [5, '评分不能大于5'],
      default: 0,
      get: (v: number) => Math.round(v * 10) / 10, // 保留一位小数
      set: (v: number) => Math.round(v * 10) / 10,
      index: true,
    },
    reviewCount: {
      type: Number,
      min: [0, '评价数量不能为负数'],
      default: 0,
    },
    totalRevenue: {
      type: Number,
      min: [0, '总收入不能为负数'],
      default: 0,
      get: (v: number) => Math.round(v * 100) / 100,
      set: (v: number) => Math.round(v * 100) / 100,
    },
    monthlyRevenue: {
      type: Number,
      min: [0, '月收入不能为负数'],
      default: 0,
      get: (v: number) => Math.round(v * 100) / 100,
      set: (v: number) => Math.round(v * 100) / 100,
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'inactive', 'pending', 'suspended'],
        message: '状态必须是active、inactive、pending或suspended',
      },
      default: 'pending',
      index: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    verifiedAt: {
      type: Date,
    },
    licenseNumber: {
      type: String,
      trim: true,
    },
    licenseImages: [{
      type: String,
      validate: {
        validator: function(v: string) {
          return /^https?:\/\/.+/.test(v);
        },
        message: '证件图片必须是有效的URL',
      },
    }],
    amenities: [{
      type: String,
      maxlength: [30, '设施名称不能超过30个字符'],
      trim: true,
    }],
    priceRange: {
      min: {
        type: Number,
        min: [0, '最低价格不能为负数'],
        default: 0,
        get: (v: number) => Math.round(v * 100) / 100,
        set: (v: number) => Math.round(v * 100) / 100,
      },
      max: {
        type: Number,
        min: [0, '最高价格不能为负数'],
        default: 0,
        get: (v: number) => Math.round(v * 100) / 100,
        set: (v: number) => Math.round(v * 100) / 100,
      },
    },
    capacity: {
      type: Number,
      min: [1, '容量至少为1'],
      default: 1,
    },
    roomCount: {
      type: Number,
      min: [0, '包间数量不能为负数'],
      default: 0,
    },
    features: [{
      type: String,
      maxlength: [50, '特色服务不能超过50个字符'],
      trim: true,
    }],
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
StoreSchema.index({ name: 'text', description: 'text', tags: 'text' });
StoreSchema.index({ location: '2dsphere' });
StoreSchema.index({ ownerId: 1, status: 1 });
StoreSchema.index({ status: 1, isVerified: 1 });
StoreSchema.index({ rating: -1, reviewCount: -1 });
StoreSchema.index({ totalRevenue: -1 });
StoreSchema.index({ createdAt: -1 });

/**
 * 验证中间件
 */
StoreSchema.pre('save', function(next) {
  // 验证营业时间
  const { open, close } = this.businessHours;
  const [openHour, openMinute] = open.split(':').map(Number);
  const [closeHour, closeMinute] = close.split(':').map(Number);
  
  const openTime = openHour * 60 + openMinute;
  const closeTime = closeHour * 60 + closeMinute;
  
  if (openTime >= closeTime) {
    return next(new Error('营业开始时间必须早于结束时间'));
  }
  
  // 验证价格范围
  if (this.priceRange.min > this.priceRange.max && this.priceRange.max > 0) {
    return next(new Error('最低价格不能高于最高价格'));
  }
  
  next();
});

/**
 * 实例方法
 */

// 更新评分
StoreSchema.methods.updateRating = async function(): Promise<void> {
  try {
    const Review = mongoose.model('Review');
    const result = await Review.aggregate([
      { $match: { storeId: this._id, isActive: true } },
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
    logger.error('更新店铺评分失败:', error);
  }
};

// 添加收入
StoreSchema.methods.addRevenue = async function(amount: number): Promise<void> {
  if (amount <= 0) {
    throw new Error('收入金额必须大于0');
  }
  
  this.totalRevenue += amount;
  this.monthlyRevenue += amount;
  await this.save();
};

// 检查是否营业
StoreSchema.methods.isOpen = function(time: Date = new Date()): boolean {
  if (this.businessHours.isClosed || this.status !== 'active') {
    return false;
  }
  
  const hour = time.getHours();
  const minute = time.getMinutes();
  const currentTime = hour * 60 + minute;
  
  const [openHour, openMinute] = this.businessHours.open.split(':').map(Number);
  const [closeHour, closeMinute] = this.businessHours.close.split(':').map(Number);
  
  const openTime = openHour * 60 + openMinute;
  const closeTime = closeHour * 60 + closeMinute;
  
  return currentTime >= openTime && currentTime <= closeTime;
};

// 计算距离（米）
StoreSchema.methods.getDistance = function(longitude: number, latitude: number): number {
  const [storeLng, storeLat] = this.location.coordinates;
  
  const R = 6371000; // 地球半径（米）
  const dLat = (latitude - storeLat) * Math.PI / 180;
  const dLng = (longitude - storeLng) * Math.PI / 180;
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(storeLat * Math.PI / 180) * Math.cos(latitude * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return Math.round(R * c);
};

/**
 * 静态方法
 */

// 根据店主查找店铺
StoreSchema.statics.findByOwner = function(ownerId: string): Promise<IStore[]> {
  return this.find({ ownerId, status: { $ne: 'inactive' } });
};

// 查找附近店铺
StoreSchema.statics.findNearby = function(
  longitude: number, 
  latitude: number, 
  maxDistance: number = 5000
): Promise<IStore[]> {
  return this.find({
    status: 'active',
    'location.coordinates': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: maxDistance
      }
    }
  }).populate('ownerId', 'nickname phone');
};

// 根据状态查找店铺
StoreSchema.statics.findByStatus = function(status: string): Promise<IStore[]> {
  return this.find({ status }).populate('ownerId', 'nickname phone');
};

// 搜索店铺
StoreSchema.statics.search = function(query: string, filters: any = {}): Promise<IStore[]> {
  const searchFilters = {
    status: 'active',
    $text: { $search: query },
    ...filters
  };
  
  return this.find(searchFilters, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' }, rating: -1 })
    .populate('ownerId', 'nickname phone');
};

// 获取高评分店铺
StoreSchema.statics.getTopRated = function(limit: number = 10): Promise<IStore[]> {
  return this.find({ 
    status: 'active', 
    reviewCount: { $gte: 5 } 
  })
    .sort({ rating: -1, reviewCount: -1 })
    .limit(limit)
    .populate('ownerId', 'nickname phone');
};

/**
 * 虚拟字段
 */

// 平均价格
StoreSchema.virtual('averagePrice').get(function() {
  if (this.priceRange.min === 0 && this.priceRange.max === 0) {
    return 0;
  }
  return (this.priceRange.min + this.priceRange.max) / 2;
});

// 营业状态
StoreSchema.virtual('businessStatus').get(function() {
  if (this.status !== 'active') return '暂停营业';
  if (this.businessHours.isClosed) return '暂停营业';
  return this.isOpen() ? '营业中' : '休息中';
});

/**
 * 中间件钩子
 */

// 删除店铺时的清理工作
StoreSchema.pre('remove', async function() {
  try {
    const Room = mongoose.model('Room');
    const Order = mongoose.model('Order');
    const Review = mongoose.model('Review');
    
    await Room.deleteMany({ storeId: this._id });
    await Order.updateMany(
      { storeId: this._id },
      { $set: { storeId: null, storeDeleted: true } }
    );
    await Review.updateMany(
      { storeId: this._id },
      { $set: { storeId: null, storeDeleted: true } }
    );
    
    logger.info(`店铺 ${this.name} 相关数据已清理`);
  } catch (error) {
    logger.error('删除店铺时清理数据失败:', error);
  }
});

/**
 * 导出模型
 */
export const Store = mongoose.model<IStore, IStoreModel>('Store', StoreSchema);
