// New-lead alert sound presets — generated on the fly via Web Audio, no MP3.
// Each preset receives an AudioContext and schedules a short pleasant sound.
//
// Add / tweak presets here without touching the admin logic.

const scheduleNote = (ctx, {
  freq,
  start,
  duration = 0.15,
  gainPeak = 0.18,
  type = 'sine',
  attack = 0.01,
  release = 0.12,
}) => {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(gainPeak, start + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + attack + release);
  osc.connect(gain).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
};

// 1) Bip classique — actuel, 2 petites notes rapides.
const playClassic = (ctx) => {
  const t = ctx.currentTime;
  scheduleNote(ctx, { freq: 880,  start: t,        duration: 0.13, gainPeak: 0.35 });
  scheduleNote(ctx, { freq: 1175, start: t + 0.16, duration: 0.13, gainPeak: 0.35 });
};

// 2) Chime zen — arpège doux ascendant C5 → E5 → G5, notification "premium".
const playChime = (ctx) => {
  const t = ctx.currentTime;
  scheduleNote(ctx, { freq: 523.25, start: t,        duration: 0.35, gainPeak: 0.32, release: 0.32 }); // C5
  scheduleNote(ctx, { freq: 659.25, start: t + 0.12, duration: 0.35, gainPeak: 0.32, release: 0.32 }); // E5
  scheduleNote(ctx, { freq: 783.99, start: t + 0.24, duration: 0.55, gainPeak: 0.36, release: 0.52 }); // G5
};

// 3) Tri-tone — style iOS / macOS, 3 notes rapides très reconnaissables.
const playTriTone = (ctx) => {
  const t = ctx.currentTime;
  scheduleNote(ctx, { freq: 1046.5, start: t,        duration: 0.10, gainPeak: 0.30, release: 0.09 }); // C6
  scheduleNote(ctx, { freq: 1318.5, start: t + 0.09, duration: 0.10, gainPeak: 0.30, release: 0.09 }); // E6
  scheduleNote(ctx, { freq: 1568.0, start: t + 0.18, duration: 0.14, gainPeak: 0.34, release: 0.14 }); // G6
};

export const ALERT_SOUND_PRESETS = [
  { id: 'classic',  label: 'Bip classique',       play: playClassic },
  { id: 'chime',    label: 'Chime zen (3 notes)', play: playChime },
  { id: 'tritone',  label: 'Tri-tone (iOS-like)', play: playTriTone },
];

export const DEFAULT_ALERT_SOUND = 'classic';

export const playAlertSound = (ctx, presetId = DEFAULT_ALERT_SOUND) => {
  if (!ctx) return;
  const preset = ALERT_SOUND_PRESETS.find(p => p.id === presetId)
    || ALERT_SOUND_PRESETS[0];
  try {
    preset.play(ctx);
  } catch {
    // ignore
  }
};
