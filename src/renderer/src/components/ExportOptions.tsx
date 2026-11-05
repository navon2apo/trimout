// Type-only import: the presets module pulls in FFmpeg, which this view does not need.
import { useId } from 'react';

import type { ExportTransition } from '../util/crossfade';
import type { AspectRatio, FitMode, QualityPreset } from '../util/qualityPresets';
import Choice from './ChoiceRow';

export type ExportMode = 'separate' | 'merge' | 'both';

export default function ExportOptions({
  quality, onQualityChange, aspectRatio, onAspectRatioChange, fitMode, onFitModeChange, mode, onModeChange, folderPerExport, onFolderPerExportChange, transition, onTransitionChange,
}: {
  transition: ExportTransition,
  onTransitionChange: (next: ExportTransition) => void,
  quality: QualityPreset,
  onQualityChange: (next: QualityPreset) => void,
  aspectRatio: AspectRatio,
  onAspectRatioChange: (next: AspectRatio) => void,
  fitMode: FitMode,
  onFitModeChange: (next: FitMode) => void,
  mode: ExportMode,
  onModeChange: (next: ExportMode) => void,
  folderPerExport: boolean,
  onFolderPerExportChange: (next: boolean) => void,
}) {
  const folderSwitchId = useId();

  return (
    <div className="export-options">
      <Choice
        label="Quality"
        value={quality}
        onChange={onQualityChange}
        options={[
          { value: 'lossless', label: 'Original', title: 'No re-encoding, fast' },
          { value: 'high', label: 'High', title: 'Maximum quality, larger file' },
          { value: 'balanced', label: 'Balanced', title: 'Balanced quality and file size' },
          { value: 'small', label: 'Small', title: 'Faster sharing for WhatsApp and mobile' },
        ]}
      />

      <Choice
        label="Format"
        value={aspectRatio}
        onChange={onAspectRatioChange}
        options={[
          { value: 'original', label: 'Original', title: 'No geometry changes' },
          { value: '16:9', label: '16:9 Wide', title: 'Landscape - TV / YouTube (1920x1080)' },
          { value: '9:16', label: '9:16 Phone', title: 'Vertical - Reels / TikTok / Shorts (1080x1920)' },
          { value: '1:1', label: '1:1 Square', title: 'Square - Instagram Feed (1080x1080)' },
        ]}
      />

      {aspectRatio !== 'original' && (
        <>
          <Choice
            label="Fit"
            value={fitMode}
            onChange={onFitModeChange}
            options={[
              { value: 'crop', label: 'Center crop', title: 'Crops from the center - no black bars, but edges may be lost' },
              { value: 'pad', label: 'Black bars', title: 'Keeps all content and adds black bars where needed' },
            ]}
          />
          {quality === 'lossless' && (
            <div className="export-option-note">Changing the format needs re-encoding, so quality switches to Balanced automatically.</div>
          )}
        </>
      )}

      {mode !== 'separate' && (
        <>
          <Choice
            label="Transitions"
            value={transition}
            onChange={onTransitionChange}
            options={[
              { value: 'none', label: 'Cut', title: 'Clips follow each other with a plain cut' },
              { value: 'fade-short', label: 'Crossfade 0.5s', title: 'Each clip blends into the next over half a second' },
              { value: 'fade-long', label: 'Crossfade 1s', title: 'Each clip blends into the next over one second' },
            ]}
          />
          {transition !== 'none' && quality === 'lossless' && (
            <div className="export-option-note">Blended transitions need re-encoding, so the merged video is made in Balanced quality.</div>
          )}
        </>
      )}

      <details className="export-more-options">
        <summary>More options</summary>
        <Choice
          label="Files"
          value={mode}
          onChange={onModeChange}
          options={[
            { value: 'separate', label: 'Separate', title: 'Each clip as a separate file' },
            { value: 'merge', label: 'Merged', title: 'One clip that combines everything' },
            { value: 'both', label: 'Both', title: 'Separate clips plus one merged clip' },
          ]}
        />
        <div className="export-option-switch">
          <input id={folderSwitchId} type="checkbox" checked={folderPerExport} onChange={(e) => onFolderPerExportChange(e.target.checked)} />
          <label htmlFor={folderSwitchId}>
            <strong>Folder per export</strong>
            <small>{folderPerExport ? 'Each export gets its own folder' : 'All files go to the destination folder'}</small>
          </label>
        </div>
      </details>
    </div>
  );
}
