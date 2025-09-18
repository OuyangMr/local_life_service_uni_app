/** @type {import('jest').Config} */
module.exports = {
  // 测试环境配置
  testEnvironment: 'node',
  
  // 根目录配置
  rootDir: '../../',
  
  // 测试文件匹配模式
  testMatch: [
    '<rootDir>/tests/integration/**/*.test.ts',
    '<rootDir>/tests/integration/**/*.spec.ts'
  ],
  
  // 忽略的文件和目录
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/frontend/*/node_modules/',
    '<rootDir>/frontend/*/dist/',
    '<rootDir>/backend/dist/',
    '<rootDir>/tests/integration/fixtures/',
    '<rootDir>/tests/integration/helpers/'
  ],
  
  // 模块路径映射
  moduleNameMapper: {
    '^@backend/(.*)$': '<rootDir>/backend/src/$1',
    '^@frontend-user/(.*)$': '<rootDir>/frontend/user-app/src/$1',
    '^@frontend-merchant/(.*)$': '<rootDir>/frontend/merchant-app/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1'
  },
  
  // 覆盖率配置
  collectCoverage: true,
  coverageDirectory: '<rootDir>/tests/integration/coverage',
  collectCoverageFrom: [
    'backend/src/**/*.ts',
    'frontend/user-app/src/services/**/*.ts',
    'frontend/merchant-app/src/services/**/*.ts',
    '!backend/src/types/**',
    '!frontend/*/src/types/**',
    '!**/*.d.ts',
    '!**/index.ts'
  ],
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json'
  ],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60
    }
  },
  
  // 设置文件
  setupFilesAfterEnv: [
    '<rootDir>/tests/integration/setup.ts'
  ],
  
  // 清理模拟
  clearMocks: true,
  restoreMocks: true,
  
  // 超时配置
  testTimeout: 30000,
  
  // 错误详情
  verbose: true,
  
  // 变换器配置
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  
  // 模块文件扩展名
  moduleFileExtensions: [
    'ts',
    'js',
    'json'
  ],
  
  // 监听模式配置
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/frontend/*/node_modules/',
    '<rootDir>/frontend/*/dist/',
    '<rootDir>/backend/dist/',
    '<rootDir>/tests/integration/coverage/'
  ],
  
  // 并行测试配置
  maxWorkers: 2, // 集成测试使用较少的并行worker
  
  // 强制退出配置
  forceExit: true,
  
  // 检测打开的句柄
  detectOpenHandles: true
}
