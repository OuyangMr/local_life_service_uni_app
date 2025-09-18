import { connectDatabase, closeDatabase, mongoose } from '../../config/database';
// eslint-disable-next-line no-console
console.log('[seed] module loaded');
import { User } from '../../models/User';
import { Store } from '../../models/Store';
import { Room, RoomStatus } from '../../models/Room';
import { Dish } from '../../models/Dish';

type CreatedRefs = {
  ownerId: string;
  storeIds: string[];
  roomIds: string[];
  dishIds: string[];
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
  const storeIds = await createStores(ownerId);

  const roomIds: string[] = [];
  const dishIds: string[] = [];
  for (const storeId of storeIds) {
    const rIds = await createRooms(storeId);
    const dIds = await createDishes(storeId);
    roomIds.push(...rIds);
    dishIds.push(...dIds);
  }

  return { ownerId, storeIds, roomIds, dishIds };
}

async function main() {
  // eslint-disable-next-line no-console
  console.log('Seed start: connecting to MongoDB...');
  try {
    await connectDatabase();
    // eslint-disable-next-line no-console
    console.log('MongoDB connected. Seeding data...');
    const result = await seed();
    // eslint-disable-next-line no-console
    console.log('✅ 种子数据导入完成:', {
      ownerId: result.ownerId,
      stores: result.storeIds.length,
      rooms: result.roomIds.length,
      dishes: result.dishIds.length,
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
