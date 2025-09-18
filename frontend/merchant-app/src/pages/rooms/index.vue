<template>
  <view class="rooms-container">
    <!-- 页面头部 -->
    <view class="page-header">
      <view class="header-title">
        <text class="title-text">🏠 包间管理</text>
        <text class="subtitle-text">{{ totalRooms }} 个包间 | 使用率 {{ usageRate }}%</text>
      </view>
      <view class="header-actions">
        <button class="action-btn" @click="handleAddRoom">
          <text class="btn-icon">➕</text>
          <text class="btn-text">新增包间</text>
        </button>
      </view>
    </view>
    
    <!-- 快速筛选 -->
    <view class="filter-section">
      <scroll-view class="filter-tabs" scroll-x>
        <view
          v-for="status in roomStatuses"
          :key="status.value"
          class="filter-tab"
          :class="{ 'active': activeStatus === status.value }"
          @click="handleStatusFilter(status.value)"
        >
          <text class="tab-icon">{{ status.icon }}</text>
          <text class="tab-text">{{ status.label }}</text>
          <view v-if="status.count > 0" class="tab-badge">{{ status.count }}</view>
        </view>
      </scroll-view>
      
      <view class="filter-actions">
        <button class="filter-btn" @click="showTypeFilter = true">
          <text class="filter-icon">🏷️</text>
          <text class="filter-text">{{ selectedType || '包间类型' }}</text>
        </button>
        <button class="filter-btn" @click="handleRefresh">
          <text class="filter-icon">🔄</text>
        </button>
      </view>
    </view>
    
    <!-- 包间网格 -->
    <scroll-view class="rooms-grid" scroll-y refresher-enabled @refresherrefresh="handleRefresh">
      <view
        v-for="room in filteredRooms"
        :key="room.id"
        class="room-card"
        :class="room.status"
        @click="handleRoomDetail(room)"
      >
        <!-- 包间头部 -->
        <view class="room-header">
          <view class="room-info">
            <text class="room-name">{{ room.name }}</text>
            <view class="room-type" :class="room.type">
              <text class="type-text">{{ getRoomTypeText(room.type) }}</text>
            </view>
          </view>
          <view class="room-status" :class="room.status">
            <text class="status-icon">{{ getStatusIcon(room.status) }}</text>
            <text class="status-text">{{ getStatusText(room.status) }}</text>
          </view>
        </view>
        
        <!-- 包间信息 -->
        <view class="room-content">
          <view class="room-meta">
            <text class="capacity">👥 {{ room.capacity }}人</text>
            <text class="rate">💰 ¥{{ room.hourlyRate }}/小时</text>
          </view>
          
          <!-- 当前订单信息 -->
          <view v-if="room.currentOrder" class="current-order">
            <view class="order-header">
              <text class="order-customer">{{ room.currentOrder.customerName }}</text>
              <text class="order-time">{{ formatDuration(room.currentOrder.startTime) }}</text>
            </view>
            <text class="order-info">
              预计结束：{{ formatTime(room.currentOrder.estimatedEndTime) }}
            </text>
          </view>
          
          <!-- 设备信息 -->
          <view class="equipment-info">
            <view class="equipment-list">
              <text v-if="room.equipment.sound" class="equipment-item">🎵</text>
              <text v-if="room.equipment.projector" class="equipment-item">📽️</text>
              <text v-if="room.equipment.microphones > 0" class="equipment-item">
                🎤×{{ room.equipment.microphones }}
              </text>
              <text v-if="room.equipment.wifi" class="equipment-item">📶</text>
              <text v-if="room.equipment.airConditioner" class="equipment-item">❄️</text>
              <text v-if="room.equipment.fridge" class="equipment-item">🧊</text>
            </view>
          </view>
        </view>
        
        <!-- 包间操作 -->
        <view class="room-actions">
          <button
            v-if="room.status === 'available'"
            class="action-btn booking"
            @click.stop="handleBookRoom(room)"
          >
            立即预订
          </button>
          <button
            v-if="room.status === 'occupied'"
            class="action-btn checkout"
            @click.stop="handleCheckout(room)"
          >
            结算离场
          </button>
          <button
            v-if="room.status === 'cleaning'"
            class="action-btn complete-clean"
            @click.stop="handleCompleteClean(room)"
          >
            清洁完成
          </button>
          <button
            v-if="room.status === 'maintenance'"
            class="action-btn complete-maintenance"
            @click.stop="handleCompleteMaintenance(room)"
          >
            维修完成
          </button>
          <button class="action-btn qr-code" @click.stop="handleShowQRCode(room)">
            二维码
          </button>
          <button class="action-btn edit" @click.stop="handleEditRoom(room)">
            编辑
          </button>
        </view>
      </view>
      
      <!-- 空状态 -->
      <view v-if="filteredRooms.length === 0" class="empty-state">
        <text class="empty-icon">🏠</text>
        <text class="empty-title">暂无包间</text>
        <text class="empty-desc">还没有添加任何包间</text>
        <button class="empty-action" @click="handleAddRoom">
          <text class="btn-text">添加第一个包间</text>
        </button>
      </view>
    </scroll-view>
    
    <!-- 类型筛选弹窗 -->
    <uni-popup ref="typePopup" v-model:show="showTypeFilter" type="bottom">
      <view class="type-filter-container">
        <view class="filter-header">
          <text class="filter-title">选择包间类型</text>
          <button class="filter-close" @click="showTypeFilter = false">✕</button>
        </view>
        <view class="type-list">
          <view
            v-for="type in roomTypes"
            :key="type.value"
            class="type-item"
            :class="{ 'active': selectedType === type.value }"
            @click="selectRoomType(type.value)"
          >
            <text class="type-icon">{{ type.icon }}</text>
            <text class="type-name">{{ type.label }}</text>
            <text class="type-count">{{ type.count }}</text>
          </view>
        </view>
      </view>
    </uni-popup>
    
    <!-- 二维码弹窗 -->
    <uni-popup ref="qrPopup" v-model:show="showQRCode" type="center">
      <view class="qr-modal">
        <view class="qr-header">
          <text class="qr-title">{{ selectedRoom?.name }} - 点餐二维码</text>
          <button class="qr-close" @click="showQRCode = false">✕</button>
        </view>
        <view class="qr-content">
          <canvas class="qr-canvas" canvas-id="qrCanvas"></canvas>
          <text class="qr-desc">客户扫码即可点餐下单</text>
          <view class="qr-actions">
            <button class="qr-btn save" @click="handleSaveQRCode">保存图片</button>
            <button class="qr-btn print" @click="handlePrintQRCode">打印</button>
          </view>
        </view>
      </view>
    </uni-popup>
    
    <!-- 底部工具栏 -->
    <view class="toolbar">
      <button class="tool-btn" @click="handleBatchOperation">
        <text class="btn-icon">📝</text>
        <text class="btn-text">批量操作</text>
      </button>
      <button class="tool-btn" @click="handleRoomStatistics">
        <text class="btn-icon">📊</text>
        <text class="btn-text">使用统计</text>
      </button>
      <button class="tool-btn" @click="handleSettings">
        <text class="btn-icon">⚙️</text>
        <text class="btn-text">设置</text>
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onPullDownRefresh } from 'vue'
import { useAuthStore } from '@/stores/auth'
import type { Room } from '@/types'

// Store
const authStore = useAuthStore()

// 响应式数据
const rooms = ref<Room[]>([])
const totalRooms = ref(0)
const activeStatus = ref('all')
const selectedType = ref('')
const selectedRoom = ref<Room | null>(null)
const showTypeFilter = ref(false)
const showQRCode = ref(false)

// 状态配置
const roomStatuses = ref([
  { value: 'all', label: '全部', icon: '🏠', count: 0 },
  { value: 'available', label: '空闲', icon: '✅', count: 0 },
  { value: 'occupied', label: '使用中', icon: '👥', count: 0 },
  { value: 'cleaning', label: '清洁中', icon: '🧽', count: 0 },
  { value: 'maintenance', label: '维修中', icon: '🔧', count: 0 }
])

const roomTypes = ref([
  { value: '', label: '全部类型', icon: '🏠', count: 0 },
  { value: 'small', label: '小型包间', icon: '🏘️', count: 0 },
  { value: 'medium', label: '中型包间', icon: '🏢', count: 0 },
  { value: 'large', label: '大型包间', icon: '🏰', count: 0 },
  { value: 'vip', label: 'VIP包间', icon: '👑', count: 0 }
])

// 计算属性
const filteredRooms = computed(() => {
  let filtered = rooms.value

  // 按状态筛选
  if (activeStatus.value !== 'all') {
    filtered = filtered.filter(room => room.status === activeStatus.value)
  }

  // 按类型筛选
  if (selectedType.value) {
    filtered = filtered.filter(room => room.type === selectedType.value)
  }

  return filtered
})

const usageRate = computed(() => {
  if (totalRooms.value === 0) return 0
  const occupiedCount = rooms.value.filter(room => room.status === 'occupied').length
  return Math.round((occupiedCount / totalRooms.value) * 100)
})

// 方法
const getRoomTypeText = (type: string) => {
  const typeMap = {
    'small': '小型',
    'medium': '中型', 
    'large': '大型',
    'vip': 'VIP'
  }
  return typeMap[type as keyof typeof typeMap] || type
}

const getStatusIcon = (status: string) => {
  const iconMap = {
    'available': '✅',
    'occupied': '👥',
    'cleaning': '🧽',
    'maintenance': '🔧'
  }
  return iconMap[status as keyof typeof iconMap] || '❓'
}

const getStatusText = (status: string) => {
  const statusMap = {
    'available': '空闲',
    'occupied': '使用中',
    'cleaning': '清洁中',
    'maintenance': '维修中'
  }
  return statusMap[status as keyof typeof statusMap] || status
}

const formatDuration = (startTime: string) => {
  const start = new Date(startTime)
  const now = new Date()
  const diff = now.getTime() - start.getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  
  if (hours > 0) {
    return `已用 ${hours}小时${minutes}分钟`
  } else {
    return `已用 ${minutes}分钟`
  }
}

const formatTime = (timeStr: string) => {
  const time = new Date(timeStr)
  return time.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 事件处理
const handleStatusFilter = (status: string) => {
  activeStatus.value = status
}

const selectRoomType = (type: string) => {
  selectedType.value = type
  showTypeFilter.value = false
}

const handleAddRoom = () => {
  uni.navigateTo({
    url: '/pages/rooms/create'
  })
}

const handleRoomDetail = (room: Room) => {
  uni.navigateTo({
    url: `/pages/rooms/detail?id=${room.id}`
  })
}

const handleBookRoom = (room: Room) => {
  uni.navigateTo({
    url: `/pages/orders/create?roomId=${room.id}`
  })
}

const handleCheckout = (room: Room) => {
  if (room.currentOrder) {
    uni.showModal({
      title: '确认结算',
      content: `确定要为 ${room.currentOrder.customerName} 结算离场吗？`,
      success: async (res) => {
        if (res.confirm) {
          try {
            await updateRoomStatus(room.id, 'cleaning')
            uni.showToast({
              title: '结算成功',
              icon: 'success'
            })
          } catch (error) {
            uni.showToast({
              title: '操作失败',
              icon: 'none'
            })
          }
        }
      }
    })
  }
}

const handleCompleteClean = async (room: Room) => {
  try {
    await updateRoomStatus(room.id, 'available')
    uni.showToast({
      title: '清洁完成',
      icon: 'success'
    })
  } catch (error) {
    uni.showToast({
      title: '操作失败',
      icon: 'none'
    })
  }
}

const handleCompleteMaintenance = async (room: Room) => {
  try {
    await updateRoomStatus(room.id, 'available')
    uni.showToast({
      title: '维修完成',
      icon: 'success'
    })
  } catch (error) {
    uni.showToast({
      title: '操作失败',
      icon: 'none'
    })
  }
}

const handleShowQRCode = (room: Room) => {
  selectedRoom.value = room
  showQRCode.value = true
  
  // 生成二维码
  setTimeout(() => {
    generateQRCode(room)
  }, 100)
}

const handleEditRoom = (room: Room) => {
  uni.navigateTo({
    url: `/pages/rooms/edit?id=${room.id}`
  })
}

const handleRefresh = async () => {
  await loadRooms()
  uni.stopPullDownRefresh()
}

const handleBatchOperation = () => {
  uni.showActionSheet({
    itemList: ['批量设为清洁中', '批量设为维修中', '批量更新价格'],
    success: (res) => {
      console.log('选择了：', res.tapIndex)
      // 实现批量操作逻辑
    }
  })
}

const handleRoomStatistics = () => {
  uni.navigateTo({
    url: '/pages/analytics/rooms'
  })
}

const handleSettings = () => {
  uni.navigateTo({
    url: '/pages/settings/rooms'
  })
}

const generateQRCode = (room: Room) => {
  // 这里应该使用真实的二维码生成库
  const ctx = uni.createCanvasContext('qrCanvas')
  
  // 模拟绘制二维码
  ctx.setFillStyle('#000000')
  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 10; j++) {
      if (Math.random() > 0.5) {
        ctx.fillRect(i * 20, j * 20, 20, 20)
      }
    }
  }
  ctx.draw()
}

const handleSaveQRCode = () => {
  uni.canvasToTempFilePath({
    canvasId: 'qrCanvas',
    success: (res) => {
      uni.saveImageToPhotosAlbum({
        filePath: res.tempFilePath,
        success: () => {
          uni.showToast({
            title: '保存成功',
            icon: 'success'
          })
        },
        fail: () => {
          uni.showToast({
            title: '保存失败',
            icon: 'none'
          })
        }
      })
    }
  })
}

const handlePrintQRCode = () => {
  uni.showToast({
    title: '打印功能开发中',
    icon: 'none'
  })
}

// API方法
const loadRooms = async () => {
  try {
    const response = await uni.request({
      url: '/api/merchant/rooms',
      method: 'GET',
      header: {
        'Authorization': `Bearer ${authStore.token}`
      }
    })
    
    if (response.data.code === 200) {
      rooms.value = response.data.data
      totalRooms.value = rooms.value.length
      updateStatusCounts()
    }
  } catch (error) {
    console.error('加载包间失败:', error)
    // 使用模拟数据
    rooms.value = getMockRooms()
    totalRooms.value = rooms.value.length
    updateStatusCounts()
  }
}

const updateRoomStatus = async (roomId: string, status: string) => {
  const response = await uni.request({
    url: `/api/merchant/rooms/${roomId}/status`,
    method: 'PUT',
    data: { status },
    header: {
      'Authorization': `Bearer ${authStore.token}`
    }
  })
  
  if (response.data.code === 200) {
    // 更新本地状态
    const roomIndex = rooms.value.findIndex(room => room.id === roomId)
    if (roomIndex !== -1) {
      rooms.value[roomIndex].status = status as any
      if (status === 'available') {
        rooms.value[roomIndex].currentOrder = undefined
      }
      updateStatusCounts()
    }
  } else {
    throw new Error(response.data.message)
  }
}

const updateStatusCounts = () => {
  roomStatuses.value.forEach(statusItem => {
    if (statusItem.value === 'all') {
      statusItem.count = rooms.value.length
    } else {
      statusItem.count = rooms.value.filter(room => room.status === statusItem.value).length
    }
  })
  
  roomTypes.value.forEach(typeItem => {
    if (typeItem.value === '') {
      typeItem.count = rooms.value.length
    } else {
      typeItem.count = rooms.value.filter(room => room.type === typeItem.value).length
    }
  })
}

const getMockRooms = (): Room[] => {
  return [
    {
      id: '1',
      name: '豪华包间A',
      type: 'large',
      capacity: 12,
      hourlyRate: 298,
      status: 'occupied',
      features: ['高音质音响', '大屏投影', '氛围灯光'],
      images: [],
      currentOrder: {
        orderId: 'o1',
        startTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        estimatedEndTime: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(),
        customerName: '张先生'
      },
      equipment: {
        sound: true,
        projector: true,
        microphones: 4,
        lights: true,
        airConditioner: true,
        wifi: true,
        fridge: true
      }
    },
    {
      id: '2',
      name: '温馨包间B',
      type: 'medium',
      capacity: 8,
      hourlyRate: 198,
      status: 'available',
      features: ['舒适沙发', '迷你吧台'],
      images: [],
      equipment: {
        sound: true,
        projector: false,
        microphones: 2,
        lights: true,
        airConditioner: true,
        wifi: true,
        fridge: false
      }
    },
    {
      id: '3',
      name: '小型包间C',
      type: 'small',
      capacity: 4,
      hourlyRate: 128,
      status: 'cleaning',
      features: ['简约装修', '基础设备'],
      images: [],
      equipment: {
        sound: true,
        projector: false,
        microphones: 1,
        lights: true,
        airConditioner: true,
        wifi: true,
        fridge: false
      }
    }
  ]
}

// 生命周期
onMounted(() => {
  loadRooms()
})

onPullDownRefresh(() => {
  handleRefresh()
})
</script>

<style lang="scss" scoped>
.rooms-container {
  min-height: 100vh;
  background: #f5f7fa;
  padding-bottom: 120rpx;
}

.page-header {
  background: white;
  padding: 30rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1rpx solid #eee;
  
  .header-title {
    .title-text {
      font-size: 36rpx;
      font-weight: bold;
      color: #333;
      display: block;
      margin-bottom: 8rpx;
    }
    
    .subtitle-text {
      font-size: 24rpx;
      color: #666;
    }
  }
  
  .header-actions {
    .action-btn {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 12rpx;
      padding: 16rpx 24rpx;
      display: flex;
      align-items: center;
      
      .btn-icon {
        font-size: 24rpx;
        margin-right: 8rpx;
      }
      
      .btn-text {
        font-size: 26rpx;
      }
      
      &:active {
        opacity: 0.8;
      }
    }
  }
}

.filter-section {
  background: white;
  padding: 20rpx 30rpx;
  border-bottom: 1rpx solid #eee;
  
  .filter-tabs {
    display: flex;
    margin-bottom: 20rpx;
    
    .filter-tab {
      position: relative;
      padding: 16rpx 20rpx;
      margin-right: 16rpx;
      background: #f5f5f5;
      border-radius: 20rpx;
      display: flex;
      align-items: center;
      
      .tab-icon {
        font-size: 24rpx;
        margin-right: 8rpx;
      }
      
      .tab-text {
        font-size: 26rpx;
        color: #666;
        margin-right: 8rpx;
      }
      
      .tab-badge {
        background: #ff4757;
        color: white;
        font-size: 20rpx;
        padding: 4rpx 8rpx;
        border-radius: 10rpx;
        min-width: 32rpx;
        text-align: center;
      }
      
      &.active {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        
        .tab-text {
          color: white;
        }
        
        .tab-badge {
          background: rgba(255, 255, 255, 0.3);
        }
      }
      
      &:active {
        opacity: 0.8;
      }
    }
  }
  
  .filter-actions {
    display: flex;
    gap: 20rpx;
    
    .filter-btn {
      padding: 16rpx 20rpx;
      background: #f8f9fa;
      border: 1rpx solid #e9ecef;
      border-radius: 8rpx;
      display: flex;
      align-items: center;
      
      .filter-icon {
        font-size: 24rpx;
        margin-right: 8rpx;
      }
      
      .filter-text {
        font-size: 24rpx;
        color: #666;
      }
      
      &:active {
        opacity: 0.8;
      }
    }
  }
}

.rooms-grid {
  flex: 1;
  padding: 20rpx 30rpx;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320rpx, 1fr));
  gap: 20rpx;
  
  .room-card {
    background: white;
    border-radius: 16rpx;
    padding: 24rpx;
    box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
    border-left: 6rpx solid transparent;
    
    &.available {
      border-left-color: #52c41a;
    }
    
    &.occupied {
      border-left-color: #1890ff;
    }
    
    &.cleaning {
      border-left-color: #fa8c16;
    }
    
    &.maintenance {
      border-left-color: #f5222d;
    }
    
    .room-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16rpx;
      
      .room-info {
        .room-name {
          font-size: 28rpx;
          font-weight: bold;
          color: #333;
          display: block;
          margin-bottom: 8rpx;
        }
        
        .room-type {
          padding: 6rpx 12rpx;
          border-radius: 8rpx;
          font-size: 22rpx;
          
          &.small {
            background: #f0f8ff;
            color: #1890ff;
          }
          
          &.medium {
            background: #f6ffed;
            color: #52c41a;
          }
          
          &.large {
            background: #fff7e6;
            color: #fa8c16;
          }
          
          &.vip {
            background: #fff1f0;
            color: #f5222d;
          }
        }
      }
      
      .room-status {
        display: flex;
        align-items: center;
        padding: 8rpx 12rpx;
        border-radius: 12rpx;
        font-size: 22rpx;
        
        .status-icon {
          margin-right: 6rpx;
        }
        
        &.available {
          background: #f6ffed;
          color: #52c41a;
        }
        
        &.occupied {
          background: #e6f7ff;
          color: #1890ff;
        }
        
        &.cleaning {
          background: #fff7e6;
          color: #fa8c16;
        }
        
        &.maintenance {
          background: #fff1f0;
          color: #f5222d;
        }
      }
    }
    
    .room-content {
      margin-bottom: 20rpx;
      
      .room-meta {
        display: flex;
        gap: 16rpx;
        margin-bottom: 16rpx;
        
        .capacity,
        .rate {
          font-size: 24rpx;
          color: #666;
          background: #f8f9fa;
          padding: 6rpx 12rpx;
          border-radius: 8rpx;
        }
      }
      
      .current-order {
        background: #e6f7ff;
        padding: 16rpx;
        border-radius: 8rpx;
        margin-bottom: 16rpx;
        
        .order-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8rpx;
          
          .order-customer {
            font-size: 26rpx;
            font-weight: bold;
            color: #1890ff;
          }
          
          .order-time {
            font-size: 22rpx;
            color: #666;
          }
        }
        
        .order-info {
          font-size: 22rpx;
          color: #666;
        }
      }
      
      .equipment-info {
        .equipment-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8rpx;
          
          .equipment-item {
            font-size: 20rpx;
            background: #f0f0f0;
            padding: 4rpx 8rpx;
            border-radius: 6rpx;
            color: #666;
          }
        }
      }
    }
    
    .room-actions {
      display: flex;
      gap: 8rpx;
      flex-wrap: wrap;
      
      .action-btn {
        padding: 12rpx 16rpx;
        border-radius: 8rpx;
        font-size: 22rpx;
        border: none;
        
        &.booking {
          background: #52c41a;
          color: white;
        }
        
        &.checkout {
          background: #1890ff;
          color: white;
        }
        
        &.complete-clean,
        &.complete-maintenance {
          background: #13c2c2;
          color: white;
        }
        
        &.qr-code {
          background: #722ed1;
          color: white;
        }
        
        &.edit {
          background: #f8f9fa;
          color: #666;
          border: 1rpx solid #e9ecef;
        }
        
        &:active {
          opacity: 0.8;
        }
      }
    }
    
    &:active {
      opacity: 0.9;
    }
  }
  
  .empty-state {
    grid-column: 1 / -1;
    text-align: center;
    padding: 120rpx 60rpx;
    
    .empty-icon {
      display: block;
      font-size: 120rpx;
      margin-bottom: 30rpx;
      opacity: 0.3;
    }
    
    .empty-title {
      display: block;
      font-size: 32rpx;
      color: #333;
      margin-bottom: 16rpx;
    }
    
    .empty-desc {
      display: block;
      font-size: 26rpx;
      color: #666;
      margin-bottom: 40rpx;
    }
    
    .empty-action {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 12rpx;
      padding: 20rpx 40rpx;
      
      .btn-text {
        font-size: 28rpx;
      }
      
      &:active {
        opacity: 0.8;
      }
    }
  }
}

.toolbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  padding: 20rpx 30rpx;
  display: flex;
  gap: 20rpx;
  box-shadow: 0 -2rpx 12rpx rgba(0, 0, 0, 0.1);
  
  .tool-btn {
    flex: 1;
    background: #f8f9fa;
    border: none;
    border-radius: 12rpx;
    padding: 20rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    
    .btn-icon {
      font-size: 32rpx;
      margin-bottom: 8rpx;
    }
    
    .btn-text {
      font-size: 24rpx;
      color: #666;
    }
    
    &:active {
      opacity: 0.7;
      transform: scale(0.95);
    }
  }
}

// 弹窗样式
.type-filter-container {
  background: white;
  border-radius: 24rpx 24rpx 0 0;
  
  .filter-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 30rpx;
    border-bottom: 1rpx solid #eee;
    
    .filter-title {
      font-size: 32rpx;
      font-weight: bold;
      color: #333;
    }
    
    .filter-close {
      background: none;
      border: none;
      font-size: 32rpx;
      color: #666;
      
      &:active {
        opacity: 0.7;
      }
    }
  }
  
  .type-list {
    padding: 20rpx 30rpx;
    
    .type-item {
      display: flex;
      align-items: center;
      padding: 24rpx 0;
      border-bottom: 1rpx solid #f0f0f0;
      
      .type-icon {
        font-size: 32rpx;
        margin-right: 20rpx;
      }
      
      .type-name {
        flex: 1;
        font-size: 28rpx;
        color: #333;
      }
      
      .type-count {
        font-size: 24rpx;
        color: #999;
      }
      
      &.active {
        background: #f0f8ff;
        
        .type-name {
          color: #1890ff;
          font-weight: bold;
        }
      }
      
      &:active {
        opacity: 0.7;
      }
      
      &:last-child {
        border-bottom: none;
      }
    }
  }
}

.qr-modal {
  background: white;
  border-radius: 16rpx;
  padding: 40rpx;
  width: 500rpx;
  
  .qr-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30rpx;
    
    .qr-title {
      font-size: 28rpx;
      font-weight: bold;
      color: #333;
    }
    
    .qr-close {
      background: none;
      border: none;
      font-size: 32rpx;
      color: #666;
      
      &:active {
        opacity: 0.7;
      }
    }
  }
  
  .qr-content {
    text-align: center;
    
    .qr-canvas {
      width: 200rpx;
      height: 200rpx;
      border: 1rpx solid #eee;
      margin-bottom: 20rpx;
    }
    
    .qr-desc {
      display: block;
      font-size: 24rpx;
      color: #666;
      margin-bottom: 30rpx;
    }
    
    .qr-actions {
      display: flex;
      gap: 20rpx;
      
      .qr-btn {
        flex: 1;
        padding: 20rpx;
        border-radius: 8rpx;
        font-size: 26rpx;
        border: none;
        
        &.save {
          background: #52c41a;
          color: white;
        }
        
        &.print {
          background: #1890ff;
          color: white;
        }
        
        &:active {
          opacity: 0.8;
        }
      }
    }
  }
}
</style>
