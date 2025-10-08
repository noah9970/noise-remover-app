const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { processAudioFile } = require('../audio/processor');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // 開発モードでDevToolsを開く
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ファイル選択ダイアログ
ipcMain.handle('select-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Audio Files', extensions: ['mp3', 'wav', 'm4a', 'flac', 'ogg'] }
    ]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

// 保存先選択ダイアログ
ipcMain.handle('select-save-path', async (event, defaultName) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName,
    filters: [
      { name: 'WAV Files', extensions: ['wav'] },
      { name: 'MP3 Files', extensions: ['mp3'] }
    ]
  });

  if (!result.canceled) {
    return result.filePath;
  }
  return null;
});

// 音声処理
ipcMain.handle('process-audio', async (event, inputPath, options) => {
  try {
    const result = await processAudioFile(inputPath, options);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ファイル保存
ipcMain.handle('save-file', async (event, outputPath, audioData) => {
  try {
    fs.writeFileSync(outputPath, audioData);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
