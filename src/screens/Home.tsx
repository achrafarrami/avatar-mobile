import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "../ui";
import { useNav, Screen } from "../nav";
import { useTheme } from "../useTheme";
import { useAura, Phase } from "../useAura";

const STATUS: Record<Phase, string> = {
  idle: "Hold to talk", listening: "Listening…", thinking: "Thinking…", speaking: "Speaking…",
};
const TABS: { icon: string; label: string; to: Screen }[] = [
  { icon: "chat", label: "Chat", to: "chat" },
  { icon: "wardrobe", label: "Wardrobe", to: "wardrobe" },
  { icon: "sparkles", label: "Customize", to: "customize" },
  { icon: "settings", label: "Settings", to: "settings" },
];

export default function Home() {
  const { go } = useNav();
  const [theme, toggle] = useTheme();
  const { phase, error, startRec, stopRec } = useAura();

  // container lets pointer events fall through to the avatar; UI re-enables them
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", pointerEvents: "none" }}>
      <div className="row" style={{ justifyContent: "space-between", padding: "calc(var(--sat) + 12px) 20px 0", pointerEvents: "auto" }}>
        <div className="h2 grad-text" style={{ fontWeight: 700 }}>Aura</div>
        <button className="icon-btn" aria-label="Toggle theme" onClick={toggle}>
          <Icon name={theme === "dark" ? "sun" : "moon"} size={20} />
        </button>
      </div>

      <div style={{ flex: 1 }} /> {/* avatar shows + is draggable through here */}

      <AnimatePresence>
        {(phase !== "idle" || error) && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            className="glass"
            style={{ alignSelf: "center", padding: "8px 16px", borderRadius: 999, fontSize: 14, fontWeight: 600, marginBottom: 12, color: error ? "var(--a3)" : undefined, pointerEvents: "none" }}>
            {error || STATUS[phase]}
          </motion.div>
        )}
      </AnimatePresence>

      {/* bottom dock: tidy glass bar with a raised mic in the middle */}
      <div className="glass" style={{
        pointerEvents: "auto", margin: "0 14px calc(var(--sab) + 14px)", padding: "10px 8px",
        borderRadius: 28, display: "grid", gridTemplateColumns: "1fr 1fr 96px 1fr 1fr", alignItems: "center",
        border: "1px solid var(--border)", boxShadow: "var(--sh-2)",
      }}>
        <Tab {...TABS[0]} go={go} />
        <Tab {...TABS[1]} go={go} />
        <div style={{ display: "grid", placeItems: "center" }}>
          <motion.button
            onPointerDown={startRec} onPointerUp={stopRec} onPointerLeave={() => phase === "listening" && stopRec()}
            whileTap={{ scale: 0.92 }} aria-label="Hold to talk"
            style={{ position: "relative", width: 72, height: 72, marginTop: -34, borderRadius: "50%", border: "4px solid var(--surface-solid)", background: "var(--grad)", color: "#fff", display: "grid", placeItems: "center", boxShadow: "var(--glow), var(--sh-2)", touchAction: "none" }}>
            <Icon name="mic" size={28} />
            {phase === "listening" && (
              <motion.span initial={{ opacity: 0.6, scale: 1 }} animate={{ opacity: 0, scale: 1.9 }}
                transition={{ duration: 1.2, repeat: Infinity }}
                style={{ position: "absolute", inset: -2, borderRadius: "50%", border: "2px solid var(--a2)" }} />
            )}
          </motion.button>
        </div>
        <Tab {...TABS[2]} go={go} />
        <Tab {...TABS[3]} go={go} />
      </div>
    </div>
  );
}

function Tab({ icon, label, to, go }: { icon: string; label: string; to: Screen; go: (s: Screen) => void }) {
  return (
    <motion.button whileTap={{ scale: 0.9 }} onClick={() => go(to)}
      style={{ background: "none", border: 0, display: "grid", justifyItems: "center", gap: 4, color: "var(--muted)", padding: "4px 0" }}>
      <Icon name={icon} size={23} />
      <span style={{ fontSize: 11 }}>{label}</span>
    </motion.button>
  );
}
