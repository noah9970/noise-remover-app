// グローバル変数
let selectedFilePath = null;
let processedAudioData = null;
let originalFileName = '';

// DOM要素
const dropZone = document.getElementById('dropZone');
const selectFileBtn = document.getElementById('selectFileBtn');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const settingsSection = document.getElementById('settingsSection');
const progressSection = document.getElementById('progressSection');
const resultSection = document.getElementById('resultSection');
const processBtn = document.getElementById('processBtn');
const saveBtn = document.getElementById('saveBtn');
const newFileBtn = document.getElementById('newFileBtn');

const thresholdSlider = document.getElementById('thresholdSlider');
const thresholdValue = document.getElementById('thresholdValue');
const reductionSlider = document.getElementById('reductionSlider');
const reductionValue = document.getElementById('reductionValue');
const methodSelect = document.getElementById('methodSelect');

const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const resultInfo = document.getElementById('resultInfo');

// スライダーの値を更新
thresholdSlider.addEventListener('input', (e) => {
  thresholdValue.textContent = parseFloat(e.target.value).toFixed(3);
});

reductionSlider.addEventListener('input', (e) => {
  reductionValue.textContent = e.target.value + '%';
});

// ファイル選択ボタン
selectFileBtn.addEventListener('click', async () => {
  const filePath = await window.electronAPI.selectFile();
  if (filePath) {
    handleFileSelected(filePath);
  }
});

// ドラッグ&ドロップ処理
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  e.stopPropagation();
  dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', (e) => {
  e.preventDefault();
  e.stopPropagation();
  dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  e.stopPropagation();
  dropZone.classList.remove('drag-over');

  const files = e.dataTransfer.files;
  if (files.length > 0) {
    const file = files[0];
    handleFileSelected(file.path);
  }
});

// ファイル選択時の処理
function handleFileSelected(filePath) {
  selectedFilePath = filePath;
  originalFileName = filePath.split(/[\\/]/).pop();
  
  fileName.textContent = originalFileName;
  fileInfo.style.display = 'block';
  settingsSection.style.display = 'block';
  progressSection.style.display = 'none';
  resultSection.style.display = 'none';
}

// 処理開始ボタン
processBtn.addEventListener('click', async () => {
  if (!selectedFilePath) return;

  // UIを更新
  settingsSection.style.display = 'none';
  progressSection.style.display = 'block';
  resultSection.style.display = 'none';

  // オプションを取得
  const options = {
    noiseGateThreshold: parseFloat(thresholdSlider.value),
    noiseReductionAmount: parseFloat(reductionSlider.value) / 100,
    method: methodSelect.value
  };

  // プログレスバーをアニメーション
  let progress = 0;
  const progressInterval = setInterval(() => {
    progress += 2;
    if (progress <= 90) {
      progressFill.style.width = progress + '%';
    }
  }, 100);

  try {
    progressText.textContent = '音声を読み込んでいます...';
    
    // 音声処理を実行
    const result = await window.electronAPI.processAudio(selectedFilePath, options);

    clearInterval(progressInterval);

    if (result.success) {
      progressFill.style.width = '100%';
      progressText.textContent = '処理完了!';

      // 結果を保存
      processedAudioData = result.data.buffer;

      // 結果表示
      setTimeout(() => {
        progressSection.style.display = 'none';
        resultSection.style.display = 'block';

        const duration = result.data.duration.toFixed(2);
        const channels = result.data.channels === 1 ? 'モノラル' : 'ステレオ';
        const sampleRate = (result.data.sampleRate / 1000).toFixed(1);

        resultInfo.innerHTML = `
          <p><strong>ファイル:</strong> ${originalFileName}</p>
          <p><strong>長さ:</strong> ${duration}秒</p>
          <p><strong>チャンネル:</strong> ${channels}</p>
          <p><strong>サンプルレート:</strong> ${sampleRate}kHz</p>
        `;
      }, 500);
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    clearInterval(progressInterval);
    alert('エラーが発生しました: ' + error.message);
    progressSection.style.display = 'none';
    settingsSection.style.display = 'block';
  }
});

// 保存ボタン
saveBtn.addEventListener('click', async () => {
  if (!processedAudioData) return;

  const defaultName = originalFileName.replace(/\.[^/.]+$/, '') + '_denoised.wav';
  const savePath = await window.electronAPI.selectSavePath(defaultName);

  if (savePath) {
    const result = await window.electronAPI.saveFile(savePath, processedAudioData);
    
    if (result.success) {
      alert('ファイルを保存しました!');
    } else {
      alert('保存に失敗しました: ' + result.error);
    }
  }
});

// 新しいファイルを処理ボタン
newFileBtn.addEventListener('click', () => {
  selectedFilePath = null;
  processedAudioData = null;
  originalFileName = '';
  
  fileInfo.style.display = 'none';
  settingsSection.style.display = 'none';
  progressSection.style.display = 'none';
  resultSection.style.display = 'none';
  
  progressFill.style.width = '0%';
  thresholdSlider.value = 0.01;
  reductionSlider.value = 50;
  thresholdValue.textContent = '0.01';
  reductionValue.textContent = '50%';
  methodSelect.value = 'both';
});
