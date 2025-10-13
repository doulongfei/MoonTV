# 缓存监控 UI 优化说明

## 更新日期: 2025-10-13

## 优化内容

将缓存速度监控从右上角的独立面板优化为控制栏内嵌显示，提供更简洁、更专业的播放体验。

## 新布局设计

### 1. 下载速度 - 控制栏显示

**位置**: 播放器控制栏右侧，设置按钮左边

```
控制栏布局:
[播放] [下一集]  ← 左侧     [⚡ 1.25 MB/s] [倍速] [设置] [全屏]  ← 右侧
                              ↑ 新增下载速度显示
```

**视觉设计**:

- ⚡ 闪电图标 + 速度数值
- 最小宽度: 60px
- 字体大小: 13px
- 颜色根据速度动态变化

**速度颜色编码**:
| 速度范围 | 颜色 | 说明 |
|----------|------|------|
| ≥ 1 MB/s | 🟢 绿色 `#22c55e` | 高速 |
| 500-999 KB/s | 🔵 蓝色 `#3b82f6` | 中速 |
| 100-499 KB/s | 🟠 橙色 `#f59e0b` | 低速 |
| < 100 KB/s | 🔴 红色 `#ef4444` | 很慢 |
| 无数据 | ⚪ 灰色 `#9ca3af` | 显示 `--` |

### 2. 缓冲进度 - 进度条叠加

**位置**: 播放进度条上方，紧贴进度条显示

```
视觉效果:
┌─────────────────────────────────────┐
│                                     │  ← 播放器主体
│                                     │
│                                     │
└─────────────────────────────────────┘
  ████████████░░░░░░░░░░░░░░░░░░░░░  ← 缓冲进度条 (蓝绿渐变)
  ●───────────────────●──────────────  ← 播放进度条
  ↑当前播放            ↑已缓冲位置
```

**视觉设计**:

- 高度: 4px
- 位置: 距底部 35px (进度条正上方)
- 背景: 蓝色到绿色渐变 `rgba(59, 130, 246, 0.6)` → `rgba(34, 197, 94, 0.6)`
- 发光效果: `box-shadow: 0 0 8px rgba(59, 130, 246, 0.5)`
- 圆角: 2px
- 过渡动画: 0.3s ease

## 技术实现

### 1. Artplayer 自定义控制项

```typescript
controls: [
  {
    position: 'right',
    index: 10, // 在设置按钮(11)之前
    html: '⚡图标 + <span id="art-download-speed">',
    tooltip: '下载速度',
    mounted: function ($el) {
      // 每 500ms 更新一次显示
      setInterval(updateSpeed, 500);
    },
  },
];
```

### 2. Artplayer 自定义图层

```typescript
layers: [
  {
    name: 'buffer-progress',
    html: '缓冲进度条 HTML',
    mounted: function ($el) {
      // 每 300ms 更新一次宽度
      setInterval(updateBuffer, 300);
    },
  },
];
```

### 3. 状态同步机制

使用 `useRef` 在 React 和 Artplayer 之间共享状态：

```typescript
const bufferStatsRef = useRef(bufferStats);

useEffect(() => {
  bufferStatsRef.current = bufferStats;
}, [bufferStats]);

// Artplayer 回调中访问
const currentSpeed = bufferStatsRef.current.downloadSpeed;
```

## 优势对比

### 优化前 (右上角面板)

❌ 遮挡视频内容  
❌ 占用屏幕空间  
❌ 移动端体验差  
❌ 与播放器分离

### 优化后 (控制栏内嵌)

✅ 不遮挡视频  
✅ 无额外空间占用  
✅ 移动端友好  
✅ 与播放器无缝集成  
✅ 更专业的外观

## 用户体验

### 桌面端

```
┌───────────────────────────────────────────┐
│                                           │
│         视频播放区域                       │
│         (无遮挡)                          │
│                                           │
└───────────────────────────────────────────┘
████████████░░░░░░░░░░░░░░░░░░░░░░░  ← 缓冲条
━━━━━━●━━━━━━━━━━━━━━━━━━━━━━━━━━  ← 进度条
[▶] [下一集]    [⚡ 1.25 MB/s] [设置] [全屏]
```

### 移动端

由于移动端控制栏空间有限，下载速度会自动响应式调整：

- 保持可读性
- 最小宽度确保数值不被截断
- 闪电图标提供视觉提示

## 交互细节

### 1. 下载速度控制项

**鼠标悬停**: 显示 tooltip "下载速度"  
**更新频率**: 500ms  
**颜色变化**: 平滑过渡  
**默认显示**: `--` (无数据时)

### 2. 缓冲进度条

**更新频率**: 300ms  
**显示条件**: `isActive && bufferProgress > 0`  
**隐藏效果**: `opacity: 0` (平滑淡出)  
**宽度计算**: `(bufferedSeconds / maxBufferLength) * 100%`

## 性能优化

### 定时器管理

```typescript
// 组件卸载时自动清理
($el as any).__cleanup = () => clearInterval(intervalId);
```

### 节流更新

- 下载速度: 500ms 更新间隔
- 缓冲进度: 300ms 更新间隔

避免过于频繁的 DOM 操作。

### 条件渲染

```typescript
if (stats.isActive && stats.bufferProgress > 0) {
  // 显示缓冲条
} else {
  // 隐藏缓冲条
}
```

仅在有数据时更新，减少不必要的计算。

## 兼容性

### 浏览器支持

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

### 响应式设计

| 屏幕尺寸          | 下载速度显示 | 缓冲条   |
| ----------------- | ------------ | -------- |
| 桌面端 (≥1024px)  | 完整显示     | 完整宽度 |
| 平板 (768-1023px) | 完整显示     | 完整宽度 |
| 移动端 (<768px)   | 紧凑显示     | 完整宽度 |

## 自定义配置

### 修改更新频率

```typescript
// 在 mounted 函数中
const intervalId = setInterval(updateSpeed, 1000); // 改为 1 秒更新
```

### 修改颜色方案

```typescript
// 自定义速度颜色
if (speedValue >= 2) {
  speedEl.style.color = '#10b981'; // 更快速度用不同绿色
}
```

### 修改缓冲条样式

```typescript
// 在 layers HTML 中
style = 'background: linear-gradient(90deg, #your-color-1, #your-color-2);';
```

## 故障排查

### 下载速度显示 `--`

**原因**:

1. HLS 尚未开始下载分片
2. `bufferStats.isActive = false`
3. 视频加载中

**解决**: 等待视频开始播放后自动显示

### 缓冲条不显示

**原因**:

1. `bufferProgress = 0`
2. `isActive = false`
3. 缓冲条 z-index 被覆盖

**检查**:

```javascript
console.log(bufferStatsRef.current);
// 查看 isActive 和 bufferProgress 值
```

### 颜色不变化

**原因**: 速度格式解析失败

**检查**:

```javascript
console.log(bufferStatsRef.current.downloadSpeed);
// 确保格式为 "1.25 MB/s" 或 "512 KB/s"
```

## 未来扩展

### 可能的增强功能

1. **统计图表**

   - 速度历史曲线
   - 缓冲历史图表

2. **高级信息**

   - Ping 延迟显示
   - 丢包率统计
   - CDN 节点信息

3. **用户设置**

   - 隐藏/显示下载速度
   - 自定义颜色方案
   - 调整更新频率

4. **移动端优化**
   - 长按显示详细信息
   - 触摸反馈动画

## 代码示例

### 完整控制项代码

```typescript
{
  position: 'right',
  index: 10,
  html: `
    <div class="art-control art-control-speed"
         style="padding: 0 10px; display: flex; align-items: center;">
      <svg width="16" height="16">...</svg>
      <span id="art-download-speed">--</span>
    </div>
  `,
  tooltip: '下载速度',
  mounted: function ($el: HTMLElement) {
    const updateSpeed = () => {
      const speedEl = $el.querySelector('#art-download-speed') as HTMLElement;
      if (speedEl) {
        const currentSpeed = bufferStatsRef.current.downloadSpeed;
        speedEl.textContent = currentSpeed || '--';
        // 设置颜色...
      }
    };
    const intervalId = setInterval(updateSpeed, 500);
    ($el as any).__cleanup = () => clearInterval(intervalId);
  }
}
```

## 相关文档

- [HLS_OPTIMIZATION.md](./HLS_OPTIMIZATION.md) - HLS 多线程缓存优化
- [BUFFER_MONITOR.md](./BUFFER_MONITOR.md) - 缓存监控功能说明（旧版）

## 更新日志

**2025-10-13**

- ✨ 将下载速度移至控制栏右侧
- ✨ 将缓冲进度移至播放进度条上方
- ✨ 添加速度颜色编码
- ✨ 添加渐变发光效果
- ✨ 优化移动端显示
- 🗑️ 移除右上角独立面板

---

**维护者**: MoonTV 开发团队  
**最后更新**: 2025-10-13
