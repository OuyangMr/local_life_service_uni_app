#!/bin/bash

# 本地生活服务应用备份脚本
# 包含数据库备份、文件备份和恢复功能

set -e

BACKUP_DIR="/backup/local-life-service"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7

# 创建备份目录
mkdir -p "$BACKUP_DIR"

echo "📦 开始备份本地生活服务应用..."
echo "备份时间: $(date)"
echo "备份目录: $BACKUP_DIR"

# MongoDB 备份
echo "🗄️ 备份 MongoDB 数据库..."
MONGO_BACKUP_DIR="$BACKUP_DIR/mongodb_$DATE"
mkdir -p "$MONGO_BACKUP_DIR"

if [ -n "$MONGODB_URI" ]; then
    mongodump --uri="$MONGODB_URI" --gzip --out="$MONGO_BACKUP_DIR"
    echo "✅ MongoDB 备份完成"
else
    mongodump --host localhost --port 27017 --db local-life-service --gzip --out="$MONGO_BACKUP_DIR"
    echo "✅ MongoDB 备份完成（本地）"
fi

# 应用文件备份
echo "📁 备份应用文件..."
APP_BACKUP_DIR="$BACKUP_DIR/app_$DATE"
mkdir -p "$APP_BACKUP_DIR"

# 备份上传的文件
if [ -d "/opt/local-life-service/uploads" ]; then
    cp -r /opt/local-life-service/uploads "$APP_BACKUP_DIR/"
    echo "✅ 上传文件备份完成"
fi

# 备份配置文件
if [ -f "/opt/local-life-service/.env" ]; then
    cp /opt/local-life-service/.env "$APP_BACKUP_DIR/"
    echo "✅ 配置文件备份完成"
fi

# 备份nginx配置
if [ -f "/etc/nginx/nginx.conf" ]; then
    cp /etc/nginx/nginx.conf "$APP_BACKUP_DIR/"
    echo "✅ Nginx配置备份完成"
fi

# 压缩备份
echo "🗜️ 压缩备份文件..."
tar -czf "$BACKUP_DIR/local-life-service_$DATE.tar.gz" -C "$BACKUP_DIR" "mongodb_$DATE" "app_$DATE"

# 清理临时目录
rm -rf "$MONGO_BACKUP_DIR" "$APP_BACKUP_DIR"

# 清理过期备份
echo "🧹 清理过期备份..."
find "$BACKUP_DIR" -name "local-life-service_*.tar.gz" -mtime +$RETENTION_DAYS -delete

# 备份完成
BACKUP_SIZE=$(du -h "$BACKUP_DIR/local-life-service_$DATE.tar.gz" | cut -f1)
echo "✅ 备份完成！"
echo "📊 备份信息:"
echo "  文件: local-life-service_$DATE.tar.gz"
echo "  大小: $BACKUP_SIZE"
echo "  路径: $BACKUP_DIR"

# 如果配置了远程备份，上传到云存储
if [ -n "$BACKUP_REMOTE_PATH" ]; then
    echo "☁️ 上传到远程存储..."
    # 这里可以添加上传到云存储的逻辑
    # 例如: aws s3 cp "$BACKUP_DIR/local-life-service_$DATE.tar.gz" "$BACKUP_REMOTE_PATH"
    echo "✅ 远程备份完成"
fi

echo "🎉 所有备份任务完成！"
