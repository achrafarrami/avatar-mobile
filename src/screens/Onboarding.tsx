import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNav } from "../nav";
import { Icon } from "../ui";

const PAGES = [
  { icon: "camera", title: "Create Your Digital Twin", body: "Upload a few selfies and generate a realistic, animated avatar of yourself." },
  { icon: "mic", title: "Talk Naturally", body: "Hold to speak. Your avatar listens, thinks, speaks, smiles, laughs, and reacts." },
  { icon: "sparkles", title: "Customize Everything", body: "Hair, clothes, accessories, colors, expressions, animations, and voice." },
  { icon: "persona", title: "Always With You", body: "Your AI companion remembers your conversations and grows with you." },
];

export default function Onboarding() {
  const { reset } = useNav();
  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1);
  const last = i === PAGES.length - 1;
  const go = (n: number) => { if (n < 0 || n >= PAGES.length) return; setDir(n > i ? 1 : -1); setI(n); };

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", paddingTop: "calc(var(--sat) + 16px)", paddingBottom: "calc(var(--sab) + 20px)" }}>
      <div style={{ display: "flex", justifyContent: "flex-end", padding: "0 20px", height: 32 }}>
        {!last && <button className="muted" style={{ background: "none", border: 0, fontSize: 15 }} onClick={() => reset("home")}>Skip</button>}
      </div>

      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        <AnimatePresence custom={dir} mode="popLayout">
          <motion.div
            key={i} custom={dir}
            drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.18}
            onDragEnd={(_, info) => { if (info.offset.x < -60) go(i + 1); else if (info.offset.x > 60) go(i - 1); }}
            initial={{ opacity: 0, x: 60 * dir }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -60 * dir }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 30, padding: "0 34px", textAlign: "center" }}
          >
            <motion.div
              initial={{ scale: 0.8, rotate: -6 }} animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 180, damping: 14 }}
              style={{ width: 200, height: 200, borderRadius: 52, display: "grid", placeItems: "center", background: "var(--grad-soft)", border: "1px solid var(--border)", boxShadow: "var(--glow)", color: "var(--text)" }}
            >
              <Icon name={PAGES[i].icon} size={76} />
            </motion.div>
            <div>
              <div className="h1" style={{ marginBottom: 12 }}>{PAGES[i].title}</div>
              <p className="muted" style={{ lineHeight: 1.55, maxWidth: 320 }}>{PAGES[i].body}</p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div style={{ padding: "0 24px", display: "grid", gap: 22 }}>
        <div className="dots">
          {PAGES.map((_, n) => <div key={n} className={`dot ${n === i ? "on" : ""}`} onClick={() => go(n)} />)}
        </div>
        <button className="btn btn-primary btn-block" onClick={() => (last ? reset("home") : go(i + 1))}>
          {last ? "Create My Avatar" : "Continue"}
        </button>
      </div>
    </div>
  );
}
