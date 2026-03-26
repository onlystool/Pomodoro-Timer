const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, Notification } = require('electron');
const path = require('path');

let mainWindow;
let tray;
let isAlwaysOnTop = true;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 480,
    height: 720,
    minWidth: 380,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    transparent: false,
    alwaysOnTop: isAlwaysOnTop,
    resizable: true,
    show: false,
    backgroundColor: '#ba4949',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile('index.html');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTray() {
  // Create a simple tray icon using a template image
  const iconSize = 16;
  const canvas = nativeImage.createEmpty();
  
  // Use a simple tomato emoji as tray icon text - we'll create a proper icon
  tray = new Tray(createTrayIcon('25:00'));

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示窗口',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      },
    },
    {
      label: '常驻顶部',
      type: 'checkbox',
      checked: isAlwaysOnTop,
      click: (menuItem) => {
        isAlwaysOnTop = menuItem.checked;
        mainWindow.setAlwaysOnTop(isAlwaysOnTop);
        mainWindow.webContents.send('always-on-top-changed', isAlwaysOnTop);
      },
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.setToolTip('番茄时钟');

  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function createTrayIcon(timeText) {
  // Create a 44x44 retina tray icon (22x22 visual size in menubar)
  const size = 44;
  const canvas = Buffer.alloc(size * size * 4);
  const cx = 22;
  const cy = 25;
  const r = 18;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      
      // Stem: simple green T-shape at the top
      const isStem = (x >= 20 && x <= 24 && y >= 4 && y <= 10) || 
                     (x >= 14 && x <= 30 && y >= 6 && y <= 9);

      if (isStem) {
        // macOS raw buffer expects BGRA
        canvas[idx] = 80;      // B
        canvas[idx + 1] = 175; // G
        canvas[idx + 2] = 76;  // R
        canvas[idx + 3] = 255; // A
      } else if (dist <= r) {
        // App background color #ba4949 (R:186, G:73, B:73)
        canvas[idx] = 73;      // B
        canvas[idx + 1] = 73;  // G
        canvas[idx + 2] = 186; // R
        canvas[idx + 3] = 255; // A
      } else {
        canvas[idx] = 0;
        canvas[idx + 1] = 0;
        canvas[idx + 2] = 0;
        canvas[idx + 3] = 0;
      }
    }
  }

  return nativeImage.createFromBuffer(canvas, {
    width: size,
    height: size,
    scaleFactor: 2.0,
  });
}

// IPC Handlers
ipcMain.on('toggle-always-on-top', () => {
  isAlwaysOnTop = !isAlwaysOnTop;
  mainWindow.setAlwaysOnTop(isAlwaysOnTop);
  mainWindow.webContents.send('always-on-top-changed', isAlwaysOnTop);
});

ipcMain.on('minimize-window', () => {
  mainWindow.minimize();
});

ipcMain.on('close-window', () => {
  mainWindow.hide();
});

ipcMain.on('update-tray-time', (event, { timeText, isRunning, modeLabel }) => {
  if (tray) {
    tray.setToolTip(`番茄时钟 - ${timeText}`);
    if (isRunning) {
      tray.setTitle(` ${timeText} ${modeLabel}`, { fontType: 'monospacedDigit' });
    } else {
      tray.setTitle('');
    }
  }
});

ipcMain.on('show-notification', (event, { title, body }) => {
  if (Notification.isSupported()) {
    const notification = new Notification({
      title,
      body,
      silent: false,
    });
    notification.show();
    notification.on('click', () => {
      mainWindow.show();
      mainWindow.focus();
    });
  }
});

ipcMain.handle('get-always-on-top', () => {
  return isAlwaysOnTop;
});

app.whenReady().then(() => {
  createWindow();
  createTray();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  }
});
