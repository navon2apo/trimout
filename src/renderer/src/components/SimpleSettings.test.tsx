import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import SimpleSettings from './SimpleSettings';

function render(extra: Partial<Parameters<typeof SimpleSettings>[0]> = {}) {
  return renderToStaticMarkup(createElement(SimpleSettings, {
    outDir: undefined,
    outDirControl: createElement('button', { type: 'button' }, 'Choose folder'),
    keyframeCut: true,
    onKeyframeCutChange: () => undefined,
    captureFormat: 'jpeg',
    onCaptureFormatChange: () => undefined,
    captureFrameQuality: 0.95,
    onCaptureFrameQualityChange: () => undefined,
    showOsNotifications: true,
    onShowOsNotificationsChange: () => undefined,
    showInAppNotifications: true,
    onShowInAppNotificationsChange: () => undefined,
    askBeforeClose: false,
    onAskBeforeCloseChange: () => undefined,
    onOpenKeyboardShortcuts: () => undefined,
    ...extra,
  }));
}

const text = (html: string) => html.replaceAll(/<[^>]+>/g, ' ').replaceAll('&amp;', '&');

describe('SimpleSettings', () => {
  it('shows only the settings that matter for TrimOut', () => {
    const t = text(render());
    for (const label of ['Save clips to', 'Cutting', 'Snapshots', 'Keyboard shortcuts', 'System notifications', 'In-app tips', 'Confirm before closing']) {
      expect(t).toContain(label);
    }
  });

  it('never offers the Remove cutting mode or engine internals', () => {
    const t = text(render());
    expect(t).not.toMatch(/remove/i);
    expect(t).not.toMatch(/ffmpeg/i);
    expect(t).not.toMatch(/advanced settings/i);
  });

  it('explains the two cutting choices in plain words', () => {
    const fast = text(render({ keyframeCut: true }));
    expect(fast).toContain('Fast & lossless');
    expect(fast).toContain('Exact frame');
    expect(fast).toMatch(/can start a moment early/i);
    expect(text(render({ keyframeCut: false }))).toMatch(/re-encodes/i);
  });

  it('marks the chosen cutting mode', () => {
    const html = render({ keyframeCut: false });
    expect(html).toMatch(/aria-pressed="true"[^>]*>Exact frame/);
  });

  it('shows where clips are saved', () => {
    expect(text(render())).toContain('Next to the original video');
    expect(text(render({ outDir: 'D:/Clips' }))).toContain('D:/Clips');
  });

  it('shows the snapshot quality as a percent', () => {
    expect(text(render({ captureFrameQuality: 0.8 }))).toContain('80%');
  });
});
