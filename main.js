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
  // Create a 32x32 tray icon with the time text
  const size = 22;
  // Use nativeImage to create a simple icon
  // We'll draw a red circle (tomato) as the tray icon
  const canvas = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 1;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      if (dist <= r) {
        canvas[idx] = 186;     // R
        canvas[idx + 1] = 73;  // G
        canvas[idx + 2] = 73;  // B
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
