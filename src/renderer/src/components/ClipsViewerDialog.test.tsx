import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import ClipsViewerDialog from './ClipsViewerDialog';

const clips = [
  { segId: 'a', start: 0, end: 8, name: 'Lavi Dribble 1' },
  { segId: 'b', start: 20, end: 26, name: 'Lavi Shot 2', isFavorite: true },
];

function render(extra: Partial<Parameters<typeof ClipsViewerDialog>[0]> = {}) {
  return renderToStaticMarkup(createElement(ClipsViewerDialog, {
    visible: true,
    videoUrl: 'file:///game.mp4',
    canPreview: true,
    clips,
    formatTimecode: (s: number) => `${s}s`,
    onClose: () => undefined,
    onToggleFavorite: () => undefined,
    onDeleteClip: () => undefined,
    onEditClip: () => undefined,
    ...extra,
  }));
}

describe('ClipsViewerDialog', () => {
  it('shows every clip with the first one in the player', () => {
    const html = render();
    expect(html).toContain('Your clips');
    expect(html.match(/data-viewer-clip="true"/g)).toHaveLength(2);
    expect(html).toContain('Lavi Shot 2');
    expect(html).toContain('<video');
    expect(html).toContain('file:///game.mp4');
  });

  it('works on its own, without KICKO', () => {
    // Visible text only; the shared dialog CSS classes are named kicko-*
    const text = render().replaceAll(/<[^>]+>/g, ' ');
    expect(text).not.toMatch(/kicko/i);
  });

  it('shows the total length of the clips', () => {
    expect(render()).toContain('14.0s total');
  });

  it('explains when the video cannot be previewed here', () => {
    const html = render({ canPreview: false });
    expect(html).not.toContain('<video');
    expect(html).toContain('Play all');
  });

  it('renders nothing when hidden', () => {
    expect(render({ visible: false })).toBe('');
  });
});
