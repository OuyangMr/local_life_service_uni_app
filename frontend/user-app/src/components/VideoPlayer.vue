<!--
  视频播放组件
  @description 实现视频播放、控制、自动播放等功能，用于空间视频预览
-->
<template>
  <view class="video-player" :class="{ 'fullscreen': isFullscreen }">
    <!-- 视频容器 -->
    <view 
      class="video-container"
      @click="togglePlay"
    >
      <!-- 主视频播放器 -->
      <video
        :id="videoId"
        :src="currentSrc"
        :poster="poster"
        :autoplay="autoplay"
        :loop="loop"
        :muted="muted"
        :controls="showControls"
        :show-fullscreen-btn="showFullscreenBtn"
        :show-play-btn="showPlayBtn"
        :show-center-play-btn="showCenterPlayBtn"
        :enable-play-gesture="enablePlayGesture"
        :object-fit="objectFit"
        class="video-element"
        @play="onPlay"
        @pause="onPause"
        @ended="onEnded"
        @error="onError"
        @waiting="onWaiting"
        @canplay="onCanplay"
        @timeupdate="onTimeupdate"
        @fullscreenchange="onFullscreenChange"
      />

      <!-- 加载状态 -->
      <view v-if="isLoading" class="loading-overlay">
        <view class="loading-spinner">
          <view class="spinner"></view>
        </view>
        <text class="loading-text">{{ loadingText }}</text>
      </view>

      <!-- 错误状态 -->
      <view v-if="hasError" class="error-overlay">
        <view class="error-icon">⚠️</view>
        <text class="error-message">{{ errorMessage }}</text>
        <button class="retry-btn" @click="retryLoad">重试</button>
      </view>

      <!-- 播放控制遮罩 -->
      <view 
        v-if="!showControls && !isLoading && !hasError"
        class="control-overlay"
        :class="{ 'visible': showOverlay }"
        @click.stop="toggleControlsVisibility"
      >
        <!-- 播放/暂停按钮 -->
        <view class="play-control" @click.stop="togglePlay">
          <text v-if="isPlaying" class="control-icon">⏸️</text>
          <text v-else class="control-icon">▶️</text>
        </view>

        <!-- 底部控制栏 */
        <view class="bottom-controls">
          <!-- 进度条 */
          <view class="progress-container">
            <view class="progress-bar">
              <view 
                class="progress-current" 
                :style="{ width: progressPercentage + '%' }"
              ></view>
            </view>
            <view class="time-display">
              <text class="current-time">{{ formatTime(currentTime) }}</text>
              <text class="separator">/</text>
              <text class="total-time">{{ formatTime(duration) }}</text>
            </view>
          </view>

          <!-- 右侧控制按钮 -->
          <view class="right-controls">
            <view class="volume-control" @click.stop="toggleMute">
              <text v-if="isMuted" class="control-icon">🔇</text>
              <text v-else class="control-icon">🔊</text>
            </view>
            <view 
              v-if="showFullscreenBtn" 
              class="fullscreen-control" 
              @click.stop="toggleFullscreen"
            >
              <text class="control-icon">{{ isFullscreen ? '⛶' : '⛷' }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 播放状态指示 -->
      <view v-if="showPlayIndicator" class="play-indicator">
        <text class="indicator-icon">{{ isPlaying ? '⏸️' : '▶️' }}</text>
      </view>
    </view>

    <!-- 多源视频选择 -->
    <view v-if="sources.length > 1" class="quality-selector">
      <text class="quality-label">画质：</text>
      <view class="quality-options">
        <view
          v-for="(source, index) in sources"
          :key="index"
          class="quality-option"
          :class="{ 'active': currentSourceIndex === index }"
          @click="switchSource(index)"
        >
          <text class="quality-text">{{ source.quality || `源${index + 1}` }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

// 视频源接口
interface VideoSource {
  url: string
  quality?: string
  type?: string
}

// Props
interface Props {
  /** 视频源，支持字符串或数组 */
  src: string | VideoSource[]
  /** 封面图 */
  poster?: string
  /** 是否自动播放 */
  autoplay?: boolean
  /** 是否循环播放 */
  loop?: boolean
  /** 是否静音 */
  muted?: boolean
  /** 是否显示默认控制栏 */
  showControls?: boolean
  /** 是否显示全屏按钮 */
  showFullscreenBtn?: boolean
  /** 是否显示播放按钮 */
  showPlayBtn?: boolean
  /** 是否显示中心播放按钮 */
  showCenterPlayBtn?: boolean
  /** 是否启用播放手势 */
  enablePlayGesture?: boolean
  /** 视频适应模式 */
  objectFit?: 'contain' | 'fill' | 'cover'
  /** 自定义视频ID */
  customId?: string
}

const props = withDefaults(defineProps<Props>(), {
  autoplay: false,
  loop: false,
  muted: false,
  showControls: false,
  showFullscreenBtn: true,
  showPlayBtn: true,
  showCenterPlayBtn: true,
  enablePlayGesture: true,
  objectFit: 'contain'
})

// Emits
interface Emits {
  /** 播放开始 */
  (e: 'play'): void
  /** 播放暂停 */
  (e: 'pause'): void
  /** 播放结束 */
  (e: 'ended'): void
  /** 播放错误 */
  (e: 'error', error: string): void
  /** 时间更新 */
  (e: 'timeupdate', time: number): void
  /** 全屏状态变化 */
  (e: 'fullscreenchange', fullscreen: boolean): void
}

const emit = defineEmits<Emits>()

// 状态管理
const videoId = ref(props.customId || `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)
const isLoading = ref(false)
const hasError = ref(false)
const errorMessage = ref('')
const loadingText = ref('视频加载中...')
const isPlaying = ref(false)
const isFullscreen = ref(false)
const isMuted = ref(props.muted)
const currentTime = ref(0)
const duration = ref(0)
const showOverlay = ref(false)
const showPlayIndicator = ref(false)
const currentSourceIndex = ref(0)

// 计算属性
const sources = computed(() => {
  if (typeof props.src === 'string') {
    return [{ url: props.src }]
  }
  return props.src || []
})

const currentSrc = computed(() => {
  return sources.value[currentSourceIndex.value]?.url || ''
})

const progressPercentage = computed(() => {
  if (duration.value === 0) return 0
  return (currentTime.value / duration.value) * 100
})

// 定时器
let overlayTimer: number | null = null
let indicatorTimer: number | null = null

// 视频上下文
let videoContext: any = null

// 初始化视频上下文
const initVideoContext = () => {
  if (!videoContext) {
    videoContext = uni.createVideoContext(videoId.value)
  }
}

// 播放/暂停切换
const togglePlay = () => {
  initVideoContext()
  
  if (isPlaying.value) {
    videoContext.pause()
  } else {
    videoContext.play()
  }
  
  showPlayIndicator.value = true
  clearIndicatorTimer()
  indicatorTimer = setTimeout(() => {
    showPlayIndicator.value = false
  }, 1000)
}

// 控制栏显示切换
const toggleControlsVisibility = () => {
  showOverlay.value = !showOverlay.value
  
  if (showOverlay.value) {
    clearOverlayTimer()
    overlayTimer = setTimeout(() => {
      showOverlay.value = false
    }, 3000)
  }
}

// 静音切换
const toggleMute = () => {
  isMuted.value = !isMuted.value
  // uni-app的video组件没有直接的静音控制，需要通过其他方式实现
}

// 全屏切换
const toggleFullscreen = () => {
  initVideoContext()
  
  if (isFullscreen.value) {
    videoContext.exitFullScreen()
  } else {
    videoContext.requestFullScreen()
  }
}

// 切换视频源
const switchSource = (index: number) => {
  if (index === currentSourceIndex.value || index >= sources.value.length) {
    return
  }
  
  const wasPlaying = isPlaying.value
  const saveTime = currentTime.value
  
  currentSourceIndex.value = index
  
  // 重新加载视频
  setTimeout(() => {
    if (wasPlaying) {
      initVideoContext()
      videoContext.seek(saveTime)
      videoContext.play()
    }
  }, 100)
}

// 重试加载
const retryLoad = () => {
  hasError.value = false
  isLoading.value = true
  
  // 触发重新加载
  const currentIndex = currentSourceIndex.value
  if (currentIndex < sources.value.length - 1) {
    switchSource(currentIndex + 1)
  } else {
    switchSource(0)
  }
}

// 时间格式化
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// 清除定时器
const clearOverlayTimer = () => {
  if (overlayTimer) {
    clearTimeout(overlayTimer)
    overlayTimer = null
  }
}

const clearIndicatorTimer = () => {
  if (indicatorTimer) {
    clearTimeout(indicatorTimer)
    indicatorTimer = null
  }
}

// 事件处理
const onPlay = () => {
  isPlaying.value = true
  isLoading.value = false
  hasError.value = false
  emit('play')
}

const onPause = () => {
  isPlaying.value = false
  emit('pause')
}

const onEnded = () => {
  isPlaying.value = false
  emit('ended')
}

const onError = (error: any) => {
  console.error('Video error:', error)
  isLoading.value = false
  hasError.value = true
  errorMessage.value = '视频加载失败'
  emit('error', errorMessage.value)
}

const onWaiting = () => {
  isLoading.value = true
  loadingText.value = '缓冲中...'
}

const onCanplay = () => {
  isLoading.value = false
  hasError.value = false
}

const onTimeupdate = (event: any) => {
  if (event.detail) {
    currentTime.value = event.detail.currentTime || 0
    duration.value = event.detail.duration || 0
    emit('timeupdate', currentTime.value)
  }
}

const onFullscreenChange = (event: any) => {
  if (event.detail) {
    isFullscreen.value = event.detail.fullScreen
    emit('fullscreenchange', isFullscreen.value)
  }
}

// 组件生命周期
onMounted(() => {
  if (props.autoplay) {
    isLoading.value = true
  }
})

onUnmounted(() => {
  clearOverlayTimer()
  clearIndicatorTimer()
})

// 监听源变化
watch(() => props.src, () => {
  currentSourceIndex.value = 0
  hasError.value = false
}, { deep: true })

// 暴露方法
defineExpose({
  play: () => {
    initVideoContext()
    videoContext.play()
  },
  pause: () => {
    initVideoContext()
    videoContext.pause()
  },
  seek: (time: number) => {
    initVideoContext()
    videoContext.seek(time)
  },
  stop: () => {
    initVideoContext()
    videoContext.stop()
  },
  toggleFullscreen,
  switchSource
})
</script>

<style scoped lang="scss">
.video-player {
  position: relative;
  width: 100%;
  border-radius: 12rpx;
  overflow: hidden;
  background: #000;
  
  &.fullscreen {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 9999;
    border-radius: 0;
  }
}

.video-container {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 400rpx;
}

.video-element {
  width: 100%;
  height: 100%;
  background: #000;
}

.loading-overlay,
.error-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  z-index: 10;
}

.loading-spinner {
  margin-bottom: 24rpx;
}

.spinner {
  width: 60rpx;
  height: 60rpx;
  border: 6rpx solid rgba(255, 255, 255, 0.3);
  border-top: 6rpx solid #fff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-text {
  color: white;
  font-size: 28rpx;
}

.error-icon {
  font-size: 72rpx;
  margin-bottom: 16rpx;
}

.error-message {
  color: white;
  font-size: 28rpx;
  margin-bottom: 32rpx;
  text-align: center;
}

.retry-btn {
  padding: 16rpx 32rpx;
  background: #667eea;
  color: white;
  border-radius: 24rpx;
  border: none;
  font-size: 28rpx;
}

.control-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 0.3) 0%,
    transparent 30%,
    transparent 70%,
    rgba(0, 0, 0, 0.5) 100%
  );
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: 5;
  
  &.visible {
    opacity: 1;
  }
}

.play-control {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 24rpx;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.6);
}

.control-icon {
  font-size: 48rpx;
  color: white;
}

.bottom-controls {
  display: flex;
  align-items: center;
  padding: 24rpx;
  gap: 24rpx;
}

.progress-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.progress-bar {
  height: 6rpx;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 3rpx;
  overflow: hidden;
}

.progress-current {
  height: 100%;
  background: #667eea;
  transition: width 0.1s ease;
}

.time-display {
  display: flex;
  align-items: center;
  gap: 8rpx;
  font-size: 24rpx;
  color: white;
}

.right-controls {
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.volume-control,
.fullscreen-control {
  padding: 12rpx;
  border-radius: 6rpx;
  
  .control-icon {
    font-size: 32rpx;
  }
}

.play-indicator {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 24rpx;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.8);
  z-index: 15;
  animation: fadeInOut 1s ease;
}

@keyframes fadeInOut {
  0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
  50% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  100% { opacity: 0; transform: translate(-50%, -50%) scale(1.2); }
}

.indicator-icon {
  font-size: 48rpx;
  color: white;
}

.quality-selector {
  display: flex;
  align-items: center;
  padding: 16rpx 24rpx;
  background: rgba(0, 0, 0, 0.05);
  border-top: 2rpx solid #f0f0f0;
}

.quality-label {
  font-size: 28rpx;
  color: #666;
  margin-right: 16rpx;
}

.quality-options {
  display: flex;
  gap: 16rpx;
}

.quality-option {
  padding: 8rpx 16rpx;
  border-radius: 16rpx;
  background: #f5f5f5;
  border: 2rpx solid transparent;
  
  &.active {
    background: #667eea;
    color: white;
  }
}

.quality-text {
  font-size: 24rpx;
}
</style>
