/**
 * SimpleSettings — the TrimOut settings screen: only what matters for cutting clips.
 * The engine's full settings stay out of reach; the cutting mode is always "keep".
 */
import { useId } from 'react';
import type { ReactNode } from 'react';
import { FiFolder, FiImage, FiScissors, FiBell, FiCommand } from 'react-icons/fi';

import type { CaptureFormat } from '../../../common/types';
import ChoiceRow from './ChoiceRow';

function Section({ icon, title, children }: { icon: ReactNode, title: string, children: ReactNode }) {
  return (
    <section className="simple-settings-section">
      <h3>{icon} {title}</h3>
      {children}
    </section>
  );
}

function SwitchRow({ title, detail, checked, onChange }: { title: string, detail: string, checked: boolean, onChange: (next: boolean) => void }) {
  const id = useId();
  return (
    <div className="export-option-switch">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <label htmlFor={id}>
        <strong>{title}</strong>
        <small>{detail}</small>
      </label>
    </div>
  );
}

export default function SimpleSettings({
  outDir, outDirControl,
  keyframeCut, onKeyframeCutChange,
  captureFormat, onCaptureFormatChange, captureFrameQuality, onCaptureFrameQualityChange,
  showOsNotifications, onShowOsNotificationsChange, showInAppNotifications, onShowInAppNotificationsChange,
  askBeforeClose, onAskBeforeCloseChange,
  onOpenKeyboardShortcuts,
}: {
  outDir: string | undefined,
  // The folder picker button (it brings its own dialog)
  outDirControl: ReactNode,
  keyframeCut: boolean,
  onKeyframeCutChange: (next: boolean) => void,
  captureFormat: CaptureFormat,
  onCaptureFormatChange: (next: CaptureFormat) => void,
  captureFrameQuality: number,
  onCaptureFrameQualityChange: (next: number) => void,
  showOsNotifications: boolean,
  onShowOsNotificationsChange: (next: boolean) => void,
  showInAppNotifications: boolean,
  onShowInAppNotificationsChange: (next: boolean) => void,
  askBeforeClose: boolean,
  onAskBeforeCloseChange: (next: boolean) => void,
  onOpenKeyboardShortcuts: () => void,
}) {
  const qualityId = useId();

  return (
    <div className="simple-settings">
      <Section icon={<FiFolder />} title="Save clips to">
        <div className="simple-settings-folder">
          <span dir="auto" title={outDir}>{outDir ?? 'Next to the original video'}</span>
          {outDirControl}
        </div>
      </Section>

      <Section icon={<FiScissors />} title="Cutting">
        <ChoiceRow
          label="How clips are cut"
          value={keyframeCut ? 'fast' : 'exact'}
          onChange={(next) => onKeyframeCutChange(next === 'fast')}
          options={[
            { value: 'fast', label: 'Fast & lossless' },
            { value: 'exact', label: 'Exact frame' },
          ]}
        />
        <p className="simple-settings-note">
          {keyframeCut
            ? 'Original quality, cut in seconds. A clip can start a moment early, at the nearest keyframe.'
            : 'Starts on the exact frame you marked. Re-encodes the first moments, so a clip may begin with a short black frame on some videos.'}
        </p>
      </Section>

      <Section icon={<FiImage />} title="Snapshots">
        <ChoiceRow
          label="Image format"
          value={captureFormat}
          onChange={onCaptureFormatChange}
          options={[
            { value: 'jpeg', label: 'JPEG' },
            { value: 'png', label: 'PNG' },
            { value: 'webp', label: 'WebP' },
          ]}
        />
        <div className="export-option-row">
          <div className="export-option-label" id={qualityId}>Image quality</div>
          <div className="simple-settings-range">
            <input
              aria-labelledby={qualityId}
              type="range"
              min={10}
              max={100}
              value={Math.round(captureFrameQuality * 100)}
              onChange={(e) => onCaptureFrameQualityChange(parseInt(e.target.value, 10) / 100)}
            />
            <span>{Math.round(captureFrameQuality * 100)}%</span>
          </div>
        </div>
      </Section>

      <Section icon={<FiBell />} title="Messages">
        <SwitchRow title="System notifications" detail="A Windows notification when an export finishes" checked={showOsNotifications} onChange={onShowOsNotificationsChange} />
        <SwitchRow title="In-app tips" detail="Short messages inside the app" checked={showInAppNotifications} onChange={onShowInAppNotificationsChange} />
        <SwitchRow title="Confirm before closing" detail="Ask before closing a video or the app" checked={askBeforeClose} onChange={onAskBeforeCloseChange} />
      </Section>

      <Section icon={<FiCommand />} title="Keyboard shortcuts">
        <button type="button" className="secondary-button compact" onClick={onOpenKeyboardShortcuts}>Show and edit shortcuts</button>
      </Section>
    </div>
  );
}
