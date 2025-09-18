/**
 * 导航工具
 * @description 统一处理页面导航，自动区分tabbar页面和普通页面
 */

// tabbar页面列表（需要与pages.json中的tabBar.list保持一致）
const TABBAR_PAGES = [
  'pages/index/index',
  'pages/store/list', 
  'pages/order/scan',
  'pages/user/profile'
]

/**
 * 判断是否为tabbar页面
 */
function isTabbarPage(url: string): boolean {
  // 移除查询参数
  const path = url.split('?')[0]
  // 移除开头的斜杠
  const cleanPath = path.startsWith('/') ? path.substring(1) : path
  return TABBAR_PAGES.includes(cleanPath)
}

/**
 * 智能导航 - 自动选择合适的导航方法
 */
export function navigateTo(options: string | {
  url: string
  animationType?: string
  animationDuration?: number
  success?: () => void
  fail?: (error: any) => void
  complete?: () => void
}): void {
  const url = typeof options === 'string' ? options : options.url
  const config = typeof options === 'object' ? options : {}
  
  if (isTabbarPage(url)) {
    // tabbar页面使用switchTab
    uni.switchTab({
      url,
      success: config.success,
      fail: config.fail,
      complete: config.complete
    })
  } else {
    // 普通页面使用navigateTo
    uni.navigateTo({
      url,
      animationType: config.animationType,
      animationDuration: config.animationDuration,
      success: config.success,
      fail: config.fail,
      complete: config.complete
    })
  }
}

/**
 * 跳转并关闭其他页面
 */
export function redirectTo(options: string | {
  url: string
  success?: () => void
  fail?: (error: any) => void
  complete?: () => void
}): void {
  const url = typeof options === 'string' ? options : options.url
  const config = typeof options === 'object' ? options : {}
  
  if (isTabbarPage(url)) {
    // tabbar页面使用switchTab
    uni.switchTab({
      url,
      success: config.success,
      fail: config.fail,
      complete: config.complete
    })
  } else {
    // 普通页面使用redirectTo
    uni.redirectTo({
      url,
      success: config.success,
      fail: config.fail,
      complete: config.complete
    })
  }
}

/**
 * 重新启动到指定页面
 */
export function reLaunch(options: string | {
  url: string
  success?: () => void
  fail?: (error: any) => void
  complete?: () => void
}): void {
  const config = typeof options === 'object' ? options : { url: options }
  uni.reLaunch(config)
}

/**
 * 回到上一页
 */
export function navigateBack(options: {
  delta?: number
  animationType?: string
  animationDuration?: number
  success?: () => void
  fail?: (error: any) => void
  complete?: () => void
} = {}): void {
  uni.navigateBack({
    delta: 1,
    ...options
  })
}

/**
 * 预加载页面
 */
export function preloadPage(url: string): void {
  if (!isTabbarPage(url)) {
    uni.preloadPage({ url })
  }
}

// 导出单例工具对象
export const Navigation = {
  navigateTo,
  redirectTo,
  reLaunch,
  navigateBack,
  preloadPage,
  isTabbarPage
}

export default Navigation

