// 商户端应用类型定义

// 商户信息
export interface Merchant {
  id: string
  name: string
  type: 'ktv' | 'restaurant' | 'bar' | 'other'
  phone: string
  email?: string
  address: string
  avatar?: string
  status: 'active' | 'inactive' | 'pending'
  registeredAt: string
  settings: MerchantSettings
}

// 商户设置
export interface MerchantSettings {
  businessHours: {
    open: string
    close: string
    isOpen24Hours: boolean
  }
  acceptOrder: boolean
  autoConfirm: boolean
  notifications: {
    newOrder: boolean
    payment: boolean
    system: boolean
  }
}

// 登录表单
export interface LoginForm {
  account: string
  password: string
  rememberMe: boolean
}

// 仪表板统计数据
export interface DashboardStats {
  totalOrders: number
  todayOrders: number
  totalRevenue: number
  todayRevenue: number
  activeRooms: number
  totalRooms: number
  pendingOrders: number
  completedOrders: number
}

// 订单信息
export interface Order {
  id: string
  orderNo: string
  type: 'room' | 'food' | 'service'
  customerId: string
  customerName: string
  customerPhone: string
  roomId?: string
  roomName?: string
  items: OrderItem[]
  totalAmount: number
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled'
  paymentStatus: 'unpaid' | 'paid' | 'refunded'
  paymentMethod?: 'wechat' | 'alipay' | 'card' | 'cash'
  note?: string
  createdAt: string
  updatedAt: string
  serviceTime?: string
}

// 订单项目
export interface OrderItem {
  id: string
  productId: string
  productName: string
  productImage?: string
  quantity: number
  unitPrice: number
  totalPrice: number
  specs?: string[]
  note?: string
}

// 房间/包间信息
export interface Room {
  id: string
  name: string
  type: 'small' | 'medium' | 'large' | 'vip'
  capacity: number
  hourlyRate: number
  status: 'available' | 'occupied' | 'cleaning' | 'maintenance'
  features: string[]
  images: string[]
  currentOrder?: {
    orderId: string
    startTime: string
    estimatedEndTime: string
    customerName: string
  }
  equipment: RoomEquipment
  qrCode?: string
}

// 房间设备
export interface RoomEquipment {
  sound: boolean
  projector: boolean
  microphones: number
  lights: boolean
  airConditioner: boolean
  wifi: boolean
  fridge: boolean
}

// 商品信息
export interface Product {
  id: string
  name: string
  category: string
  price: number
  originalPrice?: number
  description?: string
  images: string[]
  status: 'available' | 'unavailable' | 'out_of_stock'
  stock: number
  specifications: ProductSpec[]
  tags: string[]
  salesCount: number
  rating: number
  createdAt: string
  updatedAt: string
}

// 商品规格
export interface ProductSpec {
  name: string
  options: string[]
  required: boolean
}

// 商品分类
export interface ProductCategory {
  id: string
  name: string
  icon?: string
  sort: number
  products: Product[]
}

// API响应类型
export interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
  timestamp: number
}

// 分页响应
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// 筛选条件
export interface OrderFilter {
  status?: string[]
  type?: string[]
  dateRange?: [string, string]
  searchKeyword?: string
  page?: number
  pageSize?: number
}

export interface RoomFilter {
  status?: string[]
  type?: string[]
  searchKeyword?: string
}

export interface ProductFilter {
  category?: string
  status?: string[]
  searchKeyword?: string
  sortBy?: 'name' | 'price' | 'sales' | 'created'
  sortOrder?: 'asc' | 'desc'
}

// 表单验证规则
export interface FormRules {
  [key: string]: FormRule[]
}

export interface FormRule {
  required?: boolean
  min?: number
  max?: number
  pattern?: RegExp
  validator?: (value: any) => boolean | string
  message: string
}

// 弹窗配置
export interface ModalConfig {
  title: string
  content?: string
  confirmText?: string
  cancelText?: string
  showCancel?: boolean
  confirmColor?: string
}

// 系统通知
export interface SystemNotification {
  id: string
  type: 'order' | 'payment' | 'system' | 'warning'
  title: string
  content: string
  isRead: boolean
  createdAt: string
  data?: any
}

// 操作日志
export interface OperationLog {
  id: string
  operator: string
  action: string
  target: string
  details: string
  timestamp: string
  ip?: string
}

// 文件上传响应
export interface UploadResponse {
  url: string
  filename: string
  size: number
  mimeType: string
}

// 营业数据统计
export interface BusinessAnalytics {
  revenue: {
    today: number
    yesterday: number
    thisWeek: number
    lastWeek: number
    thisMonth: number
    lastMonth: number
  }
  orders: {
    today: number
    yesterday: number
    thisWeek: number
    lastWeek: number
    thisMonth: number
    lastMonth: number
  }
  customers: {
    total: number
    new: number
    returning: number
  }
  popularProducts: Product[]
  busyHours: { hour: number; count: number }[]
}
