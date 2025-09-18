/**
 * 商户和店铺服务
 * @description 实现店铺列表获取、详情查询、类目筛选、地理位置排序等功能
 */

import apiService, { buildQueryParams } from './api'
import type {
  StoreListRequest, NearbyStoresRequest, StoreDetailResponse,
  CreateStoreRequest, UpdateStoreRequest, SpaceAvailabilityRequest,
  SpaceAvailabilityResponse, CreateSpaceRequest, UpdateSpaceRequest
} from '@/types/api'
import type { Store, Space, PaginationInfo } from '@/types'
import { API_ENDPOINTS } from '@/constants'

class StoreService {
  // ============================= 店铺相关 =============================

  /**
   * 获取店铺列表
   */
  async getStoreList(params: StoreListRequest): Promise<{
    stores: Store[]
    pagination: PaginationInfo
  }> {
    const queryString = buildQueryParams(params)
    const response = await apiService.get<{
      stores: Store[]
      pagination: PaginationInfo
    }>(`${API_ENDPOINTS.STORES.LIST}${queryString}`)
    return response.data
  }

  /**
   * 搜索附近店铺
   */
  async searchNearbyStores(params: NearbyStoresRequest): Promise<Store[]> {
    const queryString = buildQueryParams(params)
    const response = await apiService.get<Store[]>(`${API_ENDPOINTS.STORES.NEARBY}${queryString}`)
    return response.data
  }

  /**
   * 获取附近店铺
   * @alias searchNearbyStores
   */
  async getNearbyStores(params: NearbyStoresRequest): Promise<Store[]> {
    return this.searchNearbyStores(params)
  }

  /**
   * 搜索店铺
   */
  async searchStores(keyword: string, params?: Partial<StoreListRequest>): Promise<{
    stores: Store[]
    pagination: PaginationInfo
  }> {
    const searchParams = { keyword, ...params }
    const response = await apiService.post<{
      stores: Store[]
      pagination: PaginationInfo
    }>(API_ENDPOINTS.STORES.SEARCH, searchParams)
    return response.data
  }

  /**
   * 获取店铺详情
   */
  async getStoreDetail(storeId: string): Promise<StoreDetailResponse> {
    const response = await apiService.get<StoreDetailResponse>(
      API_ENDPOINTS.STORES.DETAIL(storeId),
      { showLoading: true }
    )
    return response.data
  }

  /**
   * 获取热门店铺
   */
  async getTopRatedStores(limit: number = 10): Promise<Store[]> {
    const response = await apiService.get<Store[]>(`${API_ENDPOINTS.STORES.TOP_RATED}?limit=${limit}`)
    return response.data
  }

  /**
   * 创建店铺（商户端使用）
   */
  async createStore(params: CreateStoreRequest): Promise<Store> {
    const response = await apiService.post<Store>(
      API_ENDPOINTS.STORES.CREATE,
      params,
      { showLoading: true, loadingText: '创建中...' }
    )
    return response.data
  }

  /**
   * 更新店铺信息（商户端使用）
   */
  async updateStore(storeId: string, params: UpdateStoreRequest): Promise<Store> {
    const response = await apiService.put<Store>(
      API_ENDPOINTS.STORES.UPDATE(storeId),
      params,
      { showLoading: true, loadingText: '更新中...' }
    )
    return response.data
  }

  /**
   * 删除店铺（商户端使用）
   */
  async deleteStore(storeId: string): Promise<void> {
    await apiService.delete(
      API_ENDPOINTS.STORES.DELETE(storeId),
      { showLoading: true, loadingText: '删除中...' }
    )
  }

  /**
   * 获取我的店铺列表（商户端使用）
   */
  async getMyStores(): Promise<Store[]> {
    const response = await apiService.get<Store[]>(API_ENDPOINTS.STORES.MY_STORES)
    return response.data
  }

  // ============================= 空间相关 =============================

  /**
   * 获取店铺空间列表
   */
  async getSpaceList(storeId: string): Promise<Space[]> {
    const response = await apiService.get<Space[]>(API_ENDPOINTS.SPACES.LIST(storeId))
    return response.data
  }

  /**
   * 获取空间详情
   */
  async getSpaceDetail(spaceId: string): Promise<Space> {
    const response = await apiService.get<Space>(
      API_ENDPOINTS.SPACES.DETAIL(spaceId),
      { showLoading: true }
    )
    return response.data
  }

  /**
   * 检查空间可用性
   */
  async checkSpaceAvailability(params: SpaceAvailabilityRequest): Promise<SpaceAvailabilityResponse[]> {
    const response = await apiService.post<SpaceAvailabilityResponse[]>(
      API_ENDPOINTS.SPACES.AVAILABILITY,
      params
    )
    return response.data
  }

  /**
   * 更新空间状态
   */
  async updateSpaceStatus(spaceId: string, status: string): Promise<void> {
    await apiService.patch(API_ENDPOINTS.SPACES.STATUS(spaceId), { status })
  }

  /**
   * 创建空间（商户端使用）
   */
  async createSpace(params: CreateSpaceRequest): Promise<Space> {
    const response = await apiService.post<Space>(
      API_ENDPOINTS.SPACES.CREATE,
      params,
      { showLoading: true, loadingText: '创建中...' }
    )
    return response.data
  }

  /**
   * 更新空间信息（商户端使用）
   */
  async updateSpace(spaceId: string, params: UpdateSpaceRequest): Promise<Space> {
    const response = await apiService.put<Space>(
      API_ENDPOINTS.SPACES.UPDATE(spaceId),
      params,
      { showLoading: true, loadingText: '更新中...' }
    )
    return response.data
  }

  /**
   * 删除空间（商户端使用）
   */
  async deleteSpace(spaceId: string): Promise<void> {
    await apiService.delete(
      API_ENDPOINTS.SPACES.DELETE(spaceId),
      { showLoading: true, loadingText: '删除中...' }
    )
  }

  // ============================= 地理位置相关 =============================

  /**
   * 获取当前位置
   */
  async getCurrentLocation(): Promise<{ longitude: number; latitude: number }> {
    return new Promise((resolve, reject) => {
      uni.getLocation({
        type: 'gcj02',
        success: (res) => {
          resolve({
            longitude: res.longitude,
            latitude: res.latitude
          })
        },
        fail: (error) => {
          // 如果获取位置失败，使用默认位置
          console.warn('获取位置失败:', error)
          resolve({
            longitude: 116.397128, // 天安门
            latitude: 39.916527
          })
        }
      })
    })
  }

  /**
   * 计算距离
   */
  calculateDistance(
    lat1: number, lon1: number,
    lat2: number, lon2: number
  ): number {
    const R = 6371 // 地球半径（公里）
    const dLat = this.deg2rad(lat2 - lat1)
    const dLon = this.deg2rad(lon2 - lon1)
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c * 1000 // 返回米数
  }

  /**
   * 角度转弧度
   */
  private deg2rad(deg: number): number {
    return deg * (Math.PI/180)
  }

  /**
   * 格式化距离显示
   */
  formatDistance(distance: number): string {
    if (distance < 1000) {
      return `${Math.round(distance)}m`
    } else {
      return `${(distance / 1000).toFixed(1)}km`
    }
  }

  /**
   * 打开地图导航
   */
  async openMapNavigation(store: Store): Promise<void> {
    const { longitude, latitude } = store.coordinates
    
    uni.openLocation({
      longitude,
      latitude,
      name: store.name,
      address: store.address,
      scale: 18,
      success: () => {
        console.log('地图导航打开成功')
      },
      fail: (error) => {
        console.error('地图导航打开失败:', error)
        uni.showToast({
          title: '导航功能暂不可用',
          icon: 'none'
        })
      }
    })
  }

  /**
   * 选择地图位置
   */
  async chooseLocationOnMap(): Promise<{
    name: string
    address: string
    longitude: number
    latitude: number
  }> {
    return new Promise((resolve, reject) => {
      uni.chooseLocation({
        success: (res) => {
          resolve({
            name: res.name,
            address: res.address,
            longitude: res.longitude,
            latitude: res.latitude
          })
        },
        fail: reject
      })
    })
  }

  // ============================= 工具方法 =============================

  /**
   * 根据距离排序店铺
   */
  async sortStoresByDistance(
    stores: Store[],
    userLocation?: { longitude: number; latitude: number }
  ): Promise<Store[]> {
    let location = userLocation
    
    if (!location) {
      try {
        location = await this.getCurrentLocation()
      } catch (error) {
        // 无法获取位置，返回原数组
        return stores
      }
    }

    return stores
      .map(store => ({
        ...store,
        distance: this.calculateDistance(
          location!.latitude,
          location!.longitude,
          store.coordinates.latitude,
          store.coordinates.longitude
        )
      }))
      .sort((a, b) => a.distance! - b.distance!)
  }

  /**
   * 过滤可预订的店铺
   */
  filterBookableStores(stores: Store[]): Store[] {
    return stores.filter(store => 
      store.status === 'active' && 
      this.isWithinBusinessHours(store)
    )
  }

  /**
   * 检查是否在营业时间内
   */
  isWithinBusinessHours(store: Store): boolean {
    const now = new Date()
    const currentTime = now.getHours() * 60 + now.getMinutes()
    
    const [openHour, openMinute] = store.businessHours.open.split(':').map(Number)
    const [closeHour, closeMinute] = store.businessHours.close.split(':').map(Number)
    
    const openTime = openHour * 60 + openMinute
    const closeTime = closeHour * 60 + closeMinute
    
    // 处理跨日营业的情况
    if (closeTime <= openTime) {
      return currentTime >= openTime || currentTime <= closeTime
    } else {
      return currentTime >= openTime && currentTime <= closeTime
    }
  }

  /**
   * 获取店铺营业状态文本
   */
  getBusinessStatusText(store: Store): string {
    if (store.status !== 'active') {
      return '暂停营业'
    }

    if (this.isWithinBusinessHours(store)) {
      return '营业中'
    } else {
      return `${store.businessHours.open}开始营业`
    }
  }

  /**
   * 估算等待时间
   */
  async estimateWaitTime(storeId: string): Promise<number> {
    // 这里可以调用后端API获取实时等待时间
    // 暂时返回模拟数据
    const spaces = await this.getSpaceList(storeId)
    const availableSpaces = spaces.filter(space => space.status === 'available')
    
    if (availableSpaces.length > 0) {
      return 0 // 有空房间，无需等待
    } else {
      return Math.floor(Math.random() * 60) + 15 // 15-75分钟随机等待时间
    }
  }
}

// 导出服务实例
export const storeService = new StoreService()
export default storeService
