/**
 * Draws the player lock on a canvas: the dimmed field, the ring, and the name card.
 * The on-screen preview and the export both draw with this, so they look the same.
 */
import type { SpotMark } from '../types';
import { cardPosition, type LockState } from './playerLock';

export const LOCK_COLOR = '#d2ff00';
const LOCK_COLOR_BLACK = '#0a0d12';
const HEBREW = /[֐-׿]/;

export interface LockDrawOptions {
  width: number,
  height: number,
  spot: SpotMark,
  /** The name on the card (empty = no card) */
  label: string,
  /** The action, big at the top of the picture (empty = none) */
  title?: string,
  /** Color of the ring, its marks and the shadow of the card */
  color?: string,
  state: LockState,
  /** Seconds into the freeze, only to turn the dashed ring */
  time?: number,
}

/** Everything is designed for a 1080 px tall picture; other sizes scale from it */
const scaleFor = (height: number) => height / 1080;

export function ringRadiusPx(spot: SpotMark, height: number, ringScale = 1): number {
  return spot.size * height * ringScale;
}

function drawCard(ctx: CanvasRenderingContext2D, { label, cx, cy, r, width, k, opacity, draw, color }: {
  label: string, cx: number, cy: number, r: number, width: number, k: number, opacity: number, draw: number, color: string,
}) {
  const hebrew = HEBREW.test(label);
  const text = hebrew ? label : label.toUpperCase();
  const fontPx = 58 * k;
  ctx.save();
  ctx.font = `900 ${fontPx}px Heebo, "Segoe UI", Arial, sans-serif`;
  ctx.direction = hebrew ? 'rtl' : 'ltr';
  (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = hebrew ? '0px' : `${2 * k}px`;
  const textW = ctx.measureText(text).width;
  const padX = fontPx * 0.42;
  const padTop = fontPx * 0.14;
  const padBottom = fontPx * 0.1;
  const cardW = textW + padX * 2;
  const cardH = fontPx + padTop + padBottom;
  const pos = cardPosition({ cx, cy, ringRadius: r, width, cardWidth: cardW, k });
  const scale = 0.9 + 0.1 * draw;

  ctx.globalAlpha = opacity;
  ctx.translate(pos.x, pos.top + cardH / 2);
  ctx.scale(scale, scale);
  ctx.transform(1, 0, Math.tan((8 * Math.PI) / 180), 1, 0, 0); // the card leans, like the stamp in KICKO
  // Hard shadow in the ring color, then the white card
  ctx.fillStyle = color;
  ctx.fillRect(-cardW / 2 + 7 * k, -cardH / 2 + 7 * k, cardW, cardH);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-cardW / 2, -cardH / 2, cardW, cardH);
  ctx.fillStyle = '#0a0d12';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, 0, -cardH / 2 + padTop + fontPx * 0.82);
  ctx.restore();
}

/** The action, big and leaning, near the top (like THROUGH BALL) */
function drawTitle(ctx: CanvasRenderingContext2D, { title, width, height, k, opacity }: { title: string, width: number, height: number, k: number, opacity: number }) {
  const hebrew = HEBREW.test(title);
  const text = hebrew ? title : title.toUpperCase();
  const fontPx = 60 * k;
  ctx.save();
  ctx.font = `italic 900 ${fontPx}px Heebo, "Segoe UI", Arial, sans-serif`;
  ctx.direction = hebrew ? 'rtl' : 'ltr';
  (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = hebrew ? '0px' : `${2 * k}px`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.globalAlpha = opacity;
  ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(255,45,85,0.85)';
  ctx.shadowBlur = 22 * k;
  ctx.strokeStyle = '#e11d48';
  ctx.lineWidth = 12 * k;
  ctx.strokeText(text, width / 2, height * 0.12, width * 0.9);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, width / 2, height * 0.12, width * 0.9);
  ctx.restore();
}

/**
 * Draws the lock (not the picture): call it on a transparent canvas for the preview, or after drawing
 * the frozen picture for the export. The canvas is `width` x `height` pixels.
 */
export function drawPlayerLock(ctx: CanvasRenderingContext2D, { width, height, spot, label, title = '', color = LOCK_COLOR, state, time = 0 }: LockDrawOptions) {
  const k = scaleFor(height);
  const cx = spot.x * width;
  const cy = spot.y * height;
  const r = ringRadiusPx(spot, height, state.ringScale);
  const alpha = state.opacity;
  if (alpha <= 0 && state.draw <= 0) return;

  ctx.save();

  // Dim everything but the player
  const dim = ctx.createRadialGradient(cx, cy, r * 1.05, cx, cy, r * 1.9);
  dim.addColorStop(0, 'rgba(0,0,0,0)');
  dim.addColorStop(1, `rgba(0,0,0,${0.5 * alpha})`);
  ctx.fillStyle = dim;
  ctx.fillRect(0, 0, width, height);

  // The ring
  ctx.lineCap = 'round';
  ctx.globalAlpha = alpha;
  ctx.shadowColor = color === LOCK_COLOR_BLACK ? 'rgba(255,255,255,0.9)' : color; // a black ring gets a light glow so it shows on the dark pitch
  ctx.shadowBlur = 16 * k;
  ctx.strokeStyle = color;
  ctx.lineWidth = 10 * k;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Thin dashed ring, turning slowly
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(((time * 90) * Math.PI) / 180);
  ctx.globalAlpha = 0.6 * alpha;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3 * k;
  ctx.setLineDash([14 * k, 16 * k]);
  ctx.beginPath();
  ctx.arc(0, 0, r + 22 * k, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Four marks on the ring, like a target
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = 8 * k;
  for (let i = 0; i < 4; i += 1) {
    const a = (i * Math.PI) / 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * (r + 34 * k), cy + Math.sin(a) * (r + 34 * k));
    ctx.lineTo(cx + Math.cos(a) * (r + 52 * k), cy + Math.sin(a) * (r + 52 * k));
    ctx.stroke();
  }
  ctx.restore();

  if (title.trim().length > 0) drawTitle(ctx, { title: title.trim(), width, height, k, opacity: alpha });
  if (label.trim().length > 0) drawCard(ctx, { label: label.trim(), cx, cy, r, width, k, opacity: alpha, draw: state.draw, color });
}

/** Draws the frozen picture zoomed around the ring, then the lock on top: one frame of the freeze */
export function drawLockFrame(ctx: CanvasRenderingContext2D, image: CanvasImageSource, options: LockDrawOptions) {
  const { width, height, spot, state } = options;
  const px = spot.x * width;
  const py = spot.y * height;
  ctx.save();
  ctx.clearRect(0, 0, width, height);
  ctx.translate(px, py);
  ctx.scale(state.zoom, state.zoom);
  ctx.translate(-px, -py);
  ctx.drawImage(image, 0, 0, width, height);
  ctx.restore();
  drawPlayerLock(ctx, options);
}

/** Loads the lock font, so the first text drawn is not in a fallback face. Await it before drawing the export. */
export function ensureLockFonts(): Promise<unknown> {
  return Promise.all([
    document.fonts.load('900 58px Heebo'),
    document.fonts.load('italic 900 60px Heebo'),
  ]).catch((err) => console.warn('Could not load the lock font', err));
}
