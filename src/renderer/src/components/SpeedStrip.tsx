import { primaryColor } from '../colors';

const SPEEDS = [0.5, 1, 2, 4, 8] as const;

function SpeedStrip({ outputPlaybackRate, setOutputPlaybackRate }: {
  outputPlaybackRate: number,
  setOutputPlaybackRate: (v: number) => void,
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
      <span style={{ fontSize: '0.7em', color: 'var(--gray-9)', marginRight: 2 }}>Speed</span>
      {SPEEDS.map((s) => {
        const active = Math.abs(outputPlaybackRate - s) < 0.05;
        return (
          <button
            key={s}
            type="button"
            title={`Play at ${s}x speed`}
            onClick={() => setOutputPlaybackRate(s)}
            style={{
              background: active ? primaryColor : 'var(--gray-4)',
              border: active ? `1px solid ${primaryColor}` : '1px solid var(--gray-6)',
              borderRadius: 4,
              color: active ? 'white' : 'var(--gray-11)',
              fontSize: '0.72em',
              fontWeight: active ? 700 : 400,
              padding: '3px 6px',
              cursor: 'pointer',
              minWidth: 32,
            }}
          >
            {s}x
          </button>
        );
      })}
    </div>
  );
}

export default SpeedStrip;
