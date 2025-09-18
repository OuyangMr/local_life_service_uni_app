### 2025-09-18 21:00:10 CST

- 操作: 扩展全量联动种子数据
- 结果: orders=8, reviews=2, pointrecords=6（已覆盖 pending/paid/confirmed/in_progress/completed/cancelled/refunded）
- 说明: 新增多状态订单/多评价/多积分；修复过期积分 balance 校验；幂等可重复执行；已推送远程
