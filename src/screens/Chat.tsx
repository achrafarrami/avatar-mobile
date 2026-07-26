import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Icon } from "../ui";
import { useNav } from "../nav";
import { useAura, Phase } from "../useAura";

const HINT: Record<Phase, string> = {
  idle: "Hold the mic or type", listening: "Listening…", thinking: "Thinking…", speaking: "Speaking…",
};

export default function Chat() {
  const { back } = useNav();
  const { phase, messages, error, send, startRec, stopRec } = useAura();
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [messages, phase]);
  const submit = () => { const t = text; setText(""); send(t); };

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", pointerEvents: "none" }}>
      {/* top bar over the avatar (which shows through the transparent gap) */}
      <div className="row" style={{ padding: "calc(var(--sat) + 12px) 16px 8px", background: "linear-gradient(var(--bg), transparent)", pointerEvents: "auto" }}>
        <button className="icon-btn" aria-label="Back" onClick={back}><Icon name="back" size={22} /></button>
        <div className="h2" style={{ marginLeft: 4 }}>Chat</div>
      </div>

      <div style={{ flex: 1 }} /> {/* avatar face visible here */}

      {/* opaque message sheet */}
      <div style={{ background: "var(--bg)", borderTopLeftRadius: 28, borderTopRightRadius: 28, boxShadow: "0 -12px 30px rgba(0,0,0,0.35)", borderTop: "1px solid var(--border)", maxHeight: "62%", display: "flex", flexDirection: "column", pointerEvents: "auto" }}>
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 4px", display: "flex", flexDirection: "column", gap: 10, minHeight: 120 }}>
          {messages.length === 0 && <div className="muted" style={{ textAlign: "center", marginTop: 8, fontSize: 15 }}>Say hi to Aura — hold the mic, or type.</div>}
          {messages.map((m, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "82%", padding: "11px 15px", borderRadius: 20, fontSize: 15, lineHeight: 1.4,
                background: m.role === "user" ? "var(--grad)" : "var(--surface-2)", color: m.role === "user" ? "#fff" : "var(--text)",
                borderBottomRightRadius: m.role === "user" ? 6 : 20, borderBottomLeftRadius: m.role === "user" ? 20 : 6 }}>
              {m.content}
            </motion.div>
          ))}
          {error && <div style={{ alignSelf: "center", color: "var(--a3)", fontSize: 13 }}>{error}</div>}
          <div ref={endRef} />
        </div>
        <div className="row" style={{ gap: 10, padding: "8px 16px calc(var(--sab) + 12px)" }}>
          <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder={HINT[phase]}
            style={{ flex: 1, height: 48, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", borderRadius: 999, padding: "0 18px", fontSize: 15, outline: "none" }} />
          {text.trim()
            ? <button className="icon-btn" style={{ background: "var(--grad)", color: "#fff", width: 48, height: 48 }} onClick={submit} aria-label="Send"><Icon name="send" size={20} /></button>
            : <motion.button whileTap={{ scale: 0.9 }} onPointerDown={startRec} onPointerUp={stopRec} onPointerLeave={() => phase === "listening" && stopRec()} aria-label="Hold to talk"
                style={{ width: 48, height: 48, borderRadius: 999, border: 0, color: "#fff", background: phase === "listening" ? "var(--a3)" : "var(--grad)", display: "grid", placeItems: "center", touchAction: "none" }}>
                <Icon name="mic" size={20} />
              </motion.button>}
        </div>
      </div>
    </div>
  );
}
