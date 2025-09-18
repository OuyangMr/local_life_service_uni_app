import mongoose, { Schema, Document, Model } from 'mongoose';
import { logger } from '@/utils/logger';

/**
 * 菜品接口定义
 */
export interface IDish extends Document {
  _id: string;
  storeId: string;
  name: string;
  description?: string;
  price: number;
  vipPrice?: number;
  category: string;
  tags: string[];
  images: string[];
  isActive: boolean;
  stock: number;
  salesCount: number;
  rating: number;
  reviewCount: number;
  preparationTime: number; // 制作时间（分钟）
  spicyLevel: number; // 辣度等级 0-5
  allergens: string[]; // 过敏原
  nutrition?: {
    calories?: number;
    protein?: number;
    fat?: number;
    carbs?: number;
  };
  createdAt: Date;
  updatedAt: Date;
  
  // 实例方法
  updateStock(quantity: number): Promise<void>;
  addSales(quantity: number): Promise<void>;
  updateRating(): Promise<void>;
  getEffectivePrice(isVip: boolean): number;
}

/**
 * 菜品模型接口
 */
export interface IDishModel extends Model<IDish> {
  findByStore(storeId: string, category?: string): Promise<IDish[]>;
  findAvailable(storeId: string): Promise<IDish[]>;
  searchDishes(storeId: string, query: string): Promise<IDish[]>;
  getTopSelling(storeId: string, limit?: number): Promise<IDish[]>;
  findByCategory(category: string): Promise<IDish[]>;
}

/**
 * 菜品Schema定义
 */
const DishSchema = new Schema<IDish>(
  {
    storeId: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: [true, '店铺ID不能为空'],
      index: true,
    },
    name: {
      type: String,
      required: [true, '菜品名称不能为空'],
      minlength: [1, '菜品名称至少1个字符'],
      maxlength: [50, '菜品名称不能超过50个字符'],
      trim: true,
      index: true,
    },
    description: {
      type: String,
      maxlength: [300, '描述不能超过300个字符'],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, '价格不能为空'],
      min: [0, '价格不能为负数'],
      get: (v: number) => Math.round(v * 100) / 100,
      set: (v: number) => Math.round(v * 100) / 100,
      index: true,
    },
    vipPrice: {
      type: Number,
      min: [0, 'VIP价格不能为负数'],
      get: (v: number) => v ? Math.round(v * 100) / 100 : v,
      set: (v: number) => v ? Math.round(v * 100) / 100 : v,
      validate: {
        validator: function(this: IDish, v: number) {
          return !v || v <= this.price;
        },
        message: 'VIP价格不能高于普通价格',
      },
    },
    category: {
      type: String,
      required: [true, '分类不能为空'],
      minlength: [1, '分类至少1个字符'],
      maxlength: [30, '分类不能超过30个字符'],
      trim: true,
      index: true,
    },
    tags: [{
      type: String,
      maxlength: [20, '标签不能超过20个字符'],
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
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    stock: {
      type: Number,
      min: [0, '库存不能为负数'],
      default: 999,
    },
    salesCount: {
      type: Number,
      min: [0, '销量不能为负数'],
      default: 0,
      index: true,
    },
    rating: {
      type: Number,
      min: [0, '评分不能小于0'],
      max: [5, '评分不能大于5'],
      default: 0,
      get: (v: number) => Math.round(v * 10) / 10,
      set: (v: number) => Math.round(v * 10) / 10,
      index: true,
    },
    reviewCount: {
      type: Number,
      min: [0, '评价数量不能为负数'],
      default: 0,
    },
    preparationTime: {
      type: Number,
      min: [0, '制作时间不能为负数'],
      max: [180, '制作时间不能超过3小时'],
      default: 15,
    },
    spicyLevel: {
      type: Number,
      min: [0, '辣度等级最低为0'],
      max: [5, '辣度等级最高为5'],
      default: 0,
    },
    allergens: [{
      type: String,
      enum: {
        values: ['麸质', '花生', '坚果', '牛奶', '鸡蛋', '鱼类', '贝类', '大豆'],
        message: '过敏原必须是预定义的类型',
      },
    }],
    nutrition: {
      calories: {
        type: Number,
        min: [0, '卡路里不能为负数'],
      },
      protein: {
        type: Number,
        min: [0, '蛋白质不能为负数'],
      },
      fat: {
        type: Number,
        min: [0, '脂肪不能为负数'],
      },
      carbs: {
        type: Number,
        min: [0, '碳水化合物不能为负数'],
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
DishSchema.index({ name: 'text', description: 'text', tags: 'text' });
DishSchema.index({ storeId: 1, category: 1 });
DishSchema.index({ storeId: 1, isActive: 1 });
DishSchema.index({ category: 1, isActive: 1 });
DishSchema.index({ salesCount: -1 });
DishSchema.index({ rating: -1 });
DishSchema.index({ price: 1 });

/**
 * 验证中间件
 */
DishSchema.pre('save', function(next) {
  // 确保VIP价格不高于普通价格
  if (this.vipPrice && this.vipPrice > this.price) {
    return next(new Error('VIP价格不能高于普通价格'));
  }
  
  next();
});

/**
 * 实例方法
 */

// 更新库存
DishSchema.methods.updateStock = async function(quantity: number): Promise<void> {
  if (this.stock + quantity < 0) {
    throw new Error('库存不足');
  }
  
  this.stock += quantity;
  await this.save();
};

// 增加销量
DishSchema.methods.addSales = async function(quantity: number): Promise<void> {
  if (quantity <= 0) {
    throw new Error('销量必须大于0');
  }
  
  this.salesCount += quantity;
  await this.save();
};

// 更新评分
DishSchema.methods.updateRating = async function(): Promise<void> {
  try {
    const Review = mongoose.model('Review');
    const result = await Review.aggregate([
      { $match: { dishId: this._id, isActive: true } },
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
    logger.error('更新菜品评分失败:', error);
  }
};

// 获取有效价格
DishSchema.methods.getEffectivePrice = function(isVip: boolean): number {
  return isVip && this.vipPrice ? this.vipPrice : this.price;
};

/**
 * 静态方法
 */

// 根据店铺查找菜品
DishSchema.statics.findByStore = function(storeId: string, category?: string): Promise<IDish[]> {
  const query: any = { storeId, isActive: true };
  if (category) {
    query.category = category;
  }
  
  return this.find(query).sort({ category: 1, salesCount: -1 });
};

// 查找可用菜品
DishSchema.statics.findAvailable = function(storeId: string): Promise<IDish[]> {
  return this.find({
    storeId,
    isActive: true,
    stock: { $gt: 0 }
  }).sort({ category: 1, salesCount: -1 });
};

// 搜索菜品
DishSchema.statics.searchDishes = function(storeId: string, query: string): Promise<IDish[]> {
  return this.find({
    storeId,
    isActive: true,
    $text: { $search: query }
  }, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' }, salesCount: -1 });
};

// 获取热销菜品
DishSchema.statics.getTopSelling = function(storeId: string, limit: number = 10): Promise<IDish[]> {
  return this.find({
    storeId,
    isActive: true,
    salesCount: { $gt: 0 }
  })
    .sort({ salesCount: -1, rating: -1 })
    .limit(limit);
};

// 根据分类查找菜品
DishSchema.statics.findByCategory = function(category: string): Promise<IDish[]> {
  return this.find({
    category,
    isActive: true
  }).sort({ salesCount: -1 });
};

/**
 * 虚拟字段
 */

// 是否有库存
DishSchema.virtual('inStock').get(function() {
  return this.stock > 0;
});

// 是否热销
DishSchema.virtual('isPopular').get(function() {
  return this.salesCount >= 50; // 销量超过50为热销
});

// 辣度描述
DishSchema.virtual('spicyText').get(function() {
  const levels = ['不辣', '微辣', '轻辣', '中辣', '重辣', '变态辣'];
  return levels[this.spicyLevel] || '不辣';
});

/**
 * 导出模型
 */
export const Dish = mongoose.model<IDish, IDishModel>('Dish', DishSchema);
