import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import ClipsPanel from './ClipsPanel';

const segments = [
  { segId: 'a', start: 0, end: 8, name: 'Lavi Dribble 1' },
  { segId: 'b', start: 20, end: 26, name: 'Lavi Shot 2', isFavorite: true },
];

function render(extra: Partial<Parameters<typeof ClipsPanel>[0]> = {}) {
  return renderToStaticMarkup(createElement(ClipsPanel, {
    segments,
    currentSegIndex: 0,
    formatTimecode: (s: number) => `${s}s`,
    onSegClick: () => undefined,
    onPlayClip: () => undefined,
    onDeleteSegment: () => undefined,
    onToggleFavorite: () => undefined,
    onToggleIncluded: () => undefined,
    onRenameSegment: () => undefined,
    onPlayAll: () => undefined,
    onStopPlayAll: () => undefined,
    onOpenViewer: () => undefined,
    isPlayingAll: false,
    ...extra,
  }));
}

describe('ClipsPanel', () => {
  it('lists every clip as a white card with its name and duration', () => {
    const html = render();
    expect(html).toContain('Lavi Dribble 1');
    expect(html).toContain('Lavi Shot 2');
    expect(html).toContain('8.0s');
    expect(html).toContain('6.0s');
    expect(html.match(/data-clip-card="true"/g)).toHaveLength(2);
  });

  it('always shows play, favorite and delete for each clip', () => {
    const html = render();
    expect(html.match(/aria-label="Play clip"/g)).toHaveLength(2);
    expect(html.match(/aria-label="Delete clip"/g)).toHaveLength(2);
    expect(html.match(/aria-label="(Mark as|Remove from) favorite[s]?"/g)).toHaveLength(2);
  });

  it('marks the clip that is playing and turns its play button into pause', () => {
    const html = render({ playingClipIndex: 1 });
    expect(html).toContain('NOW PLAYING');
    expect(html.match(/NOW PLAYING/g)).toHaveLength(1);
    expect(html).toContain('aria-label="Pause clip"');
    expect(html.match(/aria-label="Play clip"/g)).toHaveLength(1);
    expect(render()).not.toContain('NOW PLAYING');
  });

  it('shows an open eye on every clip by default, and a closed eye on a clip left out of the export', () => {
    const all = render();
    expect(all.match(/aria-label="In the export: click to leave out"/g)).toHaveLength(2);
    expect(all).not.toContain('in the export');

    const html = render({ segments: [{ ...segments[0]!, selected: false }, segments[1]!] });
    expect(html.match(/aria-label="Left out of the export: click to include"/g)).toHaveLength(1);
    expect(html.match(/aria-label="In the export: click to leave out"/g)).toHaveLength(1);
    expect(html).toContain('1 in the export');
  });

  it('offers Play all, and Stop while playing all', () => {
    expect(render()).toContain('Play all');
    expect(render({ isPlayingAll: true })).toContain('Stop');
  });

  it('opens the clips viewer to watch everything in one place', () => {
    expect(render()).toContain('aria-label="Watch all clips"');
  });
});
