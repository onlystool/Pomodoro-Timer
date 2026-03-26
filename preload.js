const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  toggleAlwaysOnTop: () => ipcRenderer.send('toggle-always-on-top'),
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  closeWindow: () => ipcRenderer.send('close-window'),
  updateTrayTime: (timeText, isRunning, modeLabel) => ipcRenderer.send('update-tray-time', { timeText, isRunning, modeLabel }),
  showNotification: (title, body) => ipcRenderer.send('show-notification', { title, body }),
  getAlwaysOnTop: () => ipcRenderer.invoke('get-always-on-top'),
  onAlwaysOnTopChanged: (callback) => {
    ipcRenderer.on('always-on-top-changed', (event, value) => callback(value));
  },
});
