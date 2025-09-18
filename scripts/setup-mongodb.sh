#!/bin/bash

# MongoDB 环境搭建脚本
# 适用于 macOS 和 Linux

echo "🚀 开始 MongoDB 环境搭建..."

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装，请先安装 Docker"
    exit 1
fi

# 检查 Docker Compose 是否安装
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose 未安装，请先安装 Docker Compose"
    exit 1
fi

# 进入项目目录
cd "$(dirname "$0")/.."

# 创建必要的目录
mkdir -p docker/mongodb/init-scripts
mkdir -p docker/mongodb/data

# 启动 MongoDB 服务
echo "🔄 启动 MongoDB 服务..."
docker-compose -f docker/mongodb/docker-compose.yml up -d

# 等待服务启动
echo "⏳ 等待 MongoDB 服务启动..."
sleep 15

# 检查服务状态
echo "🔍 检查服务状态..."
docker-compose -f docker/mongodb/docker-compose.yml ps

# 显示连接信息
echo ""
echo "✅ MongoDB 环境搭建完成！"
echo ""
echo "📊 连接信息："
echo "  MongoDB 地址: localhost:27017"
echo "  管理员用户: admin"
echo "  管理员密码: password123"
echo "  应用用户: app_user"
echo "  应用密码: app_password_123"
echo "  数据库名: local-life-service"
echo ""
echo "🌐 管理界面："
echo "  Mongo Express: http://localhost:8081"
echo "  用户名: admin"
echo "  密码: admin123"
echo ""
echo "🔗 应用连接字符串："
echo "  mongodb://app_user:app_password_123@localhost:27017/local-life-service"
echo ""

# 测试连接
echo "🧪 测试数据库连接..."
if command -v mongosh &> /dev/null; then
    mongosh "mongodb://admin:password123@localhost:27017/local-life-service?authSource=admin" --eval "db.runCommand('ping')"
    if [ $? -eq 0 ]; then
        echo "✅ 数据库连接测试成功"
    else
        echo "❌ 数据库连接测试失败"
    fi
else
    echo "💡 请安装 mongosh 来测试连接: brew install mongosh"
fi

echo ""
echo "🎯 下一步："
echo "1. 更新 backend/.env 文件中的数据库连接字符串"
echo "2. 运行数据库迁移: npm run db:migrate"
echo "3. 启动应用: npm run dev"
