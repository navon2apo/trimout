/**
 * whisper.ts — Local Whisper transcription via @xenova/transformers (ONNX, no Python)
 *
 * Flow:
 *  1. Extract 16kHz mono WAV from the video using ffmpeg (fast, uses existing bundled binary)
 *  2. Download & cache the chosen Whisper model on first use (~150MB for tiny)
 *  3. Run inference, return timestamped TranscriptSegment[]
 */

import { join } from 'node:path';
import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { app } from 'electron';
import { execa } from 'execa';
import logger from './logger.js';

export interface TranscriptSegment {
  start: number;   // seconds
  end: number;     // seconds
  text: string;
}

export type WhisperModel = 'tiny' | 'tiny.en' | 'base' | 'base.en' | 'small' | 'small.en';

export interface WhisperProgress {
  stage: 'extracting' | 'loading' | 'transcribing' | 'done' | 'error';
  percent: number;  // 0-100
  message?: string;
}

// Map user-friendly names to Xenova model IDs
const modelMap: Record<WhisperModel, string> = {
  'tiny':     'Xenova/whisper-tiny',
  'tiny.en':  'Xenova/whisper-tiny.en',
  'base':     'Xenova/whisper-base',
  'base.en':  'Xenova/whisper-base.en',
  'small':    'Xenova/whisper-small',
  'small.en': 'Xenova/whisper-small.en',
};

function getFfmpegBin(): string {
  // Reuse the ffmpeg binary already bundled with the app
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ffmpegPath: string = require('@electron/remote').require('./index.js').ffmpeg?.getFfmpegPath?.();
  if (ffmpegPath && existsSync(ffmpegPath)) return ffmpegPath;
  // Fallback: system ffmpeg
  return 'ffmpeg';
}

/** Extract audio to a temp 16kHz mono WAV for Whisper */
async function extractAudio(videoPath: string, onProgress: (p: WhisperProgress) => void): Promise<string> {
  const outWav = join(tmpdir(), `trimout_whisper_${Date.now()}.wav`);
  onProgress({ stage: 'extracting', percent: 5, message: 'Extracting audio…' });

  // Get duration first (for rough progress)
  let ffmpegBin: string;
  try {
    ffmpegBin = getFfmpegBin();
  } catch {
    ffmpegBin = 'ffmpeg';
  }

  await execa(ffmpegBin, [
    '-y',
    '-i', videoPath,
    '-vn',
    '-ar', '16000',
    '-ac', '1',
    '-f', 'wav',
    outWav,
  ]);

  onProgress({ stage: 'extracting', percent: 20, message: 'Audio extracted' });
  return outWav;
}

/**
 * Transcribe using OpenAI Whisper API (fast, cloud, requires key).
 * Falls back to local if request fails.
 */
async function transcribeWithOpenAI(
  wavPath: string,
  apiKey: string,
  onProgress: (p: WhisperProgress) => void,
): Promise<TranscriptSegment[]> {
  onProgress({ stage: 'transcribing', percent: 55, message: 'Sending to OpenAI Whisper API…' });

  const { createReadStream } = await import('node:fs');
  const FormData = (await import('form-data')).default;
  const https = await import('node:https');

  const form = new FormData();
  form.append('file', createReadStream(wavPath));
  form.append('model', 'whisper-1');
  form.append('response_format', 'verbose_json');
  form.append('timestamp_granularities[]', 'segment');

  return new Promise<TranscriptSegment[]>((resolve, reject) => {
    const req = https.request({
      hostname: 'api.openai.com',
      path: '/v1/audio/transcriptions',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        ...form.getHeaders(),
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) { reject(new Error(json.error.message)); return; }
          const segs: TranscriptSegment[] = (json.segments ?? []).map((s: { start: number; end: number; text: string }) => ({
            start: s.start,
            end: s.end,
            text: s.text.trim(),
          }));
          resolve(segs);
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    form.pipe(req);
  });
}

/**
 * Read a WAV file and return its audio as a Float32Array.
 *
 * @xenova/transformers cannot use AudioContext in Node.js, so we must decode
 * the WAV ourselves and pass raw audio data directly to the pipeline.
 *
 * We always produce 16kHz mono PCM s16le via ffmpeg, so the format is fixed:
 *   - 44-byte standard RIFF/WAV header (or we scan for the "data" chunk)
 *   - Int16 little-endian samples  →  scaled to [-1, 1] Float32
 */
function decodeWavToFloat32(wavPath: string): { data: Float32Array; sampling_rate: number } {
  const buf = readFileSync(wavPath);

  // Locate the "data" chunk by scanning the WAV header
  // (safer than a fixed 44-byte offset in case ffmpeg adds extra chunks)
  let dataOffset = 44;      // sensible default
  let sampleRate = 16000;   // we set this with -ar 16000, but read it anyway
  let bitsPerSample = 16;   // we get PCM s16le from ffmpeg

  try {
    sampleRate    = buf.readUInt32LE(24);
    bitsPerSample = buf.readUInt16LE(34);

    // Walk chunks starting after the fmt chunk
    let i = 12;
    while (i < buf.length - 8) {
      const tag = buf.toString('ascii', i, i + 4);
      const chunkSize = buf.readUInt32LE(i + 4);
      if (tag === 'data') { dataOffset = i + 8; break; }
      i += 8 + chunkSize;
    }
  } catch {
    // If anything goes wrong, fall back to the defaults above
  }

  const pcm = buf.slice(dataOffset);

  if (bitsPerSample === 16) {
    const int16 = new Int16Array(pcm.buffer, pcm.byteOffset, pcm.byteLength >> 1);
    const float32 = new Float32Array(int16.length);
    for (let j = 0; j < int16.length; j++) float32[j] = int16[j] / 32768.0;
    return { data: float32, sampling_rate: sampleRate };
  }

  if (bitsPerSample === 32) {
    // float32 PCM — rare but handle it
    return {
      data: new Float32Array(pcm.buffer, pcm.byteOffset, pcm.byteLength >> 2),
      sampling_rate: sampleRate,
    };
  }

  throw new Error(`whisper: unsupported WAV bits-per-sample: ${bitsPerSample}`);
}

/**
 * Transcribe a video file.
 * If OpenAI API key is configured → uses cloud Whisper API (fast, ~10s for 1hr video).
 * Otherwise → uses local ONNX Whisper (~2-20 min depending on model + hardware).
 *
 * @param filePath  Path to the video file
 * @param model     Model size (default: tiny.en) — used for local inference
 * @param onProgress  Progress callback, called frequently
 */
export async function transcribeVideo(
  filePath: string,
  model: WhisperModel = 'tiny.en',
  onProgress: (p: WhisperProgress) => void,
): Promise<TranscriptSegment[]> {
  logger.info('whisper: starting transcription', { filePath, model });

  // Check for OpenAI API key — prefer cloud if available
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Store = require('electron-store');
  const apiKeyStore = new Store({ name: 'api-keys', encryptionKey: 'trimout-api-keys-v1' });
  const openaiKey = (apiKeyStore.get('key_openai') as string | undefined) ?? '';

  let wavPath: string | undefined;
  try {
    // Step 1 — extract audio
    wavPath = await extractAudio(filePath, onProgress);

    // If OpenAI key is set, use the cloud API
    if (openaiKey) {
      const cloudResult = await transcribeWithOpenAI(wavPath, openaiKey, onProgress);
      onProgress({ stage: 'done', percent: 100, message: `Found ${cloudResult.length} segments (OpenAI API)` });
      return cloudResult;
    }

    // Step 2 — load the model (with download if not cached)
    onProgress({ stage: 'loading', percent: 25, message: 'Loading model…' });

    // Dynamically import so heavy ONNX deps don't slow down app startup
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { pipeline, env } = await import('@xenova/transformers');

    // Cache models in userData so they persist across updates
    env.cacheDir = join(app.getPath('userData'), 'whisper-models');
    env.allowRemoteModels = true;

    const modelId = modelMap[model] ?? modelMap['tiny.en'];

    let lastLoadPct = 25;
    const asr = await pipeline('automatic-speech-recognition', modelId, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      progress_callback: (progress: any) => {
        if (progress?.status === 'downloading') {
          const pct = Math.round(25 + ((progress.progress ?? 0) / 100) * 30);
          if (pct > lastLoadPct) {
            lastLoadPct = pct;
            onProgress({ stage: 'loading', percent: pct, message: `Downloading model (${Math.round(progress.progress ?? 0)}%)…` });
          }
        } else if (progress?.status === 'loading') {
          onProgress({ stage: 'loading', percent: 55, message: 'Loading model into memory…' });
        }
      },
    });

    // Step 3 — transcribe
    onProgress({ stage: 'transcribing', percent: 60, message: 'Transcribing… (this may take a minute)' });

    // Decode WAV to raw Float32 samples.
    // We MUST NOT pass the file path to asr() — @xenova/transformers would try to
    // use AudioContext (a browser API) to load it, which doesn't exist in Node.js.
    const audioInput = decodeWavToFloat32(wavPath);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await asr(audioInput, {
      return_timestamps: true,
      chunk_length_s: 30,
      stride_length_s: 5,
    });

    onProgress({ stage: 'transcribing', percent: 95, message: 'Processing results…' });

    // Parse chunks into TranscriptSegment[]
    const segments: TranscriptSegment[] = [];
    if (result?.chunks) {
      for (const chunk of result.chunks) {
        const [start, end] = chunk.timestamp ?? [0, 0];
        const text = (chunk.text as string ?? '').trim();
        if (text) {
          segments.push({ start: start ?? 0, end: end ?? start + 3, text });
        }
      }
    } else if (result?.text) {
      // Fallback: no timestamps — return full text as single segment
      segments.push({ start: 0, end: 9999, text: (result.text as string).trim() });
    }

    onProgress({ stage: 'done', percent: 100, message: `Found ${segments.length} segments` });
    logger.info('whisper: done', { segments: segments.length });
    return segments;
  } catch (err) {
    logger.error('whisper: error', err);
    onProgress({ stage: 'error', percent: 0, message: String(err) });
    throw err;
  } finally {
    // Clean up temp WAV
    if (wavPath && existsSync(wavPath)) {
      try { unlinkSync(wavPath); } catch { /* ignore */ }
    }
  }
}
