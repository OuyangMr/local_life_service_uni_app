// 初始化数据库脚本
db = db.getSiblingDB('local-life-service');

// 创建应用用户
db.createUser({
  user: 'app_user',
  pwd: 'app_password_123',
  roles: [
    {
      role: 'readWrite',
      db: 'local-life-service'
    }
  ]
});

// 创建基础集合（可选，MongoDB 会自动创建）
db.createCollection('users');
db.createCollection('stores');
db.createCollection('rooms');
db.createCollection('orders');
db.createCollection('dishes');
db.createCollection('reviews');
db.createCollection('pointrecords');

print('✅ 数据库初始化完成');
print('数据库名称: local-life-service');
print('应用用户: app_user');
print('管理界面: http://localhost:8081');
