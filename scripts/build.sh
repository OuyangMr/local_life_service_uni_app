#!/bin/bash

# 本地生活服务应用构建脚本
# 用于构建用户端和商户端应用

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# 检查依赖
check_dependencies() {
    log_info "检查构建依赖..."
    
    if ! command -v node &> /dev/null; then
        log_error "Node.js 未安装，请先安装 Node.js"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        log_error "npm 未安装，请先安装 npm"
        exit 1
    fi
    
    log_success "依赖检查完成"
}

# 构建应用
build_app() {
    local app_name=$1
    local app_path=$2
    local env=${3:-production}
    
    log_info "开始构建 ${app_name}..."
    
    cd "$app_path"
    
    # 检查 package.json 是否存在
    if [ ! -f "package.json" ]; then
        log_error "${app_name} 的 package.json 不存在"
        return 1
    fi
    
    # 安装依赖
    log_info "安装 ${app_name} 依赖..."
    npm ci --silent
    
    # 构建应用
    log_info "构建 ${app_name}..."
    NODE_ENV=$env npm run build
    
    # 检查构建结果
    if [ -d "dist" ]; then
        log_success "${app_name} 构建完成"
        
        # 显示构建文件大小
        log_info "${app_name} 构建产物大小："
        du -sh dist/*
    else
        log_error "${app_name} 构建失败"
        return 1
    fi
    
    cd - > /dev/null
}

# 清理构建产物
clean_build() {
    log_info "清理旧的构建产物..."
    
    if [ -d "frontend/user-app/dist" ]; then
        rm -rf frontend/user-app/dist
        log_info "已清理用户端构建产物"
    fi
    
    if [ -d "frontend/merchant-app/dist" ]; then
        rm -rf frontend/merchant-app/dist
        log_info "已清理商户端构建产物"
    fi
    
    if [ -d "dist" ]; then
        rm -rf dist
        log_info "已清理根目录构建产物"
    fi
    
    log_success "构建产物清理完成"
}

# 复制构建产物到统一目录
copy_dist() {
    log_info "复制构建产物到统一目录..."
    
    mkdir -p dist/user-app
    mkdir -p dist/merchant-app
    
    if [ -d "frontend/user-app/dist" ]; then
        cp -r frontend/user-app/dist/* dist/user-app/
        log_info "用户端构建产物已复制"
    fi
    
    if [ -d "frontend/merchant-app/dist" ]; then
        cp -r frontend/merchant-app/dist/* dist/merchant-app/
        log_info "商户端构建产物已复制"
    fi
    
    log_success "构建产物复制完成"
}

# 生成构建报告
generate_report() {
    log_info "生成构建报告..."
    
    local report_file="dist/build-report.json"
    local build_time=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local git_commit=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
    local git_branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
    
    cat > "$report_file" << EOF
{
  "buildTime": "$build_time",
  "gitCommit": "$git_commit",
  "gitBranch": "$git_branch",
  "nodeVersion": "$(node --version)",
  "npmVersion": "$(npm --version)",
  "environment": "${NODE_ENV:-production}",
  "apps": {
    "userApp": {
      "path": "dist/user-app",
      "size": "$(du -sh dist/user-app 2>/dev/null | cut -f1 || echo 'N/A')"
    },
    "merchantApp": {
      "path": "dist/merchant-app", 
      "size": "$(du -sh dist/merchant-app 2>/dev/null | cut -f1 || echo 'N/A')"
    }
  }
}
EOF
    
    log_success "构建报告已生成: $report_file"
}

# 主函数
main() {
    local mode=${1:-all}
    local env=${2:-production}
    
    log_info "开始构建本地生活服务应用 (模式: $mode, 环境: $env)"
    
    # 检查依赖
    check_dependencies
    
    # 清理旧构建
    if [ "$mode" != "dev" ]; then
        clean_build
    fi
    
    case $mode in
        "user")
            build_app "用户端应用" "frontend/user-app" "$env"
            ;;
        "merchant")
            build_app "商户端应用" "frontend/merchant-app" "$env"
            ;;
        "all"|*)
            build_app "用户端应用" "frontend/user-app" "$env"
            build_app "商户端应用" "frontend/merchant-app" "$env"
            copy_dist
            generate_report
            ;;
    esac
    
    log_success "构建完成！"
    
    # 显示总体大小
    if [ -d "dist" ]; then
        log_info "总构建产物大小: $(du -sh dist | cut -f1)"
    fi
}

# 显示帮助信息
show_help() {
    echo "用法: $0 [模式] [环境]"
    echo ""
    echo "模式:"
    echo "  all       构建所有应用 (默认)"
    echo "  user      仅构建用户端应用"
    echo "  merchant  仅构建商户端应用"
    echo ""
    echo "环境:"
    echo "  production  生产环境 (默认)"
    echo "  staging     预发布环境"
    echo "  development 开发环境"
    echo ""
    echo "示例:"
    echo "  $0                      # 构建所有应用（生产环境）"
    echo "  $0 user staging         # 构建用户端应用（预发布环境）"
    echo "  $0 merchant development # 构建商户端应用（开发环境）"
}

# 处理命令行参数
if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    show_help
    exit 0
fi

# 执行主函数
main "$@"
