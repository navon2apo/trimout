import { memo, useCallback, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';

import type { FormatTimecode } from '../types';

type Edge = 'start' | 'end';

// Two grab handles on the active clip's edges. Dragging one trims that edge;
// the caller seeks the video to the handle so the exact frame is visible.
function ClipTrimHandles({ start, end, fileDurationNonZero, formatTimecode, getMouseTimelinePos, onTrim }: {
  start: number,
  end: number,
  fileDurationNonZero: number,
  formatTimecode: FormatTimecode,
  getMouseTimelinePos: (e: MouseEvent) => number,
  onTrim: (edge: Edge, time: number) => void,
}) {
  const [dragging, setDragging] = useState<Edge>();

  const onHandleMouseDown = useCallback((edge: Edge) => (e: ReactMouseEvent) => {
    if (e.button !== 0) return;
    // Keep the timeline from seeking/selecting underneath the handle
    e.stopPropagation();
    e.preventDefault();
    setDragging(edge);

    const onMove = (moveEvent: MouseEvent) => onTrim(edge, getMouseTimelinePos(moveEvent));
    const onUp = () => {
      setDragging(undefined);
      window.removeEventListener('mousemove', onMove);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp, { once: true });
  }, [getMouseTimelinePos, onTrim]);

  const pct = (t: number) => `${(t / fileDurationNonZero) * 100}%`;

  const handle = (edge: Edge) => (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      key={edge}
      data-trim-handle={edge}
      title={edge === 'start' ? 'Drag to change where the clip starts' : 'Drag to change where the clip ends'}
      onMouseDown={onHandleMouseDown(edge)}
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: pct(edge === 'start' ? start : end),
        width: 12,
        marginLeft: edge === 'start' ? -2 : -10,
        zIndex: 6,
        cursor: 'ew-resize',
        background: '#d2ff00',
        borderRadius: edge === 'start' ? '4px 0 0 4px' : '0 4px 4px 0',
        boxShadow: '0 0 0 1px rgba(10,18,0,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
      }}
    >
      <span style={{ width: 1.5, height: 12, background: 'rgba(10,18,0,0.6)' }} />
      <span style={{ width: 1.5, height: 12, background: 'rgba(10,18,0,0.6)' }} />
    </div>
  );

  return (
    <>
      {/* Outline of the active clip */}
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: pct(start), width: pct(end - start), zIndex: 5, pointerEvents: 'none', boxShadow: 'inset 0 2px 0 #d2ff00, inset 0 -2px 0 #d2ff00' }} />
      {handle('start')}
      {handle('end')}
      {dragging != null && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: pct(dragging === 'start' ? start : end),
          transform: dragging === 'start' ? 'translate(10px, -50%)' : 'translate(calc(-100% - 10px), -50%)',
          zIndex: 7,
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          background: '#0f172a',
          color: '#ffffff',
          fontSize: 11,
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          borderRadius: 6,
          padding: '3px 8px',
        }}
        >
          {formatTimecode({ seconds: dragging === 'start' ? start : end, shorten: true })} · {(end - start).toFixed(1)}s
        </div>
      )}
    </>
  );
}

export default memo(ClipTrimHandles);
