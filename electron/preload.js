const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  setSystemVolume: (volume) =>
    ipcRenderer.invoke("set-system-volume", volume),

  onMediaPlayPause: (callback) =>
    ipcRenderer.on("media-play-pause", callback),

  onMediaNext: (callback) =>
    ipcRenderer.on("media-next", callback),

  onMediaPrev: (callback) =>
    ipcRenderer.on("media-prev", callback),
});
