// 导出所有 store
export { useUserStore } from './user'
export { useCartStore } from './cart'

// 如果需要，可以在这里添加 store 插件或中间件
export const setupStores = () => {
  // 初始化所有 stores
  console.log('Stores initialized')
}