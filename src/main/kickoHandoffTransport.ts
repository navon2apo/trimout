import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { basename, isAbsolute } from 'node:path';
import { Readable } from 'node:stream';

const MAX_SIGNED_URL_LENGTH = 12_000;
const ALLOWED_UPLOAD_HEADERS = new Set([
  'content-type',
  'content-md5',
  'x-amz-checksum-sha256',
  'x-amz-meta-trimout-sha256',
  'x-amz-meta-trimout-grant-id',
  'x-amz-meta-trimout-grant-version',
  'x-amz-meta-trimout-handoff-id',
]);

const activeUploads = new Map<string, AbortController>();

export interface KickoFileInspection {
  fileName: string;
  sizeBytes: number;
  mtimeMs: number;
  sha256: string;
}

export interface KickoFileUploadInput {
  operationId: string;
  filePath: string;
  uploadUrl: string;
  headers?: Record<string, string>;
  expectedSizeBytes: number;
  expectedMtimeMs: number;
}

function assertLocalFilePath(filePath: string) {
  if (typeof filePath !== 'string' || filePath.length === 0 || filePath.length > 32_767 || !isAbsolute(filePath)) {
    throw new Error('The exported clip path is invalid.');
  }
}

function normalizeUploadHeaders(headers: Record<string, string> | undefined, sizeBytes: number) {
  const normalized: Record<string, string> = {};
  for (const [name, value] of Object.entries(headers ?? {})) {
    const lowerName = name.toLowerCase();
    if (!ALLOWED_UPLOAD_HEADERS.has(lowerName)) throw new Error('KICKO returned an unsupported upload header.');
    if (typeof value !== 'string' || value.length === 0 || value.length > 512 || /[\r\n]/.test(value)) {
      throw new Error('KICKO returned an invalid upload header.');
    }
    normalized[lowerName] = value;
  }
  normalized['content-length'] = String(sizeBytes);
  return normalized;
}

function parseUploadUrl(value: string, allowInsecureLoopback: boolean) {
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_SIGNED_URL_LENGTH) {
    throw new Error('KICKO returned an invalid upload address.');
  }
  const url = new URL(value);
  const loopback = url.hostname === '127.0.0.1' || url.hostname === 'localhost' || url.hostname === '::1';
  if (url.protocol !== 'https:' && !(allowInsecureLoopback && loopback && url.protocol === 'http:')) {
    throw new Error('KICKO returned an insecure upload address.');
  }
  if (url.username || url.password) throw new Error('KICKO returned an invalid upload address.');
  return url;
}

async function readStableFileStats(filePath: string) {
  const fileStats = await stat(filePath);
  if (!fileStats.isFile() || fileStats.size <= 0) throw new Error('The exported clip is empty or unavailable.');
  return fileStats;
}

export async function inspectKickoFile(filePath: string): Promise<KickoFileInspection> {
  assertLocalFilePath(filePath);
  const before = await readStableFileStats(filePath);
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(filePath)) hash.update(chunk as Buffer);
  const after = await readStableFileStats(filePath);
  if (after.size !== before.size || after.mtimeMs !== before.mtimeMs) {
    throw new Error('The exported clip changed while it was being checked.');
  }
  return {
    fileName: basename(filePath),
    sizeBytes: after.size,
    mtimeMs: after.mtimeMs,
    sha256: hash.digest('hex'),
  };
}

export async function uploadKickoFile(input: KickoFileUploadInput, {
  allowInsecureLoopback = false,
  fetchImpl = fetch,
}: {
  allowInsecureLoopback?: boolean;
  fetchImpl?: typeof fetch;
} = {}): Promise<{ status: number }> {
  assertLocalFilePath(input.filePath);
  if (!/^[A-Za-z0-9_-]{8,128}$/.test(input.operationId)) throw new Error('The upload operation is invalid.');
  if (!Number.isSafeInteger(input.expectedSizeBytes) || input.expectedSizeBytes <= 0) throw new Error('The upload size is invalid.');
  if (!Number.isFinite(input.expectedMtimeMs) || input.expectedMtimeMs <= 0) throw new Error('The upload file version is invalid.');
  if (activeUploads.has(input.operationId)) throw new Error('This upload is already running.');

  const uploadUrl = parseUploadUrl(input.uploadUrl, allowInsecureLoopback);
  const before = await readStableFileStats(input.filePath);
  if (before.size !== input.expectedSizeBytes || before.mtimeMs !== input.expectedMtimeMs) {
    throw new Error('The exported clip changed after it was checked. Check the project again.');
  }

  const controller = new AbortController();
  activeUploads.set(input.operationId, controller);
  try {
    const body = Readable.toWeb(createReadStream(input.filePath)) as ReadableStream<Uint8Array>;
    const response = await fetchImpl(uploadUrl, {
      method: 'PUT',
      headers: normalizeUploadHeaders(input.headers, before.size),
      body,
      duplex: 'half',
      redirect: 'error',
      signal: controller.signal,
    } as RequestInit & { duplex: 'half' });
    if (!response.ok) throw new Error(`KICKO file transfer failed (${response.status}).`);

    const after = await readStableFileStats(input.filePath);
    if (after.size !== before.size || after.mtimeMs !== before.mtimeMs) {
      throw new Error('The exported clip changed during upload. Check the project again.');
    }
    return { status: response.status };
  } catch (error) {
    if (controller.signal.aborted) throw new Error('The KICKO upload was cancelled.');
    throw error;
  } finally {
    activeUploads.delete(input.operationId);
  }
}

export function cancelKickoFileUpload(operationId: string): boolean {
  const controller = activeUploads.get(operationId);
  if (!controller) return false;
  controller.abort();
  return true;
}
