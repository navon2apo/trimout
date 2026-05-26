/**
 * Feature flags — controlled at build time.
 *
 * The public, paid version is meant to be a clean QuickCut tool.
 * Advanced features (local Whisper transcription, AI tools, etc.) are
 * kept in the code but hidden behind flags so they can be re-enabled
 * for an internal/personal build without forking the codebase.
 *
 * Toggle these by editing this file before `yarn build`.
 */

const FEATURES = {
  /** Show the local Whisper transcription panel in the right sidebar */
  transcript: false,
} as const;

export default FEATURES;
