import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.2';

// Transformers.js y los pesos del modelo se descargan desde el CDN/Hub la primera vez.
env.allowLocalModels = false;

const input = document.querySelector('#audio-file');
const dropzone = document.querySelector('#dropzone');
const fileTitle = document.querySelector('#file-title');
const fileHint = document.querySelector('#file-hint');
const runButton = document.querySelector('#transcribe');
const modelSelect = document.querySelector('#model');
const statusBox = document.querySelector('#status');
const statusText = document.querySelector('#status-text');
const progressTrack = document.querySelector('#progress-track');
const progressBar = document.querySelector('#progress-bar');
const resultBox = document.querySelector('#result');
const resultMeta = document.querySelector('#result-meta');
const copyButton = document.querySelector('#copy');
const downloadButton = document.querySelector('#download');

let selectedFile = null;
let transcriber = null;
let loadedModel = '';

function setStatus(message, state = '') {
  statusText.textContent = message;
  statusBox.className = `status ${state}`.trim();
}

function selectFile(file) {
  if (!file) return;
  if (!file.type.startsWith('audio/') && !/\.(mp3|wav|m4a|ogg|flac|aac|wma|mpeg)$/i.test(file.name)) {
    setStatus('Ese archivo no parece ser un formato de audio compatible.', 'error');
    return;
  }
  selectedFile = file;
  fileTitle.textContent = file.name;
  const size = file.size < 1024 ** 2 ? `${Math.max(1, Math.round(file.size / 1024))} KB` : `${(file.size / 1024 ** 2).toFixed(1)} MB`;
  fileHint.textContent = `${size} · Listo para transcribir`;
  runButton.disabled = false;
  setStatus('Archivo listo. Elige un modelo y comienza.');
}

input.addEventListener('change', () => selectFile(input.files[0]));
dropzone.addEventListener('dragover', event => { event.preventDefault(); dropzone.classList.add('dragging'); });
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragging'));
dropzone.addEventListener('drop', event => {
  event.preventDefault(); dropzone.classList.remove('dragging'); selectFile(event.dataTransfer.files[0]);
});
dropzone.addEventListener('keydown', event => {
  if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); input.click(); }
});

async function decodeAudio(file) {
  const context = new AudioContext({ sampleRate: 16000 });
  try {
    const buffer = await context.decodeAudioData(await file.arrayBuffer());
    const channels = Array.from({ length: buffer.numberOfChannels }, (_, i) => buffer.getChannelData(i));
    const mono = new Float32Array(buffer.length);
    for (const channel of channels) for (let i = 0; i < mono.length; i++) mono[i] += channel[i] / channels.length;
    if (buffer.sampleRate === 16000) return mono;
    const ratio = buffer.sampleRate / 16000;
    const output = new Float32Array(Math.ceil(mono.length / ratio));
    for (let i = 0; i < output.length; i++) {
      const pos = i * ratio, left = Math.floor(pos), right = Math.min(left + 1, mono.length - 1), mix = pos - left;
      output[i] = mono[left] * (1 - mix) + mono[right] * mix;
    }
    return output;
  } finally { await context.close(); }
}

runButton.addEventListener('click', async () => {
  if (!selectedFile) return;
  runButton.disabled = true;
  modelSelect.disabled = true;
  progressTrack.hidden = false;
  progressBar.style.width = '3%';
  const startedAt = performance.now();
  try {
    const modelId = modelSelect.value;
    if (!transcriber || loadedModel !== modelId) {
      setStatus('Descargando el modelo de Whisper. La primera descarga puede tardar…', 'busy');
      transcriber = await pipeline('automatic-speech-recognition', modelId, {
        progress_callback: info => {
          if (info.status === 'progress' && Number.isFinite(info.progress)) {
            progressBar.style.width = `${Math.min(42, 3 + info.progress * .39)}%`;
          }
        }
      });
      loadedModel = modelId;
    }
    setStatus('Preparando el audio…', 'busy');
    progressBar.style.width = '48%';
    const audio = await decodeAudio(selectedFile);
    setStatus('Transcribiendo. Los audios largos pueden tardar varios minutos…', 'busy');
    progressBar.style.width = '56%';
    const output = await transcriber(audio, { sampling_rate: 16000, chunk_length_s: 30, stride_length_s: 5 });
    const text = (output.text || '').trim();
    resultBox.value = text;
    const elapsed = ((performance.now() - startedAt) / 1000).toFixed(1);
    resultMeta.textContent = `Modelo ${modelId.split('/').pop()} · ${elapsed} s`;
    copyButton.disabled = downloadButton.disabled = !text;
    progressBar.style.width = '100%';
    setStatus('Transcripción completada. Puedes editar, copiar o descargar el texto.');
  } catch (error) {
    console.error(error);
    const detail = error?.message || 'Error desconocido';
    setStatus(`No se pudo transcribir: ${detail}`, 'error');
  } finally {
    runButton.disabled = false;
    modelSelect.disabled = false;
    window.setTimeout(() => { progressTrack.hidden = true; progressBar.style.width = '0'; }, 900);
  }
});

copyButton.addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(resultBox.value); setStatus('Texto copiado al portapapeles.'); }
  catch { resultBox.select(); document.execCommand('copy'); setStatus('Texto copiado al portapapeles.'); }
});

downloadButton.addEventListener('click', () => {
  const stem = (selectedFile?.name || 'audio').replace(/\.[^.]+$/, '');
  const blob = new Blob([resultBox.value], { type: 'text/plain;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${stem}_transcripcion.txt`;
  link.click();
  URL.revokeObjectURL(link.href);
});
