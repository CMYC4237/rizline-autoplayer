# Rizline Autoplay

[Rizline](https://www.rizline.com/) 谱面的 Autoplay 视觉渲染器，纯 JS + Canvas 2D 实现。

## 快速开始

```bash
npm start
```

浏览器打开 `http://localhost:8766`，通过「导入谱面」加载谱面文件，「导入音乐 (BGM)」加载对应的音频文件。

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

## 所需资源

本项目不包含任何 Rizline 游戏资产。HoldLine 贴图为原创绘制，已包含在仓库中。其余资源需自行获取（也可自行制作替代品）。

### 音效

放置于 `resources/audio/`：

| 文件 | 格式 | 用途 |
|------|------|------|
| `hit.wav` | WAV（任意采样率/声道） | Tap / Hold 头判定音效 |
| `drag.wav` | WAV（任意采样率/声道） | Drag 判定音效 |

WAV 格式不受限制，WebAudio API 会自动解码。

### 打击粒子帧动画

放置于 `resources/hit_fx/`，共 41 张 PNG 帧：

| 文件 | 格式 | 用途 |
|------|------|------|
| `HitFX_00000.png` ~ `HitFX_00040.png` | PNG（带 alpha 通道） | 判定闪光动画，0.5 秒内播放完毕 |

原尺寸 655×655，渲染时缩放到 25% 大小（约 164×164）。帧数以 00000 起零填充 5 位数字。如自制替代品，用 Radial 渐变白圆 + 透明度遮罩即可近似原效果。

### 谱面与 BGM

谱面文件（JSON 格式）和对应的 BGM 音频通过页面上的「导入谱面」和「导入音乐 (BGM)」按钮手动加载，无需放入项目目录。

## 免责声明

本项目为粉丝作品，与 [Rizline](https://www.rizline.com/) 官方无关。所有商标、游戏资产归版权方所有。

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
resources/          # 贴图 + 音效（需用户自行提供）
```

## License

代码部分 (js/, index.html, server.js) 以 MIT 协议授权。

