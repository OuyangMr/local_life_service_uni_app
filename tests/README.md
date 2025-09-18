# 测试目录

本目录包含应用的端到端测试、集成测试和性能测试。

## 目录结构

```
tests/
├── e2e/                    # 端到端测试
│   ├── user-flows/         # 用户流程测试
│   ├── merchant-flows/     # 商户流程测试
│   └── admin-flows/        # 管理员流程测试
│
├── integration/            # 集成测试
│   ├── api/               # API集成测试
│   ├── database/          # 数据库集成测试
│   └── external/          # 外部服务集成测试
│
└── performance/           # 性能测试
    ├── load/              # 负载测试
    ├── stress/            # 压力测试
    └── benchmark/         # 基准测试
```

## 测试策略

### 端到端测试 (E2E)
- 使用 Playwright 进行浏览器自动化测试
- 覆盖关键用户流程：注册、预订、支付、点单等
- 验证完整的业务流程

### 集成测试 (Integration)
- 测试前后端API集成
- 验证数据库操作的正确性
- 测试第三方服务集成（支付、短信等）

### 性能测试 (Performance)
- 负载测试：验证系统在预期负载下的表现
- 压力测试：找到系统的性能极限
- 基准测试：建立性能基线

## 运行测试

```bash
# 运行所有测试
npm run test

# 运行端到端测试
npm run test:e2e

# 运行集成测试  
npm run test:integration

# 运行性能测试
npm run test:performance
```

## 测试报告

测试结果和报告将生成在 `tests/reports/` 目录中。
