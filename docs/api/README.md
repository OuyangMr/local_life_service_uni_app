# API 文档

本目录包含所有API接口的详细文档。

## 目录结构

```
api/
├── README.md              # API文档说明
├── openapi.yml            # OpenAPI规范文件
├── authentication.md     # 认证与授权
├── error-codes.md         # 错误代码说明
├── rate-limiting.md       # 限流规则
└── endpoints/             # 具体接口文档
    ├── auth.md           # 认证相关接口
    ├── users.md          # 用户管理接口
    ├── stores.md         # 店铺管理接口
    ├── bookings.md       # 预订管理接口
    ├── orders.md         # 订单管理接口
    ├── payments.md       # 支付相关接口
    ├── points.md         # 积分系统接口
    └── uploads.md        # 文件上传接口
```

## API 规范

### 基础信息
- **Base URL**: `https://api.local-life.com/v1`
- **协议**: HTTPS
- **认证方式**: JWT Bearer Token
- **数据格式**: JSON

### 通用响应格式

```json
{
  "success": true,
  "data": {},
  "message": "操作成功",
  "code": "SUCCESS",
  "timestamp": "2025-01-01T00:00:00Z"
}
```

### 错误响应格式

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "请求参数验证失败",
    "details": []
  },
  "timestamp": "2025-01-01T00:00:00Z"
}
```

### 分页响应格式

```json
{
  "success": true,
  "data": {
    "items": [],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

## 快速开始

1. 获取API访问令牌
2. 设置认证头：`Authorization: Bearer <token>`
3. 发送请求到相应的端点

## 开发工具

- [Postman Collection](./postman/collection.json) - API测试集合
- [OpenAPI Spec](./openapi.yml) - OpenAPI 3.0规范文件

## 更新日志

查看 [CHANGELOG.md](./CHANGELOG.md) 了解API版本更新历史。
