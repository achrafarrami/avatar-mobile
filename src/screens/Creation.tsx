import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "../ui";
import { useNav } from "../nav";
import { useAvatar } from "../avatarStore";
import { analyzePhoto, morphInfluences, AVATARS } from "../api";

const STAGES = ["Analyzing face", "Extracting features", "Building your head",
  "Matching identity", "Preparing voice", "Almost ready"];

export default function Creation() {
  const { reset } = useNav();
  const { setAvatar } = useAvatar();
  const fileInput = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(0);
  const [note, setNote] = useState<string>("");

  const pick = (f?: File) => { if (!f) return; setPhoto(f); setPreview(URL.createObjectURL(f)); setNote(""); };

  async function generate() {
    if (!photo || busy) return;
    setBusy(true); setNote("");
    const spin = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 750);
    const minWait = new Promise((r) => setTimeout(r, STAGES.length * 750));
    try {
      const [res] = await Promise.all([analyzePhoto(photo), minWait]);
      const base = res.gender === "female" ? AVATARS.meta_female : AVATARS.meta_male;
      const params = res.engine_params ? await morphInfluences(res.engine_params) : null;
      setAvatar(base, params);
      reset("home");
    } catch (e) {
      // backend/model unavailable — proceed with a default base rather than block
      setNote(e instanceof Error ? e.message : "Analysis unavailable — using a default avatar.");
      setTimeout(() => { setAvatar(AVATARS.meta_male, null); reset("home"); }, 1400);
    } finally { clearInterval(spin); }
  }

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", padding: "calc(var(--sat) + 20px) 24px calc(var(--sab) + 20px)" }}>
      <AnimatePresence mode="wait">
        {!busy ? (
          <motion.div key="pick" exit={{ opacity: 0 }} style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <div className="h1" style={{ marginBottom: 6 }}>Create your avatar</div>
            <p className="muted" style={{ marginBottom: 24 }}>Add a clear, front-facing selfie in good light — Aura builds an avatar that looks like you.</p>

            <button onClick={() => fileInput.current?.click()}
              className="card"
              style={{ flex: 1, minHeight: 260, borderRadius: 30, borderStyle: preview ? "solid" : "dashed", display: "grid", placeItems: "center", overflow: "hidden", padding: 0, color: "var(--text)" }}>
              {preview
                ? <img src={preview} alt="selfie" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <div style={{ display: "grid", placeItems: "center", gap: 12 }}>
                    <div style={{ width: 84, height: 84, borderRadius: 26, background: "var(--grad-soft)", display: "grid", placeItems: "center" }}><Icon name="camera" size={36} /></div>
                    <div style={{ fontWeight: 600 }}>Tap to add a selfie</div>
                    <div className="faint" style={{ fontSize: 13 }}>Front-facing · good lighting</div>
                  </div>}
            </button>
            <input ref={fileInput} type="file" accept="image/*" capture="user" hidden
              onChange={(e) => pick(e.target.files?.[0])} />

            {preview && <div className="row" style={{ justifyContent: "center", gap: 8, marginTop: 14, color: "var(--a1)" }}><Icon name="check" size={18} /><span style={{ fontSize: 14 }} className="muted">Photo ready</span></div>}

            <div style={{ display: "grid", gap: 10, marginTop: 20 }}>
              <button className="btn btn-primary btn-block" disabled={!photo} style={{ opacity: photo ? 1 : 0.5 }} onClick={generate}>Generate my avatar</button>
              <button className="btn btn-ghost btn-block" onClick={() => { setAvatar(AVATARS.meta_male, null); reset("home"); }}>Skip for now</button>
            </div>
          </motion.div>
        ) : (
          <motion.div key="gen" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 26, textAlign: "center" }}>
            <motion.div animate={{ scale: [0.94, 1.06, 0.94] }} transition={{ duration: 2.4, repeat: Infinity }}
              style={{ width: 150, height: 150, borderRadius: "50%", background: "var(--grad)", boxShadow: "var(--glow)" }} />
            <div>
              <div className="h2" style={{ marginBottom: 6 }}>{STAGES[stage]}…</div>
              <div className="dots" style={{ marginTop: 12 }}>
                {STAGES.map((_, n) => <div key={n} className={`dot ${n <= stage ? "on" : ""}`} />)}
              </div>
            </div>
            {note && <p className="muted" style={{ fontSize: 13, maxWidth: 300 }}>{note}</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
