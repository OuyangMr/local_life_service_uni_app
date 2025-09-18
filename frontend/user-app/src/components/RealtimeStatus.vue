<!--
  实时状态组件
  @description 实现WebSocket连接管理和状态显示，添加连接状态指示和自动重连
-->
<template>
  <view class="realtime-status">
    <!-- 连接状态指示器 -->
    <view
      v-if="showIndicator"
      class="connection-indicator"
      :class="{
        connected: connectionStatus === 'connected',
        connecting: connectionStatus === 'connecting',
        disconnected: connectionStatus === 'disconnected',
      }"
      @click="toggleDetails"
    >
      <view class="indicator-dot"></view>
      <text class="indicator-text">{{ connectionStatusText }}</text>
      <text v-if="lastUpdateTime" class="last-update">{{ formatTime(lastUpdateTime) }}</text>
    </view>

    <!-- 详细状态信息 -->
    <view v-if="showDetails" class="status-details">
      <view class="detail-header">
        <text class="detail-title">连接状态</text>
        <text class="detail-close" @click="hideDetails">✕</text>
      </view>

      <view class="detail-content">
        <!-- 连接信息 -->
        <view class="detail-section">
          <text class="section-title">连接信息</text>
          <view class="info-list">
            <view class="info-item">
              <text class="info-label">状态</text>
              <text class="info-value" :class="connectionStatus">{{ connectionStatusText }}</text>
            </view>
            <view class="info-item">
              <text class="info-label">服务器</text>
              <text class="info-value">{{ serverUrl }}</text>
            </view>
            <view class="info-item">
              <text class="info-label">重连次数</text>
              <text class="info-value">{{ reconnectCount }}</text>
            </view>
            <view v-if="lastUpdateTime" class="info-item">
              <text class="info-label">最后更新</text>
              <text class="info-value">{{ formatDateTime(lastUpdateTime) }}</text>
            </view>
          </view>
        </view>

        <!-- 实时数据 -->
        <view v-if="realtimeData.length > 0" class="detail-section">
          <text class="section-title">实时数据</text>
          <view class="data-list">
            <view v-for="(item, index) in realtimeData" :key="index" class="data-item">
              <view class="data-header">
                <text class="data-type">{{ item.type }}</text>
                <text class="data-time">{{ formatTime(item.timestamp) }}</text>
              </view>
              <text class="data-content">{{ item.content }}</text>
            </view>
          </view>
        </view>

        <!-- 错误信息 -->
        <view v-if="errorMessage" class="detail-section">
          <text class="section-title">错误信息</text>
          <text class="error-message">{{ errorMessage }}</text>
        </view>
      </view>

      <!-- 操作按钮 -->
      <view class="detail-actions">
        <button
          v-if="connectionStatus === 'disconnected'"
          class="btn-reconnect"
          @click="manualReconnect"
        >
          手动重连
        </button>
        <button v-if="connectionStatus === 'connected'" class="btn-disconnect" @click="disconnect">
          断开连接
        </button>
        <button class="btn-clear" @click="clearData">清空数据</button>
      </view>
    </view>

    <!-- 状态消息列表 -->
    <view v-if="showMessages && messages.length > 0" class="message-list">
      <view
        v-for="message in displayMessages"
        :key="message.id"
        class="status-message"
        :class="message.type"
      >
        <view class="message-content">
          <text class="message-text">{{ message.content }}</text>
          <text class="message-time">{{ formatTime(message.timestamp) }}</text>
        </view>
        <view class="message-actions">
          <text class="message-close" @click="removeMessage(message.id)">✕</text>
        </view>
      </view>
    </view>

    <!-- 浮动通知 -->
    <view
      v-if="floatingNotification"
      class="floating-notification"
      :class="floatingNotification.type"
    >
      <text class="notification-text">{{ floatingNotification.content }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';

// 连接状态类型
type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';

// 消息类型
interface StatusMessage {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  content: string;
  timestamp: string;
  persistent?: boolean;
}

// 实时数据类型
interface RealtimeDataItem {
  type: string;
  content: string;
  timestamp: string;
  data?: any;
}

// 浮动通知类型
interface FloatingNotification {
  type: 'success' | 'warning' | 'error';
  content: string;
}

// Props
interface Props {
  /** WebSocket服务器URL */
  wsUrl?: string;
  /** 是否显示连接指示器 */
  showIndicator?: boolean;
  /** 是否显示消息列表 */
  showMessages?: boolean;
  /** 最大消息数量 */
  maxMessages?: number;
  /** 自动重连间隔（毫秒） */
  reconnectInterval?: number;
  /** 最大重连次数 */
  maxReconnectAttempts?: number;
  /** 是否启用自动重连 */
  autoReconnect?: boolean;
  /** 心跳间隔（毫秒） */
  heartbeatInterval?: number;
}

const props = withDefaults(defineProps<Props>(), {
  wsUrl: '',
  showIndicator: true,
  showMessages: true,
  maxMessages: 50,
  reconnectInterval: 3000,
  maxReconnectAttempts: 5,
  autoReconnect: true,
  heartbeatInterval: 30000,
});

// Emits
interface Emits {
  /** 连接状态变化 */
  (e: 'status-change', status: ConnectionStatus): void;
  /** 接收到消息 */
  (e: 'message', data: any): void;
  /** 连接错误 */
  (e: 'error', error: string): void;
  /** 重连成功 */
  (e: 'reconnected'): void;
}

const emit = defineEmits<Emits>();

// 状态管理
const connectionStatus = ref<ConnectionStatus>('disconnected');
const showDetails = ref(false);
const messages = ref<StatusMessage[]>([]);
const realtimeData = ref<RealtimeDataItem[]>([]);
const errorMessage = ref('');
const lastUpdateTime = ref('');
const reconnectCount = ref(0);
const floatingNotification = ref<FloatingNotification | null>(null);

// WebSocket相关
let socket: any = null;
let reconnectTimer: number | null = null;
let heartbeatTimer: number | null = null;
let isManualDisconnect = false;

// 计算属性
const serverUrl = computed(() => {
  if (props.wsUrl) {
    return props.wsUrl;
  }

  // 根据环境和协议确定WebSocket URL
  // #ifdef H5
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = location.hostname;
  const port = ':3000'; // 开发环境默认端口
  return `${protocol}//${host}${port}`;
  // #endif

  // #ifndef H5
  return 'ws://localhost:3000';
  // #endif
});

const connectionStatusText = computed(() => {
  switch (connectionStatus.value) {
    case 'connected':
      return '已连接';
    case 'connecting':
      return '连接中';
    case 'disconnected':
      return '已断开';
    default:
      return '未知';
  }
});

const displayMessages = computed(() => {
  return messages.value.slice(-props.maxMessages);
});

// 方法
// 连接WebSocket
const connect = () => {
  if (socket && socket.readyState === WebSocket.OPEN) {
    return;
  }

  connectionStatus.value = 'connecting';
  emit('status-change', connectionStatus.value);

  try {
    socket = uni.connectSocket({
      url: serverUrl.value,
      success: () => {
        console.log('WebSocket connecting...');
      },
      fail: (error) => {
        console.error('WebSocket connection failed:', error);
        handleConnectionError('连接失败');
      },
    });

    // 连接打开
    socket.onOpen(() => {
      connectionStatus.value = 'connected';
      errorMessage.value = '';
      reconnectCount.value = 0;
      lastUpdateTime.value = new Date().toISOString();

      addMessage('success', '连接成功');
      showFloatingNotification('success', '实时连接已建立');
      startHeartbeat();

      emit('status-change', connectionStatus.value);
    });

    // 接收消息
    socket.onMessage((event: any) => {
      handleMessage(event.data);
    });

    // 连接关闭
    socket.onClose((event: any) => {
      connectionStatus.value = 'disconnected';
      stopHeartbeat();

      if (!isManualDisconnect) {
        addMessage('warning', '连接断开');
        if (props.autoReconnect && reconnectCount.value < props.maxReconnectAttempts) {
          scheduleReconnect();
        } else {
          addMessage('error', '连接已断开，请手动重连');
        }
      }

      emit('status-change', connectionStatus.value);
    });

    // 连接错误
    socket.onError((error: any) => {
      console.error('WebSocket error:', error);
      handleConnectionError('连接错误');
    });
  } catch (error: any) {
    console.error('WebSocket initialization error:', error);
    handleConnectionError('初始化失败');
  }
};

// 断开连接
const disconnect = () => {
  isManualDisconnect = true;
  clearReconnectTimer();
  stopHeartbeat();

  if (socket) {
    socket.close();
    socket = null;
  }

  connectionStatus.value = 'disconnected';
  addMessage('info', '手动断开连接');
  emit('status-change', connectionStatus.value);
};

// 处理连接错误
const handleConnectionError = (message: string) => {
  connectionStatus.value = 'disconnected';
  errorMessage.value = message;
  addMessage('error', message);
  showFloatingNotification('error', message);
  emit('error', message);

  if (props.autoReconnect && reconnectCount.value < props.maxReconnectAttempts) {
    scheduleReconnect();
  }
};

// 处理接收到的消息
const handleMessage = (data: string) => {
  try {
    const message = JSON.parse(data);
    lastUpdateTime.value = new Date().toISOString();

    // 添加到实时数据列表
    addRealtimeData(
      message.type || 'message',
      JSON.stringify(message),
      lastUpdateTime.value,
      message
    );

    // 根据消息类型处理
    if (message.type === 'ping') {
      // 心跳响应
      sendMessage({ type: 'pong' });
    } else if (message.type === 'notification') {
      // 通知消息
      addMessage('info', message.content);
      if (message.showFloating) {
        showFloatingNotification('success', message.content);
      }
    } else if (message.type === 'status_update') {
      // 状态更新
      addMessage('success', `状态更新: ${message.content}`);
    } else if (message.type === 'error') {
      // 错误消息
      addMessage('error', message.content);
      showFloatingNotification('error', message.content);
    }

    emit('message', message);
  } catch (error) {
    console.error('Failed to parse message:', error);
    addRealtimeData('raw', data, new Date().toISOString());
  }
};

// 发送消息
const sendMessage = (data: any) => {
  if (socket && connectionStatus.value === 'connected') {
    socket.send({
      data: JSON.stringify(data),
      success: () => {
        console.log('Message sent successfully');
      },
      fail: (error: any) => {
        console.error('Failed to send message:', error);
      },
    });
  }
};

// 安排重连
const scheduleReconnect = () => {
  if (reconnectTimer) return;

  reconnectCount.value++;
  addMessage('info', `正在重连... (${reconnectCount.value}/${props.maxReconnectAttempts})`);

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    isManualDisconnect = false;
    connect();
  }, props.reconnectInterval);
};

// 清除重连定时器
const clearReconnectTimer = () => {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
};

// 手动重连
const manualReconnect = () => {
  reconnectCount.value = 0;
  isManualDisconnect = false;
  connect();
};

// 启动心跳
const startHeartbeat = () => {
  if (heartbeatTimer) return;

  heartbeatTimer = setInterval(() => {
    if (connectionStatus.value === 'connected') {
      sendMessage({ type: 'ping', timestamp: new Date().toISOString() });
    }
  }, props.heartbeatInterval);
};

// 停止心跳
const stopHeartbeat = () => {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
};

// 添加消息
const addMessage = (type: StatusMessage['type'], content: string, persistent = false) => {
  const message: StatusMessage = {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    type,
    content,
    timestamp: new Date().toISOString(),
    persistent,
  };

  messages.value.push(message);

  // 移除过期的非持久化消息
  if (!persistent) {
    setTimeout(() => {
      removeMessage(message.id);
    }, 5000);
  }
};

// 移除消息
const removeMessage = (id: string) => {
  const index = messages.value.findIndex((msg) => msg.id === id);
  if (index > -1) {
    messages.value.splice(index, 1);
  }
};

// 添加实时数据
const addRealtimeData = (type: string, content: string, timestamp: string, data?: any) => {
  realtimeData.value.push({
    type,
    content,
    timestamp,
    data,
  });

  // 限制数据量
  if (realtimeData.value.length > 100) {
    realtimeData.value = realtimeData.value.slice(-50);
  }
};

// 显示浮动通知
const showFloatingNotification = (type: FloatingNotification['type'], content: string) => {
  floatingNotification.value = { type, content };

  setTimeout(() => {
    floatingNotification.value = null;
  }, 3000);
};

// 切换详情显示
const toggleDetails = () => {
  showDetails.value = !showDetails.value;
};

// 隐藏详情
const hideDetails = () => {
  showDetails.value = false;
};

// 清空数据
const clearData = () => {
  messages.value = [];
  realtimeData.value = [];
  errorMessage.value = '';
};

// 格式化时间
const formatTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('zh-CN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

// 格式化日期时间
const formatDateTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
};

// 生命周期
onMounted(() => {
  if (props.wsUrl) {
    // 暂时禁用WebSocket连接，避免重复错误
    // TODO: 实现Socket.IO客户端集成
    console.log('WebSocket功能暂时禁用，等待Socket.IO客户端集成');
    connectionStatus.value = 'disconnected';
    addMessage('info', 'WebSocket功能暂时不可用');
  }
});

onUnmounted(() => {
  clearReconnectTimer();
  stopHeartbeat();
  disconnect();
});

// 监听URL变化
watch(
  () => props.wsUrl,
  (newUrl) => {
    if (newUrl) {
      disconnect();
      setTimeout(() => {
        connect();
      }, 1000);
    }
  }
);

// 暴露方法
defineExpose({
  connect,
  disconnect,
  sendMessage,
  addMessage,
  clearData,
  getConnectionStatus: () => connectionStatus.value,
});
</script>

<style scoped lang="scss">
.realtime-status {
  position: relative;
}

.connection-indicator {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 24rpx;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 24rpx;
  cursor: pointer;
  transition: all 0.3s ease;

  &.connected {
    background: rgba(0, 170, 0, 0.1);
    border: 2rpx solid rgba(0, 170, 0, 0.2);
  }

  &.connecting {
    background: rgba(255, 165, 0, 0.1);
    border: 2rpx solid rgba(255, 165, 0, 0.2);
  }

  &.disconnected {
    background: rgba(255, 68, 68, 0.1);
    border: 2rpx solid rgba(255, 68, 68, 0.2);
  }
}

.indicator-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  flex-shrink: 0;

  .connected & {
    background: #00aa00;
    animation: pulse 2s infinite;
  }

  .connecting & {
    background: #ffa500;
    animation: blink 1s infinite;
  }

  .disconnected & {
    background: #ff4444;
  }
}

@keyframes pulse {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
  100% {
    opacity: 1;
  }
}

@keyframes blink {
  0%,
  50% {
    opacity: 1;
  }
  51%,
  100% {
    opacity: 0;
  }
}

.indicator-text {
  font-size: 24rpx;
  color: #666;

  .connected & {
    color: #00aa00;
  }

  .connecting & {
    color: #ffa500;
  }

  .disconnected & {
    color: #ff4444;
  }
}

.last-update {
  font-size: 20rpx;
  color: #999;
  margin-left: auto;
}

.status-details {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32rpx;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32rpx;
  border-bottom: 2rpx solid #f0f0f0;
}

.detail-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}

.detail-close {
  font-size: 32rpx;
  color: #999;
  padding: 8rpx;
}

.detail-content {
  max-height: 600rpx;
  overflow-y: auto;
  padding: 24rpx 32rpx;
}

.detail-section {
  margin-bottom: 32rpx;
}

.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 16rpx;
  display: block;
}

.info-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12rpx 0;
}

.info-label {
  font-size: 26rpx;
  color: #666;
}

.info-value {
  font-size: 26rpx;
  color: #333;

  &.connected {
    color: #00aa00;
  }

  &.connecting {
    color: #ffa500;
  }

  &.disconnected {
    color: #ff4444;
  }
}

.data-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.data-item {
  padding: 16rpx;
  background: #f5f5f5;
  border-radius: 12rpx;
}

.data-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8rpx;
}

.data-type {
  font-size: 24rpx;
  font-weight: 500;
  color: #667eea;
}

.data-time {
  font-size: 20rpx;
  color: #999;
}

.data-content {
  font-size: 24rpx;
  color: #666;
  word-break: break-all;
}

.error-message {
  font-size: 26rpx;
  color: #ff4444;
  background: rgba(255, 68, 68, 0.1);
  padding: 16rpx;
  border-radius: 12rpx;
}

.detail-actions {
  display: flex;
  gap: 16rpx;
  padding: 32rpx;
  border-top: 2rpx solid #f0f0f0;
}

.btn-reconnect,
.btn-disconnect,
.btn-clear {
  flex: 1;
  height: 64rpx;
  border-radius: 12rpx;
  font-size: 26rpx;
  border: none;
}

.btn-reconnect {
  background: #00aa00;
  color: white;
}

.btn-disconnect {
  background: #ff4444;
  color: white;
}

.btn-clear {
  background: #f5f5f5;
  color: #666;
}

.message-list {
  position: fixed;
  top: 200rpx;
  right: 32rpx;
  width: 600rpx;
  max-height: 800rpx;
  overflow-y: auto;
  z-index: 999;
}

.status-message {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  border-radius: 16rpx;
  background: white;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.1);
  animation: slideIn 0.3s ease;

  &.info {
    border-left: 8rpx solid #667eea;
  }

  &.success {
    border-left: 8rpx solid #00aa00;
  }

  &.warning {
    border-left: 8rpx solid #ffa500;
  }

  &.error {
    border-left: 8rpx solid #ff4444;
  }
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.message-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.message-text {
  font-size: 26rpx;
  color: #333;
  line-height: 1.4;
}

.message-time {
  font-size: 20rpx;
  color: #999;
}

.message-actions {
  flex-shrink: 0;
}

.message-close {
  font-size: 24rpx;
  color: #ccc;
  padding: 8rpx;
}

.floating-notification {
  position: fixed;
  top: 100rpx;
  left: 50%;
  transform: translateX(-50%);
  padding: 24rpx 32rpx;
  border-radius: 24rpx;
  color: white;
  font-size: 28rpx;
  z-index: 1001;
  animation: fadeInOut 3s ease;

  &.success {
    background: #00aa00;
  }

  &.warning {
    background: #ffa500;
  }

  &.error {
    background: #ff4444;
  }
}

@keyframes fadeInOut {
  0% {
    opacity: 0;
    transform: translateX(-50%) translateY(-20rpx);
  }
  10%,
  90% {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
  100% {
    opacity: 0;
    transform: translateX(-50%) translateY(-20rpx);
  }
}

.notification-text {
  color: white;
}
</style>
