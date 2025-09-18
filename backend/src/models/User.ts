import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import { logger } from '@/utils/logger';

/**
 * 用户接口定义
 */
export interface IUser extends Document {
  _id: string;
  phone: string;
  password: string;
  nickname?: string;
  avatar?: string;
  userType: 'user' | 'merchant' | 'admin';
  vipLevel: number;
  vipExpireAt?: Date;
  balance: number;
  totalSpent: number;
  preferredStores: string[];
  location?: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
    address?: string;
  };
  isActive: boolean;
  isVerified: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // 实例方法
  comparePassword(password: string): Promise<boolean>;
  updateLastLogin(): Promise<void>;
  upgradeVip(level: number, duration: number): Promise<void>;
  addBalance(amount: number): Promise<void>;
  deductBalance(amount: number): Promise<boolean>;
}

/**
 * 用户模型接口
 */
export interface IUserModel extends Model<IUser> {
  findByPhone(phone: string): Promise<IUser | null>;
  findActiveUsers(filters?: any): Promise<IUser[]>;
  getVipUsers(level?: number): Promise<IUser[]>;
  findNearbyUsers(longitude: number, latitude: number, maxDistance: number): Promise<IUser[]>;
}

/**
 * 用户Schema定义
 */
const UserSchema = new Schema<IUser>(
  {
    phone: {
      type: String,
      required: [true, '手机号码不能为空'],
      unique: true,
      match: [/^1[3-9]\d{9}$/, '请输入有效的手机号码'],
      index: true,
    },
    password: {
      type: String,
      required: [true, '密码不能为空'],
      minlength: [6, '密码长度至少6位'],
      select: false, // 默认查询时不返回密码
    },
    nickname: {
      type: String,
      maxlength: [20, '昵称不能超过20个字符'],
      trim: true,
    },
    avatar: {
      type: String,
      validate: {
        validator: function(v: string) {
          return !v || /^https?:\/\/.+/.test(v);
        },
        message: '头像必须是有效的URL',
      },
    },
    userType: {
      type: String,
      enum: {
        values: ['user', 'merchant', 'admin'],
        message: '用户类型必须是user、merchant或admin',
      },
      default: 'user',
      index: true,
    },
    vipLevel: {
      type: Number,
      min: [0, 'VIP等级不能小于0'],
      max: [5, 'VIP等级不能大于5'],
      default: 0,
      index: true,
    },
    vipExpireAt: {
      type: Date,
      validate: {
        validator: function(this: IUser, v: Date) {
          return !v || this.vipLevel > 0;
        },
        message: 'VIP过期时间需要VIP等级大于0',
      },
    },
    balance: {
      type: Number,
      min: [0, '余额不能为负数'],
      default: 0,
      get: (v: number) => Math.round(v * 100) / 100, // 保留两位小数
      set: (v: number) => Math.round(v * 100) / 100,
    },
    totalSpent: {
      type: Number,
      min: [0, '消费总额不能为负数'],
      default: 0,
      get: (v: number) => Math.round(v * 100) / 100,
      set: (v: number) => Math.round(v * 100) / 100,
    },
    preferredStores: [{
      type: Schema.Types.ObjectId,
      ref: 'Store',
    }],
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        validate: {
          validator: function(v: number[]) {
            return v.length === 2 && 
                   v[0] >= -180 && v[0] <= 180 && // longitude
                   v[1] >= -90 && v[1] <= 90;     // latitude
          },
          message: '坐标格式错误',
        },
      },
      address: {
        type: String,
        maxlength: [200, '地址不能超过200个字符'],
      },
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    lastLoginAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: {
      getters: true,
      transform: function(doc, ret) {
        delete ret.password;
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
UserSchema.index({ phone: 1 }, { unique: true });
UserSchema.index({ userType: 1, isActive: 1 });
UserSchema.index({ vipLevel: 1, vipExpireAt: 1 });
UserSchema.index({ 'location.coordinates': '2dsphere' });
UserSchema.index({ totalSpent: -1 });
UserSchema.index({ lastLoginAt: -1 });

/**
 * 密码加密中间件
 */
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * VIP过期检查中间件
 */
UserSchema.pre('find', function() {
  this.where({
    $or: [
      { vipExpireAt: { $exists: false } },
      { vipExpireAt: { $gte: new Date() } },
      { vipLevel: 0 }
    ]
  });
});

/**
 * 实例方法
 */

// 比较密码
UserSchema.methods.comparePassword = async function(password: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, this.password);
  } catch (error) {
    logger.error('密码比较失败:', error);
    return false;
  }
};

// 更新最后登录时间
UserSchema.methods.updateLastLogin = async function(): Promise<void> {
  this.lastLoginAt = new Date();
  await this.save();
};

// 升级VIP
UserSchema.methods.upgradeVip = async function(level: number, duration: number): Promise<void> {
  if (level < 0 || level > 5) {
    throw new Error('VIP等级必须在0-5之间');
  }
  
  this.vipLevel = level;
  if (level > 0) {
    const now = new Date();
    const expireDate = new Date(now.getTime() + duration * 24 * 60 * 60 * 1000);
    this.vipExpireAt = expireDate;
  } else {
    this.vipExpireAt = undefined;
  }
  
  await this.save();
};

// 添加余额
UserSchema.methods.addBalance = async function(amount: number): Promise<void> {
  if (amount <= 0) {
    throw new Error('充值金额必须大于0');
  }
  
  this.balance += amount;
  await this.save();
};

// 扣除余额
UserSchema.methods.deductBalance = async function(amount: number): Promise<boolean> {
  if (amount <= 0) {
    throw new Error('扣除金额必须大于0');
  }
  
  if (this.balance < amount) {
    return false;
  }
  
  this.balance -= amount;
  this.totalSpent += amount;
  await this.save();
  return true;
};

/**
 * 静态方法
 */

// 根据手机号查找用户
UserSchema.statics.findByPhone = function(phone: string): Promise<IUser | null> {
  return this.findOne({ phone, isActive: true }).select('+password');
};

// 查找活跃用户
UserSchema.statics.findActiveUsers = function(filters: any = {}): Promise<IUser[]> {
  return this.find({ isActive: true, ...filters });
};

// 获取VIP用户
UserSchema.statics.getVipUsers = function(level?: number): Promise<IUser[]> {
  const query: any = { 
    isActive: true,
    vipLevel: { $gt: 0 },
    $or: [
      { vipExpireAt: { $gte: new Date() } },
      { vipExpireAt: { $exists: false } }
    ]
  };
  
  if (level !== undefined) {
    query.vipLevel = level;
  }
  
  return this.find(query);
};

// 查找附近用户
UserSchema.statics.findNearbyUsers = function(
  longitude: number, 
  latitude: number, 
  maxDistance: number = 5000
): Promise<IUser[]> {
  return this.find({
    isActive: true,
    'location.coordinates': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: maxDistance
      }
    }
  });
};

/**
 * 虚拟字段
 */

// 是否为VIP用户
UserSchema.virtual('isVip').get(function() {
  return this.vipLevel > 0 && (!this.vipExpireAt || this.vipExpireAt > new Date());
});

// VIP状态描述
UserSchema.virtual('vipStatus').get(function() {
  if (this.vipLevel === 0) return '普通用户';
  if (this.vipExpireAt && this.vipExpireAt < new Date()) return 'VIP已过期';
  return `VIP${this.vipLevel}`;
});

/**
 * 中间件钩子
 */

// 删除用户时的清理工作
UserSchema.pre('remove', async function() {
  try {
    // 清理相关数据
    const Order = mongoose.model('Order');
    const Review = mongoose.model('Review');
    
    await Order.updateMany(
      { userId: this._id },
      { $set: { userId: null, userDeleted: true } }
    );
    
    await Review.updateMany(
      { userId: this._id },
      { $set: { userId: null, userDeleted: true } }
    );
    
    logger.info(`用户 ${this.phone} 相关数据已清理`);
  } catch (error) {
    logger.error('删除用户时清理数据失败:', error);
  }
});

/**
 * 导出模型
 */
export const User = mongoose.model<IUser, IUserModel>('User', UserSchema);
