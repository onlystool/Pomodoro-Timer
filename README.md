<div align="center">
  <h1>🍅 Pomodoro Timer</h1>
  <p>A beautifully designed, premium cross-platform Pomodoro Timer that helps you stay focused and productive. Featuring Data Analytics, PWA Support, and a macOS Desktop App!</p>
  <a href="https://onlystool.github.io/Pomodoro-Timer/"><strong>Live Demo & Web App</strong></a>
</div>

## ✨ Features

### ⏱ Flexible & Intuitive Timer
- **Draggable Time Adjustment**: Quickly slide the numbers to adjust your timer length (1–60 mins) or use the quick-step arrows (`1, 3, 5, 10, 15, 20...`) to jump to your favorite intervals.
- **Customizable Defaults**: Set your preferred default durations for Focus, Short Breaks, and Long Breaks via the Settings panel.
- **Auto-Transitions**: Seamlessly automate the flow between your work and break sessions.

### 📝 Task Management
- Add tasks, estimate required Pomodoros, and check them off upon completion.
- Keeps you accountable by comparing estimated vs. actual Pomodoros.

### 📊 Data Analytics & Reporting
- **Today's Overview**: Track total focused minutes, Pomodoros, and completed tasks for the day.
- **7-Day Trend Chart**: Beautiful daily bar charts visually representing your weekly productivity.
- **Smart Focus Analysis**: Get personalized feedback comparing today's performance to your historical average (e.g., "Warming up", "Flow state"). 
- **Activity Log**: A chronological timeline detailing exactly when you finished a Pomodoro or completed a task.
- *Privacy First*: All data is stored purely locally on your device (`localStorage`).

### 💻 macOS Native Desktop App 
- **Always on Top**: Float the timer above all other windows by clicking the large orange tomato 🍅 in the titlebar.
- **System Tray Icon**: A high-resolution red tomato in the macOS menubar dynamically displaying your active countdown.
- **Native Notifications & Sounds**: Receive crisp, native desktop alerts and a gentle chime when your timer finishes.
- **Custom Window Controls**: Custom titlebar integrating seamlessly alongside native macOS window controls.

### 📱 iOS & iPadOS Support (PWA)
- Installable directly to your device by opening Safari, tapping **Share**, and selecting **Add to Home Screen**.
- Fully responsive layout with proper safe-area support for modern mobile devices and iPads.
- **Offline Capable**: A powerful Service Worker caches all assets, ensuring the app works perfectly without an internet connection!

## 🚀 Installation & Usage

### 🌐 Web / Mobile (PWA)
Simply visit [Pomodoro Timer](https://onlystool.github.io/Pomodoro-Timer/) on any browser. 

### 🍏 macOS Desktop App
If you'd like to use the app standalone on a Mac with the Always-On-Top and Menubar features:

1. Clone the repository:
   ```bash
   git clone https://github.com/onlystool/Pomodoro-Timer.git
   cd Pomodoro-Timer
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Electron app:
   ```bash
   npm start
   ```

## 🛠 Tech Stack
- **Frontend**: Vanilla HTML5, CSS3, JavaScript (Zero bloat).
- **Desktop**: Electron.
- **PWA**: Advanced Service Workers & App Manifest.

## 🤝 Contributing
Contributions, issues, and feature requests are immensely welcome! Please feel free to check out the issues page or submit a Pull Request.
