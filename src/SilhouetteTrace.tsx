// Bust silhouette (head + shoulders), 170×230 viewBox.
const BUST = "M85 18c-26 0-40 20-40 44 0 16 6 30 14 38-3 14-14 20-30 26-16 6-21 22-21 46v40h154v-40c0-24-5-40-21-46-16-6-27-12-30-26 8-8 14-22 14-38 0-24-14-44-40-44z";

/** Avatar-loading visual: a single ember line draws the bust outline, then a
 *  soft ember tint fills it — sketching the avatar into existence where it
 *  will appear. Loops until the real avatar takes over. Theme-token colors;
 *  the global reduced-motion rule collapses the animation. */
export function SilhouetteTrace({ size = 170, label }: { size?: number; label?: string }) {
  const h = Math.round((size * 230) / 170);
  return (
    <div style={{ display: "grid", placeItems: "center", gap: 20, textAlign: "center" }}>
      <svg width={size} height={h} viewBox="0 0 170 230" style={{ overflow: "visible" }}>
        <path className="st-fill" d={BUST} fill="var(--ember-soft)" />
        <path className="st-line" d={BUST} fill="none" stroke="var(--ember)"
          strokeWidth="2" strokeLinecap="round"
          style={{ filter: "drop-shadow(0 0 6px var(--ember-soft))" }} />
      </svg>
      {label && <div className="faint" style={{ fontSize: 13, maxWidth: 240 }}>{label}</div>}
      <style>{`
        .st-line {
          stroke-dasharray: 620; stroke-dashoffset: 620;
          animation: st-draw 3.4s cubic-bezier(0.23,1,0.32,1) infinite;
        }
        .st-fill { opacity: 0; animation: st-fill 3.4s cubic-bezier(0.23,1,0.32,1) infinite; }
        @keyframes st-draw {
          0% { stroke-dashoffset: 620; opacity: 1; }
          55% { stroke-dashoffset: 0; }
          80% { stroke-dashoffset: 0; opacity: 1; }
          95% { opacity: 0; }
          100% { stroke-dashoffset: 620; opacity: 0; }
        }
        @keyframes st-fill {
          0%, 45% { opacity: 0; }
          60%, 80% { opacity: 1; }
          95%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
