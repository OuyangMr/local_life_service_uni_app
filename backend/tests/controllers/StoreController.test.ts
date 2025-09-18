/**
 * StoreController 单元测试
 * 测试店铺管理相关的所有功能
 */

import mongoose from 'mongoose'
import { Store } from '../../src/models/Store'
import { User } from '../../src/models/User'
import { StoreController } from '../../src/controllers/StoreController'
import {
  createMockRequest,
  createMockResponse,
  createTestUser,
  createTestStore,
  connectTestDatabase,
  disconnectTestDatabase,
  cleanupDatabase,
  expectApiResponse,
  expectPaginationResponse,
  expectErrorResponse
} from '../helpers/testUtils'

// Mock外部依赖
jest.mock('../../src/utils/logger')

describe('StoreController', () => {
  let testUser: any
  let merchantUser: any
  let adminUser: any

  beforeAll(async () => {
    await connectTestDatabase()
  })

  afterAll(async () => {
    await disconnectTestDatabase()
  })

  beforeEach(async () => {
    await cleanupDatabase()
    jest.clearAllMocks()

    // 创建测试用户
    testUser = new User(createTestUser({
      userType: 'user'
    }))
    await testUser.save()

    merchantUser = new User(createTestUser({
      phone: '13800138001',
      userType: 'merchant'
    }))
    await merchantUser.save()

    adminUser = new User(createTestUser({
      phone: '13800138002',
      userType: 'admin'
    }))
    await adminUser.save()
  })

  describe('createStore', () => {
    const storeData = {
      name: '测试KTV',
      description: '这是一个测试KTV',
      category: 'ktv',
      address: '测试地址123号',
      longitude: 116.404,
      latitude: 39.915,
      phone: '400-123-4567',
      businessHours: {
        start: '10:00',
        end: '02:00'
      },
      priceRange: {
        min: 100,
        max: 500
      },
      tags: ['KTV', '包间'],
      images: ['https://example.com/image1.jpg']
    }

    it('应该允许商户创建店铺', async () => {
      const req = createMockRequest({
        user: {
          id: merchantUser._id.toString(),
          userType: 'merchant'
        },
        body: storeData
      })
      const res = createMockResponse()

      await StoreController.createStore(req as any, res as any)

      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: '店铺创建成功，等待审核',
          data: expect.objectContaining({
            name: storeData.name,
            status: 'pending'
          })
        })
      )

      // 验证店铺已保存到数据库
      const savedStore = await Store.findOne({ name: storeData.name })
      expect(savedStore).toBeTruthy()
      expect(savedStore?.ownerId.toString()).toBe(merchantUser._id.toString())
      expect(savedStore?.location.coordinates).toEqual([storeData.longitude, storeData.latitude])
    })

    it('应该允许管理员创建店铺', async () => {
      const req = createMockRequest({
        user: {
          id: adminUser._id.toString(),
          userType: 'admin'
        },
        body: storeData
      })
      const res = createMockResponse()

      await StoreController.createStore(req as any, res as any)

      expect(res.status).toHaveBeenCalledWith(201)
    })

    it('应该拒绝普通用户创建店铺', async () => {
      const req = createMockRequest({
        user: {
          id: testUser._id.toString(),
          userType: 'user'
        },
        body: storeData
      })
      const res = createMockResponse()

      await expect(StoreController.createStore(req as any, res as any))
        .rejects.toThrow('只有商户可以创建店铺')
    })

    it('应该拒绝未登录用户创建店铺', async () => {
      const req = createMockRequest({
        user: undefined,
        body: storeData
      })
      const res = createMockResponse()

      await expect(StoreController.createStore(req as any, res as any))
        .rejects.toThrow('需要登录')
    })

    it('应该拒绝商户创建第二个店铺', async () => {
      // 先创建一个店铺
      const existingStore = new Store(createTestStore({
        ownerId: merchantUser._id
      }))
      await existingStore.save()

      const req = createMockRequest({
        user: {
          id: merchantUser._id.toString(),
          userType: 'merchant'
        },
        body: storeData
      })
      const res = createMockResponse()

      await expect(StoreController.createStore(req as any, res as any))
        .rejects.toThrow('您已经拥有一个店铺')
    })
  })

  describe('getStores', () => {
    beforeEach(async () => {
      // 创建测试店铺
      const stores = [
        createTestStore({
          name: 'KTV 1',
          status: 'active',
          isVerified: true,
          rating: 4.5,
          reviewCount: 100,
          category: 'ktv',
          tags: ['KTV', '包间'],
          location: {
            type: 'Point',
            coordinates: [116.404, 39.915] // 北京
          },
          priceRange: { min: 100, max: 300 }
        }),
        createTestStore({
          name: 'KTV 2',
          status: 'active',
          isVerified: true,
          rating: 4.0,
          reviewCount: 50,
          category: 'ktv',
          tags: ['KTV', '豪华'],
          location: {
            type: 'Point',
            coordinates: [116.405, 39.916] // 稍远一点
          },
          priceRange: { min: 200, max: 500 }
        }),
        createTestStore({
          name: 'KTV 3',
          status: 'inactive', // 非活跃状态，不应该出现在结果中
          isVerified: true,
          rating: 3.5,
          reviewCount: 20
        })
      ]

      await Store.insertMany(stores)
    })

    it('应该返回活跃且已验证的店铺列表', async () => {
      const req = createMockRequest({
        query: {
          page: '1',
          limit: '10'
        }
      })
      const res = createMockResponse()

      await StoreController.getStores(req as any, res as any)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: '获取店铺列表成功',
          data: expect.arrayContaining([
            expect.objectContaining({ name: 'KTV 1' }),
            expect.objectContaining({ name: 'KTV 2' })
          ]),
          pagination: expect.objectContaining({
            current: 1,
            pageSize: 10,
            total: 2
          })
        })
      )
    })

    it('应该支持关键词搜索', async () => {
      const req = createMockRequest({
        query: {
          keyword: 'KTV 1',
          page: '1',
          limit: '10'
        }
      })
      const res = createMockResponse()

      await StoreController.getStores(req as any, res as any)

      expect(res.status).toHaveBeenCalledWith(200)
      const response = (res.json as jest.Mock).mock.calls[0][0]
      expect(response.data).toHaveLength(1)
      expect(response.data[0].name).toBe('KTV 1')
    })

    it('应该支持分类筛选', async () => {
      const req = createMockRequest({
        query: {
          category: 'ktv',
          page: '1',
          limit: '10'
        }
      })
      const res = createMockResponse()

      await StoreController.getStores(req as any, res as any)

      expect(res.status).toHaveBeenCalledWith(200)
      const response = (res.json as jest.Mock).mock.calls[0][0]
      expect(response.data.length).toBeGreaterThan(0)
      response.data.forEach((store: any) => {
        expect(store.tags).toContain('ktv')
      })
    })

    it('应该支持价格范围筛选', async () => {
      const req = createMockRequest({
        query: {
          priceMin: '150',
          priceMax: '400',
          page: '1',
          limit: '10'
        }
      })
      const res = createMockResponse()

      await StoreController.getStores(req as any, res as any)

      expect(res.status).toHaveBeenCalledWith(200)
      const response = (res.json as jest.Mock).mock.calls[0][0]
      response.data.forEach((store: any) => {
        expect(store.priceRange.min).toBeGreaterThanOrEqual(150)
        expect(store.priceRange.max).toBeLessThanOrEqual(400)
      })
    })

    it('应该支持按评分筛选', async () => {
      const req = createMockRequest({
        query: {
          rating: '4.2',
          page: '1',
          limit: '10'
        }
      })
      const res = createMockResponse()

      await StoreController.getStores(req as any, res as any)

      expect(res.status).toHaveBeenCalledWith(200)
      const response = (res.json as jest.Mock).mock.calls[0][0]
      response.data.forEach((store: any) => {
        expect(store.rating).toBeGreaterThanOrEqual(4.2)
      })
    })

    it('应该支持地理位置查询', async () => {
      const req = createMockRequest({
        query: {
          longitude: '116.404',
          latitude: '39.915',
          radius: '1', // 1公里范围
          page: '1',
          limit: '10'
        }
      })
      const res = createMockResponse()

      await StoreController.getStores(req as any, res as any)

      expect(res.status).toHaveBeenCalledWith(200)
      const response = (res.json as jest.Mock).mock.calls[0][0]
      expect(response.data.length).toBeGreaterThan(0)
      // 检查是否包含距离信息
      response.data.forEach((store: any) => {
        expect(store).toHaveProperty('distance')
        expect(typeof store.distance).toBe('number')
      })
    })

    it('应该支持不同的排序方式', async () => {
      const req = createMockRequest({
        query: {
          sortBy: 'rating',
          sortOrder: 'desc',
          page: '1',
          limit: '10'
        }
      })
      const res = createMockResponse()

      await StoreController.getStores(req as any, res as any)

      expect(res.status).toHaveBeenCalledWith(200)
      const response = (res.json as jest.Mock).mock.calls[0][0]
      
      // 验证排序结果
      for (let i = 1; i < response.data.length; i++) {
        expect(response.data[i - 1].rating).toBeGreaterThanOrEqual(response.data[i].rating)
      }
    })

    it('应该支持分页', async () => {
      const req = createMockRequest({
        query: {
          page: '2',
          limit: '1'
        }
      })
      const res = createMockResponse()

      await StoreController.getStores(req as any, res as any)

      expect(res.status).toHaveBeenCalledWith(200)
      const response = (res.json as jest.Mock).mock.calls[0][0]
      expect(response.pagination.current).toBe(2)
      expect(response.pagination.pageSize).toBe(1)
      expect(response.data.length).toBeLessThanOrEqual(1)
    })
  })

  describe('getStoreById', () => {
    let testStore: any

    beforeEach(async () => {
      testStore = new Store(createTestStore({
        status: 'active',
        isVerified: true
      }))
      await testStore.save()
    })

    it('应该成功获取店铺详情', async () => {
      const req = createMockRequest({
        params: { id: testStore._id.toString() }
      })
      const res = createMockResponse()

      await StoreController.getStoreById(req as any, res as any)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: '获取店铺详情成功',
          data: expect.objectContaining({
            _id: testStore._id,
            name: testStore.name
          })
        })
      )
    })

    it('应该在店铺不存在时返回错误', async () => {
      const nonExistentId = new mongoose.Types.ObjectId()
      const req = createMockRequest({
        params: { id: nonExistentId.toString() }
      })
      const res = createMockResponse()

      await expect(StoreController.getStoreById(req as any, res as any))
        .rejects.toThrow('店铺不存在')
    })

    it('应该拒绝无效的店铺ID', async () => {
      const req = createMockRequest({
        params: { id: 'invalid-id' }
      })
      const res = createMockResponse()

      await expect(StoreController.getStoreById(req as any, res as any))
        .rejects.toThrow()
    })
  })

  describe('updateStore', () => {
    let testStore: any

    beforeEach(async () => {
      testStore = new Store(createTestStore({
        ownerId: merchantUser._id,
        status: 'active'
      }))
      await testStore.save()
    })

    it('应该允许店铺所有者更新店铺信息', async () => {
      const updateData = {
        name: '更新后的KTV',
        description: '更新后的描述',
        phone: '400-999-8888'
      }

      const req = createMockRequest({
        user: {
          id: merchantUser._id.toString(),
          userType: 'merchant'
        },
        params: { id: testStore._id.toString() },
        body: updateData
      })
      const res = createMockResponse()

      await StoreController.updateStore(req as any, res as any)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: '店铺信息更新成功',
          data: expect.objectContaining({
            name: updateData.name,
            description: updateData.description,
            phone: updateData.phone
          })
        })
      )

      // 验证数据库中的数据已更新
      const updatedStore = await Store.findById(testStore._id)
      expect(updatedStore?.name).toBe(updateData.name)
      expect(updatedStore?.description).toBe(updateData.description)
    })

    it('应该允许管理员更新任何店铺', async () => {
      const updateData = { name: '管理员更新的店铺' }

      const req = createMockRequest({
        user: {
          id: adminUser._id.toString(),
          userType: 'admin'
        },
        params: { id: testStore._id.toString() },
        body: updateData
      })
      const res = createMockResponse()

      await StoreController.updateStore(req as any, res as any)

      expect(res.status).toHaveBeenCalledWith(200)
    })

    it('应该拒绝非所有者更新店铺', async () => {
      const updateData = { name: '非法更新' }

      const req = createMockRequest({
        user: {
          id: testUser._id.toString(),
          userType: 'user'
        },
        params: { id: testStore._id.toString() },
        body: updateData
      })
      const res = createMockResponse()

      await expect(StoreController.updateStore(req as any, res as any))
        .rejects.toThrow('无权限操作此店铺')
    })

    it('应该拒绝未登录用户更新店铺', async () => {
      const req = createMockRequest({
        user: undefined,
        params: { id: testStore._id.toString() },
        body: { name: '非法更新' }
      })
      const res = createMockResponse()

      await expect(StoreController.updateStore(req as any, res as any))
        .rejects.toThrow('需要登录')
    })
  })

  describe('deleteStore', () => {
    let testStore: any

    beforeEach(async () => {
      testStore = new Store(createTestStore({
        ownerId: merchantUser._id,
        status: 'active'
      }))
      await testStore.save()
    })

    it('应该允许店铺所有者删除店铺', async () => {
      const req = createMockRequest({
        user: {
          id: merchantUser._id.toString(),
          userType: 'merchant'
        },
        params: { id: testStore._id.toString() }
      })
      const res = createMockResponse()

      await StoreController.deleteStore(req as any, res as any)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: '店铺删除成功'
        })
      )

      // 验证店铺已被软删除
      const deletedStore = await Store.findById(testStore._id)
      expect(deletedStore?.status).toBe('deleted')
    })

    it('应该允许管理员删除任何店铺', async () => {
      const req = createMockRequest({
        user: {
          id: adminUser._id.toString(),
          userType: 'admin'
        },
        params: { id: testStore._id.toString() }
      })
      const res = createMockResponse()

      await StoreController.deleteStore(req as any, res as any)

      expect(res.status).toHaveBeenCalledWith(200)
    })

    it('应该拒绝非所有者删除店铺', async () => {
      const req = createMockRequest({
        user: {
          id: testUser._id.toString(),
          userType: 'user'
        },
        params: { id: testStore._id.toString() }
      })
      const res = createMockResponse()

      await expect(StoreController.deleteStore(req as any, res as any))
        .rejects.toThrow('无权限操作此店铺')
    })
  })

  describe('getMyStores', () => {
    beforeEach(async () => {
      // 为merchant用户创建店铺
      const stores = [
        createTestStore({
          ownerId: merchantUser._id,
          name: '我的KTV 1'
        }),
        createTestStore({
          ownerId: merchantUser._id,
          name: '我的KTV 2'
        }),
        createTestStore({
          ownerId: testUser._id, // 其他用户的店铺
          name: '其他用户的KTV'
        })
      ]

      await Store.insertMany(stores)
    })

    it('应该返回当前用户的所有店铺', async () => {
      const req = createMockRequest({
        user: {
          id: merchantUser._id.toString(),
          userType: 'merchant'
        }
      })
      const res = createMockResponse()

      await StoreController.getMyStores(req as any, res as any)

      expect(res.status).toHaveBeenCalledWith(200)
      const response = (res.json as jest.Mock).mock.calls[0][0]
      expect(response.success).toBe(true)
      expect(response.data).toHaveLength(2)
      expect(response.data.every((store: any) => 
        store.name.startsWith('我的KTV')
      )).toBe(true)
    })

    it('应该在未登录时返回错误', async () => {
      const req = createMockRequest({
        user: undefined
      })
      const res = createMockResponse()

      await expect(StoreController.getMyStores(req as any, res as any))
        .rejects.toThrow('需要登录')
    })
  })
})

// 辅助函数：计算两点之间的距离
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // 地球半径，单位公里
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  const d = R * c
  return Math.round(d * 1000) / 1000 // 保留3位小数
}
