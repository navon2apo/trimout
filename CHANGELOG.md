# KICKO TrimOut - Changelog

## 1.5.0

### Zoom motion for clips
- Each clip can have a zoom movement: the picture glides in, holds, and glides out. It is saved with the clip and rendered on export.
- Ready-made movements: Zoom in, In & out, Zoom out. They start at the playhead.
- Editable curve under the video: drag a point sideways to change when it happens, up or down to change how close it is, click empty space to add a point, double-click a point (or press Delete/Backspace) to remove only that point. With fewer than two points left the zoom is removed.
- A frame on the picture: drag it to choose where the zoom looks, drag a corner to change how close. Shown only while a point is selected and the video is paused.
- Easing: Smooth, Linear, Dynamic. The preview and the export use the same curve.
- Playback controls inside the card: start of clip, -1s, frame back, play/pause, frame forward, +1s, and Preview.
- The Zoom Motion card only shows while the playhead is inside the selected clip.
- Export: one point is a fixed crop; two or more points are rendered from the source with ffmpeg `zoompan` (clip start aligned exactly). A merged video does not get per-clip zoom (a warning is shown).
- Clip badge shows the number of zoom points; timeline shows a diamond for each point.

### Free-look zoom
- Outside a clip: `-`, `+`, `Fit` and "Wheel zoom" to look closer at far parts of the field. Viewing only, nothing is saved.
- The scissors / 10s 15s 20s overlay can be hidden (x on the overlay) and brought back from the bar below the video, so screen recordings stay clean.

### Player and timeline
- Global player: -10 / -5 / +5 / +10 second skip buttons around play.
- Timeline starts at 16x zoom when a video is opened.
- Picking a clip (or playing it) fits the timeline to it: the clip fills about two thirds, centred.

### Technical
- New: `util/zoomAnchors.ts` (curve math, ffmpeg expression, presets; 18 unit tests), `useVideoZoom`, `ZoomMotionPanel`, `ZoomRectOverlay`.
- Verified with real ffmpeg runs for all three easings.
- Known gaps: zoom points are not yet restored when reopening a saved project file; no per-clip zoom on a merged video.

## 1.4.0
- Download from VEO / Pixellot / Hudl / Trace / PlaySight match pages (hidden browser extracts the video stream), with quality picker and size.
- Export no longer duplicates clips on re-export.
