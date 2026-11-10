import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import MusicOptions from './MusicOptions';

const noop = () => undefined;

function render({ musicName, volume = 60, needsMergedVideo = false }: { musicName?: string, volume?: number, needsMergedVideo?: boolean } = {}) {
  return renderToStaticMarkup(
    <MusicOptions musicName={musicName} volume={volume} mode="mix" needsMergedVideo={needsMergedVideo} onPick={noop} onClear={noop} onVolumeChange={noop} onModeChange={noop} />,
  );
}

describe('MusicOptions', () => {
  it('first only offers to choose a song', () => {
    const html = render();
    expect(html).toContain('Choose a music file');
    expect(html).not.toContain('Music volume');
  });

  it('shows the song, the volume and how the music is used once one is chosen', () => {
    const html = render({ musicName: 'song.mp3', volume: 40 });
    expect(html).toContain('song.mp3');
    expect(html).toContain('40%');
    expect(html).toContain('Together with the game sound');
    expect(html).toContain('Instead of the game sound');
  });

  it('warns when there will be no merged video for the music to go on', () => {
    expect(render({ musicName: 'song.mp3', needsMergedVideo: true })).toContain('The music goes on the merged video');
    expect(render({ musicName: 'song.mp3' })).not.toContain('The music goes on the merged video');
  });
});
