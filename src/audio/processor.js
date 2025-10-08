const fs = require('fs');
const path = require('path');
const { WaveFile } = require('wavefile');

/**
 * シンプルなノイズゲート処理
 * @param {Float32Array} audioData - 音声データ
 * @param {number} threshold - ノイズゲートの閾値 (0-1)
 * @param {number} sampleRate - サンプルレート
 * @returns {Float32Array} 処理後の音声データ
 */
function applyNoiseGate(audioData, threshold = 0.01, sampleRate = 44100) {
  const output = new Float32Array(audioData.length);
  const attackTime = 0.001; // 1ms
  const releaseTime = 0.1; // 100ms
  
  const attackSamples = Math.floor(attackTime * sampleRate);
  const releaseSamples = Math.floor(releaseTime * sampleRate);
  
  let envelope = 0;
  
  for (let i = 0; i < audioData.length; i++) {
    const sample = Math.abs(audioData[i]);
    
    // エンベロープフォロワー
    if (sample > envelope) {
      envelope += (sample - envelope) / attackSamples;
    } else {
      envelope += (sample - envelope) / releaseSamples;
    }
    
    // ゲート適用
    const gain = envelope > threshold ? 1 : 0;
    output[i] = audioData[i] * gain;
  }
  
  return output;
}

/**
 * スペクトル減算法によるノイズ除去(簡易版)
 * @param {Float32Array} audioData - 音声データ
 * @param {number} noiseReductionAmount - ノイズ除去量 (0-1)
 * @returns {Float32Array} 処理後の音声データ
 */
function applySpectralSubtraction(audioData, noiseReductionAmount = 0.5) {
  const output = new Float32Array(audioData.length);
  
  // 簡易的なハイパスフィルター(低周波ノイズ除去)
  const alpha = 0.95;
  let prevInput = 0;
  let prevOutput = 0;
  
  for (let i = 0; i < audioData.length; i++) {
    const input = audioData[i];
    const filtered = alpha * (prevOutput + input - prevInput);
    output[i] = filtered * (1 - noiseReductionAmount * 0.3) + input * (noiseReductionAmount * 0.3);
    
    prevInput = input;
    prevOutput = filtered;
  }
  
  return output;
}

/**
 * 音声ファイルを処理する
 * @param {string} inputPath - 入力ファイルパス
 * @param {Object} options - 処理オプション
 * @returns {Promise<Object>} 処理結果
 */
async function processAudioFile(inputPath, options = {}) {
  return new Promise((resolve, reject) => {
    try {
      // デフォルトオプション
      const {
        noiseGateThreshold = 0.01,
        noiseReductionAmount = 0.5,
        method = 'both' // 'gate', 'spectral', 'both'
      } = options;

      // WAVファイルを読み込み
      const buffer = fs.readFileSync(inputPath);
      const wav = new WaveFile(buffer);
      
      // 16bitに変換
      wav.toBitDepth('32f');
      
      // サンプル数とチャンネル数を取得
      const samples = wav.getSamples();
      const sampleRate = wav.fmt.sampleRate;
      
      // ステレオの場合は各チャンネルを処理
      let processedSamples;
      
      if (Array.isArray(samples)) {
        // ステレオ
        processedSamples = samples.map(channelData => {
          let processed = channelData;
          
          if (method === 'gate' || method === 'both') {
            processed = applyNoiseGate(processed, noiseGateThreshold, sampleRate);
          }
          
          if (method === 'spectral' || method === 'both') {
            processed = applySpectralSubtraction(processed, noiseReductionAmount);
          }
          
          return processed;
        });
      } else {
        // モノラル
        let processed = samples;
        
        if (method === 'gate' || method === 'both') {
          processed = applyNoiseGate(processed, noiseGateThreshold, sampleRate);
        }
        
        if (method === 'spectral' || method === 'both') {
          processed = applySpectralSubtraction(processed, noiseReductionAmount);
        }
        
        processedSamples = processed;
      }
      
      // 処理後のデータをセット
      wav.fromScratch(
        wav.fmt.numChannels,
        wav.fmt.sampleRate,
        wav.bitDepth,
        processedSamples
      );
      
      // WAVファイルとして出力
      const outputBuffer = wav.toBuffer();
      
      resolve({
        buffer: outputBuffer,
        sampleRate: wav.fmt.sampleRate,
        channels: wav.fmt.numChannels,
        duration: wav.data.chunkSize / (wav.fmt.sampleRate * wav.fmt.numChannels * (wav.bitDepth / 8))
      });
      
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = {
  processAudioFile,
  applyNoiseGate,
  applySpectralSubtraction
};
