// Mutable, non-reactive signals the 3D avatar reads every frame (avoids
// re-rendering the Canvas + the r3f context-bridge dance for per-frame flags).
export const signals = { speaking: false };
