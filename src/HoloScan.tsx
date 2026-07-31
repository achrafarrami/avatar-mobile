import { useId } from "react";

// Bust silhouette (head + shoulders), 170×230 viewBox — shared by the
// scan-line fill, the clip, and the rim stroke.
const BUST = "M85 18c-26 0-40 20-40 44 0 16 6 30 14 38-3 14-14 20-30 26-16 6-21 22-21 46v40h154v-40c0-24-5-40-21-46-16-6-27-12-30-26 8-8 14-22 14-38 0-24-14-44-40-44z";
const RING_R = 28;
const RING_C = 2 * Math.PI * RING_R;

/** Holographic avatar-loading visual: the bust drawn in ember scan-lines with
 *  a bright beam sweeping upward ("printing" the avatar), plus an optional
 *  progress ring. `progress` 0–1 shows the ring + percentage; omit it for the
 *  indeterminate form (Suspense fallback). Colors ride the theme tokens. */
export function HoloScan({ size = 170, label, progress }:
  { size?: number; label?: string; progress?: number }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const h = Math.round((size * 230) / 170);
  return (
    <div style={{ display: "grid", placeItems: "center", gap: 20, textAlign: "center" }}>
      <div className="hs-fig" style={{ position: "relative", width: size, height: h }}>
        <svg width={size} height={h} viewBox="0 0 170 230" style={{ overflow: "visible" }}>
          <defs>
            <pattern id={`hl${id}`} width="4" height="4" patternUnits="userSpaceOnUse">
              <rect width="4" height="1.6" fill="var(--ember)" opacity="0.5" />
            </pattern>
            <clipPath id={`bc${id}`}><path d={BUST} /></clipPath>
            <linearGradient id={`hf${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffffff" stopOpacity="0.85" />
              <stop offset="1" stopColor="#ffffff" stopOpacity="0.35" />
            </linearGradient>
          </defs>
          <g clipPath={`url(#bc${id})`}>
            <path d={BUST} fill={`url(#hl${id})`} opacity="0.85" />
            <g className="hs-scan">
              <rect x="0" y="-34" width="170" height="34" fill={`url(#hf${id})`}
                style={{ mixBlendMode: "screen" }} opacity="0.5" />
              <rect x="0" y="-2" width="170" height="2" fill="#ffd9b0" />
            </g>
          </g>
          <path d={BUST} fill="none" stroke="var(--ember)" strokeOpacity="0.55" strokeWidth="1.2"
            style={{ filter: "drop-shadow(0 0 8px var(--ember-soft))" }} />
        </svg>
        <div className="hs-base" />
      </div>

      {progress !== undefined && (
        <div style={{ position: "relative", width: 64, height: 64 }}>
          <svg width="64" height="64" viewBox="0 0 64 64" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="32" cy="32" r={RING_R} fill="none" stroke="var(--surface-2)" strokeWidth="3" />
            <circle cx="32" cy="32" r={RING_R} fill="none" stroke="var(--ember)" strokeWidth="3"
              strokeLinecap="round" strokeDasharray={RING_C}
              strokeDashoffset={RING_C * (1 - Math.min(1, Math.max(0, progress)))}
              style={{ transition: "stroke-dashoffset 0.7s var(--ease)",
                filter: "drop-shadow(0 0 5px var(--ember))" }} />
          </svg>
          <div className="num" style={{ position: "absolute", inset: 0, display: "grid",
            placeItems: "center", fontSize: 13, fontWeight: 600 }}>
            {Math.round(Math.min(1, Math.max(0, progress)) * 100)}%
          </div>
        </div>
      )}

      {label && <div className="faint" style={{ fontSize: 13, maxWidth: 240 }}>{label}</div>}

      <style>{`
        .hs-fig { animation: hs-flicker 4s steps(1) infinite; }
        .hs-scan { animation: hs-sweep 3.2s cubic-bezier(0.23,1,0.32,1) infinite; }
        .hs-base {
          position: absolute; left: 50%; bottom: -16px;
          width: 78%; height: 22px; transform: translateX(-50%);
          border-radius: 50%;
          background: radial-gradient(50% 50% at 50% 50%, var(--ember-soft), transparent 70%);
          animation: hs-pad 3.2s cubic-bezier(0.23,1,0.32,1) infinite;
        }
        @keyframes hs-sweep {
          0% { transform: translateY(264px); }
          70% { transform: translateY(24px); }
          75%, 100% { transform: translateY(264px); opacity: 0; }
        }
        @keyframes hs-flicker {
          0%, 100% { opacity: 1; }
          47% { opacity: 1; } 48% { opacity: .78; } 49% { opacity: 1; }
          82% { opacity: 1; } 83% { opacity: .84; } 84% { opacity: 1; }
        }
        @keyframes hs-pad {
          0%, 100% { opacity: .5; transform: translateX(-50%) scale(.92); }
          50% { opacity: 1; transform: translateX(-50%) scale(1.05); }
        }
      `}</style>
    </div>
  );
}
