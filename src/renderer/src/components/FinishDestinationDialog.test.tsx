import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import FinishDestinationDialog from './FinishDestinationDialog';

function render(step: 'choose' | 'download') {
  return renderToStaticMarkup(
    <FinishDestinationDialog
      visible
      initialStep={step}
      clipCount={3}
      hasProject={false}
      downloadOptions={<div>EXPORT-OPTIONS</div>}
      onDownload={() => undefined}
      onContinueInKicko={() => undefined}
      onClose={() => undefined}
    />,
  );
}

describe('FinishDestinationDialog', () => {
  it('first asks where the clips go, without export settings', () => {
    const html = render('choose');
    expect(html).toContain('Download to computer');
    expect(html).not.toContain('EXPORT-OPTIONS');
  });

  it('shows the export settings on the download step', () => {
    const html = render('download');
    expect(html).toContain('EXPORT-OPTIONS');
    expect(html).toContain('Download 3 clips');
  });
});
