// Mutable, non-reactive signals the 3D avatar reads every frame (avoids
// re-rendering the Canvas + the r3f context-bridge dance for per-frame data).
//   speaking: audio is playing
//   mouth:    live 0..1 openness sampled from the speech waveform (lip-sync)
export const signals = { speaking: false, mouth: 0 };
