import type { CSSProperties, MouseEventHandler } from 'react';
import { forwardRef } from 'react';
import { FiScissors } from 'react-icons/fi';
import { FaFileExport } from 'react-icons/fa';

import { primaryColor } from '../colors';
import useUserSettings from '../hooks/useUserSettings';
import type { SegmentToExport } from '../types';
import styles from './ExportButton.module.css';


interface Props {
  segmentsToExport: SegmentToExport[],
  areWeCutting: boolean,
  onClick: MouseEventHandler<HTMLButtonElement>,
  style?: CSSProperties,
}

// eslint-disable-next-line react/display-name
const ExportButton = forwardRef<HTMLButtonElement, Props>(({
  segmentsToExport,
  areWeCutting,
  onClick,
  style,
}, ref) => {
  const CutIcon = areWeCutting ? FiScissors : FaFileExport;

  const { simpleMode } = useUserSettings();

  let title = 'Finish clips';
  if (segmentsToExport.length === 1) {
    title = 'Finish 1 clip';
  } else if (segmentsToExport.length > 1) {
    title = `Finish ${segmentsToExport.length} clips`;
  }

  const text = segmentsToExport.length > 1 ? `Finish ${segmentsToExport.length} Clips` : 'Finish Clips';

  return (
    <button
      ref={ref}
      type="button"
      className={[...(simpleMode ? ['export-animation'] : []), styles['exportButton']].join(' ')}
      style={{ backgroundColor: primaryColor, ...style }}
      onClick={onClick}
      title={title}
    >
      <CutIcon
        style={{ verticalAlign: 'middle', marginRight: '.2em' }}
      />
      {text}
    </button>
  );
});

export default ExportButton;
