import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import ClipOrderList from './ClipOrderList';

const clips = [
  { segId: 'a', name: 'Dribble 1', color: '#ef4444', seconds: 12.5, included: true },
  { segId: 'b', name: 'Header 2', color: '#22c55e', seconds: 6, included: false },
  { segId: 'c', name: 'Block 3', color: '#3b82f6', seconds: 8, included: true },
];

function render() {
  return renderToStaticMarkup(<ClipOrderList clips={clips} onReorder={() => undefined} onToggleIncluded={() => undefined} />);
}

describe('ClipOrderList', () => {
  it('lists every clip so it can be dragged', () => {
    const html = render();
    expect(html.match(/data-order-row="true"/g)).toHaveLength(3);
    expect(html.match(/draggable="true"/g)).toHaveLength(3);
    expect(html).toContain('Dribble 1');
    expect(html).toContain('12.5s');
  });

  it('numbers the clips that are in the render in order, and leaves the left out one without a number', () => {
    const html = render();
    expect(html).toContain('Number 1 in the render');
    expect(html).toContain('Number 2 in the render');
    expect(html).not.toContain('Number 3 in the render');
    expect(html).toContain('Left out of the render');
  });

  it('has arrows and an eye on every clip, and the first cannot go up', () => {
    const html = render();
    expect(html.match(/aria-label="Move up"/g)).toHaveLength(3);
    expect(html.match(/aria-label="Move down"/g)).toHaveLength(3);
    expect(html.match(/aria-label="Left out of the render: click to include"/g)).toHaveLength(1);
    expect(html.match(/aria-label="In the render: click to leave out"/g)).toHaveLength(2);
  });
});
