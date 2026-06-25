# Rizline Autoplay

[Rizline](https://www.rizline.com/) 谱面的 Autoplay 视觉渲染器，纯 JS + Canvas 2D 实现。

## 快速开始

```bash
npm start
```

浏览器打开 `http://localhost:8766`，通过「导入谱面」加载 `.IN.json` 谱面文件，「导入音乐 (BGM)」加载对应的音频文件。

## 功能

- 9:16 竖屏渲染，540×960 画布
- 引导线 + Tap / Drag / Hold 音符 + 判定环 + 打击粒子
- 相机缩放与平移 (cameraMove)
- Canvas 流速、xPosition 关键帧插值
- 主题色 / Riztime / lineColor / judgeRingColor 支持
- 分离式 SFX（Tap / Drag / Hold 头）+ BGM
- 流速调节、播放速度调节（影响 BGM 音调）
- 线宽、尺寸缩放、遮罩、判定线偏移等可调参数
- 性能监控折线图（右下角面板）

## 操作

| 操作 | 方式 |
|------|------|
| 播放 / 暂停 | 空格键 |
| 快退 / 快进 | ← / → (5 拍), 滚轮 (可调步长) |
| 跳转 | 拖动进度条 |
| 调速 | 右侧面板滑块 |

## 关卡资源

由于版权限制，谱面文件和对应的音频无法随本项目分发，请自行寻找。

## 项目结构

```
index.html          # 入口页面
js/
  chart.js          # 谱面加载、预处理、关键帧插值
  render.js         # Canvas 2D 绘制（引导线、音符、遮罩、粒子）
  audio.js          # SFX + BGM 音频管理
  ui.js             # DOM 事件、响应式缩放
  main.js           # 启动 + 渲染循环 + 性能监控
  state.js          # 全局状态
  easing.js         # 缓动函数
  utils.js          # 工具函数
server.js           # 静态服务器（npm start 入口）
resources/          # 贴图 + 音效资源
```

## License

MIT
