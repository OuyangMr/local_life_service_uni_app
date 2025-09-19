<template>
  <div class="merchant-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title">商户管理</h1>
      <el-button type="primary" @click="showAddDialog = true">
        <el-icon><Plus /></el-icon>
        新增商户
      </el-button>
    </div>

    <!-- 搜索条件 -->
    <el-card class="search-card">
      <el-form :model="searchForm" inline>
        <el-form-item label="商户名称">
          <el-input
            v-model="searchForm.name"
            placeholder="请输入商户名称"
            clearable
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="商户类型">
          <el-select v-model="searchForm.type" placeholder="请选择" clearable>
            <el-option label="全部" value="" />
            <el-option label="KTV" value="ktv" />
            <el-option label="茶楼" value="teahouse" />
            <el-option label="咖啡厅" value="cafe" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="请选择" clearable>
            <el-option label="全部" value="" />
            <el-option label="营业中" value="active" />
            <el-option label="暂停营业" value="inactive" />
            <el-option label="待审核" value="pending" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 数据表格 -->
    <el-card class="table-card">
      <el-table
        v-loading="loading"
        :data="tableData"
        border
        stripe
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="id" label="商户ID" width="100" />
        <el-table-column prop="name" label="商户名称" min-width="150" />
        <el-table-column prop="type" label="类型" width="100">
          <template #default="{ row }">
            <el-tag>{{ getTypeLabel(row.type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="contact" label="联系人" width="100" />
        <el-table-column prop="phone" label="联系电话" width="120" />
        <el-table-column prop="address" label="地址" min-width="200" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="入驻时间" width="180" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleEdit(row)">编辑</el-button>
            <el-button link type="primary" @click="handleDetail(row)">详情</el-button>
            <el-button
              v-if="row.status === 'active'"
              link
              type="warning"
              @click="handleToggleStatus(row)"
            >
              暂停
            </el-button>
            <el-button
              v-else-if="row.status === 'inactive'"
              link
              type="success"
              @click="handleToggleStatus(row)"
            >
              启用
            </el-button>
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
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

    <!-- 新增/编辑对话框 -->
    <el-dialog
      v-model="showAddDialog"
      :title="editMode ? '编辑商户' : '新增商户'"
      width="600px"
    >
      <el-form ref="formRef" :model="merchantForm" :rules="rules" label-width="100px">
        <el-form-item label="商户名称" prop="name">
          <el-input v-model="merchantForm.name" placeholder="请输入商户名称" />
        </el-form-item>
        <el-form-item label="商户类型" prop="type">
          <el-select v-model="merchantForm.type" placeholder="请选择商户类型">
            <el-option label="KTV" value="ktv" />
            <el-option label="茶楼" value="teahouse" />
            <el-option label="咖啡厅" value="cafe" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="联系人" prop="contact">
          <el-input v-model="merchantForm.contact" placeholder="请输入联系人姓名" />
        </el-form-item>
        <el-form-item label="联系电话" prop="phone">
          <el-input v-model="merchantForm.phone" placeholder="请输入联系电话" />
        </el-form-item>
        <el-form-item label="地址" prop="address">
          <el-input
            v-model="merchantForm.address"
            type="textarea"
            :rows="3"
            placeholder="请输入详细地址"
          />
        </el-form-item>
        <el-form-item label="营业时间" prop="businessHours">
          <el-time-picker
            v-model="merchantForm.startTime"
            placeholder="开始时间"
            format="HH:mm"
            value-format="HH:mm"
          />
          <span style="margin: 0 10px">至</span>
          <el-time-picker
            v-model="merchantForm.endTime"
            placeholder="结束时间"
            format="HH:mm"
            value-format="HH:mm"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'

// 搜索表单
const searchForm = reactive({
  name: '',
  type: '',
  status: '',
})

// 表格数据
const loading = ref(false)
const tableData = ref([
  {
    id: 'M001',
    name: '星光KTV（国贸店）',
    type: 'ktv',
    contact: '张经理',
    phone: '13800138001',
    address: '北京市朝阳区国贸商圈建国门外大街1号',
    status: 'active',
    createTime: '2024-01-15 10:30:00',
  },
  {
    id: 'M002',
    name: '悦茶楼（朝阳店）',
    type: 'teahouse',
    contact: '李经理',
    phone: '13800138002',
    address: '北京市朝阳区朝阳北路101号',
    status: 'active',
    createTime: '2024-01-20 14:20:00',
  },
  {
    id: 'M003',
    name: '漫咖啡（三里屯店）',
    type: 'cafe',
    contact: '王经理',
    phone: '13800138003',
    address: '北京市朝阳区三里屯北路19号',
    status: 'inactive',
    createTime: '2024-02-01 09:15:00',
  },
  {
    id: 'M004',
    name: '派对空间（CBD店）',
    type: 'other',
    contact: '赵经理',
    phone: '13800138004',
    address: '北京市朝阳区CBD核心区',
    status: 'pending',
    createTime: '2024-03-10 16:45:00',
  },
])

// 分页信息
const pageInfo = reactive({
  current: 1,
  size: 10,
  total: 100,
})

// 多选
const multipleSelection = ref([])

// 对话框
const showAddDialog = ref(false)
const editMode = ref(false)
const formRef = ref<FormInstance>()

// 商户表单
const merchantForm = reactive({
  name: '',
  type: '',
  contact: '',
  phone: '',
  address: '',
  startTime: '',
  endTime: '',
})

// 表单验证规则
const rules = reactive<FormRules>({
  name: [{ required: true, message: '请输入商户名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择商户类型', trigger: 'change' }],
  contact: [{ required: true, message: '请输入联系人姓名', trigger: 'blur' }],
  phone: [
    { required: true, message: '请输入联系电话', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' },
  ],
  address: [{ required: true, message: '请输入详细地址', trigger: 'blur' }],
})

// 获取类型标签
const getTypeLabel = (type: string) => {
  const typeMap: Record<string, string> = {
    ktv: 'KTV',
    teahouse: '茶楼',
    cafe: '咖啡厅',
    other: '其他',
  }
  return typeMap[type] || type
}

// 获取状态类型
const getStatusType = (status: string) => {
  const typeMap: Record<string, string> = {
    active: 'success',
    inactive: 'warning',
    pending: 'info',
  }
  return typeMap[status] || 'info'
}

// 获取状态标签
const getStatusLabel = (status: string) => {
  const labelMap: Record<string, string> = {
    active: '营业中',
    inactive: '暂停营业',
    pending: '待审核',
  }
  return labelMap[status] || status
}

// 搜索
const handleSearch = () => {
  loading.value = true
  // 模拟搜索延迟
  setTimeout(() => {
    loading.value = false
    ElMessage.success('搜索成功')
  }, 1000)
}

// 重置
const handleReset = () => {
  searchForm.name = ''
  searchForm.type = ''
  searchForm.status = ''
  handleSearch()
}

// 多选变化
const handleSelectionChange = (val: any[]) => {
  multipleSelection.value = val
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

// 编辑
const handleEdit = (row: any) => {
  editMode.value = true
  showAddDialog.value = true
  Object.assign(merchantForm, row)
}

// 详情
const handleDetail = (row: any) => {
  ElMessage.info(`查看商户详情：${row.name}`)
}

// 切换状态
const handleToggleStatus = async (row: any) => {
  const action = row.status === 'active' ? '暂停' : '启用'
  try {
    await ElMessageBox.confirm(
      `确定要${action}商户"${row.name}"吗？`,
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    row.status = row.status === 'active' ? 'inactive' : 'active'
    ElMessage.success(`${action}成功`)
  } catch {
    ElMessage.info('已取消操作')
  }
}

// 删除
const handleDelete = async (row: any) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除商户"${row.name}"吗？删除后不可恢复。`,
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    const index = tableData.value.findIndex((item) => item.id === row.id)
    if (index > -1) {
      tableData.value.splice(index, 1)
    }
    ElMessage.success('删除成功')
  } catch {
    ElMessage.info('已取消删除')
  }
}

// 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return
  await formRef.value.validate((valid) => {
    if (valid) {
      if (editMode.value) {
        ElMessage.success('编辑成功')
      } else {
        ElMessage.success('新增成功')
      }
      showAddDialog.value = false
      // 重置表单
      formRef.value?.resetFields()
    }
  })
}

onMounted(() => {
  handleSearch()
})
</script>

<style lang="scss" scoped>
.merchant-container {
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
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