<template>
  <div class="user-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title">用户管理</h1>
    </div>

    <!-- 搜索条件 -->
    <el-card class="search-card">
      <el-form :model="searchForm" inline>
        <el-form-item label="用户信息">
          <el-input
            v-model="searchForm.keyword"
            placeholder="手机号/昵称"
            clearable
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="用户等级">
          <el-select v-model="searchForm.level" placeholder="请选择" clearable>
            <el-option label="全部" value="" />
            <el-option label="普通用户" value="normal" />
            <el-option label="VIP用户" value="vip" />
            <el-option label="SVIP用户" value="svip" />
          </el-select>
        </el-form-item>
        <el-form-item label="注册时间">
          <el-date-picker
            v-model="searchForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 数据表格 -->
    <el-card class="table-card">
      <el-table v-loading="loading" :data="tableData" border stripe>
        <el-table-column prop="id" label="用户ID" width="100" />
        <el-table-column prop="nickname" label="昵称" min-width="120" />
        <el-table-column prop="phone" label="手机号" width="120" />
        <el-table-column prop="level" label="用户等级" width="100">
          <template #default="{ row }">
            <el-tag :type="getLevelType(row.level)">
              {{ getLevelLabel(row.level) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="points" label="积分" width="100" />
        <el-table-column prop="balance" label="余额" width="100">
          <template #default="{ row }">
            ¥{{ row.balance.toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column prop="orderCount" label="订单数" width="100" />
        <el-table-column prop="registerTime" label="注册时间" width="180" />
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleDetail(row)">详情</el-button>
            <el-button link type="primary" @click="handleEdit(row)">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <el-pagination
        v-model:current-page="pageInfo.current"
        v-model:page-size="pageInfo.size"
        :page-sizes="[10, 20, 50, 100]"
        :total="pageInfo.total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'

// 搜索表单
const searchForm = reactive({
  keyword: '',
  level: '',
  dateRange: null,
})

// 表格数据
const loading = ref(false)
const tableData = ref([
  {
    id: 'U10001',
    nickname: '张三',
    phone: '13800138001',
    level: 'vip',
    points: 2580,
    balance: 156.50,
    orderCount: 28,
    registerTime: '2024-01-15 10:30:00',
  },
  {
    id: 'U10002',
    nickname: '李四',
    phone: '13800138002',
    level: 'normal',
    points: 580,
    balance: 0,
    orderCount: 5,
    registerTime: '2024-02-20 14:20:00',
  },
  {
    id: 'U10003',
    nickname: '王五',
    phone: '13800138003',
    level: 'svip',
    points: 8888,
    balance: 888.88,
    orderCount: 156,
    registerTime: '2023-08-10 09:15:00',
  },
])

// 分页信息
const pageInfo = reactive({
  current: 1,
  size: 10,
  total: 100,
})

// 获取等级类型
const getLevelType = (level: string) => {
  const typeMap: Record<string, string> = {
    normal: 'info',
    vip: 'warning',
    svip: 'danger',
  }
  return typeMap[level] || 'info'
}

// 获取等级标签
const getLevelLabel = (level: string) => {
  const labelMap: Record<string, string> = {
    normal: '普通用户',
    vip: 'VIP',
    svip: 'SVIP',
  }
  return labelMap[level] || level
}

// 搜索
const handleSearch = () => {
  loading.value = true
  setTimeout(() => {
    loading.value = false
    ElMessage.success('搜索成功')
  }, 1000)
}

// 重置
const handleReset = () => {
  searchForm.keyword = ''
  searchForm.level = ''
  searchForm.dateRange = null
  handleSearch()
}

// 分页大小变化
const handleSizeChange = (val: number) => {
  pageInfo.size = val
  handleSearch()
}

// 当前页变化
const handleCurrentChange = (val: number) => {
  pageInfo.current = val
  handleSearch()
}

// 详情
const handleDetail = (row: any) => {
  ElMessage.info(`查看用户详情：${row.nickname}`)
}

// 编辑
const handleEdit = (row: any) => {
  ElMessage.info(`编辑用户：${row.nickname}`)
}
</script>

<style lang="scss" scoped>
.user-container {
  .page-header {
    margin-bottom: $spacing-lg;

    .page-title {
      font-size: 24px;
      font-weight: 600;
      color: var(--el-text-color-primary);
    }
  }

  .search-card {
    margin-bottom: $spacing-lg;
  }

  .table-card {
    .el-pagination {
      margin-top: $spacing-lg;
      justify-content: flex-end;
    }
  }
}
</style>