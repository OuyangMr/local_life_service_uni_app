/**
 * 平台兼容性工具
 * @description 处理不同平台（H5、小程序、App）的API兼容性问题
 */

// 平台检测
export const platform = {
  isH5: () => {
    // #ifdef H5
    return true
    // #endif
    // #ifndef H5
    return false
    // #endif
  },
  
  isMiniProgram: () => {
    // #ifdef MP
    return true
    // #endif
    // #ifndef MP
    return false
    // #endif
  },
  
  isApp: () => {
    // #ifdef APP-PLUS
    return true
    // #endif
    // #ifndef APP-PLUS
    return false
    // #endif
  }
}

// 兼容性API封装
export const compatAPI = {
  /**
   * 获取系统设置
   */
  getSetting(): Promise<UniNamespace.GetSettingRes> {
    return new Promise((resolve, reject) => {
      if (platform.isH5()) {
        // H5环境下提供模拟数据
        resolve({
          authSetting: {
            'scope.userLocation': true,
            'scope.userInfo': true
          }
        } as UniNamespace.GetSettingRes)
      } else {
        // 小程序和App环境
        uni.getSetting({
          success: resolve,
          fail: reject
        })
      }
    })
  },

  /**
   * 获取位置信息
   */
  getLocation(options: Partial<UniNamespace.GetLocationOptions> = {}): Promise<UniNamespace.GetLocationRes> {
    return new Promise((resolve, reject) => {
      if (platform.isH5()) {
        // H5环境下使用浏览器的地理位置API
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              resolve({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                speed: position.coords.speed || 0,
                accuracy: position.coords.accuracy,
                altitude: position.coords.altitude || 0,
                verticalAccuracy: position.coords.altitudeAccuracy || 0,
                horizontalAccuracy: position.coords.accuracy
              } as UniNamespace.GetLocationRes)
            },
            (error) => {
              console.warn('H5获取位置失败:', error.message)
              // 提供默认位置
              resolve({
                latitude: 39.916527,
                longitude: 116.397128,
                speed: 0,
                accuracy: 100,
                altitude: 0,
                verticalAccuracy: 0,
                horizontalAccuracy: 100
              } as UniNamespace.GetLocationRes)
            },
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 600000
            }
          )
        } else {
          // 浏览器不支持地理位置，提供默认位置
          resolve({
            latitude: 39.916527,
            longitude: 116.397128,
            speed: 0,
            accuracy: 100,
            altitude: 0,
            verticalAccuracy: 0,
            horizontalAccuracy: 100
          } as UniNamespace.GetLocationRes)
        }
      } else {
        // 小程序和App环境
        uni.getLocation({
          type: 'gcj02',
          ...options,
          success: resolve,
          fail: (error) => {
            console.warn('获取位置失败:', error)
            // 提供默认位置
            resolve({
              latitude: 39.916527,
              longitude: 116.397128,
              speed: 0,
              accuracy: 100,
              altitude: 0,
              verticalAccuracy: 0,
              horizontalAccuracy: 100
            } as UniNamespace.GetLocationRes)
          }
        })
      }
    })
  },

  /**
   * 扫码功能
   */
  scanCode(options: Partial<UniNamespace.ScanCodeOptions> = {}): Promise<UniNamespace.ScanCodeRes> {
    return new Promise((resolve, reject) => {
      if (platform.isH5()) {
        // H5环境下提供模拟扫码结果或使用WebRTC
        const mockResult = prompt('H5环境下的模拟扫码，请输入二维码内容:')
        if (mockResult) {
          resolve({
            result: mockResult,
            scanType: 'QR_CODE',
            charSet: 'utf8',
            path: ''
          } as UniNamespace.ScanCodeRes)
        } else {
          reject(new Error('用户取消扫码'))
        }
      } else {
        // 小程序和App环境
        uni.scanCode({
          ...options,
          success: resolve,
          fail: reject
        })
      }
    })
  },

  /**
   * 选择图片
   */
  chooseImage(options: Partial<UniNamespace.ChooseImageOptions> = {}): Promise<UniNamespace.ChooseImageRes> {
    return new Promise((resolve, reject) => {
      if (platform.isH5()) {
        // H5环境下使用input file
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = 'image/*'
        input.multiple = (options.count || 1) > 1
        
        input.onchange = (event) => {
          const files = (event.target as HTMLInputElement).files
          if (files && files.length > 0) {
            const tempFilePaths: string[] = []
            const tempFiles: UniNamespace.ChooseImageRes['tempFiles'] = []
            
            for (let i = 0; i < files.length; i++) {
              const file = files[i]
              const url = URL.createObjectURL(file)
              tempFilePaths.push(url)
              tempFiles.push({
                path: url,
                size: file.size,
                name: file.name,
                type: file.type
              })
            }
            
            resolve({
              errMsg: 'chooseImage:ok',
              tempFilePaths,
              tempFiles
            })
          } else {
            reject(new Error('用户取消选择'))
          }
        }
        
        input.click()
      } else {
        // 小程序和App环境
        uni.chooseImage({
          count: 9,
          sizeType: ['original', 'compressed'],
          sourceType: ['album', 'camera'],
          ...options,
          success: resolve,
          fail: reject
        })
      }
    })
  },

  /**
   * 预览图片
   */
  previewImage(options: UniNamespace.PreviewImageOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      if (platform.isH5()) {
        // H5环境下打开新窗口显示图片
        if (options.urls && options.urls.length > 0) {
          const currentIndex = options.current ? options.urls.indexOf(options.current) : 0
          const imageUrl = options.urls[currentIndex] || options.urls[0]
          window.open(imageUrl, '_blank')
          resolve()
        } else {
          reject(new Error('没有图片可预览'))
        }
      } else {
        // 小程序和App环境
        uni.previewImage({
          ...options,
          success: () => resolve(),
          fail: reject
        })
      }
    })
  }
}

// 平台特定的配置
export const platformConfig = {
  // 是否支持实时位置更新
  supportsLocationUpdate: !platform.isH5(),
  
  // 是否支持扫码
  supportsScanCode: true,
  
  // 是否支持选择位置
  supportsChooseLocation: !platform.isH5(),
  
  // WebSocket URL
  getWebSocketUrl: (path: string = '') => {
    if (platform.isH5()) {
      return `ws://localhost:3000${path}`
    } else {
      return `wss://your-domain.com${path}`
    }
  }
}

