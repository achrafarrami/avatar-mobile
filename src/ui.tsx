import { ReactNode } from "react";
import { motion } from "framer-motion";
import { useNav } from "./nav";

/* ---- icons (inline stroke SVG — no icon dependency) --------------------- */
const P: Record<string, ReactNode> = {
  back: <path d="M15 5l-7 7 7 7" />,
  mic: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></>,
  wardrobe: <><path d="M12 3v18" /><rect x="3" y="3" width="18" height="18" rx="3" /></>,
  sparkles: <path d="M12 3l1.8 4.9L19 9l-5.2 1.1L12 15l-1.8-4.9L5 9l5.2-1.1zM18 14l.9 2.4L21 17l-2.1.6L18 20l-.9-2.4L15 17l2.1-.6z" />,
  play: <path d="M8 5v14l11-7z" />,
  chat: <path d="M4 5h16v11H8l-4 4z" />,
  persona: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></>,
  settings: <><circle cx="12" cy="12" r="3.2" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" /></>,
  sun: <><circle cx="12" cy="12" r="4.5" /><path d="M12 1v3M12 20v3M1 12h3M20 12h3M4 4l2 2M18 18l2 2M20 4l-2 2M6 18l-2 2" /></>,
  moon: <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />,
  camera: <><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></>,
  check: <path d="M4 12l5 5L20 6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  history: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M12 7v5l3 2" /></>,
};
export function Icon({ name, size = 24 }: { name: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      {P[name]}
    </svg>
  );
}

/* ---- page transition wrapper (slides with nav direction) ---------------- */
export function Page({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const { dir } = useNav();
  return (
    <motion.div
      className="page"
      initial={{ opacity: 0, x: 40 * dir }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 * dir }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: "absolute", inset: 0,
        paddingTop: "calc(var(--sat) + 8px)", paddingBottom: "calc(var(--sab) + 8px)",
        overflowY: scroll ? "auto" : "hidden",
        display: "flex", flexDirection: "column",
      }}
    >
      {children}
    </motion.div>
  );
}

export function TopBar({ title }: { title?: string }) {
  const { back } = useNav();
  return (
    <div className="row" style={{ padding: "8px 16px 4px", flex: "0 0 auto" }}>
      <button className="icon-btn" aria-label="Back" onClick={back}><Icon name="back" size={22} /></button>
      {title && <div className="h2" style={{ marginLeft: 4 }}>{title}</div>}
    </div>
  );
}

/* Generic polished placeholder so every route is reachable + on-brand. */
export function Placeholder({ title, icon, blurb }: { title: string; icon: string; blurb: string }) {
  return (
    <Page>
      <TopBar title={title} />
      <div className="col" style={{ flex: 1, alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0 32px", gap: 20 }}>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 16 }}
          style={{ width: 108, height: 108, borderRadius: 34, display: "grid", placeItems: "center", background: "var(--grad-soft)", border: "1px solid var(--border)", color: "var(--text)", boxShadow: "var(--glow)" }}>
          <Icon name={icon} size={44} />
        </motion.div>
        <div className="h1">{title}</div>
        <p className="muted" style={{ maxWidth: 300, lineHeight: 1.5 }}>{blurb}</p>
        <div className="faint" style={{ fontSize: 13 }}>Designed — implementation coming next.</div>
      </div>
    </Page>
  );
}
