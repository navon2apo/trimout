// anything more than this will probably cause the UI to become unusably slow
export const maxSegmentsAllowed = 2000;

/** Size of the window to extract keyframes/waveforms */
export const ffmpegExtractWindow = 60;

export const zoomMax = 2 ** 14;
// Long matches are unreadable at 1x, so a freshly opened video starts with the timeline zoomed in
export const DEFAULT_TIMELINE_ZOOM = 16;

export const rightBarWidth = 250;
export const leftBarWidth = 240;
