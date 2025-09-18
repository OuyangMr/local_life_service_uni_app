# 开发重构计划

## 一、项目概述

基于UI重构规范和高保真HTML原型，制定全面的开发重构计划，确保100%实现原型的功能设计和视觉效果。

### 1.1 重构目标
- 完全实现高保真原型的视觉设计
- 优化用户体验和交互流程
- 提升应用性能和响应速度
- 统一设计语言和组件规范
- 支持暗黑模式和响应式设计

### 1.2 技术架构
- **前端框架**: uni-app + Vue3 + TypeScript
- **状态管理**: Pinia
- **UI组件库**: 自定义组件库（基于设计系统）
- **样式方案**: SCSS + CSS Variables
- **构建工具**: Vite
- **代码规范**: ESLint + Prettier

## 二、设计系统实现

### 2.1 设计令牌（Design Tokens）
```scss
// 创建统一的设计令牌文件 styles/tokens.scss
:root {
  // 颜色系统
  --primary: #FF6B35;
  --primary-light: #FF8F66;
  --primary-dark: #E5602F;
  
  // 间距系统
  --spacing-1: 4px;
  --spacing-2: 8px;
  --spacing-3: 12px;
  --spacing-4: 16px;
  --spacing-5: 20px;
  --spacing-6: 24px;
  --spacing-8: 32px;
  --spacing-10: 40px;
  
  // 圆角系统
  --radius-sm: 4px;
  --radius-base: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-2xl: 24px;
  --radius-full: 9999px;
  
  // 阴影系统
  --shadow-1: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-2: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
  --shadow-3: 0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.06);
  --shadow-primary: 0 4px 12px rgba(255, 107, 53, 0.3);
}
```

### 2.2 主题系统
```typescript
// 创建主题管理器 utils/theme.ts
export class ThemeManager {
  private static instance: ThemeManager;
  
  static getInstance(): ThemeManager {
    if (!this.instance) {
      this.instance = new ThemeManager();
    }
    return this.instance;
  }
  
  setTheme(theme: 'light' | 'dark' | 'auto') {
    if (theme === 'auto') {
      this.detectSystemTheme();
    } else {
      document.documentElement.setAttribute('data-theme', theme);
      uni.setStorageSync('app-theme', theme);
    }
  }
  
  private detectSystemTheme() {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    this.setTheme(isDark ? 'dark' : 'light');
  }
}
```

## 三、核心组件开发

### 3.1 基础组件

#### Button 组件
```vue
<!-- components/base/Button.vue -->
<template>
  <button 
    :class="buttonClasses"
    :disabled="disabled || loading"
    @click="handleClick"
  >
    <span v-if="loading" class="loading-icon">
      <LoadingIcon />
    </span>
    <span class="button-content">
      <slot />
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  type?: 'primary' | 'secondary' | 'ghost' | 'text';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  block?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  type: 'primary',
  size: 'medium',
  disabled: false,
  loading: false,
  block: false
});

const emit = defineEmits<{
  click: [event: MouseEvent];
}>();

const buttonClasses = computed(() => [
  'base-button',
  `button--${props.type}`,
  `button--${props.size}`,
  {
    'button--block': props.block,
    'button--loading': props.loading,
    'button--disabled': props.disabled
  }
]);

const handleClick = (event: MouseEvent) => {
  if (!props.disabled && !props.loading) {
    emit('click', event);
  }
};
</script>

<style scoped lang="scss">
.base-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-2);
  padding: var(--spacing-3) var(--spacing-6);
  border-radius: var(--radius-2xl);
  font-weight: 600;
  transition: all 0.2s ease;
  cursor: pointer;
  border: none;
  
  &--primary {
    background: linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%);
    color: var(--gray-1);
    box-shadow: var(--shadow-primary);
    
    &:hover:not(.button--disabled) {
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(255, 107, 53, 0.4);
    }
  }
  
  &--block {
    width: 100%;
  }
  
  &--loading {
    opacity: 0.8;
  }
}
</style>
```

#### Card 组件
```vue
<!-- components/base/Card.vue -->
<template>
  <div 
    :class="cardClasses"
    @click="handleClick"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  clickable?: boolean;
  padding?: 'none' | 'small' | 'medium' | 'large';
  shadow?: 'none' | 'small' | 'medium' | 'large';
}

const props = withDefaults(defineProps<Props>(), {
  clickable: false,
  padding: 'medium',
  shadow: 'medium'
});

const emit = defineEmits<{
  click: [event: MouseEvent];
}>();

const cardClasses = computed(() => [
  'base-card',
  `card--padding-${props.padding}`,
  `card--shadow-${props.shadow}`,
  {
    'card--clickable': props.clickable
  }
]);

const handleClick = (event: MouseEvent) => {
  if (props.clickable) {
    emit('click', event);
  }
};
</script>

<style scoped lang="scss">
.base-card {
  background-color: var(--gray-1);
  border-radius: var(--radius-lg);
  transition: all 0.3s ease;
  
  &--padding-small {
    padding: var(--spacing-3);
  }
  
  &--padding-medium {
    padding: var(--spacing-4);
  }
  
  &--shadow-medium {
    box-shadow: var(--shadow-2);
  }
  
  &--clickable {
    cursor: pointer;
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-3);
    }
  }
}
</style>
```

### 3.2 业务组件

#### StoreCard 组件
```vue
<!-- components/business/StoreCard.vue -->
<template>
  <Card clickable @click="handleClick">
    <div class="store-card">
      <div class="store-header">
        <img :src="store.image" :alt="store.name" class="store-image">
        <div v-if="store.hasVideo" class="video-badge">
          <VideoIcon />
          <span>预览</span>
        </div>
      </div>
      
      <div class="store-content">
        <div class="store-info">
          <h3 class="store-name">{{ store.name }}</h3>
          <div v-if="store.isVip" class="vip-badge">
            <CrownIcon />
            <span>VIP专享</span>
          </div>
        </div>
        
        <div class="store-meta">
          <div class="rating">
            <StarIcon />
            <span>{{ store.rating }}</span>
          </div>
          <span class="distance">{{ formatDistance(store.distance) }}</span>
          <span class="price">¥{{ store.avgPrice }}/人</span>
        </div>
        
        <div class="store-tags">
          <span 
            v-for="tag in store.tags.slice(0, 3)" 
            :key="tag"
            class="tag"
          >
            {{ tag }}
          </span>
        </div>
      </div>
    </div>
  </Card>
</template>

<script setup lang="ts">
import { Card } from '@/components/base';
import type { Store } from '@/types';

interface Props {
  store: Store;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  click: [store: Store];
}>();

const handleClick = () => {
  emit('click', props.store);
};

const formatDistance = (meters: number): string => {
  if (meters < 1000) {
    return `${meters}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
};
</script>
```

#### OrderStatus 组件
```vue
<!-- components/business/OrderStatus.vue -->
<template>
  <div class="order-status">
    <div class="status-timeline">
      <div 
        v-for="(step, index) in steps" 
        :key="step.key"
        :class="getStepClass(index)"
      >
        <div class="step-icon">
          <component :is="step.icon" />
        </div>
        <div class="step-content">
          <p class="step-title">{{ step.title }}</p>
          <p class="step-time">{{ step.time }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { OrderStatus } from '@/types';

interface Props {
  status: OrderStatus;
  timeline: Array<{
    key: string;
    title: string;
    time: string;
    icon: Component;
  }>;
}

const props = defineProps<Props>();

const currentStepIndex = computed(() => {
  return props.timeline.findIndex(step => step.key === props.status);
});

const getStepClass = (index: number) => {
  return [
    'status-step',
    {
      'step--completed': index <= currentStepIndex.value,
      'step--current': index === currentStepIndex.value,
      'step--pending': index > currentStepIndex.value
    }
  ];
};
</script>
```

## 四、页面开发计划

### 4.1 用户端页面

#### 首页重构
- **文件路径**: `frontend/user-app/src/pages/home/index.vue`
- **关键功能**:
  - 位置服务集成
  - 搜索功能优化
  - 分类导航交互
  - 推荐算法展示
  - 懒加载优化

```vue
<!-- pages/home/index.vue -->
<template>
  <div class="home-page">
    <!-- 状态栏 -->
    <StatusBar />
    
    <!-- 顶部导航 -->
    <HomeHeader 
      :location="currentLocation"
      :vipInfo="userVipInfo"
      @search="handleSearch"
    />
    
    <!-- 搜索栏 -->
    <SearchBar 
      v-model="searchKeyword"
      :placeholder="searchPlaceholder"
      @focus="goToSearch"
    />
    
    <!-- 分类导航 -->
    <CategoryNav 
      :categories="categories"
      @select="handleCategorySelect"
    />
    
    <!-- 推荐店铺 -->
    <section class="recommended-section">
      <SectionHeader 
        title="为你推荐"
        :subtitle="`基于你的喜好`"
        actionText="查看全部"
        @action="goToStoreList"
      />
      
      <StoreList 
        :stores="recommendedStores"
        :loading="loading"
        @select="goToStoreDetail"
      />
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useLocationStore } from '@/stores/location';
import { useUserStore } from '@/stores/user';
import { getRecommendedStores } from '@/api/store';
import { 
  StatusBar,
  HomeHeader,
  SearchBar,
  CategoryNav,
  SectionHeader,
  StoreList 
} from '@/components';

const locationStore = useLocationStore();
const userStore = useUserStore();

const currentLocation = ref(locationStore.currentLocation);
const userVipInfo = ref(userStore.vipInfo);
const searchKeyword = ref('');
const searchPlaceholder = ref('搜索店铺、包间');
const categories = ref([]);
const recommendedStores = ref([]);
const loading = ref(false);

onMounted(async () => {
  await initializeHome();
});

const initializeHome = async () => {
  loading.value = true;
  try {
    // 获取位置
    await locationStore.getCurrentLocation();
    
    // 加载推荐数据
    const [storesRes, categoriesRes] = await Promise.all([
      getRecommendedStores({
        lat: currentLocation.value.latitude,
        lng: currentLocation.value.longitude,
        radius: 5
      }),
      getCategories()
    ]);
    
    recommendedStores.value = storesRes.data;
    categories.value = categoriesRes.data;
  } catch (error) {
    console.error('初始化失败:', error);
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  uni.navigateTo({
    url: '/pages/search/index'
  });
};

const handleCategorySelect = (category: Category) => {
  uni.navigateTo({
    url: `/pages/store/list?category=${category.id}`
  });
};

const goToStoreDetail = (store: Store) => {
  uni.navigateTo({
    url: `/pages/store/detail?id=${store.id}`
  });
};
</script>
```

#### 店铺详情页重构
- **文件路径**: `frontend/user-app/src/pages/store/detail.vue`
- **关键功能**:
  - 沉浸式图片/视频展示
  - Tab切换优化
  - 包间实时状态
  - 快速预订流程

### 4.2 商户端页面

#### 数据看板重构
- **文件路径**: `frontend/merchant-app/src/pages/dashboard/index.vue`
- **关键功能**:
  - 实时数据更新
  - 图表可视化
  - 数据筛选功能
  - 导出功能

#### 订单管理重构
- **文件路径**: `frontend/merchant-app/src/pages/order/index.vue`
- **关键功能**:
  - 实时订单推送
  - 批量操作
  - 订单状态流转
  - 快速处理功能

## 五、关键功能实现

### 5.1 实时通信
```typescript
// services/websocket.ts
import { io, Socket } from 'socket.io-client';
import { useOrderStore } from '@/stores/order';

export class WebSocketService {
  private socket: Socket | null = null;
  private orderStore = useOrderStore();
  
  connect(token: string) {
    this.socket = io(process.env.VITE_WS_URL, {
      auth: { token },
      transports: ['websocket']
    });
    
    this.socket.on('order:new', (order) => {
      this.orderStore.addNewOrder(order);
      this.showNotification('新订单', `您有新的订单 #${order.orderNo}`);
    });
    
    this.socket.on('order:update', (update) => {
      this.orderStore.updateOrder(update.orderId, update.data);
    });
  }
  
  private showNotification(title: string, body: string) {
    uni.showToast({
      title,
      icon: 'none',
      duration: 3000
    });
    
    // 播放提示音
    const audio = uni.createInnerAudioContext();
    audio.src = '/static/sounds/notification.mp3';
    audio.play();
  }
}
```

### 5.2 支付系统
```typescript
// services/payment.ts
export class PaymentService {
  async createPayment(orderInfo: OrderInfo) {
    // 创建支付订单
    const paymentOrder = await api.post('/payment/create', {
      orderId: orderInfo.id,
      amount: orderInfo.amount,
      paymentMethod: orderInfo.paymentMethod
    });
    
    // 调起支付
    if (paymentOrder.paymentMethod === 'wechat') {
      return this.wechatPay(paymentOrder);
    } else if (paymentOrder.paymentMethod === 'alipay') {
      return this.alipay(paymentOrder);
    }
  }
  
  private async wechatPay(paymentOrder: PaymentOrder) {
    return new Promise((resolve, reject) => {
      uni.requestPayment({
        provider: 'wxpay',
        timeStamp: paymentOrder.timeStamp,
        nonceStr: paymentOrder.nonceStr,
        package: paymentOrder.package,
        signType: paymentOrder.signType,
        paySign: paymentOrder.paySign,
        success: resolve,
        fail: reject
      });
    });
  }
}
```

### 5.3 性能优化

#### 图片懒加载
```vue
<!-- directives/lazyload.ts -->
export const lazyload = {
  mounted(el: HTMLImageElement, binding: DirectiveBinding) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            el.src = binding.value;
            el.classList.add('loaded');
            observer.unobserve(el);
          }
        });
      },
      {
        rootMargin: '50px'
      }
    );
    
    observer.observe(el);
  }
};
```

#### 虚拟列表
```vue
<!-- components/VirtualList.vue -->
<template>
  <div class="virtual-list" ref="container" @scroll="handleScroll">
    <div class="virtual-spacer" :style="{ height: totalHeight + 'px' }">
      <div 
        class="virtual-content"
        :style="{ transform: `translateY(${offset}px)` }"
      >
        <slot 
          v-for="item in visibleItems"
          :key="item.id"
          :item="item"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';

interface Props {
  items: Array<any>;
  itemHeight: number;
  buffer: number;
}

const props = withDefaults(defineProps<Props>(), {
  buffer: 5
});

const container = ref<HTMLElement>();
const scrollTop = ref(0);
const containerHeight = ref(0);

const totalHeight = computed(() => props.items.length * props.itemHeight);

const visibleRange = computed(() => {
  const start = Math.max(0, Math.floor(scrollTop.value / props.itemHeight) - props.buffer);
  const end = Math.min(
    props.items.length,
    Math.ceil((scrollTop.value + containerHeight.value) / props.itemHeight) + props.buffer
  );
  return { start, end };
});

const visibleItems = computed(() => {
  return props.items.slice(visibleRange.value.start, visibleRange.value.end);
});

const offset = computed(() => visibleRange.value.start * props.itemHeight);

const handleScroll = () => {
  scrollTop.value = container.value?.scrollTop || 0;
};

onMounted(() => {
  containerHeight.value = container.value?.clientHeight || 0;
});
</script>
```

## 六、测试策略

### 6.1 单元测试
```typescript
// tests/unit/components/Button.spec.ts
import { mount } from '@vue/test-utils';
import Button from '@/components/base/Button.vue';

describe('Button Component', () => {
  it('renders correctly', () => {
    const wrapper = mount(Button, {
      slots: {
        default: 'Click me'
      }
    });
    
    expect(wrapper.text()).toBe('Click me');
    expect(wrapper.classes()).toContain('button--primary');
  });
  
  it('emits click event when clicked', async () => {
    const wrapper = mount(Button);
    
    await wrapper.trigger('click');
    
    expect(wrapper.emitted('click')).toHaveLength(1);
  });
  
  it('does not emit when disabled', async () => {
    const wrapper = mount(Button, {
      props: {
        disabled: true
      }
    });
    
    await wrapper.trigger('click');
    
    expect(wrapper.emitted('click')).toBeUndefined();
  });
});
```

### 6.2 集成测试
```typescript
// tests/integration/order-flow.spec.ts
import { createTestApp } from '@/tests/helpers';
import { mockServer } from '@/tests/mocks';

describe('Order Flow', () => {
  beforeAll(() => mockServer.listen());
  afterAll(() => mockServer.close());
  
  it('completes order flow successfully', async () => {
    const app = await createTestApp();
    
    // 1. 选择店铺
    await app.navigateTo('/pages/store/list');
    await app.click('.store-card:first-child');
    
    // 2. 选择包间
    await app.waitFor('.room-card');
    await app.click('.room-card.available:first-child');
    
    // 3. 确认预订
    await app.click('.book-now-btn');
    await app.fill('.booking-form input[name="phone"]', '13800138000');
    await app.click('.confirm-booking-btn');
    
    // 4. 支付
    await app.waitFor('.payment-modal');
    await app.click('.payment-method-wechat');
    await app.click('.pay-now-btn');
    
    // 5. 验证订单创建成功
    await app.waitFor('.order-success');
    expect(await app.getText('.order-number')).toMatch(/^\d{12}$/);
  });
});
```

### 6.3 E2E测试
```typescript
// tests/e2e/user-journey.spec.ts
import { test, expect } from '@playwright/test';

test.describe('User Journey', () => {
  test('complete booking flow', async ({ page }) => {
    // 1. 访问首页
    await page.goto('/');
    
    // 2. 搜索店铺
    await page.fill('.search-input', 'KTV');
    await page.press('.search-input', 'Enter');
    
    // 3. 选择店铺
    await page.click('.store-card:has-text("星光KTV")');
    
    // 4. 查看包间
    await page.click('.tab:has-text("包间选择")');
    await expect(page.locator('.room-card')).toHaveCount(6);
    
    // 5. 预订包间
    await page.click('.room-card:has-text("豪华包间A") .book-btn');
    
    // 6. 填写信息
    await page.fill('input[name="phone"]', '13800138000');
    await page.selectOption('select[name="time"]', '20:00');
    
    // 7. 确认预订
    await page.click('.confirm-btn');
    await expect(page.locator('.success-message')).toBeVisible();
  });
});
```

## 七、部署计划

### 7.1 CI/CD配置
```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Run tests
        run: pnpm test
      
      - name: Build
        run: pnpm build
  
  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to server
        uses: appleboy/ssh-action@v0.1.5
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /app/local-life-service
            git pull
            pnpm install
            pnpm build
            pm2 restart all
```

### 7.2 Docker部署
```dockerfile
# Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install

COPY . .
RUN pnpm build

FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

## 八、时间规划

### 第一阶段：基础架构（1周）
- Day 1-2: 设计系统实现
- Day 3-4: 基础组件开发
- Day 5-7: 主题系统和响应式框架

### 第二阶段：核心页面（2周）
- Week 1: 用户端核心页面
  - 首页重构
  - 店铺列表/详情
  - 订单流程
- Week 2: 商户端核心页面
  - 数据看板
  - 订单管理
  - 包间管理

### 第三阶段：功能完善（1周）
- Day 1-2: 实时通信
- Day 3-4: 支付系统
- Day 5-7: 性能优化

### 第四阶段：测试部署（1周）
- Day 1-3: 测试用例编写
- Day 4-5: Bug修复
- Day 6-7: 部署上线

## 九、风险控制

### 9.1 技术风险
- **风险**: uni-app框架限制
- **措施**: 提前验证关键功能，准备降级方案

### 9.2 进度风险
- **风险**: 功能复杂度超预期
- **措施**: 采用敏捷开发，优先核心功能

### 9.3 质量风险
- **风险**: 重构引入新bug
- **措施**: 完善测试覆盖，灰度发布

## 十、验收标准

### 10.1 功能验收
- [ ] 所有原型功能100%实现
- [ ] 交互流程符合设计规范
- [ ] 支持暗黑模式切换
- [ ] 响应式适配完成

### 10.2 性能验收
- [ ] 首屏加载时间 < 2s
- [ ] 页面切换流畅无卡顿
- [ ] 列表滚动保持60fps
- [ ] 内存占用合理

### 10.3 质量验收
- [ ] 单元测试覆盖率 > 80%
- [ ] 无P0/P1级别bug
- [ ] 代码规范检查通过
- [ ] 文档完整准确