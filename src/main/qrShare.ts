/**
 * QR-share — local network file transfer.
 *
 * Spins up a tiny HTTP server on the user's LAN that serves a single file
 * behind a random one-time token. Phone scans QR → downloads directly.
 * No cloud, no login, no telemetry.
 *
 * Security model:
 *   • Token is 32 random bytes (base64url) — unguessable
 *   • Server exposes ONLY the one file currently being shared
 *   • Auto-expires after 15 min (default), or on explicit stop()
 *   • All other paths return 404
 *   • Real filesystem path is never exposed to the phone
 */
import http, { type IncomingMessage, type ServerResponse } from 'node:http';
import { networkInterfaces } from 'node:os';
import { createReadStream, statSync, existsSync } from 'node:fs';
import { basename, extname } from 'node:path';
import { randomBytes } from 'node:crypto';
import logger from './logger.js';

export type ShareStatus = 'ready' | 'downloading' | 'completed' | 'expired' | 'stopped' | 'error';

export interface ShareSession {
  token: string;
  url: string; // http://<local-ip>:<port>/<token>
  fileName: string; // display name only
  fileSize: number; // bytes
  port: number;
  expiresAt: number; // epoch ms
}

export interface ShareEvent {
  status: ShareStatus;
  bytesSent?: number;
  totalBytes?: number;
  errorMessage?: string;
}

const PREFERRED_PORT = 8765;
const PORT_RANGE_END = 8800;
const DEFAULT_TTL_MS = 15 * 60 * 1000; // 15 minutes

// MIME mapping for common video/audio formats — keeps phone players happy
const MIME_BY_EXT: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.mkv': 'video/x-matroska',
  '.webm': 'video/webm',
  '.avi': 'video/x-msvideo',
  '.m4v': 'video/x-m4v',
  '.mp3': 'audio/mpeg',
  '.aac': 'audio/aac',
  '.wav': 'audio/wav',
  '.json': 'application/json',
};

function getMime(filePath: string): string {
  return MIME_BY_EXT[extname(filePath).toLowerCase()] ?? 'application/octet-stream';
}

/** Return the first non-internal IPv4 address — that's the LAN-reachable one. */
export function getLocalIp(): string | null {
  const nets = networkInterfaces();
  // Prefer common LAN prefixes; fall back to anything non-internal
  const candidates: string[] = [];
  const SKIP_INTERFACE = /vEthernet|Docker|WSL|Loopback|VMware|VirtualBox/i;
  for (const [name, addrs] of Object.entries(nets)) {
    // Skip virtual / Docker / Hyper-V interfaces — not reachable from a phone
    if (!addrs || SKIP_INTERFACE.test(name)) {
      // no-op
    } else {
      for (const addr of addrs) {
        if (addr.family === 'IPv4' && !addr.internal) candidates.push(addr.address);
      }
    }
  }
  // 192.168.* and 10.* are the most common home / hotspot ranges
  return candidates.find((ip) => ip.startsWith('192.168.') || ip.startsWith('10.'))
    ?? candidates[0]
    ?? null;
}

function tryListen(server: http.Server, port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    let onListen: () => void;
    const onError = (err: NodeJS.ErrnoException) => {
      server.removeListener('listening', onListen);
      reject(err);
    };
    onListen = () => {
      server.removeListener('error', onError);
      resolve();
    };
    server.once('error', onError);
    server.once('listening', onListen);
    server.listen(port, '0.0.0.0');
  });
}

/** Find an available port in PREFERRED_PORT..PORT_RANGE_END. */
async function listenOnFreePort(server: http.Server): Promise<number> {
  for (let port = PREFERRED_PORT; port <= PORT_RANGE_END; port += 1) {
    try {
      await tryListen(server, port);
      return port;
    } catch (err) {
      const e = err as NodeJS.ErrnoException;
      if (e.code !== 'EADDRINUSE') throw err;
      // try the next port
    }
  }
  throw new Error(`No free port in ${PREFERRED_PORT}–${PORT_RANGE_END}`);
}

function buildDownloadPage(fileName: string, fileSize: number, token: string): string {
  const sizeMB = (fileSize / (1024 * 1024)).toFixed(1);
  // Tiny, RTL-friendly download page. No external assets — works fully offline.
  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">
<title>TrimOut · הורד קובץ</title>
<style>
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  html, body { margin: 0; padding: 0; background: #0a0f19; color: #e2e8f0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif; min-height: 100vh; }
  .wrap { padding: 32px 22px; max-width: 480px; margin: 0 auto; min-height: 100vh; display: flex; flex-direction: column; justify-content: center; }
  .card { background: #131a28; border: 1px solid #1e2738; border-radius: 16px; padding: 24px; box-shadow: 0 16px 48px rgba(0,0,0,0.4); }
  .brand { font-size: 11px; color: #475569; letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 18px; text-align: center; }
  .icon { font-size: 48px; text-align: center; margin-bottom: 12px; }
  .name { font-size: 15px; font-weight: 600; color: #f1f5f9; text-align: center; word-break: break-word; line-height: 1.4; margin-bottom: 4px; }
  .size { font-size: 13px; color: #64748b; text-align: center; margin-bottom: 24px; }
  .btn { display: block; width: 100%; padding: 16px; background: linear-gradient(135deg, #10b981, #14b8a6); color: #fff; border: none; border-radius: 12px; font-size: 16px; font-weight: 700; text-decoration: none; text-align: center; cursor: pointer; box-shadow: 0 4px 16px rgba(20,184,166,0.35); transition: transform 0.1s; }
  .btn:active { transform: scale(0.98); }
  .hint { font-size: 11.5px; color: #64748b; text-align: center; margin-top: 18px; line-height: 1.6; }
</style>
</head>
<body>
<div class="wrap">
  <div class="brand">✂️ TrimOut</div>
  <div class="card">
    <div class="icon">📥</div>
    <div class="name">${fileName.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')}</div>
    <div class="size">${sizeMB} MB</div>
    <a class="btn" href="/${token}/file" download="${fileName.replaceAll('"', '&quot;')}">⬇ הורד עכשיו</a>
    <div class="hint">לחיצה תפתח את שמירת הקובץ במכשיר. אם זה לא קורה, פתח את האפליקציה ולחץ הורד מהדף.</div>
  </div>
</div>
</body>
</html>`;
}

class QrShareServer {
  private server: http.Server | null = null;

  private session: ShareSession | null = null;

  private filePath: string | null = null;

  private expiryTimer: NodeJS.Timeout | null = null;

  private listeners = new Set<(e: ShareEvent) => void>();

  onEvent(cb: (e: ShareEvent) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private emit(e: ShareEvent) {
    for (const cb of this.listeners) {
      try { cb(e); } catch (err) { logger.warn('qrShare listener threw', err); }
    }
  }

  isActive(): boolean { return this.session != null; }

  getSession(): ShareSession | null { return this.session; }

  async start(filePath: string, ttlMs: number = DEFAULT_TTL_MS): Promise<ShareSession> {
    if (this.session) await this.stop();

    if (!existsSync(filePath)) throw new Error(`File not found: ${filePath}`);
    const stat = statSync(filePath);
    if (!stat.isFile()) throw new Error('Path is not a file');

    const localIp = getLocalIp();
    if (!localIp) throw new Error('No local network interface found — are you on a network?');

    const token = randomBytes(24).toString('base64url');
    const fileName = basename(filePath);

    this.filePath = filePath;

    this.server = http.createServer((req, res) => this.handle(req, res));
    const port = await listenOnFreePort(this.server);
    const url = `http://${localIp}:${port}/${token}`;
    const expiresAt = Date.now() + ttlMs;

    this.session = {
      token,
      url,
      fileName,
      fileSize: stat.size,
      port,
      expiresAt,
    };

    this.expiryTimer = setTimeout(async () => {
      logger.info('qrShare expired, stopping');
      this.emit({ status: 'expired' });
      try { await this.stop(); } catch (err) { logger.warn('expire stop failed', err); }
    }, ttlMs);

    logger.info('qrShare started', { url, fileName, fileSize: stat.size, port });
    this.emit({ status: 'ready' });
    return this.session;
  }

  async stop(): Promise<void> {
    if (this.expiryTimer) {
      clearTimeout(this.expiryTimer);
      this.expiryTimer = null;
    }
    if (this.server) {
      await new Promise<void>((resolve) => { this.server!.close(() => resolve()); });
      this.server = null;
    }
    this.session = null;
    this.filePath = null;
    logger.info('qrShare stopped');
    this.emit({ status: 'stopped' });
  }

  private handle(req: IncomingMessage, res: ServerResponse) {
    const { session, filePath } = this;
    if (!session || !filePath) {
      res.statusCode = 404;
      res.end();
      return;
    }

    const url = req.url ?? '';
    const expectedDownloadPage = `/${session.token}`;
    const expectedFile = `/${session.token}/file`;

    // CORS / cache headers
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    if (url === expectedDownloadPage || url === `${expectedDownloadPage}/`) {
      const html = buildDownloadPage(session.fileName, session.fileSize, session.token);
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(html);
      return;
    }

    if (url === expectedFile) {
      this.serveFile(req, res, filePath, session);
      return;
    }

    // Anything else — silent 404 (don't reveal that we exist)
    res.statusCode = 404;
    res.end();
  }

  private serveFile(req: IncomingMessage, res: ServerResponse, filePath: string, session: ShareSession) {
    let stat;
    try {
      stat = statSync(filePath);
    } catch (err) {
      logger.error('qrShare stat failed', err);
      res.statusCode = 500;
      res.end();
      this.emit({ status: 'error', errorMessage: 'File disappeared' });
      return;
    }

    const total = stat.size;
    const { range } = req.headers;
    const mime = getMime(filePath);

    // Range request — required for iOS Safari video playback / save-to-camera-roll
    if (range) {
      const match = range.match(/bytes=(\d+)-(\d*)/);
      if (match) {
        const start = Number.parseInt(match[1]!, 10);
        const end = match[2] ? Number.parseInt(match[2], 10) : total - 1;
        if (Number.isNaN(start) || start > total - 1 || end > total - 1) {
          res.statusCode = 416;
          res.setHeader('Content-Range', `bytes */${total}`);
          res.end();
          return;
        }
        const chunkSize = end - start + 1;
        res.statusCode = 206;
        res.setHeader('Content-Range', `bytes ${start}-${end}/${total}`);
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Content-Length', String(chunkSize));
        res.setHeader('Content-Type', mime);
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(session.fileName)}`);

        this.emit({ status: 'downloading', bytesSent: 0, totalBytes: total });
        const stream = createReadStream(filePath, { start, end });
        let bytesSent = 0;
        stream.on('data', (chunk) => {
          bytesSent += chunk.length;
          this.emit({ status: 'downloading', bytesSent: start + bytesSent, totalBytes: total });
        });
        stream.on('end', () => {
          // Note: a single range request doesn't necessarily mean the full download is done
          if (start + bytesSent >= total) this.emit({ status: 'completed', bytesSent: total, totalBytes: total });
        });
        stream.on('error', (err) => {
          logger.error('qrShare stream error', err);
          this.emit({ status: 'error', errorMessage: err.message });
        });
        stream.pipe(res);
        return;
      }
    }

    // Full-file response
    res.statusCode = 200;
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Length', String(total));
    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(session.fileName)}`);

    this.emit({ status: 'downloading', bytesSent: 0, totalBytes: total });
    const stream = createReadStream(filePath);
    let bytesSent = 0;
    stream.on('data', (chunk) => {
      bytesSent += chunk.length;
      this.emit({ status: 'downloading', bytesSent, totalBytes: total });
    });
    stream.on('end', () => this.emit({ status: 'completed', bytesSent: total, totalBytes: total }));
    stream.on('error', (err) => {
      logger.error('qrShare stream error', err);
      this.emit({ status: 'error', errorMessage: err.message });
    });
    stream.pipe(res);
  }
}

// Singleton — only one share at a time
const instance = new QrShareServer();
export default instance;
