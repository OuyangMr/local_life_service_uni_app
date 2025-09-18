<!--
  二维码扫描组件
  @description 封装扫码功能，支持权限处理和错误提示，添加手动输入备选方案
-->
<template>
  <view class="qr-scanner">
    <!-- 扫码按钮 -->
    <view 
      v-if="!isScanning"
      class="scan-button"
      :class="{ disabled: props.disabled }"
      @click="startScan"
    >
      <view class="scan-icon">
        <text class="icon">📷</text>
      </view>
      <text class="scan-text">{{ scanText }}</text>
    </view>

    <!-- 扫码中状态 -->
    <view 
      v-if="isScanning"
      class="scanning-state"
    >
      <view class="scanning-animation">
        <view class="scanning-line"></view>
      </view>
      <text class="scanning-text">请将二维码置于取景框内</text>
      <view class="scanning-actions">
        <button class="btn-cancel" @click="cancelScan">取消</button>
        <button class="btn-manual" @click="showManualInput">手动输入</button>
      </view>
    </view>

    <!-- 手动输入弹窗 -->
    <uni-popup 
      ref="manualInputPopup" 
      type="center"
      :mask-click="false"
    >
      <view class="manual-input-modal">
        <view class="modal-header">
          <text class="modal-title">手动输入</text>
          <text class="modal-close" @click="closeManualInput">✕</text>
        </view>
        <view class="modal-body">
          <view class="input-group">
            <text class="input-label">请输入二维码内容或编号：</text>
            <input
              v-model="manualCode"
              class="input-field"
              placeholder="请输入编号"
              :focus="manualInputFocus"
            />
          </view>
        </view>
        <view class="modal-footer">
          <button class="btn-secondary" @click="closeManualInput">取消</button>
          <button 
            class="btn-primary" 
            :disabled="!manualCode.trim()"
            @click="confirmManualInput"
          >
            确认
          </button>
        </view>
      </view>
    </uni-popup>

    <!-- 结果提示 -->
    <uni-popup 
      ref="resultPopup" 
      type="center"
    >
      <view class="result-modal">
        <view class="result-icon">
          <text v-if="scanResult.success">✅</text>
          <text v-else>❌</text>
        </view>
        <text class="result-message">{{ scanResult.message }}</text>
        <button class="btn-ok" @click="closeResult">确定</button>
      </view>
    </uni-popup>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

// Props
interface Props {
  /** 扫码按钮文本 */
  scanText?: string
  /** 是否自动开始扫码 */
  autoStart?: boolean
  /** 扫码类型 */
  scanType?: 'barCode' | 'qrCode' | 'datamatrix' | 'pdf417'
  /** 是否只识别相册中的码 */
  onlyFromCamera?: boolean
  /** 是否禁用扫码 */
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  scanText: '扫一扫',
  autoStart: false,
  scanType: 'qrCode',
  onlyFromCamera: true,
  disabled: false
})

// Emits
interface Emits {
  /** 扫码成功 */
  (e: 'success', result: string): void
  /** 扫码失败 */
  (e: 'fail', error: string): void
  /** 扫码取消 */
  (e: 'cancel'): void
}

const emit = defineEmits<Emits>()

// 状态管理
const isScanning = ref(false)
const manualCode = ref('')
const manualInputFocus = ref(false)
const scanResult = ref({
  success: false,
  message: ''
})

// Refs
const manualInputPopup = ref()
const resultPopup = ref()

// 检查扫码权限
const checkScanPermission = async (): Promise<boolean> => {
  return new Promise((resolve) => {
    uni.getSetting({
      success: (res) => {
        if (res.authSetting['scope.camera'] === false) {
          // 用户拒绝了相机权限，引导用户去设置
          uni.showModal({
            title: '相机权限',
            content: '需要相机权限来扫描二维码，请前往设置开启',
            confirmText: '去设置',
            success: (modalRes) => {
              if (modalRes.confirm) {
                uni.openSetting({
                  success: (settingRes) => {
                    resolve(settingRes.authSetting['scope.camera'] === true)
                  },
                  fail: () => resolve(false)
                })
              } else {
                resolve(false)
              }
            }
          })
        } else {
          resolve(true)
        }
      },
      fail: () => resolve(false)
    })
  })
}

// 开始扫码
const startScan = async () => {
  // 检查是否禁用
  if (props.disabled) {
    return
  }
  
  // 检查权限
  const hasPermission = await checkScanPermission()
  if (!hasPermission) {
    emit('fail', '相机权限不足')
    return
  }

  isScanning.value = true

  uni.scanCode({
    scanType: [props.scanType],
    onlyFromCamera: props.onlyFromCamera,
    success: (res) => {
      isScanning.value = false
      
      if (res.result && res.result.trim()) {
        showResult(true, '扫码成功')
        emit('success', res.result)
      } else {
        showResult(false, '未识别到有效内容')
        emit('fail', '扫码结果为空')
      }
    },
    fail: (error) => {
      isScanning.value = false
      
      if (error.errMsg && error.errMsg.includes('cancel')) {
        emit('cancel')
      } else {
        const errorMsg = getErrorMessage(error.errMsg || '扫码失败')
        showResult(false, errorMsg)
        emit('fail', errorMsg)
      }
    }
  })
}

// 取消扫码
const cancelScan = () => {
  isScanning.value = false
  emit('cancel')
}

// 显示手动输入
const showManualInput = () => {
  isScanning.value = false
  manualCode.value = ''
  manualInputFocus.value = true
  manualInputPopup.value?.open()
}

// 关闭手动输入
const closeManualInput = () => {
  manualInputPopup.value?.close()
  manualInputFocus.value = false
}

// 确认手动输入
const confirmManualInput = () => {
  const code = manualCode.value.trim()
  if (!code) {
    uni.showToast({
      title: '请输入有效内容',
      icon: 'none'
    })
    return
  }

  closeManualInput()
  showResult(true, '输入成功')
  emit('success', code)
}

// 显示结果
const showResult = (success: boolean, message: string) => {
  scanResult.value = { success, message }
  resultPopup.value?.open()
}

// 关闭结果
const closeResult = () => {
  resultPopup.value?.close()
}

// 获取错误消息
const getErrorMessage = (errorMsg: string): string => {
  if (errorMsg.includes('camera')) {
    return '相机启动失败'
  } else if (errorMsg.includes('permission')) {
    return '缺少相机权限'
  } else if (errorMsg.includes('system')) {
    return '系统错误，请重试'
  } else {
    return '扫码失败，请重试'
  }
}

// 自动开始扫码
if (props.autoStart) {
  startScan()
}

// 暴露方法
defineExpose({
  startScan,
  cancelScan
})
</script>

<style scoped lang="scss">
.qr-scanner {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.scan-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32rpx;
  border-radius: 16rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  transition: all 0.3s ease;
  
  &:active {
    transform: scale(0.96);
    opacity: 0.8;
  }
  
  &.disabled {
    opacity: 0.5;
    background: #ccc;
    pointer-events: none;
  }
}

.scan-icon {
  margin-bottom: 16rpx;
  
  .icon {
    font-size: 48rpx;
  }
}

.scan-text {
  font-size: 28rpx;
  font-weight: 500;
}

.scanning-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32rpx;
}

.scanning-animation {
  width: 200rpx;
  height: 200rpx;
  border: 4rpx solid #e0e0e0;
  border-radius: 16rpx;
  position: relative;
  overflow: hidden;
  margin-bottom: 24rpx;
}

.scanning-line {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4rpx;
  background: linear-gradient(90deg, transparent, #667eea, transparent);
  animation: scanning 2s linear infinite;
}

@keyframes scanning {
  0% {
    transform: translateY(0);
  }
  100% {
    transform: translateY(196rpx);
  }
}

.scanning-text {
  font-size: 28rpx;
  color: #666;
  margin-bottom: 32rpx;
}

.scanning-actions {
  display: flex;
  gap: 24rpx;
}

.btn-cancel,
.btn-manual {
  padding: 16rpx 32rpx;
  border-radius: 24rpx;
  font-size: 28rpx;
  border: none;
  
  &.btn-cancel {
    background: #f5f5f5;
    color: #666;
  }
  
  &.btn-manual {
    background: #667eea;
    color: white;
  }
}

.manual-input-modal {
  width: 600rpx;
  background: white;
  border-radius: 24rpx;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32rpx;
  border-bottom: 2rpx solid #f0f0f0;
}

.modal-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}

.modal-close {
  font-size: 32rpx;
  color: #999;
  padding: 8rpx;
}

.modal-body {
  padding: 32rpx;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.input-label {
  font-size: 28rpx;
  color: #666;
}

.input-field {
  padding: 24rpx;
  border: 2rpx solid #e0e0e0;
  border-radius: 12rpx;
  font-size: 28rpx;
  background: #fafafa;
  
  &:focus {
    border-color: #667eea;
    background: white;
  }
}

.modal-footer {
  display: flex;
  gap: 16rpx;
  padding: 32rpx;
  border-top: 2rpx solid #f0f0f0;
}

.btn-secondary,
.btn-primary {
  flex: 1;
  padding: 24rpx;
  border-radius: 12rpx;
  font-size: 28rpx;
  border: none;
  
  &.btn-secondary {
    background: #f5f5f5;
    color: #666;
  }
  
  &.btn-primary {
    background: #667eea;
    color: white;
    
    &:disabled {
      opacity: 0.5;
    }
  }
}

.result-modal {
  width: 500rpx;
  background: white;
  border-radius: 24rpx;
  padding: 48rpx 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24rpx;
}

.result-icon {
  font-size: 64rpx;
}

.result-message {
  font-size: 28rpx;
  color: #333;
  text-align: center;
}

.btn-ok {
  width: 200rpx;
  padding: 20rpx;
  border-radius: 24rpx;
  background: #667eea;
  color: white;
  font-size: 28rpx;
  border: none;
}
</style>
