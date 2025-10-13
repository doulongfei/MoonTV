# 缓存速度监控功能说明

## 功能概述

在播放器右上角实时显示视频缓存速度和缓冲进度，帮助用户了解当前网络状况和缓冲情况。

## 功能特性

### 1. 实时下载速度监控

```typescript
// 监听 HLS 分片加载事件
hls.on(Hls.Events.FRAG_LOADED, function (_event, data) {
  // 计算每个分片的下载速度
  const speedBps = bytesDiff / timeDiff;
  // 自动转换单位: B/s -> KB/s -> MB/s
});
```

**显示效果:**

- `1.25 MB/s` - 高速下载
- `512 KB/s` - 中等速度
- `128.5 KB/s` - 低速下载

### 2. 缓冲进度可视化

**显示内容:**

- 当前缓冲时长: `15s / 90s`
- 缓冲百分比: `17%`
- 渐变色进度条 (蓝色 → 青色)

**计算逻辑:**

```typescript
const bufferedSeconds = bufferEnd - currentTime;
const bufferPercent = (bufferedSeconds / maxBufferLength) * 100;
```

### 3. 智能显隐控制

监控面板**仅在以下条件下显示**:

✅ `!isVideoLoading` - 视频非加载状态  
✅ `bufferStats.isActive` - HLS 已激活  
✅ `bufferStats.downloadSpeed` - 有下载速度数据

**自动隐藏场景:**

- 视频加载中
- 播放器未初始化
- 无下载活动

## UI 设计

### 视觉样式

```css
位置: 播放器右上角 (top-4 right-4)
背景: 半透明黑色 + 毛玻璃效果 (backdrop-blur-md)
边框: 白色半透明边框
层级: z-index: 400 (在播放器控制栏之下)
最小宽度: 220px
```

### 组件结构

```
┌─────────────────────────┐
│ ● 下载速度    1.25 MB/s │  <- 绿色脉冲指示器
│                         │
│ 缓冲进度      15s / 90s │  <- 灰色文字
│ ████████░░░░░░░░░░░░░  │  <- 蓝色渐变进度条
│                    17%  │  <- 青色百分比
└─────────────────────────┘
```

### 动画效果

| 元素       | 动画                          | 说明                   |
| ---------- | ----------------------------- | ---------------------- |
| 绿色指示点 | `animate-pulse`               | 脉冲效果，表示活跃状态 |
| 进度条内层 | `animate-pulse`               | 白色半透明脉冲         |
| 进度条宽度 | `transition-all duration-300` | 平滑过渡               |

## 数据更新机制

### 更新时机

1. **分片加载完成时** (主要更新)

   - 触发: `Hls.Events.FRAG_LOADED`
   - 更新: 下载速度 + 缓冲进度

2. **视频 progress 事件**

   - 触发: `video.addEventListener('progress')`
   - 更新: 缓冲进度

3. **视频 timeupdate 事件**
   - 触发: `video.addEventListener('timeupdate')`
   - 更新: 缓冲进度

### 状态管理

```typescript
const [bufferStats, setBufferStats] = useState({
  downloadSpeed: '', // 下载速度文本
  bufferProgress: 0, // 缓冲百分比 0-100
  currentBuffer: 0, // 当前缓冲秒数
  maxBuffer: 0, // 最大缓冲秒数 (30s/90s)
  isActive: false, // 是否激活显示
});
```

## 设备适配

### 桌面端

- 最大缓冲: `90 秒`
- 进度条显示: `0-90s`

### 移动端

- 最大缓冲: `30 秒`
- 进度条显示: `0-30s`

## 性能优化

### 1. 防抖优化

```typescript
let lastLoadTime = Date.now();
const timeDiff = (currentTime - lastLoadTime) / 1000;

// 仅在时间差 > 0 时计算
if (timeDiff > 0 && bytesDiff > 0) {
  // 计算速度
}
```

### 2. 条件渲染

```tsx
{
  !isVideoLoading && bufferStats.isActive && bufferStats.downloadSpeed && (
    <div>监控面板</div>
  );
}
```

避免不必要的 DOM 渲染。

### 3. 状态聚合

使用单个 state 对象管理所有监控数据，减少 re-render 次数。

## 清理机制

```typescript
// HLS 销毁时重置状态
hls.on(Hls.Events.DESTROYING, () => {
  setBufferStats({
    downloadSpeed: '',
    bufferProgress: 0,
    currentBuffer: 0,
    maxBuffer: 0,
    isActive: false,
  });
});
```

防止内存泄漏和状态残留。

## 使用场景

### 用户视角

- ✅ 查看当前网络速度
- ✅ 判断是否需要切换线路
- ✅ 了解缓冲情况，避免卡顿
- ✅ 优化观看体验

### 开发者视角

- ✅ 调试 HLS 下载性能
- ✅ 监控 CDN 响应速度
- ✅ 验证多线程缓存效果
- ✅ 分析网络瓶颈

## 交互设计

### 默认状态

- 监控面板自动显示
- 无需用户操作

### 隐藏逻辑

- 视频切换时自动隐藏
- 暂停/加载时自动隐藏
- 无下载活动时自动隐藏

### 未来扩展

可考虑添加:

- 手动显隐开关
- 详细统计信息
- 历史速度曲线图
- 网络质量评级

## 兼容性

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ 移动端浏览器

## 故障排查

### 监控面板不显示

**可能原因:**

1. `isVideoLoading = true` - 等待视频加载完成
2. `bufferStats.isActive = false` - HLS 未启动
3. `bufferStats.downloadSpeed = ''` - 无下载数据

**检查方法:**

```javascript
// 浏览器控制台
console.log('视频加载状态:', isVideoLoading);
console.log('缓冲统计:', bufferStats);
```

### 速度显示不准确

**可能原因:**

1. 网络波动导致速度突变
2. 分片大小差异
3. CDN 缓存命中

**建议:**

- 观察平均速度而非瞬时速度
- 多个分片加载后速度会更稳定

## 技术细节

### HLS.js 事件监听

```typescript
// 分片加载完成
Hls.Events.FRAG_LOADED
├─ data.frag.stats.total    // 总字节数
├─ data.frag.stats.loaded   // 已加载字节数
└─ 计算时间差 -> 速度

// HLS 销毁
Hls.Events.DESTROYING
└─ 重置状态
```

### 缓冲计算

```typescript
const buffered = video.buffered;
for (let i = 0; i < buffered.length; i++) {
  // buffered.start(i) - 缓冲区开始时间
  // buffered.end(i)   - 缓冲区结束时间
}
```

## 更新日志

**2025-10-13**

- ✨ 实现实时下载速度监控
- ✨ 添加缓冲进度可视化
- ✨ 智能显隐控制
- ✨ 毛玻璃 UI 设计
- ✨ 设备自适应配置

---

**维护者**: MoonTV 开发团队  
**最后更新**: 2025-10-13  
**相关文档**: [HLS_OPTIMIZATION.md](./HLS_OPTIMIZATION.md)
