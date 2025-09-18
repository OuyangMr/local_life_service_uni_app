#!/bin/bash

# 本地生活服务应用部署脚本
# 支持多种部署方式和环境

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
DEPLOY_DIR="/var/www/local-life-service"
BACKUP_DIR="/var/backups/local-life-service"
NGINX_CONFIG_DIR="/etc/nginx/sites-available"
MAX_BACKUPS=5

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查权限
check_permissions() {
    log_info "检查部署权限..."
    
    if [ "$EUID" -ne 0 ] && [ "$1" != "docker" ]; then
        log_error "请使用 sudo 权限运行部署脚本"
        exit 1
    fi
    
    log_success "权限检查通过"
}

# 检查依赖
check_dependencies() {
    local deploy_type=$1
    
    log_info "检查部署依赖..."
    
    case $deploy_type in
        "nginx")
            if ! command -v nginx &> /dev/null; then
                log_error "Nginx 未安装，请先安装 Nginx"
                exit 1
            fi
            ;;
        "docker")
            if ! command -v docker &> /dev/null; then
                log_error "Docker 未安装，请先安装 Docker"
                exit 1
            fi
            ;;
        "pm2")
            if ! command -v pm2 &> /dev/null; then
                log_error "PM2 未安装，请先安装 PM2"
                exit 1
            fi
            ;;
    esac
    
    log_success "依赖检查完成"
}

# 创建备份
create_backup() {
    log_info "创建部署备份..."
    
    local backup_name="backup-$(date +%Y%m%d-%H%M%S)"
    local backup_path="$BACKUP_DIR/$backup_name"
    
    # 创建备份目录
    mkdir -p "$backup_path"
    
    # 备份当前部署
    if [ -d "$DEPLOY_DIR" ]; then
        cp -r "$DEPLOY_DIR"/* "$backup_path/" 2>/dev/null || true
        log_success "备份已创建: $backup_path"
    else
        log_warning "没有找到现有部署，跳过备份"
    fi
    
    # 清理旧备份
    cleanup_old_backups
}

# 清理旧备份
cleanup_old_backups() {
    log_info "清理旧备份..."
    
    if [ -d "$BACKUP_DIR" ]; then
        local backup_count=$(ls -1 "$BACKUP_DIR" | wc -l)
        
        if [ "$backup_count" -gt "$MAX_BACKUPS" ]; then
            local excess=$((backup_count - MAX_BACKUPS))
            ls -1t "$BACKUP_DIR" | tail -n "$excess" | while read -r backup; do
                rm -rf "$BACKUP_DIR/$backup"
                log_info "已删除旧备份: $backup"
            done
        fi
    fi
    
    log_success "备份清理完成"
}

# 部署到 Nginx
deploy_nginx() {
    local env=$1
    
    log_info "部署到 Nginx..."
    
    # 创建部署目录
    mkdir -p "$DEPLOY_DIR/user-app"
    mkdir -p "$DEPLOY_DIR/merchant-app"
    
    # 复制构建产物
    if [ -d "dist/user-app" ]; then
        cp -r dist/user-app/* "$DEPLOY_DIR/user-app/"
        log_info "用户端应用已部署"
    fi
    
    if [ -d "dist/merchant-app" ]; then
        cp -r dist/merchant-app/* "$DEPLOY_DIR/merchant-app/"
        log_info "商户端应用已部署"
    fi
    
    # 设置权限
    chown -R www-data:www-data "$DEPLOY_DIR"
    chmod -R 755 "$DEPLOY_DIR"
    
    # 生成 Nginx 配置
    generate_nginx_config "$env"
    
    # 测试 Nginx 配置
    nginx -t
    
    # 重载 Nginx
    systemctl reload nginx
    
    log_success "Nginx 部署完成"
}

# 生成 Nginx 配置
generate_nginx_config() {
    local env=$1
    local config_file="$NGINX_CONFIG_DIR/local-life-service"
    
    log_info "生成 Nginx 配置..."
    
    cat > "$config_file" << EOF
# 本地生活服务应用 Nginx 配置
# 环境: $env

# 用户端应用
server {
    listen 80;
    server_name app.locallife.com;
    root $DEPLOY_DIR/user-app;
    index index.html;
    
    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json;
    
    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
    
    # API 代理
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # WebSocket 代理
    location /ws/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # SPA 路由
    location / {
        try_files \$uri \$uri/ /index.html;
    }
    
    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}

# 商户端应用
server {
    listen 80;
    server_name merchant.locallife.com;
    root $DEPLOY_DIR/merchant-app;
    index index.html;
    
    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json;
    
    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
    
    # API 代理
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # 管理员 API 代理
    location /admin/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # WebSocket 代理
    location /ws/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # SPA 路由
    location / {
        try_files \$uri \$uri/ /index.html;
    }
    
    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
EOF
    
    # 启用站点
    ln -sf "$config_file" "/etc/nginx/sites-enabled/"
    
    log_success "Nginx 配置已生成"
}

# Docker 部署
deploy_docker() {
    local env=$1
    
    log_info "Docker 部署..."
    
    # 生成 Dockerfile
    generate_dockerfile
    
    # 构建 Docker 镜像
    docker build -t local-life-service:latest .
    
    # 停止旧容器
    docker stop local-life-service 2>/dev/null || true
    docker rm local-life-service 2>/dev/null || true
    
    # 运行新容器
    docker run -d \
        --name local-life-service \
        --restart unless-stopped \
        -p 80:80 \
        -p 81:81 \
        -e NODE_ENV="$env" \
        local-life-service:latest
    
    log_success "Docker 部署完成"
}

# 生成 Dockerfile
generate_dockerfile() {
    log_info "生成 Dockerfile..."
    
    cat > Dockerfile << 'EOF'
# 本地生活服务应用 Docker 镜像
FROM nginx:alpine

# 安装依赖
RUN apk add --no-cache curl

# 复制构建产物
COPY dist/user-app /usr/share/nginx/html/user-app
COPY dist/merchant-app /usr/share/nginx/html/merchant-app

# 复制 Nginx 配置
COPY scripts/nginx.conf /etc/nginx/conf.d/default.conf

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

# 暴露端口
EXPOSE 80 81

# 启动命令
CMD ["nginx", "-g", "daemon off;"]
EOF
    
    log_success "Dockerfile 已生成"
}

# PM2 部署
deploy_pm2() {
    local env=$1
    
    log_info "PM2 部署..."
    
    # 生成 PM2 配置
    generate_pm2_config "$env"
    
    # 启动应用
    pm2 start ecosystem.config.js --env "$env"
    
    # 保存 PM2 进程列表
    pm2 save
    
    log_success "PM2 部署完成"
}

# 生成 PM2 配置
generate_pm2_config() {
    local env=$1
    
    log_info "生成 PM2 配置..."
    
    cat > ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'local-life-backend',
      script: 'backend/dist/main.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 3000
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3000
      }
    },
    {
      name: 'local-life-static',
      script: 'serve',
      args: '-s dist -l 8080',
      instances: 1,
      env: {
        NODE_ENV: '$env'
      }
    }
  ]
};
EOF
    
    log_success "PM2 配置已生成"
}

# 健康检查
health_check() {
    log_info "执行健康检查..."
    
    local endpoints=(
        "http://localhost/health"
        "http://localhost:8080/health"
    )
    
    for endpoint in "${endpoints[@]}"; do
        if curl -f "$endpoint" > /dev/null 2>&1; then
            log_success "健康检查通过: $endpoint"
        else
            log_warning "健康检查失败: $endpoint"
        fi
    done
}

# 回滚部署
rollback() {
    log_info "回滚部署..."
    
    local latest_backup=$(ls -1t "$BACKUP_DIR" | head -n 1)
    
    if [ -n "$latest_backup" ]; then
        rm -rf "$DEPLOY_DIR"/*
        cp -r "$BACKUP_DIR/$latest_backup"/* "$DEPLOY_DIR/"
        
        # 重载服务
        systemctl reload nginx 2>/dev/null || true
        
        log_success "已回滚到备份: $latest_backup"
    else
        log_error "没有找到可用的备份"
        exit 1
    fi
}

# 主函数
main() {
    local deploy_type=${1:-nginx}
    local env=${2:-production}
    local action=${3:-deploy}
    
    log_info "开始部署本地生活服务应用 (类型: $deploy_type, 环境: $env, 操作: $action)"
    
    case $action in
        "rollback")
            rollback
            return
            ;;
        "health")
            health_check
            return
            ;;
    esac
    
    # 检查权限和依赖
    check_permissions "$deploy_type"
    check_dependencies "$deploy_type"
    
    # 创建备份
    create_backup
    
    # 执行部署
    case $deploy_type in
        "nginx")
            deploy_nginx "$env"
            ;;
        "docker")
            deploy_docker "$env"
            ;;
        "pm2")
            deploy_pm2 "$env"
            ;;
        *)
            log_error "不支持的部署类型: $deploy_type"
            exit 1
            ;;
    esac
    
    # 健康检查
    sleep 5
    health_check
    
    log_success "部署完成！"
}

# 显示帮助信息
show_help() {
    echo "用法: $0 [部署类型] [环境] [操作]"
    echo ""
    echo "部署类型:"
    echo "  nginx     Nginx 静态部署 (默认)"
    echo "  docker    Docker 容器部署"
    echo "  pm2       PM2 进程管理部署"
    echo ""
    echo "环境:"
    echo "  production  生产环境 (默认)"
    echo "  staging     预发布环境"
    echo "  development 开发环境"
    echo ""
    echo "操作:"
    echo "  deploy    执行部署 (默认)"
    echo "  rollback  回滚到上一版本"
    echo "  health    健康检查"
    echo ""
    echo "示例:"
    echo "  $0                    # Nginx 部署到生产环境"
    echo "  $0 docker staging     # Docker 部署到预发布环境"
    echo "  $0 nginx production rollback  # 回滚 Nginx 部署"
}

# 处理命令行参数
if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    show_help
    exit 0
fi

# 执行主函数
main "$@"