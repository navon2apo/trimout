import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import ExportOptions from './ExportOptions';

function render(extra: Partial<Parameters<typeof ExportOptions>[0]> = {}) {
  return renderToStaticMarkup(createElement(ExportOptions, {
    quality: 'lossless',
    onQualityChange: () => undefined,
    aspectRatio: 'original',
    onAspectRatioChange: () => undefined,
    fitMode: 'crop',
    onFitModeChange: () => undefined,
    mode: 'separate',
    onModeChange: () => undefined,
    folderPerExport: true,
    onFolderPerExportChange: () => undefined,
    ...extra,
  }));
}

describe('ExportOptions', () => {
  it('shows quality and format up front, with Original as the selected default', () => {
    const html = render();
    expect(html).toContain('Quality');
    expect(html).toContain('Format');
    expect(html.match(/aria-pressed="true"/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it('keeps mode and folder settings under More options', () => {
    const html = render();
    expect(html).toContain('More options');
    expect(html).toContain('<details');
    expect(html).toContain('Folder per export');
  });

  it('asks how to fit only when the format changes the shape', () => {
    expect(render()).not.toContain('Center crop');
    expect(render({ aspectRatio: '9:16' })).toContain('Center crop');
  });
});
