const { app, BrowserWindow, ipcMain, globalShortcut } = require("electron");
const path = require("path");
const audio = require("win-audio").speaker;

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      webviewTag: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL("http://localhost:5173");
}

app.whenReady().then(() => {
  createWindow();

  // =========================
  // GLOBAL MEDIA KEYS
  // =========================
  globalShortcut.register("MediaPlayPause", () => {
    mainWindow.webContents.send("media-play-pause");
  });

  globalShortcut.register("MediaNextTrack", () => {
    mainWindow.webContents.send("media-next");
  });

  globalShortcut.register("MediaPreviousTrack", () => {
    mainWindow.webContents.send("media-prev");
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// =========================
// SYSTEM VOLUME
// =========================
ipcMain.handle("set-system-volume", (_event, volume) => {
  try {
    const clamped = Math.max(0, Math.min(volume, 100));
    audio.set(clamped);
  } catch (e) {
    console.error("Failed to set system volume:", e);
  }
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
