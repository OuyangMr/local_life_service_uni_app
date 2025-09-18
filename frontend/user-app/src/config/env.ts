/**
 * 用户端环境配置
 * 根据不同环境加载相应的配置
 */

// 环境类型
export type EnvType = 'development' | 'production' | 'staging'

// 环境配置接口
interface EnvConfig {
  // 应用信息
  APP_TITLE: string
  APP_TYPE: string
  APP_DESCRIPTION: string
  
  // API配置
  API_BASE_URL: string
  UPLOAD_URL: string
  WEBSOCKET_URL: string
  
  // 微信配置
  WECHAT_APPID: string
  
  // 支付配置
  PAYMENT_TIMEOUT: number
  PAYMENT_RETRY_COUNT: number
  
  // 地图配置
  MAP_KEY: string
  
  // 功能开关
  ENABLE_MOCK: boolean
  ENABLE_VCONSOLE: boolean
  ENABLE_ANALYTICS: boolean
  ENABLE_ERROR_REPORTING: boolean
  
  // 性能配置
  REQUEST_TIMEOUT: number
  UPLOAD_TIMEOUT: number
  MAX_FILE_SIZE: number
  
  // CDN配置
  CDN_URL: string
  STATIC_URL: string
}

// 开发环境配置
const developmentConfig: EnvConfig = {
  APP_TITLE: '本地生活服务',
  APP_TYPE: 'user',
  APP_DESCRIPTION: '本地生活服务用户端应用',
  
  API_BASE_URL: 'http://localhost:3000',
  UPLOAD_URL: 'http://localhost:3000',
  WEBSOCKET_URL: 'ws://localhost:3000',
  
  WECHAT_APPID: 'wx_dev_appid',
  
  PAYMENT_TIMEOUT: 300000,
  PAYMENT_RETRY_COUNT: 3,
  
  MAP_KEY: 'development_map_key',
  
  ENABLE_MOCK: false,
  ENABLE_VCONSOLE: true,
  ENABLE_ANALYTICS: false,
  ENABLE_ERROR_REPORTING: false,
  
  REQUEST_TIMEOUT: 10000,
  UPLOAD_TIMEOUT: 60000,
  MAX_FILE_SIZE: 10485760, // 10MB
  
  CDN_URL: '',
  STATIC_URL: ''
}

// 预发布环境配置
const stagingConfig: EnvConfig = {
  APP_TITLE: '本地生活服务',
  APP_TYPE: 'user',
  APP_DESCRIPTION: '本地生活服务用户端应用',
  
  API_BASE_URL: 'https://staging-api.locallife.com',
  UPLOAD_URL: 'https://staging-upload.locallife.com',
  WEBSOCKET_URL: 'wss://staging-ws.locallife.com',
  
  WECHAT_APPID: 'wx_staging_appid',
  
  PAYMENT_TIMEOUT: 300000,
  PAYMENT_RETRY_COUNT: 3,
  
  MAP_KEY: 'staging_map_key',
  
  ENABLE_MOCK: false,
  ENABLE_VCONSOLE: false,
  ENABLE_ANALYTICS: true,
  ENABLE_ERROR_REPORTING: true,
  
  REQUEST_TIMEOUT: 15000,
  UPLOAD_TIMEOUT: 90000,
  MAX_FILE_SIZE: 20971520, // 20MB
  
  CDN_URL: 'https://staging-cdn.locallife.com',
  STATIC_URL: 'https://staging-static.locallife.com'
}

// 生产环境配置
const productionConfig: EnvConfig = {
  APP_TITLE: '本地生活服务',
  APP_TYPE: 'user',
  APP_DESCRIPTION: '本地生活服务用户端应用',
  
  API_BASE_URL: 'https://api.locallife.com',
  UPLOAD_URL: 'https://upload.locallife.com',
  WEBSOCKET_URL: 'wss://ws.locallife.com',
  
  WECHAT_APPID: 'wx_production_appid',
  
  PAYMENT_TIMEOUT: 300000,
  PAYMENT_RETRY_COUNT: 5,
  
  MAP_KEY: 'production_map_key',
  
  ENABLE_MOCK: false,
  ENABLE_VCONSOLE: false,
  ENABLE_ANALYTICS: true,
  ENABLE_ERROR_REPORTING: true,
  
  REQUEST_TIMEOUT: 20000,
  UPLOAD_TIMEOUT: 120000,
  MAX_FILE_SIZE: 52428800, // 50MB
  
  CDN_URL: 'https://cdn.locallife.com',
  STATIC_URL: 'https://static.locallife.com'
}

// 获取当前环境
export const getCurrentEnv = (): EnvType => {
  const env = process.env.NODE_ENV as EnvType
  if (['development', 'production', 'staging'].includes(env)) {
    return env
  }
  return 'development'
}

// 配置映射
const configMap: Record<EnvType, EnvConfig> = {
  development: developmentConfig,
  staging: stagingConfig,
  production: productionConfig
}

// 获取当前环境配置
export const getEnvConfig = (): EnvConfig => {
  const currentEnv = getCurrentEnv()
  return configMap[currentEnv]
}

// 导出当前配置
export const ENV_CONFIG = getEnvConfig()

// 便捷访问配置
export const {
  APP_TITLE,
  APP_TYPE,
  APP_DESCRIPTION,
  API_BASE_URL,
  UPLOAD_URL,
  WEBSOCKET_URL,
  WECHAT_APPID,
  PAYMENT_TIMEOUT,
  PAYMENT_RETRY_COUNT,
  MAP_KEY,
  ENABLE_MOCK,
  ENABLE_VCONSOLE,
  ENABLE_ANALYTICS,
  ENABLE_ERROR_REPORTING,
  REQUEST_TIMEOUT,
  UPLOAD_TIMEOUT,
  MAX_FILE_SIZE,
  CDN_URL,
  STATIC_URL
} = ENV_CONFIG

// 运行时环境信息
export const RUNTIME_CONFIG = {
  IS_DEVELOPMENT: getCurrentEnv() === 'development',
  IS_PRODUCTION: getCurrentEnv() === 'production',
  IS_STAGING: getCurrentEnv() === 'staging',
  APP_VERSION: __APP_VERSION__,
  BUILD_TIME: __BUILD_TIME__,
  NODE_ENV: process.env.NODE_ENV
}
