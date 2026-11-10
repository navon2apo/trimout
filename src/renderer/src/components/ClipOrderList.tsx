import { useState } from 'react';
import { FiArrowDown, FiArrowUp, FiEye, FiEyeOff, FiMenu } from 'react-icons/fi';

import { exportNumbers, moveItem } from '../util/clipOrder';

export interface OrderClip {
  segId: string,
  name: string,
  /** The clip's color on the timeline */
  color: string,
  seconds: number | undefined,
  /** Open eye: the clip goes into the render */
  included: boolean,
}

interface Props {
  clips: OrderClip[],
  /** The new order, as a list of segIds */
  onReorder: (segIdsInOrder: string[]) => void,
  onToggleIncluded: (segId: string) => void,
}

const iconButton: React.CSSProperties = {
  width: 30, height: 30, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, fontSize: 16, color: '#334155', flexShrink: 0,
};

/**
 * The clips in the order they will be rendered: drag a clip to a new place (or use the arrows).
 * The number on each clip is its place in the render, and follows the order live.
 */
export default function ClipOrderList({ clips, onReorder, onToggleIncluded }: Props) {
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const numbers = exportNumbers(clips);

  const move = (from: number, to: number) => {
    const next = moveItem(clips, from, to);
    if (next !== clips) onReorder(next.map((clip) => clip.segId));
  };

  return (
    <div className="clip-order">
      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.04em', color: '#64748b', marginBottom: 6 }}>ORDER OF THE CLIPS</div>
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>Drag a clip to where you want it. The numbers follow. Close the eye to leave a clip out.</div>
      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 280, overflowY: 'auto' }}>
        {clips.map((clip, i) => (
          <li
            key={clip.segId}
            draggable
            data-order-row="true"
            onDragStart={(e) => { setDragFrom(i); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', clip.segId); }}
            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (dragOver !== i) setDragOver(i); }}
            onDrop={(e) => { e.preventDefault(); if (dragFrom != null) move(dragFrom, i); setDragFrom(null); setDragOver(null); }}
            onDragEnd={() => { setDragFrom(null); setDragOver(null); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: '#ffffff',
              border: '1px solid #e4e7ec',
              // A line shows where the dragged clip will land
              borderTop: dragOver === i && dragFrom !== null && dragFrom !== i ? '3px solid #84cc16' : '1px solid #e4e7ec',
              borderRadius: 10,
              padding: '6px 8px',
              opacity: dragFrom === i ? 0.4 : (clip.included ? 1 : 0.55),
              cursor: 'grab',
            }}
          >
            <span aria-hidden="true" style={{ color: '#94a3b8', display: 'flex', fontSize: 16 }}><FiMenu /></span>
            <span
              style={{ minWidth: 26, height: 26, borderRadius: 13, background: numbers[i] == null ? '#f1f5f9' : '#0f172a', color: numbers[i] == null ? '#94a3b8' : '#d2ff00', fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
              title={numbers[i] == null ? 'Left out of the render' : `Number ${numbers[i]} in the render`}
            >
              {numbers[i] ?? '–'}
            </span>
            <span style={{ width: 5, alignSelf: 'stretch', borderRadius: 3, background: clip.color, flexShrink: 0 }} />
            <span dir="auto" style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 650, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textDecoration: clip.included ? 'none' : 'line-through' }}>{clip.name}</span>
            {clip.seconds != null && <span style={{ fontSize: 12, fontWeight: 700, color: '#475569', background: '#f1f5f9', borderRadius: 5, padding: '1px 6px', flexShrink: 0 }}>{clip.seconds.toFixed(1)}s</span>}
            <button type="button" aria-label="Move up" title="Move up" disabled={i === 0} onClick={() => move(i, i - 1)} style={{ ...iconButton, opacity: i === 0 ? 0.3 : 1 }}><FiArrowUp /></button>
            <button type="button" aria-label="Move down" title="Move down" disabled={i === clips.length - 1} onClick={() => move(i, i + 1)} style={{ ...iconButton, opacity: i === clips.length - 1 ? 0.3 : 1 }}><FiArrowDown /></button>
            <button
              type="button"
              aria-label={clip.included ? 'In the render: click to leave out' : 'Left out of the render: click to include'}
              title={clip.included ? 'In the render (click to leave it out)' : 'Left out of the render (click to include it)'}
              onClick={() => onToggleIncluded(clip.segId)}
              style={{ ...iconButton, fontSize: 18, color: clip.included ? '#334155' : '#94a3b8' }}
            >
              {clip.included ? <FiEye /> : <FiEyeOff />}
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
