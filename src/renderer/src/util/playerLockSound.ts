import { LOCK_SOUNDS, type LockSoundId } from './playerLock';

let audioContext: AudioContext | undefined;

/** Plays a lock sound in the app (the export puts the same sound in the video) */
export default function playLockSound(id: LockSoundId) {
  if (id === 'off') return;
  try {
    audioContext ??= new AudioContext();
    const ctx = audioContext;
    if (ctx.state === 'suspended') ctx.resume().catch(() => undefined);
    const now = ctx.currentTime;
    const { volume, tones } = LOCK_SOUNDS[id];
    tones.forEach(({ at, freq, freqEnd, seconds, type }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now + at);
      if (freqEnd != null) osc.frequency.exponentialRampToValueAtTime(freqEnd, now + at + seconds);
      gain.gain.setValueAtTime(0.0001, now + at);
      gain.gain.exponentialRampToValueAtTime(volume, now + at + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + at + seconds);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + at);
      osc.stop(now + at + seconds + 0.02);
    });
  } catch (err) {
    console.warn('Could not play the lock sound', err);
  }
}
