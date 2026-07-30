import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNav } from "../nav";
import { Icon } from "../ui";
import { useT } from "../i18n";

const PAGES = [
  { icon: "camera", title: "A twin from one selfie", body: "Upload a photo and Aura builds a realistic, animated avatar of you." },
  { icon: "mic", title: "Talk like you'd talk", body: "Hold to speak. Your avatar listens, thinks, answers — and smiles back." },
  { icon: "sparkles", title: "Make it yours", body: "Hair, clothes, colors, expressions, animations, and voice." },
  { icon: "persona", title: "It remembers you", body: "Conversations carry over. Your companion grows with you." },
];

export default function Onboarding() {
  const { reset } = useNav();
  const t = useT();
  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1);
  const last = i === PAGES.length - 1;
  const go = (n: number) => { if (n < 0 || n >= PAGES.length) return; setDir(n > i ? 1 : -1); setI(n); };

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", paddingTop: "calc(var(--sat) + 16px)", paddingBottom: "calc(var(--sab) + 20px)" }}>
      <div className="row" style={{ justifyContent: "space-between", padding: "0 24px", height: 32 }}>
        <span className="faint num" style={{ fontSize: 14 }}>{i + 1} / {PAGES.length}</span>
        {!last && <button className="muted" style={{ background: "none", border: 0, fontSize: 15, padding: 4 }} onClick={() => reset("creation")}>{t("Skip")}</button>}
      </div>

      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        <AnimatePresence custom={dir} mode="popLayout">
          <motion.div
            key={i} custom={dir}
            drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.18}
            onDragEnd={(_, info) => { if (info.offset.x < -60) go(i + 1); else if (info.offset.x > 60) go(i - 1); }}
            initial={{ opacity: 0, x: 60 * dir }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -60 * dir }}
            transition={{ duration: 0.32, ease: [0.23, 1, 0.32, 1] }}
            style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 18, padding: "0 28px 24px" }}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", duration: 0.5, bounce: 0.2 }}
              style={{ width: 76, height: 76, borderRadius: 22, display: "grid", placeItems: "center", background: "var(--ember-soft)", color: "var(--ember)", marginBottom: 8 }}
            >
              <Icon name={PAGES[i].icon} size={34} />
            </motion.div>
            <div className="display" style={{ fontSize: 40, maxWidth: 320 }}>{t(PAGES[i].title)}</div>
            <p className="muted" style={{ lineHeight: 1.55, maxWidth: 320, fontSize: 17 }}>{t(PAGES[i].body)}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div style={{ padding: "24px 24px 0", display: "grid", gap: 22 }}>
        <div className="dots" style={{ justifyContent: "flex-start" }}>
          {PAGES.map((_, n) => <motion.div layout key={n} transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1] }} style={{ borderRadius: 999 }} className={`dot ${n === i ? "on" : ""}`} onClick={() => go(n)} />)}
        </div>
        <button className="btn btn-primary btn-block" onClick={() => (last ? reset("creation") : go(i + 1))}>
          {last ? t("Create my avatar") : t("Continue")}
        </button>
      </div>
    </div>
  );
}
