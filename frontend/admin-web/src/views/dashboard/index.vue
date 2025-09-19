<template>
  <div class="dashboard-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title">数据看板</h1>
      <p class="page-subtitle">
        实时监控平台运营数据，最后更新时间：{{ currentTime }}
      </p>
    </div>

    <!-- 统计卡片 -->
    <el-row :gutter="16" class="stats-cards">
      <el-col :xs="24" :sm="12" :lg="6">
        <div class="stat-card">
          <div class="stat-header">
            <div class="stat-info">
              <div class="stat-title">今日订单数</div>
              <div class="stat-value">{{ stats.todayOrders.toLocaleString() }}</div>
              <div class="stat-trend" :class="stats.orderTrend > 0 ? 'up' : 'down'">
                <el-icon>
                  <component :is="stats.orderTrend > 0 ? 'ArrowUp' : 'ArrowDown'" />
                </el-icon>
                <span>{{ Math.abs(stats.orderTrend) }}%</span>
                <span class="trend-text">较昨日</span>
              </div>
            </div>
            <div class="stat-icon blue">
              <el-icon><ShoppingCart /></el-icon>
            </div>
          </div>
        </div>
      </el-col>

      <el-col :xs="24" :sm="12" :lg="6">
        <div class="stat-card">
          <div class="stat-header">
            <div class="stat-info">
              <div class="stat-title">今日交易额</div>
              <div class="stat-value">¥{{ stats.todayRevenue.toLocaleString() }}</div>
              <div class="stat-trend up">
                <el-icon><ArrowUp /></el-icon>
                <span>8.3%</span>
                <span class="trend-text">较昨日</span>
              </div>
            </div>
            <div class="stat-icon green">
              <el-icon><Wallet /></el-icon>
            </div>
          </div>
        </div>
      </el-col>

      <el-col :xs="24" :sm="12" :lg="6">
        <div class="stat-card">
          <div class="stat-header">
            <div class="stat-info">
              <div class="stat-title">新增用户</div>
              <div class="stat-value">{{ stats.newUsers.toLocaleString() }}</div>
              <div class="stat-trend down">
                <el-icon><ArrowDown /></el-icon>
                <span>3.2%</span>
                <span class="trend-text">较昨日</span>
              </div>
            </div>
            <div class="stat-icon orange">
              <el-icon><User /></el-icon>
            </div>
          </div>
        </div>
      </el-col>

      <el-col :xs="24" :sm="12" :lg="6">
        <div class="stat-card">
          <div class="stat-header">
            <div class="stat-info">
              <div class="stat-title">活跃商户</div>
              <div class="stat-value">{{ stats.activeMerchants.toLocaleString() }}</div>
              <div class="stat-trend up">
                <el-icon><ArrowUp /></el-icon>
                <span>5.7%</span>
                <span class="trend-text">较昨日</span>
              </div>
            </div>
            <div class="stat-icon purple">
              <el-icon><Shop /></el-icon>
            </div>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- 图表区域 -->
    <el-row :gutter="16" class="chart-row">
      <el-col :xs="24" :lg="12">
        <div class="chart-card">
          <div class="chart-header">
            <h3 class="chart-title">订单趋势</h3>
            <el-radio-group v-model="orderChartType" size="small">
              <el-radio-button label="day">日</el-radio-button>
              <el-radio-button label="week">周</el-radio-button>
              <el-radio-button label="month">月</el-radio-button>
            </el-radio-group>
          </div>
          <div class="chart-container">
            <div class="chart-placeholder">订单趋势图表区域</div>
          </div>
        </div>
      </el-col>

      <el-col :xs="24" :lg="12">
        <div class="chart-card">
          <div class="chart-header">
            <h3 class="chart-title">类目营收分布</h3>
            <el-radio-group v-model="revenueChartType" size="small">
              <el-radio-button label="today">今日</el-radio-button>
              <el-radio-button label="week">本周</el-radio-button>
            </el-radio-group>
          </div>
          <div class="chart-container">
            <div class="chart-placeholder">类目营收饼图区域</div>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- 最新订单 -->
    <div class="latest-orders">
      <div class="section-header">
        <h3 class="section-title">最新订单</h3>
        <el-link type="primary" :underline="false" @click="router.push('/order/list')">
          查看全部
          <el-icon><ArrowRight /></el-icon>
        </el-link>
      </div>
      <el-table :data="latestOrders" style="width: 100%">
        <el-table-column prop="orderId" label="订单编号" width="180" />
        <el-table-column prop="user" label="用户" />
        <el-table-column prop="merchant" label="商户" />
        <el-table-column prop="amount" label="金额">
          <template #default="{ row }">
            ¥{{ row.amount.toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="time" label="下单时间" />
      </el-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'

const router = useRouter()

// 当前时间
const currentTime = ref(dayjs().format('YYYY-MM-DD HH:mm:ss'))

// 统计数据
const stats = reactive({
  todayOrders: 1234,
  orderTrend: 12.5,
  todayRevenue: 89234,
  newUsers: 342,
  activeMerchants: 156,
})

// 图表类型
const orderChartType = ref('day')
const revenueChartType = ref('today')

// 最新订单
const latestOrders = ref([
  {
    orderId: '#202503190001',
    user: '张三',
    merchant: '星光KTV（国贸店）',
    amount: 568.0,
    status: '已完成',
    time: '10:25:33',
  },
  {
    orderId: '#202503190002',
    user: '李四',
    merchant: '悦茶楼（朝阳店）',
    amount: 238.0,
    status: '进行中',
    time: '10:22:15',
  },
  {
    orderId: '#202503190003',
    user: '王五',
    merchant: '漫咖啡（三里屯店）',
    amount: 88.0,
    status: '待支付',
    time: '10:18:42',
  },
  {
    orderId: '#202503190004',
    user: '赵六',
    merchant: '星光KTV（国贸店）',
    amount: 1288.0,
    status: '已完成',
    time: '10:15:20',
  },
  {
    orderId: '#202503190005',
    user: '孙七',
    merchant: '悦茶楼（朝阳店）',
    amount: 398.0,
    status: '进行中',
    time: '10:10:55',
  },
])

// 获取状态类型
const getStatusType = (status: string) => {
  const typeMap: Record<string, string> = {
    已完成: 'success',
    进行中: 'primary',
    待支付: 'warning',
    已取消: 'info',
  }
  return typeMap[status] || 'info'
}

// 定时器
let timer: NodeJS.Timer | null = null

onMounted(() => {
  // 更新时间
  timer = setInterval(() => {
    currentTime.value = dayjs().format('YYYY-MM-DD HH:mm:ss')
  }, 1000)
})

onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
  }
})
</script>

<style lang="scss" scoped>
.dashboard-container {
  .page-header {
    margin-bottom: $spacing-lg;

    .page-title {
      font-size: 24px;
      font-weight: 600;
      color: var(--el-text-color-primary);
      margin-bottom: $spacing-sm;
    }

    .page-subtitle {
      font-size: 14px;
      color: var(--el-text-color-regular);
    }
  }

  .stats-cards {
    margin-bottom: $spacing-lg;

    .stat-card {
      background: var(--el-bg-color);
      border-radius: $radius-lg;
      padding: $spacing-lg;
      box-shadow: var(--el-box-shadow-light);
      transition: all $transition-duration;

      &:hover {
        transform: translateY(-4px);
        box-shadow: var(--el-box-shadow);
      }

      .stat-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .stat-info {
        flex: 1;
      }

      .stat-title {
        font-size: 14px;
        color: var(--el-text-color-regular);
        margin-bottom: $spacing-sm;
      }

      .stat-value {
        font-size: 32px;
        font-weight: 700;
        color: var(--el-text-color-primary);
        margin-bottom: $spacing-sm;
      }

      .stat-trend {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 14px;

        &.up {
          color: var(--el-color-success);
        }

        &.down {
          color: var(--el-color-danger);
        }

        .trend-text {
          color: var(--el-text-color-regular);
          margin-left: 4px;
        }
      }

      .stat-icon {
        width: 56px;
        height: 56px;
        border-radius: $radius-lg;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 28px;

        &.blue {
          background: rgba(102, 126, 234, 0.1);
          color: #667eea;
        }

        &.green {
          background: rgba(103, 194, 58, 0.1);
          color: #67c23a;
        }

        &.orange {
          background: rgba(230, 162, 60, 0.1);
          color: #e6a23c;
        }

        &.purple {
          background: rgba(168, 85, 247, 0.1);
          color: #a855f7;
        }
      }
    }
  }

  .chart-row {
    margin-bottom: $spacing-lg;

    .chart-card {
      background: var(--el-bg-color);
      border-radius: $radius-lg;
      padding: $spacing-lg;
      box-shadow: var(--el-box-shadow-light);
      height: 400px;

      .chart-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: $spacing-lg;

        .chart-title {
          font-size: 18px;
          font-weight: 600;
          color: var(--el-text-color-primary);
        }
      }

      .chart-container {
        height: calc(100% - 60px);
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--el-fill-color-lighter);
        border-radius: $radius-base;

        .chart-placeholder {
          color: var(--el-text-color-secondary);
        }
      }
    }
  }

  .latest-orders {
    background: var(--el-bg-color);
    border-radius: $radius-lg;
    padding: $spacing-lg;
    box-shadow: var(--el-box-shadow-light);

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: $spacing-lg;

      .section-title {
        font-size: 18px;
        font-weight: 600;
        color: var(--el-text-color-primary);
      }
    }
  }
}
</style>