import { defineConfig, loadEnv } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
import { resolve } from 'path'
import type { ConfigEnv, UserConfig } from 'vite'

export default defineConfig(({ command, mode }: ConfigEnv): UserConfig => {
  // 加载环境变量
  const env = loadEnv(mode, process.cwd(), '')
  const isProduction = mode === 'production'
  const isDevelopment = mode === 'development'

  return {
    plugins: [
      uni()
    ],
    
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@/components': resolve(__dirname, 'src/components'),
        '@/services': resolve(__dirname, 'src/services'),
        '@/stores': resolve(__dirname, 'src/stores'),
        '@/types': resolve(__dirname, 'src/types'),
        '@/utils': resolve(__dirname, 'src/utils'),
        '@/constants': resolve(__dirname, 'src/constants'),
        '@/styles': resolve(__dirname, 'src/styles')
      }
    },

    // 开发服务器配置
    server: {
      port: 8080,
      host: '0.0.0.0',
      open: false,
      cors: true,
      proxy: {
        '/api': {
          target: env.VITE_API_BASE_URL || 'http://localhost:3000',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '/api'),
          timeout: 30000
        },
        '/upload': {
          target: env.VITE_UPLOAD_URL || 'http://localhost:3000',
          changeOrigin: true,
          timeout: 60000
        }
      }
    },

    // 构建配置
    build: {
      target: 'es2015',
      outDir: 'dist',
      assetsDir: 'static',
      sourcemap: !isProduction,
      minify: isProduction ? 'terser' : false,
      
      // Terser压缩配置
      terserOptions: isProduction ? {
        compress: {
          drop_console: true,
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.info'],
          passes: 2
        },
        format: {
          comments: false
        },
        mangle: {
          safari10: true
        }
      } : {},

      // 代码分割配置
      rollupOptions: {
        output: {
          // 静态资源分类
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name?.split('.') || []
            let extType = info[info.length - 1]
            
            if (/\.(mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/i.test(assetInfo.name || '')) {
              extType = 'media'
            } else if (/\.(png|jpe?g|gif|svg|ico|webp)(\?.*)?$/i.test(assetInfo.name || '')) {
              extType = 'images'
            } else if (/\.(woff2?|eot|ttf|otf)(\?.*)?$/i.test(assetInfo.name || '')) {
              extType = 'fonts'
            }
            
            return `static/${extType}/[name]-[hash][extname]`
          },
          
          // JS文件分类
          chunkFileNames: 'static/js/[name]-[hash].js',
          entryFileNames: 'static/js/[name]-[hash].js',
          
          // 手动分包
          manualChunks: isProduction ? {
            // 框架代码
            'vue-vendor': ['vue', '@vue/shared'],
            'uni-vendor': ['@dcloudio/uni-app'],
            
            // 状态管理
            'store-vendor': ['pinia'],
            
            // 工具库
            'utils-vendor': ['lodash-es', 'dayjs']
          } : undefined,
          
          // 全局变量配置
          globals: {
            'vue': 'Vue',
            'pinia': 'Pinia'
          }
        },
        
        // 外部依赖
        external: isProduction ? [] : []
      },

      // 文件大小警告配置
      chunkSizeWarningLimit: 1000,
      
      // 资源内联阈值
      assetsInlineLimit: 4096,
      
      // CSS代码分割
      cssCodeSplit: true,
      
      // 预加载配置
      modulePreload: {
        polyfill: true
      }
    },

    // CSS配置
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `
            @import "@/styles/theme.scss";
          `,
          silenceDeprecations: ['legacy-js-api', 'import']
        }
      },
      postcss: {
        plugins: [
          // 添加厂商前缀
          require('autoprefixer'),
          // CSS压缩
          isProduction && require('cssnano')({
            preset: 'default'
          })
        ].filter(Boolean)
      }
    },

    // 环境变量
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode),
      'process.env.VUE_APP_VERSION': JSON.stringify(process.env.npm_package_version),
      '__APP_VERSION__': JSON.stringify(process.env.npm_package_version || '1.0.0'),
      '__BUILD_TIME__': JSON.stringify(new Date().toISOString()),
      '__IS_PRODUCTION__': isProduction,
      '__IS_DEVELOPMENT__': isDevelopment
    },

    // 优化配置
    optimizeDeps: {
      include: [
        '@dcloudio/uni-app'
      ],
      exclude: ['@dcloudio/uni-ui', 'vue', 'pinia'],
      force: true
    },

    // ESBuild配置
    esbuild: {
      drop: isProduction ? ['console', 'debugger'] : [],
      legalComments: 'none'
    },

    // 实验性功能
    experimental: {
      renderBuiltUrl: (filename, { hostType }) => {
        if (hostType === 'js') {
          return { js: `/${filename}` }
        } else {
          return { relative: true }
        }
      }
    }
  }
})