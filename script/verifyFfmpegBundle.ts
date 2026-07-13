import { spawnSync } from 'node:child_process';
import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const REQUIRED_FILES = ['ffmpeg.exe', 'ffprobe.exe'];
const REQUIRED_DLL_FAMILIES = ['avcodec', 'avformat', 'avutil', 'swresample', 'swscale'];

export function findMissingFfmpegBundleEntries(fileNames: string[]) {
  const normalized = new Set(fileNames.map((fileName) => fileName.toLowerCase()));
  return [
    ...REQUIRED_FILES.filter((fileName) => !normalized.has(fileName)),
    ...REQUIRED_DLL_FAMILIES
      .filter((family) => !fileNames.some((fileName) => new RegExp(`^${family}-\\d+\\.dll$`, 'i').test(fileName)))
      .map((family) => `${family}-<version>.dll`),
  ];
}

async function verifyExecutable(filePath: string) {
  const file = await stat(filePath);
  if (!file.isFile() || file.size === 0) throw new Error(`${filePath} is empty or is not a file.`);
  const result = spawnSync(filePath, ['-version'], { encoding: 'utf8', shell: false, windowsHide: true });
  if (result.status !== 0 || !/^ff(?:mpeg|probe) version /i.test(result.stdout || '')) {
    throw new Error(`${filePath} could not report its version.`);
  }
}

export async function verifyFfmpegBundle(target = 'win32-x64') {
  if (!/^win32-(?:x64|arm64)$/.test(target)) throw new Error(`Unsupported FFmpeg bundle target: ${target}`);
  const bundlePath = join('ffmpeg', target, 'lib');
  const fileNames = await readdir(bundlePath);
  const missing = findMissingFfmpegBundleEntries(fileNames);
  if (missing.length > 0) throw new Error(`FFmpeg bundle is incomplete: ${missing.join(', ')}`);
  await Promise.all(REQUIRED_FILES.map((fileName) => verifyExecutable(join(bundlePath, fileName))));
  return bundlePath;
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === invokedPath) {
  const target = process.argv[2] || 'win32-x64';
  const verifiedPath = await verifyFfmpegBundle(target);
  console.log(`Verified FFmpeg bundle: ${verifiedPath}`);
}
