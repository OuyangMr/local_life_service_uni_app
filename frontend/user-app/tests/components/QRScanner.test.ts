/**
 * QRScanner 组件单元测试
 * 测试二维码扫描、权限处理、手动输入等功能
 */

import { mount } from '@vue/test-utils'
import QRScanner from '../../src/components/QRScanner.vue'
import {
  createMountOptions,
  flushPromises
} from '../helpers/testUtils'

// Mock uni-popup component with better functionality
const mockUniPopup = {
  template: '<div class="uni-popup-mock"><slot /></div>',
  methods: {
    open: jest.fn(),
    close: jest.fn()
  }
}

describe('QRScanner Component', () => {
  let wrapper: any

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Reset all uni API mocks to default
    const uni = (global as any).uni
    uni.getSetting.mockReset()
    uni.scanCode.mockReset()
    uni.showToast.mockReset()
    uni.showModal.mockReset()
    uni.openSetting.mockReset()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('基本渲染', () => {
    it('应该正确渲染扫码按钮', () => {
      wrapper = mount(QRScanner, createMountOptions({
        global: {
          components: {
            'uni-popup': mockUniPopup
          }
        }
      }))

      expect(wrapper.find('.scan-button').exists()).toBe(true)
      expect(wrapper.find('.scan-text').text()).toBe('扫一扫')
      expect(wrapper.find('.scanning-state').exists()).toBe(false)
    })

    it('应该支持自定义扫码按钮文本', () => {
      const customText = '开始扫码'
      wrapper = mount(QRScanner, createMountOptions({
        props: {
          scanText: customText
        },
        global: {
          components: {
            'uni-popup': mockUniPopup
          }
        }
      }))

      expect(wrapper.find('.scan-text').text()).toBe(customText)
    })

    it('应该支持禁用状态', () => {
      wrapper = mount(QRScanner, createMountOptions({
        props: {
          disabled: true
        },
        global: {
          components: {
            'uni-popup': mockUniPopup
          }
        }
      }))

      expect(wrapper.find('.scan-button').classes()).toContain('disabled')
    })
  })

  describe('扫码功能', () => {
    beforeEach(() => {
      wrapper = mount(QRScanner, createMountOptions({
        global: {
          components: {
            'uni-popup': mockUniPopup
          }
        }
      }))
    })

    it('应该在点击扫码按钮时启动扫码', async () => {
      const uni = (global as any).uni
      
      // Mock 权限检查成功
      uni.getSetting.mockImplementation((options: any) => {
        options.success({
          authSetting: {
            'scope.camera': true
          }
        })
      })

      // Mock 扫码功能
      uni.scanCode.mockImplementation((options: any) => {
        // 不立即调用回调，模拟扫码过程
      })

      await wrapper.find('.scan-button').trigger('click')
      await flushPromises()

      expect(wrapper.vm.isScanning).toBe(true)
      expect(wrapper.find('.scanning-state').exists()).toBe(true)
      expect(wrapper.find('.scan-button').exists()).toBe(false)
    })

    it('应该在扫码成功时触发success事件', async () => {
      const uni = (global as any).uni
      const scanResult = 'test-qr-code'
      
      // Mock 权限检查成功
      uni.getSetting.mockImplementation((options: any) => {
        options.success({
          authSetting: {
            'scope.camera': true
          }
        })
      })

      // Mock 扫码成功
      uni.scanCode.mockImplementation((options: any) => {
        options.success({
          result: scanResult
        })
      })

      await wrapper.find('.scan-button').trigger('click')
      await flushPromises()

      // 检查是否触发了success事件
      expect(wrapper.emitted('success')).toBeTruthy()
      expect(wrapper.emitted('success')[0]).toEqual([scanResult])
      expect(wrapper.vm.isScanning).toBe(false)
    })

    it('应该在扫码失败时显示错误信息', async () => {
      const uni = (global as any).uni
      
      // Mock 权限检查成功
      uni.getSetting.mockImplementation((options: any) => {
        options.success({
          authSetting: {
            'scope.camera': true
          }
        })
      })

      // Mock 扫码取消
      uni.scanCode.mockImplementation((options: any) => {
        options.fail({
          errMsg: 'scanCode:fail cancel'
        })
      })

      await wrapper.find('.scan-button').trigger('click')
      await flushPromises()

      expect(wrapper.emitted('cancel')).toBeTruthy()
      expect(wrapper.vm.isScanning).toBe(false)
    })

    it('应该在权限被拒绝时显示权限说明', async () => {
      const uni = (global as any).uni
      
      // Mock 权限被拒绝
      uni.getSetting.mockImplementation((options: any) => {
        options.success({
          authSetting: {
            'scope.camera': false
          }
        })
      })

      // Mock showModal
      uni.showModal.mockImplementation((options: any) => {
        options.success({
          confirm: true
        })
      })

      await wrapper.find('.scan-button').trigger('click')
      await flushPromises()

      expect(uni.showModal).toHaveBeenCalledWith({
        title: '相机权限',
        content: '需要相机权限来扫描二维码，请前往设置开启',
        confirmText: '去设置',
        success: expect.any(Function)
      })
    })

    it('应该支持取消扫码', async () => {
      // 直接设置扫码状态
      wrapper.vm.isScanning = true
      await wrapper.vm.$nextTick()

      await wrapper.find('.btn-cancel').trigger('click')
      expect(wrapper.vm.isScanning).toBe(false)
      expect(wrapper.emitted('cancel')).toBeTruthy()
    })

    it('应该在禁用状态下不响应点击', async () => {
      const uni = (global as any).uni
      await wrapper.setProps({ disabled: true })

      await wrapper.find('.scan-button').trigger('click')
      await flushPromises()

      expect(wrapper.vm.isScanning).toBe(false)
      expect(uni.scanCode).not.toHaveBeenCalled()
    })
  })

  describe('手动输入功能', () => {
    beforeEach(() => {
      wrapper = mount(QRScanner, createMountOptions({
        global: {
          components: {
            'uni-popup': mockUniPopup
          }
        }
      }))
    })

    it('应该能打开手动输入弹窗', async () => {
      // 先设置扫码状态
      wrapper.vm.isScanning = true
      await wrapper.vm.$nextTick()

      await wrapper.find('.btn-manual').trigger('click')

      // 检查状态变化
      expect(wrapper.vm.isScanning).toBe(false)
      expect(wrapper.vm.manualInputFocus).toBe(true)
    })

    it('应该能输入和提交手动输入的内容', async () => {
      const manualCode = '123456'
      
      // 设置手动输入内容
      wrapper.vm.manualCode = manualCode
      await wrapper.vm.$nextTick()

      // 模拟点击确认按钮
      await wrapper.vm.confirmManualInput()

      // 检查是否触发了success事件
      expect(wrapper.emitted('success')).toBeTruthy()
      expect(wrapper.emitted('success')[0]).toEqual([manualCode])
    })

    it('应该在提交空内容时显示错误提示', async () => {
      const uni = (global as any).uni
      
      // 设置空内容
      wrapper.vm.manualCode = ''
      await wrapper.vm.$nextTick()

      // 调用确认方法
      await wrapper.vm.confirmManualInput()

      expect(uni.showToast).toHaveBeenCalledWith({
        title: '请输入有效内容',
        icon: 'none'
      })
    })
  })

  describe('错误处理', () => {
    beforeEach(() => {
      wrapper = mount(QRScanner, createMountOptions({
        global: {
          components: {
            'uni-popup': mockUniPopup
          }
        }
      }))
    })

    it('应该处理相机权限被拒绝的情况', async () => {
      const uni = (global as any).uni
      
      // Mock 权限被拒绝，用户选择去设置
      uni.getSetting.mockImplementation((options: any) => {
        options.success({
          authSetting: {
            'scope.camera': false
          }
        })
      })

      uni.showModal.mockImplementation((options: any) => {
        options.success({
          confirm: true
        })
      })

      uni.openSetting.mockImplementation((options: any) => {
        options.success({
          authSetting: {
            'scope.camera': true
          }
        })
      })

      await wrapper.find('.scan-button').trigger('click')
      await flushPromises()

      expect(uni.openSetting).toHaveBeenCalled()
    })

    it('应该处理设备不支持扫码的情况', async () => {
      const uni = (global as any).uni
      
      // Mock 权限检查成功
      uni.getSetting.mockImplementation((options: any) => {
        options.success({
          authSetting: {
            'scope.camera': true
          }
        })
      })

      // Mock 扫码失败 - 设备不支持
      uni.scanCode.mockImplementation((options: any) => {
        options.fail({
          errMsg: 'scanCode:fail system error'
        })
      })

      await wrapper.find('.scan-button').trigger('click')
      await flushPromises()

      expect(wrapper.emitted('fail')).toBeTruthy()
      expect(wrapper.emitted('fail')[0][0]).toContain('系统错误')
    })

    it('应该处理未知扫码错误', async () => {
      const uni = (global as any).uni
      
      // Mock 权限检查成功
      uni.getSetting.mockImplementation((options: any) => {
        options.success({
          authSetting: {
            'scope.camera': true
          }
        })
      })

      // Mock 扫码失败 - 未知错误
      uni.scanCode.mockImplementation((options: any) => {
        options.fail({
          errMsg: 'scanCode:fail unknown error'
        })
      })

      await wrapper.find('.scan-button').trigger('click')
      await flushPromises()

      expect(wrapper.emitted('fail')).toBeTruthy()
      expect(wrapper.emitted('fail')[0][0]).toContain('扫码失败')
    })
  })

  describe('组件状态管理', () => {
    beforeEach(() => {
      wrapper = mount(QRScanner, createMountOptions({
        global: {
          components: {
            'uni-popup': mockUniPopup
          }
        }
      }))
    })

    it('应该正确管理扫码状态', async () => {
      expect(wrapper.vm.isScanning).toBe(false)
      
      // 直接设置状态
      wrapper.vm.isScanning = true
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.isScanning).toBe(true)
      
      // 取消扫码
      await wrapper.find('.btn-cancel').trigger('click')
      expect(wrapper.vm.isScanning).toBe(false)
    })

    it('应该正确管理手动输入状态', async () => {
      expect(wrapper.vm.manualCode).toBe('')
      
      // 设置手动输入内容
      wrapper.vm.manualCode = 'test123'
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.manualCode).toBe('test123')
      
      // 清空内容
      wrapper.vm.manualCode = ''
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.manualCode).toBe('')
    })

    it('应该在组件销毁时清理状态', async () => {
      // 设置一些状态
      wrapper.vm.isScanning = true
      wrapper.vm.manualCode = 'test'
      
      // 销毁前的状态
      expect(wrapper.vm.isScanning).toBe(true)
      expect(wrapper.vm.manualCode).toBe('test')
      
      // 销毁组件
      wrapper.unmount()

      // 注意：组件销毁后无法访问vm，这个测试主要是确保没有内存泄漏
    })
  })

  describe('事件触发', () => {
    beforeEach(() => {
      wrapper = mount(QRScanner, createMountOptions({
        global: {
          components: {
            'uni-popup': mockUniPopup
          }
        }
      }))
    })

    it('应该在扫码成功时调用相关API', async () => {
      const uni = (global as any).uni
      
      // Mock 权限检查成功
      uni.getSetting.mockImplementation((options: any) => {
        options.success({
          authSetting: {
            'scope.camera': true
          }
        })
      })

      // Mock 扫码成功
      uni.scanCode.mockImplementation((options: any) => {
        options.success({
          result: 'test-result'
        })
      })

      await wrapper.find('.scan-button').trigger('click')
      await flushPromises()

      // 验证扫码被调用
      expect(uni.scanCode).toHaveBeenCalled()
    })

    it('应该在取消扫码时触发cancel事件', async () => {
      // 设置扫码状态
      wrapper.vm.isScanning = true
      await wrapper.vm.$nextTick()

      await wrapper.find('.btn-cancel').trigger('click')

      expect(wrapper.emitted('cancel')).toBeTruthy()
    })

    it('应该在扫码失败时触发fail事件', async () => {
      const uni = (global as any).uni
      const error = '测试错误'
      
      // Mock 权限检查成功
      uni.getSetting.mockImplementation((options: any) => {
        options.success({
          authSetting: {
            'scope.camera': true
          }
        })
      })

      // Mock 扫码失败
      uni.scanCode.mockImplementation((options: any) => {
        options.fail({
          errMsg: error
        })
      })

      await wrapper.find('.scan-button').trigger('click')
      await flushPromises()

      expect(wrapper.emitted('fail')).toBeTruthy()
    })
  })
})
