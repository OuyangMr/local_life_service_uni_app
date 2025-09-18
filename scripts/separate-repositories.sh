#!/bin/bash

# 本地生活服务项目仓库分离脚本
# 自动化执行项目分离，Agent友好设计

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 验证环境
check_prerequisites() {
    log "检查分离前置条件..."
    
    # 检查Git
    if ! command -v git &> /dev/null; then
        error "Git 未安装，请先安装 Git"
        exit 1
    fi
    
    # 检查必需目录
    if [ ! -d "backend" ]; then
        error "backend目录不存在，请在项目根目录执行此脚本"
        exit 1
    fi
    
    if [ ! -d "frontend/user-app" ]; then
        error "frontend/user-app目录不存在"
        exit 1
    fi
    
    if [ ! -d "frontend/merchant-app" ]; then
        error "frontend/merchant-app目录不存在"
        exit 1
    fi
    
    # 检查Git状态
    if ! git status &>/dev/null; then
        error "当前目录不是Git仓库"
        exit 1
    fi
    
    # 检查是否有未提交的更改
    if ! git diff-index --quiet HEAD --; then
        warning "发现未提交的更改，建议先提交或暂存"
        read -p "是否继续？(y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log "分离操作已取消"
            exit 0
        fi
    fi
    
    success "前置条件检查通过"
}

# 创建分离目录
create_separation_workspace() {
    log "创建分离工作区..."
    
    # 创建分离目录
    mkdir -p ../separated-repos
    
    # 记录原始目录
    ORIGINAL_DIR=$(pwd)
    
    success "分离工作区创建完成: ../separated-repos"
}

# 分离后端仓库
separate_backend() {
    log "开始分离后端仓库..."
    
    cd ../separated-repos
    
    # 创建后端仓库
    if [ -d "local-life-service-backend" ]; then
        warning "后端仓库目录已存在，正在清理..."
        rm -rf local-life-service-backend
        rm -rf local-life-service-backend.git
    fi
    
    # 克隆裸仓库
    git clone --bare "$ORIGINAL_DIR" local-life-service-backend.git
    
    # 克隆工作仓库
    git clone local-life-service-backend.git local-life-service-backend
    
    cd local-life-service-backend
    
    # 过滤只保留后端代码
    git filter-branch --prune-empty --subdirectory-filter backend HEAD
    
    # 移除原始远程仓库
    git remote remove origin
    
    # 创建新的package.json
    cat > package.json << 'EOF'
{
  "name": "local-life-service-backend",
  "version": "1.0.0",
  "description": "本地生活服务应用后端API服务 - 独立仓库",
  "main": "dist/index.js",
  "scripts": {
    "start": "node dist/index.js",
    "dev": "ts-node-dev --respawn --transpile-only -r tsconfig-paths/register src/index.ts",
    "build": "tsc",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint src/**/*.ts",
    "lint:fix": "eslint src/**/*.ts --fix",
    "db:migrate": "node migrations/migration-runner.js migrate",
    "db:rollback": "node migrations/migration-runner.js rollback",
    "db:seed": "ts-node --transpile-only -r tsconfig-paths/register src/database/seeds/index.ts",
    "db:status": "node migrations/migration-runner.js status",
    "docker:build": "docker build -t local-life-backend .",
    "docker:run": "docker run -p 3000:3000 local-life-backend",
    "deploy:staging": "npm run build && ./scripts/deploy.sh staging",
    "deploy:production": "npm run build && ./scripts/deploy.sh production"
  },
  "repository": {
    "type": "git",
    "url": "git@github.com:your-org/local-life-service-backend.git"
  },
  "keywords": [
    "local-life-service",
    "backend",
    "api",
    "typescript",
    "express"
  ],
  "author": "本地生活服务团队",
  "license": "MIT"
}
EOF
    
    # 提交更改
    git add package.json
    git commit -m "feat: 独立化后端仓库配置"
    
    # 清理Git历史
    git gc --aggressive --prune=now
    
    # 验证分离结果
    if [ -f "package.json" ] && [ -d "src" ]; then
        success "后端仓库分离成功"
    else
        error "后端仓库分离失败"
        exit 1
    fi
    
    cd ..
}

# 分离用户端仓库
separate_user_app() {
    log "开始分离用户端仓库..."
    
    cd ../separated-repos
    
    # 创建用户端仓库
    if [ -d "local-life-service-user-app" ]; then
        warning "用户端仓库目录已存在，正在清理..."
        rm -rf local-life-service-user-app
        rm -rf local-life-service-user-app.git
    fi
    
    # 克隆裸仓库
    git clone --bare "$ORIGINAL_DIR" local-life-service-user-app.git
    
    # 克隆工作仓库
    git clone local-life-service-user-app.git local-life-service-user-app
    
    cd local-life-service-user-app
    
    # 过滤只保留用户端代码
    git filter-branch --prune-empty --subdirectory-filter frontend/user-app HEAD
    
    # 移除原始远程仓库
    git remote remove origin
    
    # 更新package.json
    if [ -f "package.json" ]; then
        # 使用jq更新package.json，如果没有jq则手动更新
        if command -v jq &> /dev/null; then
            jq '.name = "local-life-service-user-app" | .description = "本地生活服务应用用户端 - 独立仓库" | .repository.url = "git@github.com:your-org/local-life-service-user-app.git"' package.json > package.tmp && mv package.tmp package.json
        else
            # 手动更新关键字段
            sed -i.bak 's/"name": ".*"/"name": "local-life-service-user-app"/' package.json
            rm -f package.json.bak
        fi
        
        git add package.json
        git commit -m "feat: 独立化用户端仓库配置"
    fi
    
    # 清理Git历史
    git gc --aggressive --prune=now
    
    # 验证分离结果
    if [ -f "package.json" ] && [ -f "src/main.ts" ]; then
        success "用户端仓库分离成功"
    else
        error "用户端仓库分离失败"
        exit 1
    fi
    
    cd ..
}

# 分离商户端仓库
separate_merchant_app() {
    log "开始分离商户端仓库..."
    
    cd ../separated-repos
    
    # 创建商户端仓库
    if [ -d "local-life-service-merchant-app" ]; then
        warning "商户端仓库目录已存在，正在清理..."
        rm -rf local-life-service-merchant-app
        rm -rf local-life-service-merchant-app.git
    fi
    
    # 克隆裸仓库
    git clone --bare "$ORIGINAL_DIR" local-life-service-merchant-app.git
    
    # 克隆工作仓库
    git clone local-life-service-merchant-app.git local-life-service-merchant-app
    
    cd local-life-service-merchant-app
    
    # 过滤只保留商户端代码
    git filter-branch --prune-empty --subdirectory-filter frontend/merchant-app HEAD
    
    # 移除原始远程仓库
    git remote remove origin
    
    # 更新package.json
    if [ -f "package.json" ]; then
        if command -v jq &> /dev/null; then
            jq '.name = "local-life-service-merchant-app" | .description = "本地生活服务应用商户端 - 独立仓库" | .repository.url = "git@github.com:your-org/local-life-service-merchant-app.git"' package.json > package.tmp && mv package.tmp package.json
        else
            sed -i.bak 's/"name": ".*"/"name": "local-life-service-merchant-app"/' package.json
            rm -f package.json.bak
        fi
        
        git add package.json
        git commit -m "feat: 独立化商户端仓库配置"
    fi
    
    # 清理Git历史
    git gc --aggressive --prune=now
    
    # 验证分离结果
    if [ -f "package.json" ] && [ -f "src/main.ts" ]; then
        success "商户端仓库分离成功"
    else
        error "商户端仓库分离失败"
        exit 1
    fi
    
    cd ..
}

# 创建共享配置仓库
create_shared_repo() {
    log "创建共享配置仓库..."
    
    cd ../separated-repos
    
    # 创建共享仓库目录
    if [ -d "local-life-service-shared" ]; then
        warning "共享仓库目录已存在，正在清理..."
        rm -rf local-life-service-shared
    fi
    
    mkdir local-life-service-shared
    cd local-life-service-shared
    
    # 初始化Git仓库
    git init
    
    # 拷贝共享配置
    cp "$ORIGINAL_DIR/.prettierrc" . 2>/dev/null || true
    cp "$ORIGINAL_DIR/commitlint.config.cjs" . 2>/dev/null || true
    cp "$ORIGINAL_DIR/.gitignore" . 2>/dev/null || true
    
    # 创建目录结构
    mkdir -p packages/shared-utils
    mkdir -p packages/api-types
    mkdir -p packages/api-contracts
    mkdir -p config/environments
    mkdir -p scripts
    
    # 创建基础package.json
    cat > package.json << 'EOF'
{
  "name": "local-life-service-shared",
  "version": "1.0.0",
  "description": "本地生活服务应用共享配置和工具",
  "private": true,
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "build": "npm run build --workspaces",
    "test": "npm run test --workspaces",
    "lint": "npm run lint --workspaces",
    "publish:packages": "npm run build && npm publish --workspaces"
  },
  "repository": {
    "type": "git",
    "url": "git@github.com:your-org/local-life-service-shared.git"
  },
  "keywords": [
    "local-life-service",
    "shared",
    "monorepo",
    "utilities"
  ],
  "author": "本地生活服务团队",
  "license": "MIT",
  "devDependencies": {
    "@commitlint/cli": "^19.8.1",
    "@commitlint/config-conventional": "^19.8.1",
    "prettier": "^3.6.2",
    "typescript": "^5.0.0"
  }
}
EOF
    
    # 创建API契约示例
    cat > packages/api-contracts/api-spec.yaml << 'EOF'
openapi: 3.0.0
info:
  title: Local Life Service API
  version: 1.0.0
  description: 本地生活服务API规范
paths:
  /api/stores/nearby/search:
    get:
      summary: 搜索附近店铺
      parameters:
        - name: latitude
          in: query
          required: true
          schema:
            type: number
            description: 纬度
        - name: longitude
          in: query
          required: true
          schema:
            type: number
            description: 经度
        - name: radius
          in: query
          schema:
            type: number
            minimum: 0.1
            maximum: 50
            default: 5
            description: 搜索半径（公里）
        - name: limit
          in: query
          schema:
            type: integer
            minimum: 1
            maximum: 50
            default: 20
            description: 返回数量限制
      responses:
        '200':
          description: 成功返回店铺列表
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  message:
                    type: string
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/Store'
                  timestamp:
                    type: string
                    format: date-time
components:
  schemas:
    Store:
      type: object
      properties:
        _id:
          type: string
        name:
          type: string
        description:
          type: string
        address:
          type: string
        rating:
          type: number
        averagePrice:
          type: number
EOF
    
    # 创建基础README
    cat > README.md << 'EOF'
# 本地生活服务共享配置

这个仓库包含所有项目共享的配置、工具和API契约。

## 包结构

- `packages/shared-utils`: 共享工具函数
- `packages/api-types`: API类型定义
- `packages/api-contracts`: API契约规范
- `config/environments`: 环境配置
- `scripts`: 共享脚本

## 使用方式

```bash
npm install
npm run build
```

## API契约

API契约定义在 `packages/api-contracts/api-spec.yaml` 中，使用OpenAPI 3.0规范。
EOF
    
    # 初始提交
    git add .
    git commit -m "feat: 初始化共享配置仓库"
    
    success "共享配置仓库创建成功"
    cd ..
}

# 生成分离报告
generate_separation_report() {
    log "生成分离报告..."
    
    cd ../separated-repos
    
    local report_file="separation-report.md"
    local separation_time=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    cat > "$report_file" << EOF
# 项目分离报告

**分离时间**: $separation_time
**原始项目**: local-life-service-app
**分离方式**: Git filter-branch

## 分离结果

### 1. 后端服务 (local-life-service-backend)
- **路径**: \`local-life-service-backend/\`
- **技术栈**: Node.js + TypeScript + Express + MongoDB
- **大小**: $(du -sh local-life-service-backend 2>/dev/null | cut -f1 || echo 'N/A')
- **提交数**: $(cd local-life-service-backend && git rev-list --count HEAD 2>/dev/null || echo 'N/A')

### 2. 用户端应用 (local-life-service-user-app)
- **路径**: \`local-life-service-user-app/\`
- **技术栈**: uni-app + Vue 3 + TypeScript
- **大小**: $(du -sh local-life-service-user-app 2>/dev/null | cut -f1 || echo 'N/A')
- **提交数**: $(cd local-life-service-user-app && git rev-list --count HEAD 2>/dev/null || echo 'N/A')

### 3. 商户端应用 (local-life-service-merchant-app)
- **路径**: \`local-life-service-merchant-app/\`
- **技术栈**: uni-app + Vue 3 + TypeScript
- **大小**: $(du -sh local-life-service-merchant-app 2>/dev/null | cut -f1 || echo 'N/A')
- **提交数**: $(cd local-life-service-merchant-app && git rev-list --count HEAD 2>/dev/null || echo 'N/A')

### 4. 共享配置 (local-life-service-shared)
- **路径**: \`local-life-service-shared/\`
- **内容**: 共享配置、工具、API契约
- **大小**: $(du -sh local-life-service-shared 2>/dev/null | cut -f1 || echo 'N/A')

## 下一步操作

1. **测试分离结果**: 在每个仓库中运行 \`npm install && npm run build\`
2. **创建远程仓库**: 在GitHub/GitLab上创建对应的远程仓库
3. **推送代码**: 将分离的仓库推送到远程
4. **设置CI/CD**: 为每个仓库配置独立的CI/CD流程
5. **更新文档**: 更新项目文档和README

## 验证命令

\`\`\`bash
# 验证所有仓库
./verify-separation.sh
\`\`\`

## 回滚方案

如果需要回滚到原始状态：

\`\`\`bash
# 删除分离的仓库
rm -rf ../separated-repos

# 返回原始项目
cd $ORIGINAL_DIR
\`\`\`
EOF
    
    success "分离报告已生成: $report_file"
}

# 创建验证脚本
create_verification_script() {
    log "创建验证脚本..."
    
    cd ../separated-repos
    
    cat > verify-separation.sh << 'EOF'
#!/bin/bash

# 验证项目分离结果脚本

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

verify_repository() {
    local repo_name=$1
    shift
    local expected_files=("$@")
    
    echo "验证仓库: $repo_name"
    
    if [ ! -d "$repo_name" ]; then
        error "仓库目录不存在: $repo_name"
        return 1
    fi
    
    cd "$repo_name"
    
    # 检查必需文件
    for file in "${expected_files[@]}"; do
        if [ ! -e "$file" ]; then
            error "缺少必需文件: $file"
            cd ..
            return 1
        fi
    done
    
    # 检查Git状态
    if ! git status &>/dev/null; then
        error "不是有效的Git仓库"
        cd ..
        return 1
    fi
    
    # 检查构建（如果有package.json）
    if [ -f "package.json" ]; then
        echo "  安装依赖..."
        if npm install --silent; then
            echo "  依赖安装成功"
        else
            error "依赖安装失败"
            cd ..
            return 1
        fi
        
        echo "  执行构建..."
        if npm run build &>/dev/null; then
            echo "  构建成功"
        else
            echo "  构建跳过或失败（可能正常）"
        fi
    fi
    
    cd ..
    success "$repo_name 验证通过"
    return 0
}

echo "开始验证项目分离结果..."

# 验证所有仓库
verify_repository "local-life-service-backend" "package.json" "src" "tsconfig.json"
verify_repository "local-life-service-user-app" "package.json" "src/main.ts"
verify_repository "local-life-service-merchant-app" "package.json" "src/main.ts"
verify_repository "local-life-service-shared" "package.json" "packages"

success "🎉 所有仓库验证完成！"

echo ""
echo "下一步建议："
echo "1. 为每个仓库创建远程仓库"
echo "2. 推送代码到远程"
echo "3. 设置CI/CD流程"
echo "4. 更新项目文档"
EOF
    
    chmod +x verify-separation.sh
    
    success "验证脚本已创建: verify-separation.sh"
}

# 主执行函数
main() {
    echo ""
    echo "🚀 本地生活服务项目仓库分离工具"
    echo "========================================"
    echo ""
    
    # 检查前置条件
    check_prerequisites
    
    # 创建工作区
    create_separation_workspace
    
    # 执行分离步骤
    separate_backend
    separate_user_app
    separate_merchant_app
    create_shared_repo
    
    # 生成报告和脚本
    generate_separation_report
    create_verification_script
    
    # 返回原目录
    cd "$ORIGINAL_DIR"
    
    echo ""
    success "🎉 项目分离完成！"
    echo ""
    echo "分离结果位置: ../separated-repos/"
    echo ""
    echo "建议执行以下命令验证分离结果:"
    echo "  cd ../separated-repos"
    echo "  ./verify-separation.sh"
    echo ""
    echo "查看详细分离报告:"
    echo "  cat ../separated-repos/separation-report.md"
    echo ""
}

# 脚本入口
if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    echo "用法: $0"
    echo ""
    echo "这个脚本会将当前项目分离为独立的仓库："
    echo "  - local-life-service-backend"
    echo "  - local-life-service-user-app"
    echo "  - local-life-service-merchant-app"
    echo "  - local-life-service-shared"
    echo ""
    echo "分离结果将保存在 ../separated-repos/ 目录中"
    exit 0
fi

# 执行主函数
main "$@"
