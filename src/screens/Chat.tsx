import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { TopBar, Icon } from "../ui";
import { AvatarStage } from "../Avatar";
import { useAura, Phase } from "../useAura";
import { useAvatar } from "../avatarStore";

const HINT: Record<Phase, string> = {
  idle: "Hold the mic or type", listening: "Listening…", thinking: "Thinking…", speaking: "Speaking…",
};

export default function Chat() {
  const { file, params } = useAvatar();
  const { phase, messages, error, send, startRec, stopRec } = useAura();
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [messages, phase]);

  const submit = () => { const t = text; setText(""); send(t); };

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", paddingTop: "calc(var(--sat) + 4px)" }}>
      <TopBar title="Chat" />
      <div style={{ height: "34%", minHeight: 180, position: "relative", flex: "0 0 auto" }}>
        <AvatarStage file={file} params={params} />
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        {messages.length === 0 && (
          <div className="muted" style={{ textAlign: "center", marginTop: 24, fontSize: 15 }}>
            Say hi to Aura — hold the mic, or type below.
          </div>
        )}
        {messages.map((m, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "80%", padding: "11px 15px", borderRadius: 20, fontSize: 15, lineHeight: 1.4,
              background: m.role === "user" ? "var(--grad)" : "var(--surface-2)",
              color: m.role === "user" ? "#fff" : "var(--text)",
              borderBottomRightRadius: m.role === "user" ? 6 : 20, borderBottomLeftRadius: m.role === "user" ? 20 : 6 }}>
            {m.content}
          </motion.div>
        ))}
        {error && <div style={{ alignSelf: "center", color: "var(--a3)", fontSize: 13 }}>{error}</div>}
        <div ref={endRef} />
      </div>

      <div className="row" style={{ gap: 10, padding: "8px 16px calc(var(--sab) + 12px)" }}>
        <input value={text} onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder={HINT[phase]}
          style={{ flex: 1, height: 48, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", borderRadius: 999, padding: "0 18px", fontSize: 15, outline: "none" }} />
        {text.trim()
          ? <button className="icon-btn" style={{ background: "var(--grad)", color: "#fff", width: 48, height: 48 }} onClick={submit} aria-label="Send"><Icon name="send" size={20} /></button>
          : <motion.button whileTap={{ scale: 0.9 }} onPointerDown={startRec} onPointerUp={stopRec} onPointerLeave={() => phase === "listening" && stopRec()}
              aria-label="Hold to talk"
              style={{ width: 48, height: 48, borderRadius: 999, border: 0, color: "#fff", background: phase === "listening" ? "var(--a3)" : "var(--grad)", display: "grid", placeItems: "center", touchAction: "none" }}>
              <Icon name="mic" size={20} />
            </motion.button>}
      </div>
    </div>
  );
}
