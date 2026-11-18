/**
 * Web Audio API synthesizer for zero-dependency, offline-ready audio chimes.
 * Plays a clear dual-tone alert chime when an item is cancelled/voided.
 */
let audioCtx = null;

export function getAudioContext() {
  if (typeof window === 'undefined') return null;
  try {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        audioCtx = new AudioContext();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  } catch (e) {
    console.warn('AudioContext init error:', e);
    return null;
  }
}

// Auto-unlock AudioContext on first user touch/click on the page
if (typeof window !== 'undefined') {
  const unlock = () => {
    try {
      const ctx = getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume();
      }
    } catch (_) {}
    window.removeEventListener('click', unlock);
    window.removeEventListener('touchstart', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('click', unlock, { passive: true });
  window.addEventListener('touchstart', unlock, { passive: true });
  window.addEventListener('keydown', unlock, { passive: true });
}

export const playVoidAlertChime = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const playSound = () => {
      const now = ctx.currentTime;

      // 1. First warning ping (880Hz / A5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now);
      osc1.frequency.exponentialRampToValueAtTime(587.33, now + 0.35);

      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.36);

      // 2. Second warning ping (659Hz -> 880Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(659.25, now + 0.12);
      osc2.frequency.exponentialRampToValueAtTime(880, now + 0.45);

      gain2.gain.setValueAtTime(0.25, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc2.start(now + 0.12);
      osc2.stop(now + 0.46);
    };

    if (ctx.state === 'suspended') {
      ctx.resume().then(playSound).catch(playSound);
    } else {
      playSound();
    }
  } catch (e) {
    console.warn('Audio chime playback omitted:', e);
  }
};
