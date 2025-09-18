import { connectDatabase, closeDatabase, mongoose } from '../../config/database';
// eslint-disable-next-line no-console
console.log('[seed] module loaded');
import { User } from '../../models/User';
import { Store } from '../../models/Store';
import { Room, RoomStatus } from '../../models/Room';
import { Dish } from '../../models/Dish';
import { Order, OrderStatus, PaymentMethod } from '../../models/Order';
import { Review } from '../../models/Review';
import { PointRecord, PointSource } from '../../models/PointRecord';

type CreatedRefs = {
  ownerId: string;
  storeIds: string[];
  roomIds: string[];
  dishIds: string[];
  customerId?: string;
  orderIds?: string[];
  reviewIds?: string[];
};

async function ensureMerchantOwner(): Promise<string> {
  const phone = '19900001111';
  const existing = await User.findOne({ phone }).select('_id');
  if (existing) {
    // eslint-disable-next-line no-console
    console.log('Owner exists:', existing._id.toString());
    return existing._id.toString();
  }

  const user = await User.create({
    phone,
    password: 'Passw0rd!@#',
    nickname: '示例商户',
    userType: 'merchant',
    vipLevel: 1,
    isVerified: true,
    balance: 1000,
    totalSpent: 0,
  });
  // eslint-disable-next-line no-console
  console.log('Owner created:', user._id.toString());
  return user._id.toString();
}

async function ensureCustomerUser(): Promise<string> {
  const phone = '19900002222';
  const existing = await User.findOne({ phone }).select('_id');
  if (existing) {
    // eslint-disable-next-line no-console
    console.log('Customer exists:', existing._id.toString());
    return existing._id.toString();
  }

  const user = await User.create({
    phone,
    password: 'Passw0rd!@#',
    nickname: '示例用户',
    userType: 'user',
    vipLevel: 0,
    isVerified: true,
    balance: 2000,
    totalSpent: 0,
  });
  // eslint-disable-next-line no-console
  console.log('Customer created:', user._id.toString());
  return user._id.toString();
}

async function createStores(ownerId: string): Promise<string[]> {
  const samples = [
    {
      name: '星光KTV（国贸店）',
      description: '环境优雅，音效专业，适合团建聚会',
      phone: '13800000001',
      address: '北京市朝阳区建国门外大街甲6号',
      location: { type: 'Point' as const, coordinates: [116.4603, 39.9146] },
      businessHours: { open: '10:00', close: '23:30', isClosed: false },
      images: ['https://picsum.photos/seed/store1/800/400'],
      tags: ['商务聚会', '停车方便'],
      rating: 4.6,
      reviewCount: 28,
      totalRevenue: 0,
      monthlyRevenue: 0,
      status: 'active' as const,
      isVerified: true,
      amenities: ['WiFi', '停车场', '酒水'],
      priceRange: { min: 198, max: 1298 },
      capacity: 300,
      roomCount: 0,
      features: ['专业音响', '大屏投影'],
    },
    {
      name: '乐巢量贩KTV（五道口店）',
      description: '学生最爱，高性价比量贩式KTV',
      phone: '13900000002',
      address: '北京市海淀区成府路45号',
      location: { type: 'Point' as const, coordinates: [116.3343, 39.9999] },
      businessHours: { open: '12:00', close: '23:00', isClosed: false },
      images: ['https://picsum.photos/seed/store2/800/400'],
      tags: ['学生党', '性价比'],
      rating: 4.3,
      reviewCount: 16,
      totalRevenue: 0,
      monthlyRevenue: 0,
      status: 'active' as const,
      isVerified: true,
      amenities: ['WiFi', '地铁周边'],
      priceRange: { min: 99, max: 899 },
      capacity: 200,
      roomCount: 0,
      features: ['自助点歌', '主题包间'],
    },
  ];

  const ids: string[] = [];
  for (const s of samples) {
    const existed = await Store.findOne({ name: s.name }).select('_id');
    if (existed) {
      ids.push(existed._id.toString());
      // eslint-disable-next-line no-console
      console.log('Store exists:', s.name, existed._id.toString());
      continue;
    }
    const store = await Store.create({ ...s, ownerId });
    // eslint-disable-next-line no-console
    console.log('Store created:', s.name, store._id.toString());
    ids.push(store._id.toString());
  }
  return ids;
}

async function createRooms(storeId: string): Promise<string[]> {
  const roomDefs = [
    { name: '欢聚小包', capacity: 6, price: 198, deposit: 100, status: RoomStatus.AVAILABLE },
    { name: '派对中包', capacity: 12, price: 398, deposit: 200, status: RoomStatus.AVAILABLE },
    { name: '豪华大包', capacity: 20, price: 888, deposit: 500, status: RoomStatus.AVAILABLE },
  ];
  const ids: string[] = [];
  for (const r of roomDefs) {
    const existed = await Room.findOne({ storeId, name: r.name }).select('_id');
    if (existed) {
      ids.push(existed._id.toString());
      // eslint-disable-next-line no-console
      console.log('Room exists:', r.name, existed._id.toString());
      continue;
    }
    const room = await Room.create({
      storeId,
      name: r.name,
      capacity: r.capacity,
      price: r.price,
      deposit: r.deposit,
      amenities: ['沙发', '茶水', '零食'],
      images: ['https://picsum.photos/seed/room-' + encodeURIComponent(r.name) + '/640/360'],
      status: r.status,
      isAvailable: true,
      features: ['大屏电视', '立体音响'],
      equipment: ['麦克风*4', '点歌机'],
    });
    // eslint-disable-next-line no-console
    console.log('Room created:', r.name, room._id.toString());
    ids.push(room._id.toString());
  }
  await Store.updateOne({ _id: storeId }, { $set: { roomCount: ids.length } });
  return ids;
}

async function createDishes(storeId: string): Promise<string[]> {
  const dishes = [
    { name: '果盘拼盘', price: 68, vipPrice: 58, category: '小食', tags: ['清爽'], spicyLevel: 0 },
    {
      name: '椒盐鸡米花',
      price: 48,
      vipPrice: 42,
      category: '炸物',
      tags: ['人气'],
      spicyLevel: 1,
    },
    { name: '香辣花生', price: 18, category: '小食', tags: ['佐酒'], spicyLevel: 2 },
    { name: '牛肉干', price: 38, category: '小食', tags: ['高蛋白'], spicyLevel: 1 },
    { name: '百威啤酒（6听）', price: 78, category: '酒水', tags: ['畅销'], spicyLevel: 0 },
  ];
  const ids: string[] = [];
  for (const d of dishes) {
    const existed = await Dish.findOne({ storeId, name: d.name }).select('_id');
    if (existed) {
      ids.push(existed._id.toString());
      // eslint-disable-next-line no-console
      console.log('Dish exists:', d.name, existed._id.toString());
      continue;
    }
    const dish = await Dish.create({
      storeId,
      name: d.name,
      description: d.tags?.join('、'),
      price: d.price,
      vipPrice: (d as any).vipPrice,
      category: d.category,
      tags: d.tags || [],
      images: ['https://picsum.photos/seed/dish-' + encodeURIComponent(d.name) + '/600/400'],
      isActive: true,
      stock: 999,
      salesCount: 0,
      rating: 0,
      reviewCount: 0,
      preparationTime: 10,
      spicyLevel: d.spicyLevel,
      allergens: [],
    });
    // eslint-disable-next-line no-console
    console.log('Dish created:', d.name, dish._id.toString());
    ids.push(dish._id.toString());
  }
  return ids;
}

async function seed(): Promise<CreatedRefs> {
  const ownerId = await ensureMerchantOwner();
  const customerId = await ensureCustomerUser();
  const storeIds = await createStores(ownerId);

  const roomIds: string[] = [];
  const dishIds: string[] = [];
  for (const storeId of storeIds) {
    const rIds = await createRooms(storeId);
    const dIds = await createDishes(storeId);
    roomIds.push(...rIds);
    dishIds.push(...dIds);
  }

  return { ownerId, customerId, storeIds, roomIds, dishIds };
}

async function createLinkedDemo(result: CreatedRefs) {
  const orderIds: string[] = [];
  const reviewIds: string[] = [];

  const storeId = result.storeIds[0];
  const room = await Room.findOne({ storeId }).sort({ capacity: 1 });
  const dishes = await Dish.find({ storeId }).limit(2);

  if (!storeId || !room || dishes.length === 0 || !result.customerId) {
    // eslint-disable-next-line no-console
    console.log('Skip linked demo due to missing base data');
    return { orderIds, reviewIds };
  }

  // 幂等：若已存在则不重复创建
  const existingOrder = await Order.findOne({ orderNumber: 'SEED-DEMO-ROOM-1' }).select('_id');
  if (!existingOrder) {
    const start = new Date(Date.now() + 60 * 60 * 1000);
    const end = new Date(Date.now() + 3 * 60 * 60 * 1000);
    const items = dishes.map((d) => ({
      dishId: d._id as any,
      name: d.name,
      price: d.price,
      quantity: 1,
      subtotal: d.price,
    }));

    const order = await Order.create({
      orderNumber: 'SEED-DEMO-ROOM-1',
      userId: result.customerId,
      storeId,
      roomId: room._id as any,
      type: 'combo',
      startTime: start,
      endTime: end,
      guestCount: 4,
      items,
      deposit: room.deposit || 0,
      discount: 0,
      contactPhone: '15900003333',
      specialRequests: '[seed] 联动演示订单',
      expiredAt: new Date(Date.now() + 15 * 60 * 1000),
    });

    // 支付
    await order.pay({
      method: PaymentMethod.BALANCE,
      amount: order.actualAmount,
      transactionId: 'SEED-TXN-1',
    });
    // 确认
    await order.confirm();
    // 进行中
    order.status = OrderStatus.IN_PROGRESS;
    await order.save();
    // 完成
    await order.complete();

    // 评价
    const review = await Review.create({
      userId: result.customerId,
      storeId,
      roomId: room._id as any,
      orderId: order._id as any,
      rating: 5,
      content: '环境好，音效棒，服务到位，推荐！',
      images: ['https://picsum.photos/seed/rev1/640/360'],
      tags: ['服务好', '环境佳', '设备新'],
      isAnonymous: false,
    });
    order.isReviewed = true;
    order.reviewId = review._id as any;
    await order.save();

    // 积分（按5%比例）
    const earn = Math.max(1, Math.floor(order.actualAmount * 0.05));
    await PointRecord.createEarnRecord(
      result.customerId,
      earn,
      PointSource.ORDER,
      `订单 ${order.orderNumber} 消费返积分`
    );

    orderIds.push(order._id.toString());
    reviewIds.push(review._id.toString());
    // eslint-disable-next-line no-console
    console.log('Linked demo created:', {
      orderId: order._id.toString(),
      reviewId: review._id.toString(),
      earn,
    });
  } else {
    // eslint-disable-next-line no-console
    console.log('Linked demo order exists, skip');
  }

  return { orderIds, reviewIds };
}

async function main() {
  // eslint-disable-next-line no-console
  console.log('Seed start: connecting to MongoDB...');
  try {
    await connectDatabase();
    // eslint-disable-next-line no-console
    console.log('MongoDB connected. Seeding data...');
    const result = await seed();
    const link = await createLinkedDemo(result);

    // 追加更多联动与状态覆盖（幂等）
    const storeId = result.storeIds[0];
    const dishes = await Dish.find({ storeId }).limit(3);
    if (result.customerId && dishes.length) {
      const mkItems = (mult = 1) =>
        dishes.map((d) => ({
          dishId: d._id as any,
          name: d.name,
          price: d.price,
          quantity: mult,
          subtotal: d.price * mult,
        }));

      // PENDING（待支付）
      if (!(await Order.findOne({ orderNumber: 'SEED-DEMO-PENDING-1' }).select('_id'))) {
        await Order.create({
          orderNumber: 'SEED-DEMO-PENDING-1',
          userId: result.customerId,
          storeId,
          type: 'food_order',
          items: mkItems(1),
          deposit: 0,
          discount: 0,
          contactPhone: '15900003333',
          specialRequests: '[seed] pending',
          expiredAt: new Date(Date.now() + 15 * 60 * 1000),
        });
      }

      // PAID（已支付）
      if (!(await Order.findOne({ orderNumber: 'SEED-DEMO-PAID-1' }).select('_id'))) {
        const paid = await Order.create({
          orderNumber: 'SEED-DEMO-PAID-1',
          userId: result.customerId,
          storeId,
          type: 'food_order',
          items: mkItems(2),
          deposit: 0,
          discount: 0,
          contactPhone: '15900003333',
          specialRequests: '[seed] paid',
          expiredAt: new Date(Date.now() + 15 * 60 * 1000),
        });
        await paid.pay({
          method: PaymentMethod.WECHAT,
          amount: paid.actualAmount,
          transactionId: 'SEED-TXN-P1',
        });
      }

      // CONFIRMED（已确认）
      if (!(await Order.findOne({ orderNumber: 'SEED-DEMO-CONFIRMED-1' }).select('_id'))) {
        const confirmed = await Order.create({
          orderNumber: 'SEED-DEMO-CONFIRMED-1',
          userId: result.customerId,
          storeId,
          type: 'food_order',
          items: mkItems(1),
          contactPhone: '15900003333',
          specialRequests: '[seed] confirmed',
          expiredAt: new Date(Date.now() + 15 * 60 * 1000),
        });
        await confirmed.pay({
          method: PaymentMethod.ALIPAY,
          amount: confirmed.actualAmount,
          transactionId: 'SEED-TXN-C1',
        });
        await confirmed.confirm();
      }

      // IN_PROGRESS（进行中）
      if (!(await Order.findOne({ orderNumber: 'SEED-DEMO-INPROGRESS-1' }).select('_id'))) {
        const ip = await Order.create({
          orderNumber: 'SEED-DEMO-INPROGRESS-1',
          userId: result.customerId,
          storeId,
          type: 'food_order',
          items: mkItems(1),
          contactPhone: '15900003333',
          specialRequests: '[seed] in_progress',
          expiredAt: new Date(Date.now() + 15 * 60 * 1000),
        });
        await ip.pay({
          method: PaymentMethod.BALANCE,
          amount: ip.actualAmount,
          transactionId: 'SEED-TXN-IP1',
        });
        await ip.confirm();
        ip.status = OrderStatus.IN_PROGRESS;
        await ip.save();
      }

      // COMPLETED（已完成）
      if (!(await Order.findOne({ orderNumber: 'SEED-DEMO-COMPLETED-1' }).select('_id'))) {
        const done = await Order.create({
          orderNumber: 'SEED-DEMO-COMPLETED-1',
          userId: result.customerId,
          storeId,
          type: 'food_order',
          items: mkItems(3),
          contactPhone: '15900003333',
          specialRequests: '[seed] completed',
          expiredAt: new Date(Date.now() + 15 * 60 * 1000),
        });
        await done.pay({
          method: PaymentMethod.WECHAT,
          amount: done.actualAmount,
          transactionId: 'SEED-TXN-D1',
        });
        await done.confirm();
        done.status = OrderStatus.IN_PROGRESS;
        await done.save();
        await done.complete();

        // 对完成订单创建积分使用示例（消费积分）
        try {
          await PointRecord.createUseRecord(
            result.customerId,
            5,
            done._id as any,
            `订单 ${done.orderNumber} 使用积分抵扣`
          );
        } catch (e) {
          // eslint-disable-next-line no-console
          console.log('[seed] createUseRecord skipped:', (e as any)?.message || e);
        }
      }

      // CANCELLED（已取消，未支付）
      if (!(await Order.findOne({ orderNumber: 'SEED-DEMO-CANCELLED-1' }).select('_id'))) {
        const cancel = await Order.create({
          orderNumber: 'SEED-DEMO-CANCELLED-1',
          userId: result.customerId,
          storeId,
          type: 'food_order',
          items: mkItems(1),
          contactPhone: '15900003333',
          specialRequests: '[seed] cancelled (unpaid)',
          expiredAt: new Date(Date.now() + 15 * 60 * 1000),
        });
        await cancel.cancel('用户主动取消（未支付）');
      }

      // REFUNDED（已退款）
      if (!(await Order.findOne({ orderNumber: 'SEED-DEMO-REFUNDED-1' }).select('_id'))) {
        const ref = await Order.create({
          orderNumber: 'SEED-DEMO-REFUNDED-1',
          userId: result.customerId,
          storeId,
          type: 'food_order',
          items: mkItems(2),
          contactPhone: '15900003333',
          specialRequests: '[seed] refunded',
          expiredAt: new Date(Date.now() + 15 * 60 * 1000),
        });
        await ref.pay({
          method: PaymentMethod.BALANCE,
          amount: ref.actualAmount,
          transactionId: 'SEED-TXN-R1',
        });
        await ref.cancel('商户处理退款');
      }

      // 额外评价（不绑定订单，绑定店铺/菜品）
      const extraReviewKey = '环境佳，菜品不错，推荐拼盘';
      if (!(await Review.findOne({ content: extraReviewKey }).select('_id'))) {
        await Review.create({
          userId: result.customerId,
          storeId,
          dishId: dishes[0]._id as any,
          rating: 4,
          content: extraReviewKey,
          images: ['https://picsum.photos/seed/rev2/640/360'],
          tags: ['环境佳', '菜品美味'],
          isAnonymous: true,
        });
      }

      // 人为制造一个即将过期的积分并处理过期
      const earnTemp = await PointRecord.createEarnRecord(
        result.customerId,
        3,
        PointSource.ACTIVITY,
        '活动奖励临期积分'
      );
      await PointRecord.updateOne(
        { _id: earnTemp._id },
        { $set: { expiredAt: new Date(Date.now() - 24 * 3600 * 1000) } }
      );
      await PointRecord.processExpiredPoints();
    }
    // eslint-disable-next-line no-console
    console.log('✅ 种子数据导入完成:', {
      ownerId: result.ownerId,
      customerId: result.customerId,
      stores: result.storeIds.length,
      rooms: result.roomIds.length,
      dishes: result.dishIds.length,
      orders: link.orderIds?.length || 0,
      reviews: link.reviewIds?.length || 0,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('❌ 种子数据导入失败:', error);
    process.exitCode = 1;
  } finally {
    try {
      await closeDatabase();
    } catch {}
  }
}

// 始终执行（确保脚本通过 ts-node 运行时不会因 require.main 判断差异而跳过）
main()
  .then(() => {
    // eslint-disable-next-line no-console
    console.log('[seed] done');
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('[seed] error', err);
  });
