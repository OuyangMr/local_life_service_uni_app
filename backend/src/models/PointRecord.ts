import mongoose, { Schema, Document, Model } from 'mongoose';
import { logger } from '@/utils/logger';

/**
 * 积分类型枚举
 */
export enum PointType {
  EARN = 'earn',     // 获得积分
  USE = 'use',       // 使用积分
  EXPIRE = 'expire', // 积分过期
  REFUND = 'refund', // 积分退回
}

/**
 * 积分来源枚举
 */
export enum PointSource {
  ORDER = 'order',       // 订单获得
  ACTIVITY = 'activity', // 活动获得
  MANUAL = 'manual',     // 手动调整
  REFUND = 'refund',     // 退款退回
  SIGN_IN = 'sign_in',   // 签到获得
  INVITE = 'invite',     // 邀请获得
}

/**
 * 积分记录接口定义
 */
export interface IPointRecord extends Document {
  _id: string;
  userId: string;
  type: PointType;
  amount: number;
  balance: number;
  orderId?: string;
  description: string;
  source: PointSource;
  expiredAt?: Date;
  isProcessed: boolean;
  processedAt?: Date;
  metadata?: {
    activityId?: string;
    inviteUserId?: string;
    adminId?: string;
    refundOrderId?: string;
  };
  createdAt: Date;
  updatedAt: Date;
  
  // 实例方法
  process(): Promise<void>;
  cancel(): Promise<void>;
  isExpired(): boolean;
}

/**
 * 积分记录模型接口
 */
export interface IPointRecordModel extends Model<IPointRecord> {
  findByUser(userId: string, type?: PointType): Promise<IPointRecord[]>;
  getUserBalance(userId: string): Promise<number>;
  processExpiredPoints(): Promise<number>;
  getEarningStats(userId: string, startDate: Date, endDate: Date): Promise<any>;
  createEarnRecord(userId: string, amount: number, source: PointSource, description: string, metadata?: any): Promise<IPointRecord>;
  createUseRecord(userId: string, amount: number, orderId: string, description: string): Promise<IPointRecord>;
}

/**
 * 积分记录Schema定义
 */
const PointRecordSchema = new Schema<IPointRecord>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, '用户ID不能为空'],
      index: true,
    },
    type: {
      type: String,
      enum: {
        values: Object.values(PointType),
        message: '积分类型必须是earn、use、expire或refund',
      },
      required: [true, '积分类型不能为空'],
      index: true,
    },
    amount: {
      type: Number,
      required: [true, '积分数量不能为空'],
      validate: {
        validator: function(this: IPointRecord, v: number) {
          if (this.type === PointType.EARN || this.type === PointType.REFUND) {
            return v > 0;
          } else {
            return v < 0;
          }
        },
        message: '积分数量必须符合类型要求',
      },
    },
    balance: {
      type: Number,
      required: [true, '余额不能为空'],
      min: [0, '余额不能为负数'],
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      index: true,
    },
    description: {
      type: String,
      required: [true, '描述不能为空'],
      maxlength: [200, '描述不能超过200个字符'],
      trim: true,
    },
    source: {
      type: String,
      enum: {
        values: Object.values(PointSource),
        message: '积分来源必须是预定义的类型',
      },
      required: [true, '积分来源不能为空'],
      index: true,
    },
    expiredAt: {
      type: Date,
      validate: {
        validator: function(this: IPointRecord, v: Date) {
          // 只有获得积分才需要设置过期时间
          if (this.type === PointType.EARN) {
            return v && v > new Date();
          }
          return true;
        },
        message: '积分过期时间必须晚于当前时间',
      },
      index: true,
    },
    isProcessed: {
      type: Boolean,
      default: false,
      index: true,
    },
    processedAt: {
      type: Date,
    },
    metadata: {
      activityId: {
        type: Schema.Types.ObjectId,
        ref: 'Activity',
      },
      inviteUserId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
      adminId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
      refundOrderId: {
        type: Schema.Types.ObjectId,
        ref: 'Order',
      },
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
PointRecordSchema.index({ userId: 1, type: 1 });
PointRecordSchema.index({ userId: 1, createdAt: -1 });
PointRecordSchema.index({ type: 1, createdAt: -1 });
PointRecordSchema.index({ expiredAt: 1, type: 1 });
PointRecordSchema.index({ isProcessed: 1, expiredAt: 1 });
PointRecordSchema.index({ source: 1, createdAt: -1 });

/**
 * 预保存中间件
 */
PointRecordSchema.pre('save', function(next) {
  // 设置积分过期时间（获得积分的默认过期时间为1年）
  if (this.type === PointType.EARN && !this.expiredAt) {
    this.expiredAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1年后过期
  }
  
  // 使用和过期类型的积分数量应为负数
  if ((this.type === PointType.USE || this.type === PointType.EXPIRE) && this.amount > 0) {
    this.amount = -Math.abs(this.amount);
  }
  
  next();
});

/**
 * 后置中间件 - 更新用户积分余额
 */
PointRecordSchema.post('save', async function() {
  if (!this.isProcessed) {
    try {
      const User = mongoose.model('User');
      await User.findByIdAndUpdate(this.userId, {
        $inc: { points: this.amount }
      });
      
      this.isProcessed = true;
      this.processedAt = new Date();
      await this.updateOne({ 
        isProcessed: true, 
        processedAt: new Date() 
      });
      
      logger.info(`用户 ${this.userId} 积分变动: ${this.amount}, 余额: ${this.balance}`);
    } catch (error) {
      logger.error('更新用户积分失败:', error);
    }
  }
});

/**
 * 实例方法
 */

// 处理积分
PointRecordSchema.methods.process = async function(): Promise<void> {
  if (this.isProcessed) {
    throw new Error('积分记录已处理');
  }
  
  const User = mongoose.model('User');
  const user = await User.findById(this.userId);
  if (!user) {
    throw new Error('用户不存在');
  }
  
  // 更新用户积分
  const newBalance = Math.max(0, (user.points || 0) + this.amount);
  await User.findByIdAndUpdate(this.userId, { points: newBalance });
  
  this.balance = newBalance;
  this.isProcessed = true;
  this.processedAt = new Date();
  await this.save();
};

// 取消积分记录
PointRecordSchema.methods.cancel = async function(): Promise<void> {
  if (this.isProcessed) {
    // 创建反向记录
    const reverseRecord = new (this.constructor as IPointRecordModel)({
      userId: this.userId,
      type: this.type === PointType.EARN ? PointType.USE : PointType.REFUND,
      amount: -this.amount,
      description: `取消: ${this.description}`,
      source: PointSource.MANUAL,
    });
    
    await reverseRecord.save();
  }
};

// 检查是否过期
PointRecordSchema.methods.isExpired = function(): boolean {
  return this.expiredAt && new Date() > this.expiredAt;
};

/**
 * 静态方法
 */

// 根据用户查找积分记录
PointRecordSchema.statics.findByUser = function(userId: string, type?: PointType): Promise<IPointRecord[]> {
  const query: any = { userId };
  if (type) {
    query.type = type;
  }
  
  return this.find(query).sort({ createdAt: -1 });
};

// 获取用户积分余额
PointRecordSchema.statics.getUserBalance = async function(userId: string): Promise<number> {
  const result = await this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), isProcessed: true } },
    { $group: { _id: null, balance: { $sum: '$amount' } } }
  ]);
  
  return result.length > 0 ? Math.max(0, result[0].balance) : 0;
};

// 处理过期积分
PointRecordSchema.statics.processExpiredPoints = async function(): Promise<number> {
  const expiredRecords = await this.find({
    type: PointType.EARN,
    isProcessed: true,
    expiredAt: { $lt: new Date() },
    // 确保没有对应的过期记录
    _id: {
      $nin: await this.distinct('metadata.originalRecordId', {
        type: PointType.EXPIRE
      })
    }
  });
  
  let expiredCount = 0;
  for (const record of expiredRecords) {
    try {
      // 创建过期记录
      const expireRecord = new this({
        userId: record.userId,
        type: PointType.EXPIRE,
        amount: -record.amount,
        description: `积分过期: ${record.description}`,
        source: PointSource.MANUAL,
        metadata: {
          originalRecordId: record._id
        }
      });
      
      await expireRecord.save();
      expiredCount++;
    } catch (error) {
      logger.error(`处理过期积分失败 ${record._id}:`, error);
    }
  }
  
  return expiredCount;
};

// 获取积分统计
PointRecordSchema.statics.getEarningStats = function(
  userId: string, 
  startDate: Date, 
  endDate: Date
): Promise<any> {
  return this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        type: PointType.EARN,
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$source',
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    },
    { $sort: { totalAmount: -1 } }
  ]);
};

// 创建获得积分记录
PointRecordSchema.statics.createEarnRecord = async function(
  userId: string,
  amount: number,
  source: PointSource,
  description: string,
  metadata: any = {}
): Promise<IPointRecord> {
  if (amount <= 0) {
    throw new Error('获得积分数量必须大于0');
  }
  
  const currentBalance = await this.getUserBalance(userId);
  
  const record = new this({
    userId,
    type: PointType.EARN,
    amount,
    balance: currentBalance + amount,
    description,
    source,
    metadata
  });
  
  await record.save();
  return record;
};

// 创建使用积分记录
PointRecordSchema.statics.createUseRecord = async function(
  userId: string,
  amount: number,
  orderId: string,
  description: string
): Promise<IPointRecord> {
  if (amount <= 0) {
    throw new Error('使用积分数量必须大于0');
  }
  
  const currentBalance = await this.getUserBalance(userId);
  if (currentBalance < amount) {
    throw new Error('积分余额不足');
  }
  
  const record = new this({
    userId,
    type: PointType.USE,
    amount: -amount,
    balance: currentBalance - amount,
    orderId,
    description,
    source: PointSource.ORDER
  });
  
  await record.save();
  return record;
};

/**
 * 虚拟字段
 */

// 积分类型描述
PointRecordSchema.virtual('typeText').get(function() {
  const typeMap = {
    [PointType.EARN]: '获得',
    [PointType.USE]: '使用',
    [PointType.EXPIRE]: '过期',
    [PointType.REFUND]: '退回',
  };
  return typeMap[this.type] || '未知';
});

// 积分来源描述
PointRecordSchema.virtual('sourceText').get(function() {
  const sourceMap = {
    [PointSource.ORDER]: '订单获得',
    [PointSource.ACTIVITY]: '活动获得',
    [PointSource.MANUAL]: '手动调整',
    [PointSource.REFUND]: '退款退回',
    [PointSource.SIGN_IN]: '签到获得',
    [PointSource.INVITE]: '邀请获得',
  };
  return sourceMap[this.source] || '未知';
});

/**
 * 导出模型
 */
export const PointRecord = mongoose.model<IPointRecord, IPointRecordModel>('PointRecord', PointRecordSchema);
