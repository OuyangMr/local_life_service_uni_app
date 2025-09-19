<template>
  <el-breadcrumb separator="/">
    <el-breadcrumb-item v-for="(item, index) in breadcrumbs" :key="item.path">
      <span v-if="index === breadcrumbs.length - 1" class="no-redirect">
        {{ item.meta?.title }}
      </span>
      <a v-else @click.prevent="handleLink(item)">
        {{ item.meta?.title }}
      </a>
    </el-breadcrumb-item>
  </el-breadcrumb>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { RouteLocationMatched } from 'vue-router'

const route = useRoute()
const router = useRouter()

const breadcrumbs = computed(() => {
  let matched = route.matched.filter((item) => item.meta && item.meta.title)
  const first = matched[0]

  if (!isDashboard(first)) {
    matched = [{ path: '/dashboard', meta: { title: '首页' } } as any].concat(matched)
  }

  return matched
})

const isDashboard = (route: RouteLocationMatched) => {
  const name = route && route.name
  if (!name) {
    return false
  }
  return name === 'Dashboard'
}

const handleLink = (item: any) => {
  const { redirect, path } = item
  if (redirect) {
    router.push(redirect)
    return
  }
  router.push(path)
}
</script>

<style lang="scss" scoped>
.el-breadcrumb {
  font-size: 14px;
  line-height: $header-height;

  .no-redirect {
    color: var(--el-text-color-secondary);
    cursor: text;
  }

  a {
    color: var(--el-text-color-regular);
    font-weight: normal;

    &:hover {
      color: var(--el-color-primary);
    }
  }
}
</style>