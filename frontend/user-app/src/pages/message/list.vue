<template>
  <view class="message-page">
    <!-- 顶部标签切换 -->
    <view class="tab-bar">
      <view
        v-for="(tab, index) in tabs"
        :key="index"
        class="tab-item"
        :class="{ active: activeTab === index }"
        @click="switchTab(index)"
      >
        <text class="tab-text">{{ tab.name }}</text>
        <view v-if="tab.count > 0" class="tab-badge">{{ tab.count }}</view>
      </view>
    </view>

    <!-- 消息列表 -->
    <scroll-view
      class="message-list"
      scroll-y
      refresher-enabled
      :refresher-triggered="isRefreshing"
      @refresherrefresh="onRefresh"
    >
      <!-- 系统消息 -->
      <view v-if="activeTab === 0">
        <view
          v-for="message in systemMessages"
          :key="message.id"
          class="message-item"
          @click="openMessage(message)"
        >
          <view class="message-icon system">📢</view>
          <view class="message-content">
            <view class="message-header">
              <text class="message-title">{{ message.title }}</text>
              <text class="message-time">{{ formatTime(message.createTime) }}</text>
            </view>
            <text class="message-summary">{{ message.content }}</text>
          </view>
          <view v-if="!message.isRead" class="unread-dot"></view>
        </view>
      </view>

      <!-- 订单消息 -->
      <view v-if="activeTab === 1">
        <view
          v-for="message in orderMessages"
          :key="message.id"
          class="message-item"
          @click="openMessage(message)"
        >
          <view class="message-icon order">📦</view>
          <view class="message-content">
            <view class="message-header">
              <text class="message-title">{{ message.title }}</text>
              <text class="message-time">{{ formatTime(message.createTime) }}</text>
            </view>
            <text class="message-summary">{{ message.content }}</text>
          </view>
          <view v-if="!message.isRead" class="unread-dot"></view>
        </view>
      </view>

      <!-- 活动消息 -->
      <view v-if="activeTab === 2">
        <view
          v-for="message in activityMessages"
          :key="message.id"
          class="message-item"
          @click="openMessage(message)"
        >
          <view class="message-icon activity">🎉</view>
          <view class="message-content">
            <view class="message-header">
              <text class="message-title">{{ message.title }}</text>
              <text class="message-time">{{ formatTime(message.createTime) }}</text>
            </view>
            <text class="message-summary">{{ message.content }}</text>
          </view>
          <view v-if="!message.isRead" class="unread-dot"></view>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-if="getCurrentMessages().length === 0" class="empty-state">
        <text class="empty-icon">💬</text>
        <text class="empty-text">暂无消息</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

// 数据
const activeTab = ref(0);
const isRefreshing = ref(false);

const tabs = ref([
  { name: '系统消息', count: 2 },
  { name: '订单消息', count: 1 },
  { name: '活动消息', count: 0 },
]);

const systemMessages = ref([
  {
    id: 1,
    title: '系统维护通知',
    content: '系统将于今晚23:00-02:00进行维护，期间部分功能可能无法使用，请您提前做好准备。',
    createTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
    isRead: false,
  },
  {
    id: 2,
    title: '实名认证提醒',
    content: '为了保障您的账户安全，请及时完成实名认证。',
    createTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
    isRead: true,
  },
]);

const orderMessages = ref([
  {
    id: 3,
    title: '订单状态更新',
    content: '您的订单已确认，商家正在准备中，预计30分钟内完成。',
    createTime: new Date(Date.now() - 30 * 60 * 1000),
    isRead: false,
  },
]);

const activityMessages = ref([
  {
    id: 4,
    title: '新用户专享优惠',
    content: '恭喜您获得新用户专享9折优惠券，有效期7天，快来使用吧！',
    createTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    isRead: true,
  },
]);

// 计算属性
const getCurrentMessages = () => {
  switch (activeTab.value) {
    case 0:
      return systemMessages.value;
    case 1:
      return orderMessages.value;
    case 2:
      return activityMessages.value;
    default:
      return [];
  }
};

// 方法
const switchTab = (index: number) => {
  activeTab.value = index;
};

const onRefresh = async () => {
  isRefreshing.value = true;

  try {
    // 模拟刷新
    await new Promise((resolve) => setTimeout(resolve, 1000));
    // 这里可以调用API刷新消息
  } finally {
    isRefreshing.value = false;
  }
};

const openMessage = (message: any) => {
  // 标记为已读
  message.isRead = true;

  // 更新未读计数
  updateUnreadCount();

  // 跳转到消息详情或相关页面
  if (message.type === 'order') {
    uni.navigateTo({
      url: `/pages/order/detail?id=${message.orderId}`,
    });
  } else {
    // 显示消息详情
    uni.showModal({
      title: message.title,
      content: message.content,
      showCancel: false,
    });
  }
};

const updateUnreadCount = () => {
  tabs.value[0].count = systemMessages.value.filter((m) => !m.isRead).length;
  tabs.value[1].count = orderMessages.value.filter((m) => !m.isRead).length;
  tabs.value[2].count = activityMessages.value.filter((m) => !m.isRead).length;
};

const formatTime = (time: Date) => {
  const now = new Date();
  const diff = now.getTime() - time.getTime();

  if (diff < 60 * 1000) {
    return '刚刚';
  } else if (diff < 60 * 60 * 1000) {
    return `${Math.floor(diff / (60 * 1000))}分钟前`;
  } else if (diff < 24 * 60 * 60 * 1000) {
    return `${Math.floor(diff / (60 * 60 * 1000))}小时前`;
  } else if (diff < 7 * 24 * 60 * 60 * 1000) {
    return `${Math.floor(diff / (24 * 60 * 60 * 1000))}天前`;
  } else {
    return time.toLocaleDateString();
  }
};

// 初始化未读计数
updateUnreadCount();
</script>

<style lang="scss" scoped>
.message-page {
  height: 100vh;
  background-color: #f8f9fa;
  display: flex;
  flex-direction: column;
}

.tab-bar {
  display: flex;
  background-color: white;
  border-bottom: 1px solid #e9ecef;
}

.tab-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  padding: 30rpx 20rpx;
  border-bottom: 4rpx solid transparent;

  &.active {
    border-bottom-color: #667eea;

    .tab-text {
      color: #667eea;
      font-weight: 600;
    }
  }
}

.tab-text {
  font-size: 32rpx;
  color: #333;
}

.tab-badge {
  position: absolute;
  top: 15rpx;
  right: 20rpx;
  background-color: #ff4757;
  color: white;
  font-size: 20rpx;
  padding: 4rpx 8rpx;
  border-radius: 10rpx;
  min-width: 32rpx;
  text-align: center;
}

.message-list {
  flex: 1;
  padding: 20rpx;
}

.message-item {
  display: flex;
  align-items: flex-start;
  background-color: white;
  border-radius: 20rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.1);
  position: relative;
}

.message-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40rpx;
  margin-right: 30rpx;

  &.system {
    background-color: #e3f2fd;
  }

  &.order {
    background-color: #f3e5f5;
  }

  &.activity {
    background-color: #fff3e0;
  }
}

.message-content {
  flex: 1;
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15rpx;
}

.message-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}

.message-time {
  font-size: 24rpx;
  color: #6c757d;
}

.message-summary {
  font-size: 28rpx;
  color: #6c757d;
  line-height: 1.4;
  display: block;
}

.unread-dot {
  width: 16rpx;
  height: 16rpx;
  background-color: #ff4757;
  border-radius: 8rpx;
  position: absolute;
  top: 30rpx;
  right: 30rpx;
}

.empty-state {
  text-align: center;
  padding: 100rpx 20rpx;
}

.empty-icon {
  font-size: 120rpx;
  display: block;
  margin-bottom: 30rpx;
}

.empty-text {
  font-size: 32rpx;
  color: #6c757d;
  display: block;
}
</style>
