import type { CSSProperties } from 'react';
import { useMemo } from 'react';
import { useSegColors } from '../contexts';
import type { SegmentColorIndex } from '../types';

const ClipMarkButton = ({ currentCutSeg, side, onClick, style }: {
  currentCutSeg: SegmentColorIndex | undefined,
  side: 'start' | 'end',
  onClick?: () => void,
  style?: CSSProperties,
}) => {
  const { getSegColor } = useSegColors();
  const segColor = useMemo(() => getSegColor(currentCutSeg), [currentCutSeg, getSegColor]);
  const bg = segColor.desaturate(0.5).lightness(38).string();
  const border = `2px solid ${segColor.desaturate(0.4).lightness(55).string()}`;
  const isStart = side === 'start';

  return (
    <button
      type="button"
      title={isStart ? 'Mark clip start here (I)' : 'Mark clip end here (O)'}
      onClick={onClick}
      style={{
        background: bg,
        border,
        borderRadius: 6,
        color: 'white',
        fontWeight: 700,
        fontSize: '0.82em',
        padding: '5px 10px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        flexShrink: 0,
        ...style,
      }}
    >
      {isStart ? '▷ Start' : 'End ◁'}
    </button>
  );
};

export default ClipMarkButton;
