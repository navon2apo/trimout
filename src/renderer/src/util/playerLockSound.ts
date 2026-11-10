import { LOCK_SOUND } from './playerLock';

let audioContext: AudioContext | undefined;

/** Plays the lock sound in the app (the export puts the same sound in the video) */
export default function playLockSound() {
  try {
    audioContext ??= new AudioContext();
    const ctx = audioContext;
    if (ctx.state === 'suspended') ctx.resume().catch(() => undefined);
    const now = ctx.currentTime;
    LOCK_SOUND.blips.forEach(({ at, freq, seconds }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now + at);
      gain.gain.setValueAtTime(0.0001, now + at);
      gain.gain.exponentialRampToValueAtTime(LOCK_SOUND.volume, now + at + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + at + seconds);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + at);
      osc.stop(now + at + seconds + 0.02);
    });
  } catch (err) {
    console.warn('Could not play the lock sound', err);
  }
}
