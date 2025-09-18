/** @type {import('jest').Config} */
module.exports = {
  // 测试环境配置
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  
  // 修复Vue is not defined错误
  testEnvironmentOptions: {
    customExportConditions: ["node", "node-addons"]
  },
  
  // 根目录配置
  rootDir: '.',
  
  // 测试文件匹配模式
  testMatch: [
    '<rootDir>/tests/**/*.test.ts',
    '<rootDir>/tests/**/*.spec.ts'
  ],
  
  // 忽略的文件和目录
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/tests/fixtures/',
    '<rootDir>/tests/helpers/'
  ],
  
  // 模块路径映射
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/tests/__mocks__/fileMock.js',
    '\\.(css|less|scss)$': 'identity-obj-proxy'
  },
  
  // 模块文件扩展名
  moduleFileExtensions: [
    'ts',
    'js',
    'vue',
    'json'
  ],
  
  // 变换器配置
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
      isolatedModules: true
    }],
    '^.+\\.vue$': '@vue/vue3-jest'
  },
  
  // 覆盖率配置
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
  collectCoverageFrom: [
    'src/**/*.ts',
    'src/**/*.vue',
    '!src/types/**',
    '!src/main.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts'
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
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  
  // 设置文件
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.ts'
  ],
  
  // 清理模拟
  clearMocks: true,
  restoreMocks: true,
  
  // 超时配置
  testTimeout: 10000,
  
  // 错误详情
  verbose: true
}
