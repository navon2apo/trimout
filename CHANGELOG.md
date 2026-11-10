# KICKO TrimOut - Changelog

## 1.8.0

### Player lock
- Mark a player on a clip: the picture freezes for a moment, a ring closes in on the player, his name and the name of the move show, and the picture glides closer and back. Plays in the app and is rendered into the exported clip.
- Click on the player, then drag the ring or its corner handles to place and size it.
- Style: show the player name and / or the move name, ring color (lime, white, yellow, red, green, blue, black), and the sound (blips, sweep, pings, tick, or none).
- The zoom starts from the view on screen and comes back to exactly it; it follows the clip's own zoom and the output format.
- Modern Hebrew and Latin type (Heebo, open license).

### Render screen
- Drag the clips into the order you want before rendering. The numbers follow, and the file names and the merged video use the new order.
- Music for the merged video: replace the game sound or mix with it, volume, fades, repeats if the song is short.
- An eye on every clip: only clips with an open eye are rendered (default: all).

### Clips and zoom
- The play button on a clip plays, pauses where it is, and continues. The clip that plays is clearly marked.
- Clip cards have a calmer layout with bigger buttons.
- The strip on top of the zoom curve moves the playhead; the duplicate player buttons are gone.

### Windows
- The taskbar shows the TrimOut logo in the installed app (the app id now matches the shortcut).

## 1.7.0

### Projects you can come back to
- File → Recent projects, and a list on the start screen. Each shows its clips and the last position, and opens where you stopped.
- Opening a video loads its saved clips straight away, with their zoom, action, player and favorite marks.
- Optional: open the last project when the app starts.
- The project file now keeps each clip's action, player, favorite/uncertain mark and zoom movement.
- Clips saved by an older version get their action back from the clip name.

### KICKO
- Fixed the connection to KICKO (the app now uses the official kicko.football address).
- A play with an action you typed yourself is sent to KICKO as a free play with your own name for it.
- Error messages from KICKO now say what was rejected.

## 1.6.0

### Merged export and playback
- Crossfade transitions between clips when exporting a merged video (option in the export dialog).
- In simple mode, the selected clips play one after the other, in order.
- Fixed the release-config test, which still expected an old version number.

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
