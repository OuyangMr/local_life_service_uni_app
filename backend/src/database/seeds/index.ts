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
  adminId?: string;
  vipIds?: string[];
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

async function ensureAdminUser(): Promise<string> {
  const phone = '19900003333';
  const existing = await User.findOne({ phone }).select('_id');
  if (existing) {
    console.log('Admin exists:', existing._id.toString());
    return existing._id.toString();
  }
  const user = await User.create({
    phone,
    password: 'Passw0rd!@#',
    nickname: '系统管理员',
    userType: 'admin',
    vipLevel: 0,
    isVerified: true,
  });
  console.log('Admin created:', user._id.toString());
  return user._id.toString();
}

async function ensureVipUsers(): Promise<string[]> {
  const vipDefs = [
    { phone: '19900004444', level: 1, nickname: 'VIP一号' },
    { phone: '19900005555', level: 2, nickname: 'VIP二号' },
    { phone: '19900006666', level: 3, nickname: 'VIP三号' },
  ];
  const ids: string[] = [];
  for (const v of vipDefs) {
    const exists = await User.findOne({ phone: v.phone }).select('_id');
    if (exists) {
      console.log('VIP exists:', v.level, exists._id.toString());
      ids.push(exists._id.toString());
      continue;
    }
    const expireAt = new Date(Date.now() + 180 * 24 * 3600 * 1000);
    const user = await User.create({
      phone: v.phone,
      password: 'Passw0rd!@#',
      nickname: v.nickname,
      userType: 'user',
      vipLevel: v.level,
      vipExpireAt: expireAt,
      isVerified: true,
      balance: 500,
    });
    console.log('VIP created:', v.level, user._id.toString());
    ids.push(user._id.toString());
  }
  return ids;
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
    {
      name: '夜色KTV（中关村店）',
      description: '设备新、主题房，审核中门店',
      phone: '13700000003',
      address: '北京市海淀区海淀大街1号',
      location: { type: 'Point' as const, coordinates: [116.3269, 39.9834] },
      businessHours: { open: '11:00', close: '22:30', isClosed: false },
      images: ['https://picsum.photos/seed/store3/800/400'],
      tags: ['主题房', '设备新'],
      rating: 0,
      reviewCount: 0,
      totalRevenue: 0,
      monthlyRevenue: 0,
      status: 'pending' as const,
      isVerified: false,
      amenities: ['WiFi'],
      priceRange: { min: 99, max: 699 },
      capacity: 120,
      roomCount: 0,
      features: ['审核中'],
    },
    {
      name: '天籁之音KTV（通州店）',
      description: '暂停营业维护中',
      phone: '13600000004',
      address: '北京市通州区新华大街8号',
      location: { type: 'Point' as const, coordinates: [116.6586, 39.9097] },
      businessHours: { open: '10:00', close: '22:00', isClosed: true },
      images: ['https://picsum.photos/seed/store4/800/400'],
      tags: ['维护中'],
      rating: 0,
      reviewCount: 0,
      totalRevenue: 0,
      monthlyRevenue: 0,
      status: 'suspended' as const,
      isVerified: false,
      amenities: [],
      priceRange: { min: 0, max: 0 },
      capacity: 1,
      roomCount: 0,
      features: [],
    },
    {
      name: '悠然KTV（望京店）',
      description: '暂未开业',
      phone: '13500000005',
      address: '北京市朝阳区望京东路2号',
      location: { type: 'Point' as const, coordinates: [116.4821, 40.0031] },
      businessHours: { open: '12:00', close: '21:30', isClosed: true },
      images: ['https://picsum.photos/seed/store5/800/400'],
      tags: ['未开业'],
      rating: 0,
      reviewCount: 0,
      totalRevenue: 0,
      monthlyRevenue: 0,
      status: 'inactive' as const,
      isVerified: false,
      amenities: [],
      priceRange: { min: 0, max: 0 },
      capacity: 1,
      roomCount: 0,
      features: [],
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
    { name: '维护中-中包', capacity: 10, price: 288, deposit: 150, status: RoomStatus.MAINTENANCE },
    { name: '已禁用-小包', capacity: 4, price: 128, deposit: 80, status: RoomStatus.DISABLED },
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
    { name: '重庆辣子鸡', price: 58, category: '热菜', tags: ['重辣'], spicyLevel: 5 },
    { name: '冰镇可乐', price: 8, category: '酒水', tags: ['清凉'], spicyLevel: 0 },
    { name: '鱼香肉丝', price: 42, category: '热菜', tags: ['家常'], spicyLevel: 2 },
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
      stock: d.name.includes('可乐') ? 300 : d.name.includes('辣子鸡') ? 50 : 999,
      salesCount: d.name.includes('百威') ? 120 : d.name.includes('果盘') ? 60 : 0,
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
  const adminId = await ensureAdminUser();
  const vipIds = await ensureVipUsers();
  const storeIds = await createStores(ownerId);

  const roomIds: string[] = [];
  const dishIds: string[] = [];
  for (const storeId of storeIds) {
    const rIds = await createRooms(storeId);
    const dIds = await createDishes(storeId);
    roomIds.push(...rIds);
    dishIds.push(...dIds);
  }

  return { ownerId, customerId, adminId, vipIds, storeIds, roomIds, dishIds };
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

async function createAdvancedScenarios(result: CreatedRefs) {
  const storeId = result.storeIds[0];
  if (!storeId || !result.customerId) return;

  // 库存告警/售罄场景
  const spicy = await Dish.findOne({ storeId, name: '重庆辣子鸡' });
  const cola = await Dish.findOne({ storeId, name: '冰镇可乐' });
  if (spicy) {
    // 将辣子鸡库存降至 1，随后创建订单扣减至 0
    if (spicy.stock !== 1) {
      spicy.stock = 1 as any;
      await spicy.save();
    }
    const invOrderNo = 'SEED-INVENTORY-LOW-1';
    if (!(await Order.findOne({ orderNumber: invOrderNo }).select('_id'))) {
      const order = await Order.create({
        orderNumber: invOrderNo,
        userId: result.customerId,
        storeId,
        type: 'food_order',
        items: [
          {
            dishId: spicy._id as any,
            name: spicy.name,
            price: spicy.price,
            quantity: 1,
            subtotal: spicy.price,
          },
        ],
        contactPhone: '15900003333',
        specialRequests: '[seed] 库存告警/售罄',
        expiredAt: new Date(Date.now() + 15 * 60 * 1000),
      });
      await order.pay({
        method: PaymentMethod.WECHAT,
        amount: order.actualAmount,
        transactionId: 'SEED-TXN-INV1',
      });
      // 手动扣减库存与增加销量
      await spicy.updateStock(-1);
      await spicy.addSales(1);
    }
  }
  if (cola) {
    // 制造低库存商品（例如库存 2），然后一次下两份
    if (cola.stock !== 2) {
      cola.stock = 2 as any;
      await cola.save();
    }
    const invOrderNo2 = 'SEED-INVENTORY-LOW-2';
    if (!(await Order.findOne({ orderNumber: invOrderNo2 }).select('_id'))) {
      const order = await Order.create({
        orderNumber: invOrderNo2,
        userId: result.customerId,
        storeId,
        type: 'food_order',
        items: [
          {
            dishId: cola._id as any,
            name: cola.name,
            price: cola.price,
            quantity: 2,
            subtotal: cola.price * 2,
          },
        ],
        contactPhone: '15900003333',
        specialRequests: '[seed] 库存用尽',
        expiredAt: new Date(Date.now() + 15 * 60 * 1000),
      });
      await order.pay({
        method: PaymentMethod.ALIPAY,
        amount: order.actualAmount,
        transactionId: 'SEED-TXN-INV2',
      });
      await cola.updateStock(-2);
      await cola.addSales(2);
    }
  }

  // 房间满负荷（同一时间段多订单占用）
  const room = await Room.findOne({ storeId }).sort({ capacity: 1 });
  if (room) {
    const start = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const end = new Date(Date.now() + 26 * 60 * 60 * 1000);
    const makeRoomOrder = async (no: string) => {
      if (await Order.findOne({ orderNumber: no }).select('_id')) return;
      const o = await Order.create({
        orderNumber: no,
        userId: result.customerId,
        storeId,
        roomId: room._id as any,
        type: 'room_booking',
        startTime: start,
        endTime: end,
        guestCount: 4,
        items: [],
        deposit: (room.deposit as any) || (room.price as any) || 100,
        contactPhone: '15900003333',
        specialRequests: '[seed] 房间满负荷',
        expiredAt: new Date(Date.now() + 15 * 60 * 1000),
      });
      await o.pay({
        method: PaymentMethod.BALANCE,
        amount: o.actualAmount,
        transactionId: `SEED-TXN-RF-${no}`,
      });
      await o.confirm();
      o.status = OrderStatus.IN_PROGRESS;
      await o.save();
    };
    await makeRoomOrder('SEED-ROOM-FULL-1');
    await makeRoomOrder('SEED-ROOM-FULL-2');
  }

  // 部分退款 & 优惠 + 积分组合
  const dishes = await Dish.find({ storeId }).limit(1);
  if (dishes.length) {
    // 部分退款
    const prNo = 'SEED-PARTIAL-REFUND-2';
    if (!(await Order.findOne({ orderNumber: prNo }).select('_id'))) {
      const d = dishes[0];
      const o = await Order.create({
        orderNumber: prNo,
        userId: result.customerId,
        storeId,
        type: 'food_order',
        items: [
          {
            dishId: d._id as any,
            name: d.name,
            price: d.price,
            quantity: 3,
            subtotal: d.price * 3,
          },
        ],
        contactPhone: '15900003333',
        specialRequests: '[seed] 部分退款',
        expiredAt: new Date(Date.now() + 15 * 60 * 1000),
      });
      await o.pay({
        method: PaymentMethod.BALANCE,
        amount: o.actualAmount,
        transactionId: 'SEED-TXN-PR2',
      });
      await o.confirm();
      // 直接部分退款一半金额
      try {
        await o.refund(Math.max(1, Math.round(o.actualAmount / 2)));
      } catch (e) {
        console.log('[seed] partial refund failed:', (e as any)?.message || e);
      }
    }

    // 优惠 + 积分组合
    const dpNo = 'SEED-DISCOUNT-POINTS-2';
    if (!(await Order.findOne({ orderNumber: dpNo }).select('_id'))) {
      const d = dishes[0];
      const baseSubtotal = d.price * 4;
      const discount = Math.min(10, baseSubtotal / 2);
      const o = await Order.create({
        orderNumber: dpNo,
        userId: result.customerId,
        storeId,
        type: 'food_order',
        items: [
          {
            dishId: d._id as any,
            name: d.name,
            price: d.price,
            quantity: 4,
            subtotal: baseSubtotal,
          },
        ],
        discount,
        contactPhone: '15900003333',
        specialRequests: '[seed] 优惠+积分组合',
        expiredAt: new Date(Date.now() + 15 * 60 * 1000),
      });
      await o.pay({
        method: PaymentMethod.WECHAT,
        amount: o.actualAmount,
        transactionId: 'SEED-TXN-DP2',
      });
      try {
        await PointRecord.createUseRecord(
          result.customerId,
          10,
          o._id as any,
          `订单 ${o.orderNumber} 使用积分抵扣`
        );
      } catch (e) {
        console.log('[seed] createUseRecord skipped:', (e as any)?.message || e);
      }
    }
  }
}

async function createStressAndHistoryScenarios(result: CreatedRefs) {
  const storeId = result.storeIds[0];
  if (!storeId) return;

  // 高并发房间冲突追加（同一时间多订单）
  const room = await Room.findOne({ storeId }).sort({ capacity: 1 });
  if (room && result.customerId) {
    const start = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const end = new Date(Date.now() + 50 * 60 * 60 * 1000);
    for (let i = 3; i <= 5; i++) {
      const no = `SEED-ROOM-FULL-${i}`;
      if (!(await Order.findOne({ orderNumber: no }).select('_id'))) {
        const o = await Order.create({
          orderNumber: no,
          userId: result.customerId,
          storeId,
          roomId: room._id as any,
          type: 'room_booking',
          startTime: start,
          endTime: end,
          guestCount: 6,
          items: [],
          deposit: (room.deposit as any) || (room.price as any) || 100,
          contactPhone: '15900003333',
          specialRequests: '[seed] 房间满负荷-追加',
          expiredAt: new Date(Date.now() + 15 * 60 * 1000),
        });
        await o.pay({
          method: PaymentMethod.WECHAT,
          amount: o.actualAmount,
          transactionId: `SEED-TXN-RF-${no}`,
        });
        await o.confirm();
        o.status = OrderStatus.IN_PROGRESS;
        await o.save();
      }
    }
  }

  // 历史订单/评价/积分（使用 VIP 用户，分布在30/60/90天前）
  if (result.vipIds && result.vipIds.length) {
    const vipUser = result.vipIds[0];
    const dish = await Dish.findOne({ storeId });
    if (vipUser && dish) {
      const days = [30, 60, 90];
      for (const d of days) {
        const no = `SEED-VIP-HIST-${d}`;
        if (await Order.findOne({ orderNumber: no }).select('_id')) continue;
        const created = new Date(Date.now() - d * 24 * 3600 * 1000);
        const o = await Order.create({
          orderNumber: no,
          userId: vipUser,
          storeId,
          type: 'food_order',
          items: [
            {
              dishId: dish._id as any,
              name: dish.name,
              price: dish.price,
              quantity: 2,
              subtotal: dish.price * 2,
            },
          ],
          discount: d >= 60 ? 5 : 0,
          contactPhone: '15800007777',
          specialRequests: `[seed] 历史订单 ${d} 天前`,
          createdAt: created,
          // 为避免支付阶段触发“已过期”，先将 expiredAt 设为未来，再在后续保存时修正其他时间字段
          expiredAt: new Date(Date.now() + 60 * 60 * 1000),
        } as any);
        await o.pay({
          method: PaymentMethod.ALIPAY,
          amount: o.actualAmount,
          transactionId: `SEED-TXN-HIST-${d}`,
        });
        await o.confirm();
        o.status = OrderStatus.COMPLETED;
        o.completedAt = new Date(created.getTime() + 2 * 60 * 60 * 1000);
        await o.save();

        // 历史评价（仅30天与60天）
        if (d !== 90) {
          const rev = await Review.create({
            userId: vipUser,
            storeId,
            orderId: o._id as any,
            rating: d === 30 ? 5 : 4,
            content: `[seed] 历史评价 ${d} 天前`,
            images: ['https://picsum.photos/seed/rev_hist/640/360'],
            tags: ['服务好', '环境佳'],
            createdAt: new Date(created.getTime() + 3 * 60 * 60 * 1000),
          } as any);
          o.isReviewed = true;
          o.reviewId = rev._id as any;
          await o.save();
        }

        // 历史积分（earn）
        await PointRecord.createEarnRecord(vipUser, 5, PointSource.ORDER, `历史订单 ${no} 积分`, {
          hist: true,
        });
      }
    }
  }

  // 退款争议样例：先支付再全额退款，并记录退款积分（正向）
  if (result.customerId) {
    const no = 'SEED-REFUND-DISPUTE-1';
    if (!(await Order.findOne({ orderNumber: no }).select('_id'))) {
      const dish = await Dish.findOne({ storeId });
      if (dish) {
        const o = await Order.create({
          orderNumber: no,
          userId: result.customerId,
          storeId,
          type: 'food_order',
          items: [
            {
              dishId: dish._id as any,
              name: dish.name,
              price: dish.price,
              quantity: 1,
              subtotal: dish.price,
            },
          ],
          contactPhone: '15900003333',
          specialRequests: '[seed] 退款争议',
          expiredAt: new Date(Date.now() + 15 * 60 * 1000),
        });
        await o.pay({
          method: PaymentMethod.WECHAT,
          amount: o.actualAmount,
          transactionId: 'SEED-TXN-RFD1',
        });
        await o.refund();
        // 积分退回示例
        await PointRecord.createEarnRecord(
          result.customerId,
          2,
          PointSource.REFUND,
          `订单 ${no} 退款积分退回`
        );
      }
    }
  }

  // 评价审核样例：被多次举报后自动隐藏
  const flaggedKey = '[seed] 可疑评价，需人工复核';
  const flagged = await Review.findOne({ content: flaggedKey }).select('_id');
  if (!flagged && result.customerId) {
    const anyStore = storeId;
    const r = await Review.create({
      userId: result.customerId,
      storeId: anyStore,
      rating: 2,
      content: flaggedKey,
      images: [],
      tags: ['环境差'],
    });
    for (let i = 0; i < 5; i++) {
      await r.addReport();
    }
  }
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
    await createAdvancedScenarios(result);
    await createStressAndHistoryScenarios(result);

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
