import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, RefObject, WheelEvent as ReactWheelEvent, MouseEvent as ReactMouseEvent } from 'react';

import type { ZoomRect } from '../types';

/** View transform applied to the video picture: screen = scale * point + (tx, ty). */
export interface ViewZoom {
  scale: number,
  tx: number,
  ty: number,
}

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 8;
const BUTTON_STEP = 1.35;
// Below this the picture counts as "not zoomed" (no crop is saved / exported)
const ZOOMED_EPSILON = 1.02;
const DRAG_THRESHOLD_PX = 4;

const IDENTITY: ViewZoom = { scale: 1, tx: 0, ty: 0 };

interface Geometry {
  /** Container size */
  W: number,
  H: number,
  /** Where the picture sits inside the container (object-fit: contain letterboxing) */
  px: number,
  py: number,
  pw: number,
  ph: number,
}

const clampNum = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * The zoom window IS the picture frame: zooming scales the picture inside its own frame,
 * so what is visible is always `picture / scale` — exactly the region the export crops.
 * That keeps the picture's aspect ratio (w === h in normalized coordinates).
 */
function clampView(v: ViewZoom, g: Geometry): ViewZoom {
  const scale = clampNum(v.scale, MIN_ZOOM, MAX_ZOOM);
  return {
    scale,
    tx: clampNum(v.tx, g.px + g.pw - scale * (g.px + g.pw), g.px * (1 - scale)),
    ty: clampNum(v.ty, g.py + g.ph - scale * (g.py + g.ph), g.py * (1 - scale)),
  };
}

/** The part of the picture a view shows, normalized to the full frame. Null when not zoomed. */
function rectFromView(g: Geometry | null, v: ViewZoom): ZoomRect | null {
  if (g == null || v.scale < ZOOMED_EPSILON) return null;
  return {
    x: ((g.px - v.tx) / v.scale - g.px) / g.pw,
    y: ((g.py - v.ty) / v.scale - g.py) / g.ph,
    w: 1 / v.scale,
    h: 1 / v.scale,
  };
}

function viewFromRect(g: Geometry, rect: ZoomRect): ViewZoom {
  const scale = clampNum(1 / Math.max(rect.w, rect.h), MIN_ZOOM, MAX_ZOOM);
  return clampView({
    scale,
    tx: g.px - scale * (g.px + rect.x * g.pw),
    ty: g.py - scale * (g.py + rect.y * g.ph),
  }, g);
}

/**
 * Picture zoom/pan for the video element. Pure view state: nothing is saved or exported
 * until the caller turns the visible area into a ZoomRect via `getVisibleRect()`.
 *
 * The picture is moved by writing the CSS transform directly (not through React props), so a
 * zoom that glides during playback can update every frame without re-rendering the app.
 */
export default function useVideoZoom({ containerRef, layerRef, videoRef }: {
  containerRef: RefObject<HTMLElement>,
  /** The element that holds the video and gets scaled / moved */
  layerRef: RefObject<HTMLElement>,
  videoRef: RefObject<HTMLVideoElement>,
}) {
  const [view, setView] = useState<ViewZoom>(IDENTITY);
  const [visibleRect, setVisibleRect] = useState<ZoomRect | null>(null);
  // When on, the mouse wheel zooms the picture instead of seeking in time
  const [wheelZoom, setWheelZoom] = useState(false);
  const viewRef = useRef<ViewZoom>(IDENTITY);
  const dragRef = useRef<{ x: number, y: number, moved: boolean } | null>(null);
  const justDraggedRef = useRef(false);

  const getGeometry = useCallback((): Geometry | null => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (container == null || video == null) return null;
    const { videoWidth, videoHeight } = video;
    const { width: W, height: H } = container.getBoundingClientRect();
    if (!videoWidth || !videoHeight || !W || !H) return null;
    const fit = Math.min(W / videoWidth, H / videoHeight);
    const pw = videoWidth * fit;
    const ph = videoHeight * fit;
    return { W, H, px: (W - pw) / 2, py: (H - ph) / 2, pw, ph };
  }, [containerRef, videoRef]);

  // Move the picture, and cut everything outside the picture frame while zoomed
  const paint = useCallback((v: ViewZoom, g: Geometry | null) => {
    const layer = layerRef.current;
    const container = containerRef.current;
    if (layer != null) layer.style.transform = v.scale === 1 && v.tx === 0 && v.ty === 0 ? '' : `translate(${v.tx}px, ${v.ty}px) scale(${v.scale})`;
    if (container != null) container.style.clipPath = g != null && v.scale >= ZOOMED_EPSILON ? `inset(${g.py}px ${g.px}px ${g.py}px ${g.px}px)` : '';
  }, [containerRef, layerRef]);

  /** Update React state (scale label, mini-map) from the current view. */
  const syncState = useCallback(() => {
    setView(viewRef.current);
    setVisibleRect(rectFromView(getGeometry(), viewRef.current));
  }, [getGeometry]);

  const commit = useCallback((v: ViewZoom) => {
    viewRef.current = v;
    paint(v, getGeometry());
    syncState();
  }, [getGeometry, paint, syncState]);

  const reset = useCallback(() => commit(IDENTITY), [commit]);

  const zoomAt = useCallback((factor: number, ax?: number, ay?: number) => {
    const g = getGeometry();
    if (g == null) return;
    const cur = viewRef.current;
    const anchorX = ax ?? g.W / 2;
    const anchorY = ay ?? g.H / 2;
    const scale = clampNum(cur.scale * factor, MIN_ZOOM, MAX_ZOOM);
    const ratio = scale / cur.scale;
    commit(clampView({
      scale,
      tx: anchorX - (anchorX - cur.tx) * ratio,
      ty: anchorY - (anchorY - cur.ty) * ratio,
    }, g));
  }, [commit, getGeometry]);

  const zoomIn = useCallback(() => zoomAt(BUTTON_STEP), [zoomAt]);
  const zoomOut = useCallback(() => zoomAt(1 / BUTTON_STEP), [zoomAt]);

  /** The part of the picture the view shows right now (for event handlers / effects). Null when not zoomed. */
  const getVisibleRect = useCallback((): ZoomRect | null => rectFromView(getGeometry(), viewRef.current), [getGeometry]);

  /** Show a zoom frame (null = fit the whole picture). */
  const applyRect = useCallback((rect: ZoomRect | null) => {
    const g = getGeometry();
    if (rect == null || g == null) { if (rect == null) reset(); return; }
    commit(viewFromRect(g, rect));
  }, [commit, getGeometry, reset]);

  /** Same, but only moves the picture — no React render. Call `syncState` now and then to refresh the UI. */
  const applyRectFast = useCallback((rect: ZoomRect | null) => {
    const g = getGeometry();
    const v = rect != null && g != null ? viewFromRect(g, rect) : IDENTITY;
    viewRef.current = v;
    paint(v, g);
  }, [getGeometry, paint]);

  // Window resized / video metadata arrived: keep showing the same part of the picture
  useEffect(() => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (container == null) return undefined;
    const refit = () => {
      const g = getGeometry();
      if (g == null) return;
      const rect = rectFromView(g, viewRef.current);
      if (rect != null) commit(viewFromRect(g, rect));
    };
    const observer = new ResizeObserver(refit);
    observer.observe(container);
    video?.addEventListener('loadedmetadata', refit);
    return () => {
      observer.disconnect();
      video?.removeEventListener('loadedmetadata', refit);
    };
  }, [containerRef, videoRef, getGeometry, commit]);

  const handlers = useMemo(() => ({
    onWheel: (e: ReactWheelEvent<HTMLElement>) => {
      if (!wheelZoom) return;
      // Zoom mode owns the wheel: don't let it bubble up to the timeline seek handler
      e.stopPropagation();
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX - rect.left, e.clientY - rect.top);
    },
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => {
      if (viewRef.current.scale < ZOOMED_EPSILON || e.button !== 0) return;
      dragRef.current = { x: e.clientX, y: e.clientY, moved: false };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    onPointerMove: (e: ReactPointerEvent<HTMLElement>) => {
      const drag = dragRef.current;
      const g = getGeometry();
      if (drag == null || g == null) return;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
      drag.moved = true;
      drag.x = e.clientX;
      drag.y = e.clientY;
      const cur = viewRef.current;
      commit(clampView({ ...cur, tx: cur.tx + dx, ty: cur.ty + dy }, g));
    },
    onPointerUp: (e: ReactPointerEvent<HTMLElement>) => {
      const drag = dragRef.current;
      dragRef.current = null;
      if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
      // A drag ends with a click event — remember it so the video's play/pause click is skipped
      justDraggedRef.current = drag?.moved === true;
    },
    onClickCapture: (e: ReactMouseEvent<HTMLElement>) => {
      if (justDraggedRef.current) {
        justDraggedRef.current = false;
        e.stopPropagation();
      }
    },
  }), [wheelZoom, containerRef, zoomAt, getGeometry, commit]);

  return {
    view,
    isZoomed: view.scale >= ZOOMED_EPSILON,
    visibleRect,
    wheelZoom,
    setWheelZoom,
    zoomIn,
    zoomOut,
    reset,
    getVisibleRect,
    applyRect,
    applyRectFast,
    syncState,
    handlers,
  };
}
