import { spawn } from 'node:child_process';
import { access, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { basename, join, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';

type CdpTarget = { type?: string, webSocketDebuggerUrl?: string };
type CdpResult = { id?: number, error?: { message?: string }, result?: unknown };

const executablePath = resolve('dist', 'win-unpacked', 'KICKO TrimOut.exe');
const mediaPath = process.argv[2] ? resolve(process.argv[2]) : undefined;
const screenshotPath = process.argv[3]
  ? resolve(process.argv[3])
  : join(tmpdir(), 'kicko-trimout-packaged-qa.png');

await Promise.all([access(executablePath), ...(mediaPath ? [access(mediaPath)] : [])]);

const port = 9300 + Math.floor(Math.random() * 400);
const userDataDir = await mkdtemp(join(tmpdir(), 'kicko-trimout-packaged-qa-'));
const child = spawn(executablePath, [
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${userDataDir}`,
  ...(mediaPath ? [mediaPath] : []),
], { stdio: 'ignore' });

async function getTarget() {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
      if (response.ok) {
        const targets = await response.json() as CdpTarget[];
        const target = targets.find(({ type, webSocketDebuggerUrl }) => type === 'page' && webSocketDebuggerUrl);
        if (target?.webSocketDebuggerUrl) return target.webSocketDebuggerUrl;
      }
    } catch {
      // The debug endpoint is not ready yet.
    }
    await new Promise((done) => setTimeout(done, 200));
  }
  throw new Error('The packaged app did not expose its renderer in time.');
}

let socket: WebSocket | undefined;
try {
  socket = new WebSocket(await getTarget());
  await new Promise<void>((done, reject) => {
    socket?.addEventListener('open', () => done(), { once: true });
    socket?.addEventListener('error', () => reject(new Error('Could not connect to the packaged renderer.')), { once: true });
  });

  let nextId = 1;
  const pending = new Map<number, { resolve: (value: unknown) => void, reject: (reason: Error) => void }>();
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(String(event.data)) as CdpResult;
    if (message.id == null) return;
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    if (message.error) request.reject(new Error(message.error.message || 'CDP request failed.'));
    else request.resolve(message.result);
  });

  const call = (method: string, params: Record<string, unknown> = {}) => new Promise<unknown>((done, reject) => {
    const id = nextId++;
    pending.set(id, { resolve: done, reject });
    socket?.send(JSON.stringify({ id, method, params }));
  });

  await call('Page.enable');
  const expression = `(() => {
    const bodyText = document.body?.innerText || '';
    const video = document.querySelector('video');
    return {
      title: document.title,
      bodyText,
      videoCount: document.querySelectorAll('video').length,
      videoReadyState: video?.readyState ?? -1,
      videoDuration: Number.isFinite(video?.duration) ? video.duration : null,
      logoVisible: [...document.images].some((image) => image.src.includes('trimout-logo') && image.getBoundingClientRect().width > 0),
    };
  })()`;

  let state: {
    title: string,
    bodyText: string,
    videoCount: number,
    videoReadyState: number,
    videoDuration: number | null,
    logoVisible: boolean,
  } | undefined;
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    const evaluated = await call('Runtime.evaluate', { expression, returnByValue: true }) as {
      result?: { value?: typeof state },
    };
    state = evaluated.result?.value;
    const expectedSurfaceReady = mediaPath ? state?.videoReadyState != null && state.videoReadyState >= 1 : state?.logoVisible;
    if (state && state.title.includes('KICKO TrimOut 1.2.0') && expectedSurfaceReady) break;
    await new Promise((done) => setTimeout(done, 300));
  }

  if (!state) throw new Error('The packaged renderer did not return a QA state.');
  if (!state.title.includes('KICKO TrimOut 1.2.0')) throw new Error(`Unexpected packaged title: ${state.title}`);
  if (state.bodyText.includes('Something went wrong')) throw new Error('The packaged app opened its error boundary.');
  if (state.bodyText.includes('Failed to load FFmpeg')) throw new Error('The packaged app could not load FFmpeg.');
  if (/\p{Script=Hebrew}/u.test(state.bodyText)) throw new Error('The packaged app displayed Hebrew text.');
  if (mediaPath && (state.videoCount < 1 || state.videoReadyState < 1 || state.videoDuration == null)) {
    throw new Error('The packaged player did not load the QA video.');
  }
  if (!mediaPath && !state.logoVisible) throw new Error('The TrimOut logo is not visible on the start screen.');

  const screenshot = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }) as { data?: string };
  if (!screenshot.data) throw new Error('The packaged app screenshot was not captured.');
  await writeFile(screenshotPath, Buffer.from(screenshot.data, 'base64'));

  console.log(JSON.stringify({
    title: state.title,
    mode: mediaPath ? 'media' : 'home',
    media: mediaPath ? basename(mediaPath) : null,
    videoReadyState: mediaPath ? state.videoReadyState : null,
    videoDuration: mediaPath ? state.videoDuration : null,
    logoVisible: state.logoVisible,
    englishOnly: true,
    screenshotPath,
  }, null, 2));

  socket.send(JSON.stringify({ id: nextId++, method: 'Browser.close' }));
} finally {
  socket?.close();
  if (child.exitCode == null) child.kill();
  await new Promise((done) => setTimeout(done, 500));

  const resolvedTemp = `${resolve(tmpdir())}${sep}`.toLowerCase();
  const resolvedUserData = resolve(userDataDir).toLowerCase();
  if (!resolvedUserData.startsWith(resolvedTemp) || !basename(resolvedUserData).startsWith('kicko-trimout-packaged-qa-')) {
    throw new Error('Refusing to remove an unexpected QA directory.');
  }
  await rm(userDataDir, { recursive: true, force: true });
}
