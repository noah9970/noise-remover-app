const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectFile: () => ipcRenderer.invoke('select-file'),
  selectSavePath: (defaultName) => ipcRenderer.invoke('select-save-path', defaultName),
  processAudio: (inputPath, options) => ipcRenderer.invoke('process-audio', inputPath, options),
  saveFile: (outputPath, audioData) => ipcRenderer.invoke('save-file', outputPath, audioData)
});
