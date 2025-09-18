/** @type {import('jest').Config} */
module.exports = {
  // 测试环境配置
  preset: 'ts-jest',
  testEnvironment: 'node',
  
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
    '^@tests/(.*)$': '<rootDir>/tests/$1'
  },
  
  // 覆盖率配置
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/types/**',
    '!src/index.ts',
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
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
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
  testTimeout: 30000,
  
  // 错误详情
  verbose: true,
  
  // 并行测试
  maxWorkers: '50%',
  
  // 变换器配置
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
      isolatedModules: true
    }]
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
    '<rootDir>/dist/',
    '<rootDir>/logs/',
    '<rootDir>/coverage/'
  ]
}
