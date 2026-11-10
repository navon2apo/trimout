import { useId } from 'react';
import { FiMusic, FiX } from 'react-icons/fi';

import type { MusicMode } from '../util/music';

interface Props {
  /** Name of the chosen song, or none */
  musicName: string | undefined,
  volume: number,
  mode: MusicMode,
  /** The export makes no merged video, so there is nothing to put music on */
  needsMergedVideo: boolean,
  onPick: () => void,
  onClear: () => void,
  onVolumeChange: (volume: number) => void,
  onModeChange: (mode: MusicMode) => void,
}

/** Music for the merged video: pick a song, how loud, and whether it replaces the game sound or plays with it */
export default function MusicOptions({ musicName, volume, mode, needsMergedVideo, onPick, onClear, onVolumeChange, onModeChange }: Props) {
  const volumeId = useId();
  const modeName = useId();

  return (
    <div className="music-options" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.04em', color: '#64748b' }}>MUSIC FOR THE MERGED VIDEO</div>
      {musicName == null ? (
        <button
          type="button"
          onClick={onPick}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, alignSelf: 'flex-start', padding: '8px 14px', borderRadius: 8, border: '1px solid #d0d5dd', background: '#ffffff', fontSize: 14, fontWeight: 700, cursor: 'pointer', color: '#0f172a' }}
        >
          <FiMusic /> Choose a music file
        </button>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f7fee7', border: '1px solid #bef264', borderRadius: 8, padding: '6px 10px' }}>
            <FiMusic />
            <span dir="auto" title={musicName} style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 650, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{musicName}</span>
            <button type="button" onClick={onPick} style={{ border: 'none', background: 'transparent', color: '#3f6212', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>Change</button>
            <button type="button" aria-label="Remove the music" title="Remove the music" onClick={onClear} style={{ border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', fontSize: 16, color: '#475569' }}><FiX /></button>
          </div>

          <div role="radiogroup" aria-label="How the music is used" style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 14, color: '#0f172a' }}>
            <label htmlFor={`${modeName}-mix`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input id={`${modeName}-mix`} type="radio" name={modeName} checked={mode === 'mix'} onChange={() => onModeChange('mix')} />
              Together with the game sound
            </label>
            <label htmlFor={`${modeName}-replace`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input id={`${modeName}-replace`} type="radio" name={modeName} checked={mode === 'replace'} onChange={() => onModeChange('replace')} />
              Instead of the game sound
            </label>
          </div>

          <label htmlFor={volumeId} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#0f172a' }}>
            Music volume
            <input id={volumeId} type="range" min={0} max={100} step={5} value={volume} onChange={(e) => onVolumeChange(Number(e.target.value))} style={{ flex: 1 }} />
            <span style={{ minWidth: 40, textAlign: 'right', fontWeight: 700 }}>{volume}%</span>
          </label>

          {needsMergedVideo && (
            <div role="alert" style={{ fontSize: 13, color: '#9a3412', background: '#fff7ed', border: '1px solid #fdba74', borderRadius: 8, padding: '6px 10px' }}>
              The music goes on the merged video. Choose &quot;Merged&quot; or &quot;Both&quot; in the settings below, otherwise it is not used.
            </div>
          )}
        </>
      )}
    </div>
  );
}
