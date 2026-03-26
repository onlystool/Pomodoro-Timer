# 🍅 番茄时钟 (Pomodoro Timer)

一款 macOS 桌面番茄时钟应用，基于 [Pomofocus.io](https://pomofocus.io/) 设计，使用 Electron 构建，支持窗口常驻顶部。

![Pomodoro Timer](https://img.shields.io/badge/Platform-macOS-blue) ![Electron](https://img.shields.io/badge/Electron-33-green) ![License](https://img.shields.io/badge/License-MIT-yellow)

## ✨ 功能特性

### 🕐 计时器
- **三种模式**：Pomodoro (25min) / Short Break (5min) / Long Break (15min)
- 模式切换时背景色动态渐变（🔴 红 → 🟢 青绿 → 🔵 蓝）
- 大字号倒计时显示，一目了然
- 空格键快捷键快速开始/暂停

### 📋 任务管理
- 添加任务并设置预估番茄数
- 点选当前正在进行的任务
- 完成番茄后自动累计任务的已用番茄数
- 一键清除已完成/全部任务

### 🖥 macOS 原生体验
- **窗口常驻顶部**（Always on Top），可通过 📌 图标切换
- **菜单栏倒计时**：关闭窗口后，菜单栏实时显示剩余时间和当前模式
- **系统托盘**：点击托盘图标快速显示/隐藏窗口
- **系统通知**：计时结束时推送通知提醒
- **音效提醒**：优雅的和弦提示音

### ⚙️ 自定义设置
- 自定义各模式时长
- 自动开始休息 / 自动开始番茄
- 设置长休息间隔（默认每 4 个番茄后）

### 💾 数据持久化
- 任务列表、设置、番茄计数自动保存到本地
- 关闭重开不会丢失任何数据

## 📦 安装与使用

### 前置要求
- [Node.js](https://nodejs.org/) (v18+)

### 安装
```bash
git clone https://github.com/onlystool/Pomodoro-Timer.git
cd Pomodoro-Timer
npm install
```

### 运行
```bash
npm start
```

## 🗂 项目结构

```
fanqie/
├── main.js          # Electron 主进程（窗口管理、系统托盘、IPC）
├── preload.js       # 安全 API 桥接
├── index.html       # 界面结构
├── styles.css       # 样式（三种模式配色、动画、响应式）
├── app.js           # 应用逻辑（计时器、任务管理、持久化）
├── package.json     # 项目配置
└── .gitignore
```

## ⌨️ 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Space` | 开始 / 暂停计时 |
| 📌 按钮 | 切换窗口常驻顶部 |

## 🎨 设计参考

视觉设计灵感来源于 [Pomofocus.io](https://pomofocus.io/)，包括：
- 模式对应的背景色方案
- 半透明计时器容器
- 按压效果的 START/STOP 按钮
- 白色卡片式任务列表

## 📄 License

[MIT](LICENSE)
