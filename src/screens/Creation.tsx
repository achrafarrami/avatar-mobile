import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "../ui";
import { useNav } from "../nav";
import { useAvatar, voiceForGender, toEquip } from "../avatarStore";
import { analyzePhoto, morphInfluences, fetchCatalog, AVATARS } from "../api";
import { planEquips, lookFromAppearance } from "../appearance";
import { useT, t as tt } from "../i18n";

const STAGES = ["Analyzing face", "Extracting features", "Building your head",
  "Matching identity", "Preparing voice", "Almost ready"];

export default function Creation() {
  const { reset } = useNav();
  const t = useT();
  const { setAvatar, setLook, equip } = useAvatar();
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
      // voice always follows the detected gender (user can still change it in Settings)
      setAvatar(base, params, voiceForGender(res.gender));
      // appearance: hair/beard/glasses equips + measured colors, same as the
      // web sandbox — hair, beard, clothing tints on the items; skin/brows/
      // iris on the template materials (via look).
      try {
        const cat = await fetchCatalog();
        for (const step of planEquips(res.appearance ?? null)) {
          const item = step.id ? cat.items.find((i) => i.id === step.id) : null;
          equip(step.slot, item ? { ...toEquip(item), color: step.color } : null);
        }
      } catch { /* backend catalog unavailable — keep default outfit */ }
      setLook(lookFromAppearance(res.appearance ?? null));
      reset("home");
    } catch (e) {
      // backend/model unavailable — proceed with a default base rather than block
      setNote(e instanceof Error ? e.message : tt("Analysis unavailable — using a default avatar."));
      setTimeout(() => { setAvatar(AVATARS.meta_male, null); reset("home"); }, 1400);
    } finally { clearInterval(spin); }
  }

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", padding: "calc(var(--sat) + 20px) 24px calc(var(--sab) + 20px)" }}>
      <AnimatePresence mode="wait">
        {!busy ? (
          <motion.div key="pick" exit={{ opacity: 0 }} style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <div className="h1" style={{ marginBottom: 6 }}>{t("Create your avatar")}</div>
            <p className="muted" style={{ marginBottom: 24 }}>{t("Add a clear, front-facing selfie in good light — Aura builds an avatar that looks like you.")}</p>

            <button onClick={() => fileInput.current?.click()}
              className="card"
              style={{ flex: 1, minHeight: 260, borderRadius: "var(--r-xl)", borderStyle: preview ? "solid" : "dashed", display: "grid", placeItems: "center", overflow: "hidden", padding: 0, color: "var(--text)" }}>
              {preview
                ? <img src={preview} alt="selfie" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <div style={{ display: "grid", placeItems: "center", gap: 12 }}>
                    <div style={{ width: 80, height: 80, borderRadius: 22, background: "var(--ember-soft)", color: "var(--ember)", display: "grid", placeItems: "center" }}><Icon name="camera" size={34} /></div>
                    <div style={{ fontWeight: 600 }}>{t("Tap to add a selfie")}</div>
                    <div className="faint" style={{ fontSize: 13 }}>{t("Front-facing · good lighting")}</div>
                  </div>}
            </button>
            <input ref={fileInput} type="file" accept="image/*" capture="user" hidden
              onChange={(e) => pick(e.target.files?.[0])} />

            {preview && <div className="row" style={{ justifyContent: "center", gap: 8, marginTop: 14, color: "var(--ember)" }}><Icon name="check" size={18} /><span style={{ fontSize: 14 }} className="muted">{t("Photo ready")}</span></div>}

            <div style={{ display: "grid", gap: 10, marginTop: 20 }}>
              <button className="btn btn-primary btn-block" disabled={!photo} style={{ opacity: photo ? 1 : 0.5 }} onClick={generate}>{t("Generate my avatar")}</button>
              <button className="btn btn-ghost btn-block" onClick={() => { setAvatar(AVATARS.meta_male, null); reset("home"); }}>{t("Skip for now")}</button>
            </div>
          </motion.div>
        ) : (
          <motion.div key="gen" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 26, textAlign: "center" }}>
            <div className="ember-orb" style={{ width: 26, height: 26 }} />
            <div>
              <div className="h2" style={{ marginBottom: 6 }}>{t(STAGES[stage])}…</div>
              <div className="dots" style={{ marginTop: 12 }}>
                {STAGES.map((_, n) => <motion.div layout key={n} transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1] }} style={{ borderRadius: 999 }} className={`dot ${n <= stage ? "on" : ""}`} />)}
              </div>
            </div>
            {note && <p className="muted" style={{ fontSize: 13, maxWidth: 300 }}>{note}</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
