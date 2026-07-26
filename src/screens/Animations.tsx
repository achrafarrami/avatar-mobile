import { useState, useEffect, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { Icon } from "../ui";
import { useNav } from "../nav";
import { useAvatar } from "../avatarStore";
import { useAura } from "../useAura";
import { signals } from "../avatarSignals";
import { fetchAnimations, Animation } from "../api";

// Animation test bench. Two ways to drive the avatar:
//  1. Built library — the pre-made clips, played on the live avatar (retargeted
//     onto whatever base is loaded; facial morphs show fully on the meta bases).
//  2. Manual — speaking lip-sync / listening pose / jaw travel via signals,
//     no backend or mic needed.
// Leaving the screen resets everything.
export default function Animations() {
  const { back } = useNav();
  const { clip, clipLoop, clipLoading, playClip, stopClip, setClipLoop } = useAvatar();
  const [anims, setAnims] = useState<Animation[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [jaw, setJaw] = useState(0);          // 0..100 manual override
  const [collapsed, setCollapsed] = useState(false); // hide the sheet to watch full-screen
  const [chatText, setChatText] = useState("");
  const { phase, send } = useAura();  // text chat -> voice reply -> lip-sync + talk clip
  const raf = useRef(0);

  useEffect(() => { fetchAnimations().then(setAnims).catch((e) => setErr(String(e))); }, []);

  useEffect(() => () => {                       // reset on unmount
    cancelAnimationFrame(raf.current);
    stopClip();
    signals.speaking = false; signals.listening = false; signals.mouth = 0;
  }, []);

  // auto lip-sync: feed a speech-like waveform into signals.mouth each frame
  useEffect(() => {
    signals.speaking = speaking;
    if (!speaking) { cancelAnimationFrame(raf.current); signals.mouth = 0; return; }
    setJaw(0);
    const t0 = performance.now();
    const loop = () => {
      const t = (performance.now() - t0) / 1000;
      const v = (Math.sin(t * 11) * 0.5 + Math.sin(t * 4.3) * 0.3) * (0.5 + Math.random() * 0.5);
      signals.mouth = Math.min(1, Math.max(0, v));
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, [speaking]);

  useEffect(() => { signals.listening = listening; }, [listening]);

  const setManual = (n: number) => {            // manual jaw (auto-speak off)
    setJaw(n);
    if (speaking) setSpeaking(false);
    signals.speaking = n > 0; signals.mouth = n / 100;
  };

  const groups = useMemo(() => {
    const g = new Map<string, Animation[]>();
    for (const a of anims) { if (!g.has(a.category)) g.set(a.category, []); g.get(a.category)!.push(a); }
    return [...g].sort((x, y) => x[0].localeCompare(y[0]));
  }, [anims]);

  const selectClip = (a: Animation) => { if (clip === a.id) stopClip(); else playClip(a.id); };

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", pointerEvents: "none" }}>
      <div className="row" style={{ padding: "calc(var(--sat) + 12px) 16px 8px", background: "linear-gradient(var(--bg), transparent)", pointerEvents: "auto" }}>
        <button className="icon-btn" aria-label="Back" onClick={back}><Icon name="back" size={22} /></button>
        <div className="h2" style={{ marginLeft: 4 }}>Test Animations</div>
      </div>

      <div style={{ flex: 1 }} /> {/* avatar visible here, reacting live */}

      {/* Collapsed: sheet hidden so the whole avatar is visible; pills in the
          TOP-RIGHT bring the controls back / stop. The clip keeps playing. */}
      {collapsed && (
        <div style={{ position: "absolute", top: "calc(var(--sat) + 12px)", right: 12, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, zIndex: 5, pointerEvents: "auto" }}>
          <motion.button whileTap={{ scale: 0.96 }} onClick={() => setCollapsed(false)}
            style={{ padding: "9px 16px", borderRadius: 999, border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text)", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 6px 20px rgba(0,0,0,0.35)" }}>
            ⌃ Controls
          </motion.button>
          {clip && (
            <motion.button whileTap={{ scale: 0.96 }} onClick={stopClip}
              style={{ padding: "9px 16px", borderRadius: 999, border: 0, background: "var(--grad)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 6px 20px rgba(0,0,0,0.35)" }}>
              Stop
            </motion.button>
          )}
        </div>
      )}

      {!collapsed && (
      <div style={{ background: "var(--bg)", borderTopLeftRadius: 28, borderTopRightRadius: 28, boxShadow: "0 -12px 30px rgba(0,0,0,0.35)", borderTop: "1px solid var(--border)", padding: "18px 18px calc(var(--sab) + 18px)", display: "flex", flexDirection: "column", gap: 14, pointerEvents: "auto" }}>

        {/* ---- text chat -> voice reply + lip-sync + talk animation ---- */}
        <div className="col" style={{ gap: 8 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>Talk to Aura <span className="faint" style={{ fontWeight: 400, fontSize: 12 }}>· voice reply + lip-sync</span></div>
          <div className="row" style={{ gap: 8 }}>
            <input value={chatText} onChange={(e) => setChatText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && chatText.trim()) { send(chatText); setChatText(""); } }}
              placeholder={phase === "idle" ? "Type a message…" : `${phase}…`}
              style={{ flex: 1, height: 44, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", borderRadius: 999, padding: "0 16px", fontSize: 14, outline: "none" }} />
            <button onClick={() => { if (chatText.trim()) { send(chatText); setChatText(""); } }} disabled={phase !== "idle"}
              style={{ height: 44, padding: "0 18px", borderRadius: 999, border: 0, background: "var(--grad)", color: "#fff", fontWeight: 700, cursor: phase === "idle" ? "pointer" : "default", opacity: phase === "idle" ? 1 : 0.6 }}>
              Send
            </button>
          </div>
          {phase !== "idle" && <div className="faint" style={{ fontSize: 12 }}>{phase}…</div>}
        </div>

        {/* ---- built animation library ---- */}
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>Built animations</div>
          <div className="row" style={{ gap: 12 }}>
            <label className="row" style={{ gap: 6, fontSize: 13 }}>
              <input type="checkbox" checked={clipLoop} onChange={(e) => setClipLoop(e.target.checked)} style={{ accentColor: "var(--a2)" }} />
              <span className="muted">Loop</span>
            </label>
            <button className="muted" onClick={stopClip} disabled={!clip}
              style={{ fontSize: 13, background: "none", border: "none", cursor: clip ? "pointer" : "default", color: clip ? "var(--text)" : "var(--faint)" }}>
              Stop
            </button>
            <button onClick={() => setCollapsed(true)}
              style={{ fontSize: 13, fontWeight: 700, padding: "6px 14px", borderRadius: 999, border: 0, background: "var(--grad)", color: "#fff", cursor: "pointer" }}>
              Done
            </button>
          </div>
        </div>

        {err && <div className="faint" style={{ fontSize: 13 }}>Couldn't load clips — is the backend on :8100? ({err})</div>}
        {!err && !anims.length && <div className="faint" style={{ fontSize: 13 }}>Loading clip list…</div>}
        {clipLoading && <div className="faint" style={{ fontSize: 13 }}>Loading animation library (first play)…</div>}

        <div style={{ maxHeight: "34vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, margin: "0 -2px", padding: "0 2px" }}>
          {groups.map(([cat, items]) => (
            <div key={cat} className="col" style={{ gap: 6 }}>
              <div className="faint" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.4 }}>{cat}</div>
              <div className="row" style={{ flexWrap: "wrap", gap: 6 }}>
                {items.map((a) => {
                  const on = clip === a.id;
                  return (
                    <motion.button key={a.id} whileTap={{ scale: 0.96 }} onClick={() => selectClip(a)} title={a.description}
                      style={{ padding: "7px 11px", borderRadius: 12, border: "1px solid var(--border)", cursor: "pointer", fontSize: 13, fontWeight: 600,
                        background: on ? "var(--grad)" : "var(--surface-2)", color: on ? "#fff" : "var(--text)" }}>
                      {a.id}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* ---- manual signal test ---- */}
        <div className="muted" style={{ fontSize: 13, textAlign: "center", marginTop: 2 }}>Or drive it directly — no backend or mic needed.</div>
        <Toggle label="Speaking (auto lip-sync)" icon="chat" on={speaking} onClick={() => setSpeaking((s) => !s)} />
        <Toggle label="Listening pose" icon="mic" on={listening} onClick={() => setListening((l) => !l)} />
        <div className="col" style={{ gap: 6 }}>
          <div className="row" style={{ justifyContent: "space-between", fontSize: 13 }}>
            <span className="muted">Jaw open (manual)</span><span className="faint">{jaw}%</span>
          </div>
          <input type="range" min={0} max={100} value={jaw}
            onChange={(e) => setManual(Number(e.target.value))}
            style={{ width: "100%", accentColor: "var(--a2)" }} />
        </div>
      </div>
      )}
    </div>
  );
}

function Toggle({ label, icon, on, onClick }: { label: string; icon: string; on: boolean; onClick: () => void }) {
  return (
    <motion.button whileTap={{ scale: 0.97 }} onClick={onClick}
      style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "13px 16px", borderRadius: 16, border: "1px solid var(--border)", cursor: "pointer",
        background: on ? "var(--grad)" : "var(--surface-2)", color: on ? "#fff" : "var(--text)" }}>
      <Icon name={icon} size={20} />
      <span style={{ flex: 1, textAlign: "left", fontSize: 15, fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 13, opacity: 0.85 }}>{on ? "ON" : "OFF"}</span>
    </motion.button>
  );
}
