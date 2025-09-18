import mongoose, { Schema, Document, Model } from 'mongoose';
import { logger } from '@/utils/logger';

/**
 * 评价接口定义
 */
export interface IReview extends Document {
  _id: string;
  userId: string;
  storeId: string;
  roomId?: string;
  orderId?: string;
  dishId?: string;
  rating: number;
  content?: string;
  images: string[];
  reply?: string;
  replyAt?: Date;
  isActive: boolean;
  isAnonymous: boolean;
  tags: string[];
  helpfulCount: number;
  reportCount: number;
  createdAt: Date;
  updatedAt: Date;

  // 实例方法
  addHelpful(): Promise<void>;
  addReport(): Promise<void>;
  replyTo(content: string): Promise<void>;
  deactivate(): Promise<void>;
}

/**
 * 评价模型接口
 */
export interface IReviewModel extends Model<IReview> {
  findByStore(storeId: string, rating?: number): Promise<IReview[]>;
  findByUser(userId: string): Promise<IReview[]>;
  findByOrder(orderId: string): Promise<IReview | null>;
  getStoreRatingStats(storeId: string): Promise<any>;
  getRoomRatingStats(roomId: string): Promise<any>;
}

/**
 * 评价Schema定义
 */
const ReviewSchema = new Schema<IReview>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, '用户ID不能为空'],
      index: true,
    },
    storeId: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: [true, '店铺ID不能为空'],
      index: true,
    },
    roomId: {
      type: Schema.Types.ObjectId,
      ref: 'Room',
      index: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      index: true,
    },
    dishId: {
      type: Schema.Types.ObjectId,
      ref: 'Dish',
      index: true,
    },
    rating: {
      type: Number,
      required: [true, '评分不能为空'],
      min: [1, '评分至少为1'],
      max: [5, '评分最高为5'],
      index: true,
    },
    content: {
      type: String,
      maxlength: [500, '评价内容不能超过500个字符'],
      trim: true,
    },
    images: [
      {
        type: String,
        validate: {
          validator: function (v: string) {
            return /^https?:\/\/.+/.test(v);
          },
          message: '图片必须是有效的URL',
        },
      },
    ],
    reply: {
      type: String,
      maxlength: [300, '回复不能超过300个字符'],
      trim: true,
    },
    replyAt: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isAnonymous: {
      type: Boolean,
      default: false,
    },
    tags: [
      {
        type: String,
        enum: {
          values: [
            '服务好',
            '环境佳',
            '性价比高',
            '菜品美味',
            '分量足',
            '服务差',
            '环境差',
            '性价比低',
            '菜品难吃',
            '分量少',
            '位置好',
            '停车方便',
            '网络快',
            '设备新',
            '干净卫生',
          ],
          message: '评价标签必须是预定义的类型',
        },
      },
    ],
    helpfulCount: {
      type: Number,
      min: [0, '有用数不能为负数'],
      default: 0,
    },
    reportCount: {
      type: Number,
      min: [0, '举报数不能为负数'],
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: {
      getters: true,
      transform: function (doc, ret) {
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
ReviewSchema.index({ storeId: 1, isActive: 1 });
ReviewSchema.index({ roomId: 1, isActive: 1 });
ReviewSchema.index({ userId: 1, createdAt: -1 });
ReviewSchema.index({ orderId: 1 }, { unique: true, sparse: true });
ReviewSchema.index({ rating: 1, createdAt: -1 });
ReviewSchema.index({ createdAt: -1 });
ReviewSchema.index({ helpfulCount: -1 });

/**
 * 验证中间件
 */
ReviewSchema.pre('save', async function (next) {
  // 检查同一订单是否已有评价
  if (this.orderId && this.isNew) {
    const existingReview = await (this.constructor as IReviewModel).findOne({
      orderId: this.orderId,
      _id: { $ne: this._id },
    });

    if (existingReview) {
      return next(new Error('该订单已存在评价'));
    }
  }

  // 图片数量限制
  if (this.images && this.images.length > 9) {
    return next(new Error('最多只能上传9张图片'));
  }

  next();
});

/**
 * 后置中间件 - 更新相关评分
 */
ReviewSchema.post('save', async function () {
  try {
    // 更新店铺评分
    const Store = mongoose.model('Store');
    const store = await Store.findById(this.storeId);
    if (store) {
      await store.updateRating();
    }

    // 更新包间评分
    if (this.roomId) {
      const Room = mongoose.model('Room');
      const room = await Room.findById(this.roomId);
      if (room) {
        await room.updateRating();
      }
    }

    // 更新菜品评分
    if (this.dishId) {
      const Dish = mongoose.model('Dish');
      const dish = await Dish.findById(this.dishId);
      if (dish) {
        await dish.updateRating();
      }
    }
  } catch (error) {
    logger.error('更新评分失败:', error);
  }
});

/**
 * 实例方法
 */

// 添加有用标记
ReviewSchema.methods.addHelpful = async function (): Promise<void> {
  this.helpfulCount += 1;
  await this.save();
};

// 添加举报
ReviewSchema.methods.addReport = async function (): Promise<void> {
  this.reportCount += 1;

  // 如果举报次数过多，自动隐藏
  if (this.reportCount >= 5) {
    this.isActive = false;
  }

  await this.save();
};

// 商家回复（避免与字段名 reply 冲突，方法命名为 replyTo）
ReviewSchema.methods.replyTo = async function (content: string): Promise<void> {
  if (!content || content.trim().length === 0) {
    throw new Error('回复内容不能为空');
  }

  if (content.length > 300) {
    throw new Error('回复内容不能超过300个字符');
  }

  this.reply = content.trim();
  this.replyAt = new Date();
  await this.save();
};

// 停用评价
ReviewSchema.methods.deactivate = async function (): Promise<void> {
  this.isActive = false;
  await this.save();

  // 重新计算相关评分
  const Store = mongoose.model('Store');
  const store = await Store.findById(this.storeId);
  if (store) {
    await store.updateRating();
  }
};

/**
 * 静态方法
 */

// 根据店铺查找评价
ReviewSchema.statics.findByStore = function (storeId: string, rating?: number): Promise<IReview[]> {
  const query: any = { storeId, isActive: true };
  if (rating) {
    query.rating = rating;
  }

  return this.find(query).populate('userId', 'nickname avatar').sort({ createdAt: -1 });
};

// 根据用户查找评价
ReviewSchema.statics.findByUser = function (userId: string): Promise<IReview[]> {
  return this.find({ userId })
    .populate('storeId', 'name')
    .populate('roomId', 'name')
    .sort({ createdAt: -1 });
};

// 根据订单查找评价
ReviewSchema.statics.findByOrder = function (orderId: string): Promise<IReview | null> {
  return this.findOne({ orderId }).populate('userId', 'nickname avatar');
};

// 获取店铺评分统计
ReviewSchema.statics.getStoreRatingStats = function (storeId: string): Promise<any> {
  return this.aggregate([
    { $match: { storeId: new mongoose.Types.ObjectId(storeId), isActive: true } },
    {
      $group: {
        _id: '$rating',
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: -1 } },
  ]);
};

// 获取包间评分统计
ReviewSchema.statics.getRoomRatingStats = function (roomId: string): Promise<any> {
  return this.aggregate([
    { $match: { roomId: new mongoose.Types.ObjectId(roomId), isActive: true } },
    {
      $group: {
        _id: '$rating',
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: -1 } },
  ]);
};

/**
 * 虚拟字段
 */

// 评分文本
ReviewSchema.virtual('ratingText').get(function () {
  const texts = ['', '很差', '较差', '一般', '较好', '很好'];
  return texts[this.rating] || '未知';
});

// 是否有回复
ReviewSchema.virtual('hasReply').get(function () {
  return !!(this.reply && this.reply.trim());
});

// 是否为好评
ReviewSchema.virtual('isPositive').get(function () {
  return this.rating >= 4;
});

/**
 * 导出模型
 */
export const Review = mongoose.model<IReview, IReviewModel>('Review', ReviewSchema);
