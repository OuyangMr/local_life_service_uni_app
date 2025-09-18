# Z世代赛博霓虹本地生活App设计规范

## 📋 文档信息

- **文档版本**：v1.0
- **创建时间**：2025年9月19日
- **设计风格**：赛博霓虹 + 玻璃拟态 (Cyberpunk Neon + Glassmorphism)
- **目标用户**：Z世代夜间活动人群
- **使用场景**：夜间室内环境，高对比度保证安全

---

## 🎨 设计理念

### 核心概念

**"夜光城市，指尖生活"** - 为Z世代打造的夜间本地生活服务平台，融合赛博朋克美学与现代玻璃拟态设计，创造独特的视觉体验。

### 设计原则

1. **高对比度安全性**：夜间使用场景下的视觉清晰度
2. **霓虹美学**：营造未来感和科技感
3. **玻璃质感**：半透明层次创造空间深度
4. **动态交互**：微光粒子动效增强活力
5. **信息层级**：清晰的视觉引导和信息优先级

---

## 🌈 配色系统

### 主色调

```scss
// 霓虹粉红 - 主品牌色
$neon-pink: #ff0055;
$neon-pink-light: #ff3366;
$neon-pink-dark: #cc0044;

// 深空蓝 - 背景基色
$deep-space: #001220;
$deep-space-light: #001830;
$deep-space-dark: #000810;
```

### 功能色

```scss
// 成功 - 霓虹绿
$success: #00ff88;
$success-light: #33ffaa;
$success-dark: #00cc66;

// 警告 - 霓虹橙
$warning: #ffa500;
$warning-light: #ffb733;
$warning-dark: #cc8400;

// 错误 - 保持主色调
$error: #ff0055;

// 信息 - 霓虹蓝
$info: #00bfff;
```

### 中性色

```scss
// 白色透明度系列
$white-100: rgba(255, 255, 255, 1);
$white-80: rgba(255, 255, 255, 0.8);
$white-60: rgba(255, 255, 255, 0.6);
$white-30: rgba(255, 255, 255, 0.3);
$white-10: rgba(255, 255, 255, 0.1);
$white-5: rgba(255, 255, 255, 0.05);
```

### 使用规范

- **背景**：深空蓝 (#001220) 作为主背景
- **主要操作**：霓虹粉红 (#FF0055)
- **成功状态**：霓虹绿 (#00FF88)
- **文字**：白色系列，根据重要性调整透明度

---

## 📝 字体系统

### 字体选择

```scss
// 英文字体 - 免费开源
$font-english:
  'Poppins',
  -apple-system,
  BlinkMacSystemFont,
  sans-serif;

// 中文字体 - 免费开源
$font-chinese: '思源黑体', 'Source Han Sans', 'Noto Sans CJK SC', sans-serif;

// 数字字体
$font-number: 'Poppins', 'SF Mono', monospace;
```

### 字体大小

```scss
$text-xs: 10px; // 辅助信息
$text-sm: 12px; // 次要文本
$text-base: 14px; // 基础文本
$text-lg: 16px; // 重要文本
$text-xl: 18px; // 小标题
$text-2xl: 20px; // 标题
$text-3xl: 22px; // 大标题
$text-4xl: 24px; // 特大标题
```

### 使用规范

- **标题**：使用思源黑体，搭配霓虹发光效果
- **正文**：14px 基础大小，行高 1.4
- **数字**：使用 Poppins，价格等重要数字加霓虹效果
- **图标文字**：10-12px，配合图标使用

---

## 🎯 设计规范

### 间距系统

```scss
$spacing-base: 12px; // 基础留白单位

// 间距规范
$spacing-xs: 4px;
$spacing-sm: 8px;
$spacing-md: 12px; // 基础留白
$spacing-lg: 16px;
$spacing-xl: 20px;
$spacing-2xl: 24px;
$spacing-3xl: 32px;
```

### 圆角系统

```scss
$radius-base: 8px; // 基础圆角

// 圆角规范
$radius-sm: 4px; // 小组件
$radius-md: 8px; // 按钮、卡片
$radius-lg: 12px; // 大卡片
$radius-xl: 18px; // 标签
$radius-full: 50%; // 圆形
$radius-dock: 35px; // 底部Dock
```

### 玻璃拟态效果

```scss
// 玻璃背景
.glass-morphism {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 0, 85, 0.3);
}

// 深度玻璃
.glass-deep {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
}
```

### 霓虹发光效果

```scss
// 标准霓虹
.neon-glow {
  filter: drop-shadow(0 0 3px currentColor);
}

// 强烈霓虹
.neon-strong {
  filter: drop-shadow(0 0 5px currentColor) drop-shadow(0 0 10px currentColor);
}

// 数据发光
.data-glow {
  filter: drop-shadow(0 0 4px currentColor) drop-shadow(0 0 8px currentColor);
}
```

---

## 🎭 组件规范

### 按钮组件

```scss
// 主要按钮
.btn-primary {
  background: linear-gradient(135deg, #ff0055, #ff3366);
  border-radius: 8px;
  padding: 12px 24px;
  color: #ffffff;
  filter: drop-shadow(0 0 10px #ff0055);
}

// 次要按钮
.btn-secondary {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid #ff0055;
  border-radius: 8px;
  padding: 12px 24px;
  color: #ff0055;
}
```

### 卡片组件

```scss
// 基础卡片
.card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 0, 85, 0.3);
  border-radius: 8px;
  backdrop-filter: blur(10px);
}

// 悬浮卡片
.card-hover {
  transition: all 0.3s ease;
  &:hover {
    transform: translateY(-2px);
    border-color: rgba(255, 0, 85, 0.5);
    box-shadow: 0 4px 20px rgba(255, 0, 85, 0.2);
  }
}
```

### 底部导航 Dock

```scss
// 玻璃Dock
.bottom-dock {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 0, 85, 0.5);
  border-radius: 35px;
  backdrop-filter: blur(20px);
  padding: 10px 20px;
  margin: 0 20px 20px;
}
```

### 图标规范

- **线条粗细**：2px
- **图标大小**：20x20px（标准）、24x24px（大号）
- **风格**：线性图标，圆润端点
- **效果**：添加霓虹发光效果

---

## ✨ 动效规范

### 微光粒子动效

```xml
<!-- SVG 动画示例 -->
<circle cx="50" cy="200" r="2" fill="#FF0055" opacity="0.6">
  <animate attributeName="cy"
           values="200;180;200"
           dur="3s"
           repeatCount="indefinite"/>
  <animate attributeName="opacity"
           values="0.6;1;0.6"
           dur="3s"
           repeatCount="indefinite"/>
</circle>
```

### 页面转场

```scss
// 进入动画
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

// 动画时长
$transition-fast: 0.2s;
$transition-normal: 0.3s;
$transition-slow: 0.5s;
```

### 交互反馈

- **点击反馈**：缩放 0.98 + 增强发光
- **悬停效果**：上移 2px + 边框发光
- **加载动画**：脉冲霓虹光效
- **成功反馈**：绿色光波扩散

---

## 📱 Material You 3 命名规范

### 文件命名

```
HomePage.svg                    // 首页
StoreDetail.svg                // 店铺详情
MerchantDashboard.svg          // 商户仪表盘
OrderManagement.svg            // 订单管理
```

### 组件命名

```
// 容器组件
surface_primary               // 主要表面
surface_variant              // 变体表面
surface_container            // 容器表面

// 颜色角色
primary                      // 主要色
on_primary                   // 主要色上的内容
primary_container           // 主要色容器
on_primary_container        // 主要色容器上的内容

// 状态
state_enabled               // 启用状态
state_hover                 // 悬停状态
state_pressed              // 按下状态
state_disabled             // 禁用状态
```

### 图层命名

```
background                  // 背景层
content                    // 内容层
overlay                    // 覆盖层
scrim                      // 遮罩层
```

---

## 🚀 实施指南

### 开发建议

1. **性能优化**
   - 使用 CSS 动画替代 JS 动画
   - 霓虹效果使用 GPU 加速
   - 玻璃效果注意性能影响

2. **响应式适配**
   - 移动优先设计
   - 断点：375px / 414px / 768px
   - 触摸目标最小 44x44px

3. **可访问性**
   - 确保对比度符合 WCAG AA 标准
   - 提供非颜色的状态指示
   - 支持深色模式切换

4. **组件复用**
   - 建立组件库
   - 统一设计令牌
   - 保持一致性

### 文件导出

- **格式**：SVG（矢量）、PNG（位图）
- **命名**：遵循 Material You 3 规范
- **版本**：保留设计迭代历史
- **标注**：包含间距、颜色值等开发信息

---

## 📐 设计检查清单

- [ ] 所有文字在深色背景上清晰可读
- [ ] 霓虹效果不影响内容识别
- [ ] 玻璃效果层次分明
- [ ] 交互状态明确
- [ ] 动效流畅不卡顿
- [ ] 图标风格统一
- [ ] 间距规范一致
- [ ] 颜色使用符合规范

---

## 🎯 应用示例

### 首页

- 玻璃质感搜索框
- 霓虹发光分类卡片
- 悬浮粒子背景动效
- 全圆角玻璃底部Dock

### 店铺详情

- 视频展示区暗色遮罩
- 包间状态霓虹指示灯
- 玻璃卡片信息展示
- 悬浮预订按钮

### 商户仪表盘

- 数据卡片发光效果
- 实时状态指示器
- 图表霓虹描边
- 快捷操作玻璃按钮

### 订单管理

- 紧急订单警告发光
- 状态标签颜色编码
- 列表项玻璃背景
- 底部操作栏悬浮

---

**设计师**：AI Assistant  
**最后更新**：2025年9月19日  
**版本**：v1.0
