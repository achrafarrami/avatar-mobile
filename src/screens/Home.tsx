import { motion, AnimatePresence } from "framer-motion";
import { AvatarStage } from "../Avatar";
import { Icon } from "../ui";
import { useNav, Screen } from "../nav";
import { useTheme } from "../useTheme";
import { useAura, Phase } from "../useAura";
import { useAvatar } from "../avatarStore";

const STATUS: Record<Phase, string> = {
  idle: "Hold to talk", listening: "Listening…", thinking: "Thinking…", speaking: "Speaking…",
};
const ACTIONS: { icon: string; label: string; to: Screen }[] = [
  { icon: "chat", label: "Chat", to: "chat" },
  { icon: "wardrobe", label: "Wardrobe", to: "wardrobe" },
  { icon: "sparkles", label: "Customize", to: "customize" },
  { icon: "play", label: "Animations", to: "animations" },
  { icon: "persona", label: "Personality", to: "personality" },
  { icon: "settings", label: "Settings", to: "settings" },
];

export default function Home() {
  const { go } = useNav();
  const [theme, toggle] = useTheme();
  const { file, params } = useAvatar();
  const { phase, error, startRec, stopRec } = useAura();
  const active = phase !== "idle";

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }}>
      <div className="row" style={{ justifyContent: "space-between", padding: "calc(var(--sat) + 12px) 20px 0" }}>
        <div className="h2 grad-text" style={{ fontWeight: 700 }}>Aura</div>
        <button className="icon-btn" aria-label="Toggle theme" onClick={toggle}>
          <Icon name={theme === "dark" ? "sun" : "moon"} size={20} />
        </button>
      </div>

      <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
        <AvatarStage file={file} params={params} />
        <AnimatePresence>
          {(active || error) && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
              className="glass"
              style={{ position: "absolute", top: 8, left: "50%", transform: "translateX(-50%)", padding: "8px 16px", borderRadius: 999, fontSize: 14, fontWeight: 600, maxWidth: "88%", textAlign: "center", color: error ? "var(--a3)" : undefined }}>
              {error || STATUS[phase]}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div style={{ display: "grid", placeItems: "center", padding: "4px 0 10px" }}>
        <motion.button
          onPointerDown={startRec} onPointerUp={stopRec} onPointerLeave={() => phase === "listening" && stopRec()}
          whileTap={{ scale: 0.92 }}
          style={{ position: "relative", width: 84, height: 84, borderRadius: "50%", border: 0, background: "var(--grad)", color: "#fff", display: "grid", placeItems: "center", boxShadow: "var(--glow), var(--sh-2)", touchAction: "none" }}
          aria-label="Hold to talk">
          <Icon name="mic" size={30} />
          {phase === "listening" && (
            <motion.span initial={{ opacity: 0.6, scale: 1 }} animate={{ opacity: 0, scale: 1.9 }}
              transition={{ duration: 1.2, repeat: Infinity }}
              style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid var(--a2)" }} />
          )}
        </motion.button>
        <div className="faint" style={{ fontSize: 12, marginTop: 6 }}>{STATUS[phase]}</div>
      </div>

      <div style={{ display: "flex", gap: 12, overflowX: "auto", padding: "6px 20px calc(var(--sab) + 18px)", scrollbarWidth: "none" }}>
        {ACTIONS.map((a) => (
          <motion.button key={a.to} whileTap={{ scale: 0.94 }} onClick={() => go(a.to)} className="glass"
            style={{ flex: "0 0 auto", width: 84, height: 84, borderRadius: 22, display: "grid", placeItems: "center", gap: 7, border: "1px solid var(--border)", color: "var(--text)" }}>
            <Icon name={a.icon} size={24} />
            <span style={{ fontSize: 12 }} className="muted">{a.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
