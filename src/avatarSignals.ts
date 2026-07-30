// Mutable, non-reactive signals the 3D avatar reads every frame (avoids
// re-rendering the Canvas + the r3f context-bridge dance for per-frame data).
//   speaking:   audio is playing
//   listening:  mic is capturing (hold-to-talk) — drives the attentive pose
//   mouth:      live 0..1 openness sampled from the speech waveform (lip-sync)
//   mouthWide:  0..1 lip spread (ee/s sounds — high spectral centroid)
//   mouthRound: 0..1 lip rounding (oo/o sounds — low spectral centroid)
export const signals = { speaking: false, listening: false, mouth: 0, mouthWide: 0, mouthRound: 0 };

// dev-only: lets lip-sync be driven from the console without a TTS round-trip
if (import.meta.env.DEV) (window as unknown as { __signals: typeof signals }).__signals = signals;
