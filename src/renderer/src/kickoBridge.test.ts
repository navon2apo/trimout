import { readFile } from 'node:fs/promises';

// eslint-disable-next-line import/no-extraneous-dependencies
import { describe, expect, it, vi } from 'vitest';

import { addExportBatch, createTrimoutProject } from './projectModel';
import {
  connectToKicko,
  getKickoUploadInfo,
  listKickoProjects,
  sendProjectToKicko,
  type KickoBridgeDependencies,
} from './kickoBridge';

const NOW = Date.parse('2026-07-13T12:00:00.000Z');
const EXPIRES_AT = '2026-07-13T12:10:00.000Z';

function makeProject() {
  const project = createTrimoutProject({ name: 'Alex 2026', playerName: 'Alex', scoutRole: 'cm8', now: '2026-07-13T11:00:00.000Z' });
  return addExportBatch(project, {
    sourcePath: String.raw`C:\games\match.mp4`,
    exportedPlays: [{
      filePath: String.raw`C:\exports\under-pressure.mp4`,
      actionType: 'reception_pressure',
      actionLabel: 'Under pressure',
      duration: 12,
      favorite: true,
    }],
    now: '2026-07-13T11:30:00.000Z',
  });
}

function dependencies(overrides: Partial<KickoBridgeDependencies> = {}): Partial<KickoBridgeDependencies> {
  return {
    inspectFile: vi.fn(async () => ({
      fileName: 'under-pressure.mp4',
      sizeBytes: 1200,
      mtimeMs: 123456,
      sha256: 'a'.repeat(64),
    })),
    uploadFile: vi.fn(async () => ({ status: 200 })),
    cancelUpload: vi.fn(async () => true),
    openExternal: vi.fn(async () => undefined),
    sleep: vi.fn(async () => undefined),
    now: () => NOW,
    randomId: () => 'upload_operation_1',
    getAppVersion: () => '1.1.1',
    digestText: vi.fn(async () => 'b'.repeat(64)),
    ...overrides,
  };
}

describe('paid KICKO handoff', () => {
  it('stops free preview before projects, grants, signed URLs, or uploads', async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    const deps = dependencies({
      requestJson: vi.fn(async (url: string, init?: RequestInit) => {
        calls.push({ url, init });
        if (url.endsWith('/api/trimout/handoffs')) {
          return {
            ok: true,
            handoffId: 'handoff-1',
            deviceSecret: 's'.repeat(43),
            userCode: 'ABCD-2345',
            expiresAt: EXPIRES_AT,
            verificationUrl: 'https://kicko.example/mvp/trimout-connect.html?code=ABCD-2345',
          };
        }
        if (url.endsWith('/api/trimout/handoffs/status')) return { ok: true, status: 'subscription_required' };
        throw new Error(`Unexpected request: ${url}`);
      }),
    });

    await expect(connectToKicko({ project: makeProject(), baseUrl: 'https://kicko.example', dependencies: deps })).rejects.toMatchObject({
      code: 'subscription_required',
      status: 402,
    });
    const paths = calls.map(({ url }) => new URL(url).pathname);
    expect(paths).toEqual(['/api/trimout/handoffs', '/api/trimout/handoffs/status']);
    expect(paths.some((path) => path.includes('/grants') || path.includes('/projects') || path.includes('/finalize'))).toBe(false);
    const creationBody = JSON.parse(String(calls[0]?.init?.body));
    expect(creationBody).toMatchObject({
      expectedClipCount: 1,
      expectedTotalSizeBytes: 1200,
      selectedDurationSeconds: 12,
      sourceAppVersion: '1.1.1',
    });
    expect(JSON.stringify(creationBody)).not.toContain('C:\\');
    expect(deps.uploadFile).not.toHaveBeenCalled();
  });

  it('uploads through one-time grants, validates, and finalizes in the selected order', async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    const requestJson = vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      if (url.endsWith('/api/trimout/handoffs')) {
        return {
          ok: true,
          handoffId: 'handoff-2',
          deviceSecret: 't'.repeat(43),
          userCode: 'EFGH-6789',
          expiresAt: EXPIRES_AT,
          verificationUrl: 'https://kicko.example/mvp/trimout-connect.html?code=EFGH-6789',
        };
      }
      if (url.endsWith('/api/trimout/handoffs/status')) return { ok: true, status: 'ready_for_upload' };
      if (url.endsWith('/api/trimout/handoffs/projects')) return { ok: true, projects: [{ id: 'project-old', title: 'Season reel', clipCount: 4 }] };
      if (url.endsWith('/api/trimout/handoffs/grants')) {
        return {
          ok: true,
          grantId: 'grant-1',
          status: 'issued',
          uploadRequired: true,
          uploadUrl: 'https://storage.example/signed-upload',
          headers: { 'Content-Type': 'video/mp4' },
        };
      }
      if (url.endsWith('/api/trimout/handoffs/grants/grant-1/complete')) return { ok: true, grantId: 'grant-1', status: 'validated' };
      if (url.endsWith('/api/trimout/handoffs/finalize')) return { ok: true, projectId: 'project-new', status: 'completed', importedClipCount: 1 };
      throw new Error(`Unexpected request: ${url}`);
    });
    const uploadFile = vi.fn(async () => ({ status: 200 }));
    const deps = dependencies({ requestJson, uploadFile });
    const project = makeProject();
    const connection = await connectToKicko({ project, baseUrl: 'https://kicko.example', dependencies: deps });
    await expect(listKickoProjects(connection, deps)).resolves.toEqual([expect.objectContaining({ id: 'project-old', title: 'Season reel', clipCount: 4 })]);
    await expect(sendProjectToKicko({ connection, project, destinationProjectId: null, dependencies: deps })).resolves.toEqual({
      projectId: 'project-new',
      openUrl: 'https://kicko.example/mvp/?projectId=project-new',
    });

    expect(uploadFile).toHaveBeenCalledWith(expect.objectContaining({
      filePath: String.raw`C:\exports\under-pressure.mp4`,
      uploadUrl: 'https://storage.example/signed-upload',
      expectedSizeBytes: 1200,
      expectedMtimeMs: 123456,
    }));
    const grantCall = calls.find(({ url }) => url.endsWith('/api/trimout/handoffs/grants'));
    expect(JSON.parse(String(grantCall?.init?.body))).toMatchObject({
      contentType: 'video/mp4',
      sha256: 'a'.repeat(64),
      clip: { actionType: 'reception_pressure', rating: 'strong', order: 0, durationSeconds: 12, isOpeningCandidate: true },
    });
    const finalizeCall = calls.find(({ url }) => url.endsWith('/api/trimout/handoffs/finalize'));
    expect(JSON.parse(String(finalizeCall?.init?.body))).toEqual({ destinationProjectId: null, title: 'Alex 2026' });
    expect(calls.filter(({ init }) => String((init?.headers as Record<string, string> | undefined)?.Authorization || '').startsWith('TrimOut ')).length).toBeGreaterThan(0);
  });

  it('contains no active legacy device or MVP bridge endpoints', async () => {
    const source = await readFile(new URL('kickoBridge.ts', import.meta.url), 'utf8');
    expect(source).not.toContain('/api/trimout/device/');
    expect(source).not.toContain('/api/mvp/');
    expect(source).not.toContain('Authorization: `Bridge ');
    expect(source).not.toContain('readFile(');
  });

  it('accepts shared KICKO video containers and rejects unsupported files', () => {
    expect(getKickoUploadInfo('match clip.WMV')).toEqual({ extension: 'wmv', contentType: 'video/x-ms-wmv' });
    expect(getKickoUploadInfo('match clip.webm')).toEqual({ extension: 'webm', contentType: 'video/webm' });
    expect(() => getKickoUploadInfo('clip.ts')).toThrow('KICKO cannot upload clips .ts');
    expect(() => getKickoUploadInfo('clip')).toThrow('without a file extension');
  });
});
