import { createServer } from 'node:http';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

// eslint-disable-next-line import/no-extraneous-dependencies
import { afterEach, describe, expect, it } from 'vitest';

import { cancelKickoFileUpload, inspectKickoFile, uploadKickoFile } from './kickoHandoffTransport.js';

const tempPaths: string[] = [];

afterEach(async () => {
  await Promise.all(tempPaths.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

async function makeClip(contents: string) {
  const directory = await mkdtemp(join(tmpdir(), 'trimout-kicko-'));
  tempPaths.push(directory);
  const filePath = join(directory, 'clip.mp4');
  await writeFile(filePath, contents);
  return filePath;
}

describe('KICKO handoff transport', () => {
  it('hashes a local clip without exposing its path in the result', async () => {
    const filePath = await makeClip('streamed-video-bytes');
    const result = await inspectKickoFile(filePath);
    expect(result).toMatchObject({
      fileName: 'clip.mp4',
      sizeBytes: 20,
      sha256: 'fca6928e2903a2e1f2bae49abe626a8f59974a8d01437985b41ce0743392e8ed',
    });
    expect(result).not.toHaveProperty('filePath');
  });

  it('streams the exact file to a loopback signed URL with bounded headers', async () => {
    const filePath = await makeClip('exact-upload-body');
    const inspected = await inspectKickoFile(filePath);
    let receivedBody = '';
    let receivedType = '';
    const server = createServer((request, response) => {
      receivedType = String(request.headers['content-type'] || '');
      request.setEncoding('utf8');
      request.on('data', (chunk) => { receivedBody += chunk; });
      request.on('end', () => { response.statusCode = 200; response.end(); });
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    try {
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('Test server did not start.');
      await expect(uploadKickoFile({
        operationId: 'upload_test_1',
        filePath,
        uploadUrl: `http://127.0.0.1:${address.port}/signed`,
        headers: { 'Content-Type': 'video/mp4' },
        expectedSizeBytes: inspected.sizeBytes,
        expectedMtimeMs: inspected.mtimeMs,
      }, { allowInsecureLoopback: true })).resolves.toEqual({ status: 200 });
      expect(receivedBody).toBe('exact-upload-body');
      expect(receivedType).toBe('video/mp4');
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    }
  });

  it('closes the local file stream when an upload target rejects early', async () => {
    const filePath = await makeClip('rejected-upload-body'.repeat(1024 * 256));
    const inspected = await inspectKickoFile(filePath);
    const server = createServer((_request, response) => {
      response.statusCode = 403;
      response.end('rejected');
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    try {
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('Test server did not start.');
      await expect(uploadKickoFile({
        operationId: 'upload_rejected_1',
        filePath,
        uploadUrl: `http://127.0.0.1:${address.port}/signed`,
        headers: { 'Content-Type': 'video/mp4' },
        expectedSizeBytes: inspected.sizeBytes,
        expectedMtimeMs: inspected.mtimeMs,
      }, { allowInsecureLoopback: true })).rejects.toThrow('KICKO file transfer failed (403)');
      await delay(100);
      expect(cancelKickoFileUpload('upload_rejected_1')).toBe(false);
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    }
  });

  it('rejects changed files, insecure hosts, and privileged headers before transfer', async () => {
    const filePath = await makeClip('before');
    const inspected = await inspectKickoFile(filePath);
    await writeFile(filePath, 'after-change');

    await expect(uploadKickoFile({
      operationId: 'upload_test_2',
      filePath,
      uploadUrl: 'https://uploads.example/signed',
      expectedSizeBytes: inspected.sizeBytes,
      expectedMtimeMs: inspected.mtimeMs,
    })).rejects.toThrow('changed after it was checked');

    await expect(uploadKickoFile({
      operationId: 'upload_test_3',
      filePath,
      uploadUrl: 'http://uploads.example/signed',
      expectedSizeBytes: 12,
      expectedMtimeMs: inspected.mtimeMs,
    })).rejects.toThrow('insecure upload address');

    const changedInspection = await inspectKickoFile(filePath);
    await expect(uploadKickoFile({
      operationId: 'upload_test_4',
      filePath,
      uploadUrl: 'https://uploads.example/signed',
      headers: { Authorization: 'secret' },
      expectedSizeBytes: changedInspection.sizeBytes,
      expectedMtimeMs: changedInspection.mtimeMs,
    })).rejects.toThrow('unsupported upload header');
  });

  it('cancels an active upload and releases its operation id', async () => {
    const filePath = await makeClip('cancel-me');
    const inspected = await inspectKickoFile(filePath);
    let markStarted: (() => void) | undefined;
    const started = new Promise<void>((resolve) => { markStarted = resolve; });
    const fetchImpl: typeof fetch = async (_url, init) => {
      markStarted?.();
      const signal = init?.signal;
      return new Promise<Response>((_resolve, reject) => {
        signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
      });
    };
    const operationId = 'upload_cancel_1';
    const upload = uploadKickoFile({
      operationId,
      filePath,
      uploadUrl: 'https://uploads.example/signed',
      expectedSizeBytes: inspected.sizeBytes,
      expectedMtimeMs: inspected.mtimeMs,
    }, { fetchImpl });
    await started;
    expect(cancelKickoFileUpload(operationId)).toBe(true);
    await expect(upload).rejects.toThrow('upload was cancelled');
    expect(cancelKickoFileUpload(operationId)).toBe(false);
  });
});
