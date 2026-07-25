import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AvatarStage } from "../Avatar";
import { Icon } from "../ui";
import { useNav, Screen } from "../nav";
import { useTheme } from "../useTheme";

type Voice = "idle" | "listening" | "thinking" | "speaking";
const STATUS: Record<Voice, string> = {
  idle: "Hold to talk",
  listening: "Listening…",
  thinking: "Thinking…",
  speaking: "Speaking…",
};

const ACTIONS: { icon: string; label: string; to: Screen }[] = [
  { icon: "sparkles", label: "Customize", to: "customize" },
  { icon: "wardrobe", label: "Wardrobe", to: "wardrobe" },
  { icon: "play", label: "Animations", to: "animations" },
  { icon: "chat", label: "Chat", to: "chat" },
  { icon: "persona", label: "Personality", to: "personality" },
  { icon: "settings", label: "Settings", to: "settings" },
];

export default function Home() {
  const { go } = useNav();
  const [theme, toggle] = useTheme();
  const [voice, setVoice] = useState<Voice>("idle");
  const timers = useRef<number[]>([]);

  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  const press = () => { clearTimers(); setVoice("listening"); };
  const release = () => {
    if (voice !== "listening") return;
    setVoice("thinking");
    // ponytail: mocked reply timeline — swap for a real /chat stream + lip-sync.
    timers.current.push(setTimeout(() => setVoice("speaking"), 1100) as unknown as number);
    timers.current.push(setTimeout(() => setVoice("idle"), 3400) as unknown as number);
  };

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }}>
      {/* top bar */}
      <div className="row" style={{ justifyContent: "space-between", padding: "calc(var(--sat) + 12px) 20px 0" }}>
        <div className="h2 grad-text" style={{ fontWeight: 700 }}>Aura</div>
        <button className="icon-btn" aria-label="Toggle theme" onClick={toggle}>
          <Icon name={theme === "dark" ? "sun" : "moon"} size={20} />
        </button>
      </div>

      {/* avatar (~70%) */}
      <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
        <AvatarStage />
        <AnimatePresence>
          {voice !== "idle" && (
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
              className="glass"
              style={{ position: "absolute", top: 8, left: "50%", transform: "translateX(-50%)", padding: "8px 16px", borderRadius: 999, fontSize: 14, fontWeight: 600 }}
            >
              {STATUS[voice]}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* hold to talk */}
      <div style={{ display: "grid", placeItems: "center", padding: "4px 0 10px" }}>
        <motion.button
          onPointerDown={press} onPointerUp={release} onPointerLeave={release}
          whileTap={{ scale: 0.92 }}
          style={{
            position: "relative", width: 84, height: 84, borderRadius: "50%", border: 0,
            background: "var(--grad)", color: "#fff", display: "grid", placeItems: "center",
            boxShadow: "var(--glow), var(--sh-2)", touchAction: "none",
          }}
          aria-label="Hold to talk"
        >
          <Icon name="mic" size={30} />
          {voice === "listening" && (
            <motion.span
              initial={{ opacity: 0.6, scale: 1 }} animate={{ opacity: 0, scale: 1.9 }}
              transition={{ duration: 1.2, repeat: Infinity }}
              style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid var(--a2)" }}
            />
          )}
        </motion.button>
        <div className="faint" style={{ fontSize: 12, marginTop: 6 }}>{STATUS[voice]}</div>
      </div>

      {/* quick actions */}
      <div style={{ display: "flex", gap: 12, overflowX: "auto", padding: "6px 20px calc(var(--sab) + 18px)", scrollbarWidth: "none" }}>
        {ACTIONS.map((a) => (
          <motion.button key={a.to} whileTap={{ scale: 0.94 }} onClick={() => go(a.to)}
            className="glass"
            style={{ flex: "0 0 auto", width: 84, height: 84, borderRadius: 22, display: "grid", placeItems: "center", gap: 7, border: "1px solid var(--border)", color: "var(--text)" }}>
            <Icon name={a.icon} size={24} />
            <span style={{ fontSize: 12 }} className="muted">{a.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
