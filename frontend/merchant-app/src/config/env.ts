/**
 * 商户端环境配置
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
  ADMIN_API_URL: string
  UPLOAD_URL: string
  WEBSOCKET_URL: string
  
  // 商户认证配置
  MERCHANT_AUTH_TIMEOUT: number
  SESSION_TIMEOUT: number
  
  // 数据配置
  DATA_REFRESH_INTERVAL: number
  CHART_REFRESH_INTERVAL: number
  
  // 功能开关
  ENABLE_REAL_TIME: boolean
  ENABLE_ANALYTICS: boolean
  ENABLE_ERROR_REPORTING: boolean
  ENABLE_PRINT: boolean
  
  // 性能配置
  REQUEST_TIMEOUT: number
  UPLOAD_TIMEOUT: number
  MAX_FILE_SIZE: number
  PAGE_SIZE: number
  
  // CDN配置
  CDN_URL: string
  STATIC_URL: string
  
  // 报表配置
  REPORT_EXPORT_FORMATS: string[]
  MAX_EXPORT_RECORDS: number
}

// 开发环境配置
const developmentConfig: EnvConfig = {
  APP_TITLE: '钱柜KTV商户端',
  APP_TYPE: 'merchant',
  APP_DESCRIPTION: '本地生活服务商户管理端应用',
  
  API_BASE_URL: 'http://localhost:3000',
  ADMIN_API_URL: 'http://localhost:3000/admin',
  UPLOAD_URL: 'http://localhost:3000',
  WEBSOCKET_URL: 'ws://localhost:3000',
  
  MERCHANT_AUTH_TIMEOUT: 1800000, // 30分钟
  SESSION_TIMEOUT: 3600000, // 1小时
  
  DATA_REFRESH_INTERVAL: 30000, // 30秒
  CHART_REFRESH_INTERVAL: 60000, // 1分钟
  
  ENABLE_REAL_TIME: true,
  ENABLE_ANALYTICS: false,
  ENABLE_ERROR_REPORTING: false,
  ENABLE_PRINT: true,
  
  REQUEST_TIMEOUT: 15000,
  UPLOAD_TIMEOUT: 120000,
  MAX_FILE_SIZE: 52428800, // 50MB
  PAGE_SIZE: 20,
  
  CDN_URL: '',
  STATIC_URL: '',
  
  REPORT_EXPORT_FORMATS: ['xlsx', 'csv', 'pdf'],
  MAX_EXPORT_RECORDS: 10000
}

// 预发布环境配置
const stagingConfig: EnvConfig = {
  APP_TITLE: '钱柜KTV商户端',
  APP_TYPE: 'merchant',
  APP_DESCRIPTION: '本地生活服务商户管理端应用',
  
  API_BASE_URL: 'https://staging-api.locallife.com',
  ADMIN_API_URL: 'https://staging-api.locallife.com/admin',
  UPLOAD_URL: 'https://staging-upload.locallife.com',
  WEBSOCKET_URL: 'wss://staging-ws.locallife.com',
  
  MERCHANT_AUTH_TIMEOUT: 1800000, // 30分钟
  SESSION_TIMEOUT: 7200000, // 2小时
  
  DATA_REFRESH_INTERVAL: 60000, // 1分钟
  CHART_REFRESH_INTERVAL: 300000, // 5分钟
  
  ENABLE_REAL_TIME: true,
  ENABLE_ANALYTICS: true,
  ENABLE_ERROR_REPORTING: true,
  ENABLE_PRINT: true,
  
  REQUEST_TIMEOUT: 20000,
  UPLOAD_TIMEOUT: 180000,
  MAX_FILE_SIZE: 104857600, // 100MB
  PAGE_SIZE: 20,
  
  CDN_URL: 'https://staging-cdn.locallife.com',
  STATIC_URL: 'https://staging-static.locallife.com',
  
  REPORT_EXPORT_FORMATS: ['xlsx', 'csv', 'pdf'],
  MAX_EXPORT_RECORDS: 50000
}

// 生产环境配置
const productionConfig: EnvConfig = {
  APP_TITLE: '钱柜KTV商户端',
  APP_TYPE: 'merchant',
  APP_DESCRIPTION: '本地生活服务商户管理端应用',
  
  API_BASE_URL: 'https://api.locallife.com',
  ADMIN_API_URL: 'https://api.locallife.com/admin',
  UPLOAD_URL: 'https://upload.locallife.com',
  WEBSOCKET_URL: 'wss://ws.locallife.com',
  
  MERCHANT_AUTH_TIMEOUT: 1800000, // 30分钟
  SESSION_TIMEOUT: 14400000, // 4小时
  
  DATA_REFRESH_INTERVAL: 120000, // 2分钟
  CHART_REFRESH_INTERVAL: 600000, // 10分钟
  
  ENABLE_REAL_TIME: true,
  ENABLE_ANALYTICS: true,
  ENABLE_ERROR_REPORTING: true,
  ENABLE_PRINT: true,
  
  REQUEST_TIMEOUT: 30000,
  UPLOAD_TIMEOUT: 300000,
  MAX_FILE_SIZE: 209715200, // 200MB
  PAGE_SIZE: 20,
  
  CDN_URL: 'https://cdn.locallife.com',
  STATIC_URL: 'https://static.locallife.com',
  
  REPORT_EXPORT_FORMATS: ['xlsx', 'csv', 'pdf'],
  MAX_EXPORT_RECORDS: 100000
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
  ADMIN_API_URL,
  UPLOAD_URL,
  WEBSOCKET_URL,
  MERCHANT_AUTH_TIMEOUT,
  SESSION_TIMEOUT,
  DATA_REFRESH_INTERVAL,
  CHART_REFRESH_INTERVAL,
  ENABLE_REAL_TIME,
  ENABLE_ANALYTICS,
  ENABLE_ERROR_REPORTING,
  ENABLE_PRINT,
  REQUEST_TIMEOUT,
  UPLOAD_TIMEOUT,
  MAX_FILE_SIZE,
  PAGE_SIZE,
  CDN_URL,
  STATIC_URL,
  REPORT_EXPORT_FORMATS,
  MAX_EXPORT_RECORDS
} = ENV_CONFIG

// 运行时环境信息
export const RUNTIME_CONFIG = {
  IS_DEVELOPMENT: getCurrentEnv() === 'development',
  IS_PRODUCTION: getCurrentEnv() === 'production',
  IS_STAGING: getCurrentEnv() === 'staging',
  APP_VERSION: __APP_VERSION__,
  BUILD_TIME: __BUILD_TIME__,
  NODE_ENV: process.env.NODE_ENV,
  APP_TYPE: __APP_TYPE__,
  ENABLE_ANALYTICS: __ENABLE_ANALYTICS__
}
