import { useEffect, useRef, useState, ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Page, TopBar, Icon } from "../ui";
import { useTheme } from "../useTheme";
import { useSettings, setSetting, LANGUAGES, Quality } from "../settings";
import { useAvatar } from "../avatarStore";
import { API_BASE, avatarUrl, speakBuffer } from "../api";
import { useNav } from "../nav";
import { useT } from "../i18n";

const VERSION = "0.1.0";

// OpenAI TTS voices the backend accepts, with human labels.
const VOICES: [id: string, label: string, blurb: string][] = [
  ["onyx", "Onyx", "Deep · warm"],
  ["echo", "Echo", "Bright · clear"],
  ["alloy", "Alloy", "Balanced · neutral"],
  ["fable", "Fable", "Storyteller · British"],
  ["nova", "Nova", "Warm · feminine"],
  ["shimmer", "Shimmer", "Soft · airy"],
];

const QUALITIES: [Quality, string, string][] = [
  ["low", "Low", "Longest battery"],
  ["medium", "Medium", "Balanced"],
  ["high", "High", "Sharpest"],
];

/* ---- small building blocks ---------------------------------------------- */

function Row({ label, value, danger, onClick, chevron = true, first }:
  { label: string; value?: string; danger?: boolean; onClick?: () => void; chevron?: boolean; first?: boolean }) {
  return (
    <button onClick={onClick} style={{
      width: "100%", padding: "16px 18px", display: "flex", justifyContent: "space-between",
      alignItems: "center", background: "none", border: 0,
      borderTop: first ? undefined : "1px solid var(--border)",
      color: danger ? "var(--danger)" : "var(--text)", font: "inherit", fontWeight: danger ? 600 : 500,
      textAlign: "left", cursor: "pointer",
    }}>
      <span>{label}</span>
      <span className="row muted" style={{ fontSize: 14, gap: 6 }}>
        {value}
        {chevron && <span style={{ transform: "rotate(180deg)", display: "inline-flex" }}><Icon name="back" size={16} /></span>}
      </span>
    </button>
  );
}

function Check({ on }: { on: boolean }) {
  return on
    ? <span style={{ color: "var(--ember)", display: "inline-flex" }}><Icon name="check" size={20} /></span>
    : null;
}

/** Sub-page shell: covers the settings list, its Back returns to the list. */
function Sub({ title, onBack, children }: { title: string; onBack: () => void; children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}
      transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1] }}
      style={{ position: "absolute", inset: 0, background: "var(--bg)", display: "flex", flexDirection: "column", paddingTop: "calc(var(--sat) + 8px)" }}>
      <div className="row" style={{ padding: "8px 16px 4px", flex: "0 0 auto" }}>
        <button className="icon-btn" aria-label="Back" onClick={onBack}><Icon name="back" size={22} /></button>
        <div className="h2" style={{ marginLeft: 4 }}>{title}</div>
      </div>
      <div style={{ overflowY: "auto", padding: "8px 16px calc(var(--sab) + 16px)", display: "grid", gap: 12, alignContent: "start" }}>
        {children}
      </div>
    </motion.div>
  );
}

/* ---- sub-pages ----------------------------------------------------------- */

function LanguageSub({ onBack }: { onBack: () => void }) {
  const { language } = useSettings();
  const t = useT();
  return (
    <Sub title={t("Language")} onBack={onBack}>
      <p className="muted" style={{ fontSize: 14, margin: "0 2px" }}>
        {t("Aura replies — text and voice — in this language.")}
      </p>
      <div className="card" style={{ overflow: "hidden" }}>
        {LANGUAGES.map(([label], n) => (
          <button key={label} onClick={() => setSetting("language", label)} style={{
            width: "100%", padding: "15px 18px", display: "flex", justifyContent: "space-between", alignItems: "center",
            background: "none", border: 0, borderTop: n ? "1px solid var(--border)" : undefined,
            color: "var(--text)", font: "inherit", fontWeight: 500, cursor: "pointer",
          }}>
            <span>{label}</span><Check on={language === label} />
          </button>
        ))}
      </div>
    </Sub>
  );
}

function VoiceSub({ onBack }: { onBack: () => void }) {
  const { voice, setVoice } = useAvatar();
  const t = useT();
  const [previewing, setPreviewing] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => () => audioRef.current?.pause(), []);

  const pick = async (id: string) => {
    setVoice(id);
    // preview: short sample in the chosen voice (backend TTS)
    audioRef.current?.pause();
    setPreviewing(id);
    try {
      const bytes = await speakBuffer("Hi! This is how I sound.", id);
      const a = new Audio(URL.createObjectURL(new Blob([bytes], { type: "audio/mpeg" })));
      audioRef.current = a;
      a.onended = () => setPreviewing((p) => (p === id ? null : p));
      await a.play();
    } catch { setPreviewing(null); }
  };

  return (
    <Sub title={t("Voice")} onBack={onBack}>
      <p className="muted" style={{ fontSize: 14, margin: "0 2px" }}>
        {t("Tap a voice to select and hear it.")}
      </p>
      <div className="card" style={{ overflow: "hidden" }}>
        {VOICES.map(([id, label, blurb], n) => (
          <button key={id} onClick={() => pick(id)} style={{
            width: "100%", padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center",
            background: "none", border: 0, borderTop: n ? "1px solid var(--border)" : undefined,
            color: "var(--text)", font: "inherit", cursor: "pointer", textAlign: "left",
          }}>
            <span>
              <div style={{ fontWeight: 600 }}>{label}</div>
              <div className="muted" style={{ fontSize: 13 }}>{t(blurb)}</div>
            </span>
            <span className="row" style={{ gap: 10 }}>
              {previewing === id && <span className="ember-orb" style={{ width: 10, height: 10 }} />}
              <Check on={voice === id} />
            </span>
          </button>
        ))}
      </div>
    </Sub>
  );
}

function PrivacySub({ onBack }: { onBack: () => void }) {
  const t = useT();
  const POINTS: [string, string][] = [
    ["Microphone", "Only records while you hold the mic button. Nothing listens in the background."],
    ["Voice & chat", "Sent to your Aura backend, which uses OpenAI to transcribe, reply, and speak. Conversations are not stored — closing the chat clears them."],
    ["Photos", "A selfie is analyzed once to shape your avatar, then discarded. Only the resulting slider values are kept."],
    ["On this device", "Your avatar, outfit, voice and settings live in this app's local storage only."],
  ];
  return (
    <Sub title={t("Privacy")} onBack={onBack}>
      {POINTS.map(([title, body]) => (
        <div key={title} className="card" style={{ padding: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>{t(title)}</div>
          <div className="muted" style={{ fontSize: 14, lineHeight: 1.5 }}>{t(body)}</div>
        </div>
      ))}
    </Sub>
  );
}

function SubscriptionSub({ onBack }: { onBack: () => void }) {
  const t = useT();
  return (
    <Sub title={t("Subscription")} onBack={onBack}>
      <div className="card" style={{ padding: 20 }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div className="h2">{t("Free")}</div>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", padding: "4px 10px", borderRadius: 999, background: "var(--ember-soft)", color: "var(--ember)" }}>{t("CURRENT PLAN")}</span>
        </div>
        <div className="muted" style={{ fontSize: 14, marginTop: 10, lineHeight: 1.6 }}>
          {t("Everything works: avatar from a selfie, wardrobe, voice chat with live lip-sync, and the full animation library.")}
        </div>
      </div>
      <div className="card" style={{ padding: 20 }}>
        <div className="h2">Aura Plus</div>
        <div className="muted" style={{ fontSize: 14, marginTop: 10, lineHeight: 1.6 }}>
          {t("Cloud avatar backup, more voices, exclusive wardrobe drops, and longer conversations.")}
        </div>
        <button className="btn btn-ghost btn-block" disabled style={{ marginTop: 14, opacity: 0.6 }}>{t("Coming soon")}</button>
      </div>
    </Sub>
  );
}

function AboutSub({ onBack }: { onBack: () => void }) {
  const t = useT();
  const [backend, setBackend] = useState<"checking" | "online" | "offline">("checking");
  useEffect(() => {
    fetch(`${API_BASE}/animations`).then((r) => setBackend(r.ok ? "online" : "offline"))
      .catch(() => setBackend("offline"));
  }, []);
  const dot = { checking: "var(--surface-2)", online: "#4ade80", offline: "var(--danger)" }[backend];
  return (
    <Sub title={t("About")} onBack={onBack}>
      <div className="card" style={{ padding: 20, display: "grid", gap: 4, justifyItems: "center", textAlign: "center" }}>
        <div className="wordmark" style={{ fontSize: 34 }}>Aura</div>
        <div className="muted" style={{ fontSize: 14 }}>{t("Your avatar, alive.")}</div>
        <div className="faint" style={{ fontSize: 13, marginTop: 6 }}>{t("Version")} {VERSION}</div>
      </div>
      <div className="card" style={{ padding: "16px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontWeight: 500 }}>{t("Backend")}</span>
        <span className="row muted" style={{ fontSize: 14, gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: dot }} />
          {backend === "checking" ? t("Checking…") : backend === "online" ? t("Connected") : t("Offline")}
        </span>
      </div>
      <div className="card" style={{ padding: "16px 18px" }}>
        <div className="muted" style={{ fontSize: 13, lineHeight: 1.6 }}>
          Avatars, wardrobe and the 103-clip animation library are built by the
          AI-Avatar-Engine backend and streamed to this app.
        </div>
      </div>
    </Sub>
  );
}

/* ---- main screen ---------------------------------------------------------- */

type SubPage = "language" | "voice" | "privacy" | "subscription" | "about" | null;

export default function Settings() {
  const [theme, toggle] = useTheme();
  const t = useT();
  const { language, quality } = useSettings();
  const { file, voice, resetAvatar } = useAvatar();
  const { back } = useNav();
  const [sub, setSub] = useState<SubPage>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [exporting, setExporting] = useState<"idle" | "busy" | "done" | "fail">("idle");

  const voiceLabel = VOICES.find(([id]) => id === voice)?.[1] ?? voice;

  // Export = download the current avatar GLB (fetch -> blob so the download
  // works cross-origin; the backend is a different origin than the app).
  const exportAvatar = async () => {
    if (exporting === "busy") return;
    setExporting("busy");
    try {
      const blob = await fetch(avatarUrl(file)).then((r) => { if (!r.ok) throw new Error(); return r.blob(); });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = file;
      a.click();
      URL.revokeObjectURL(a.href);
      setExporting("done");
    } catch { setExporting("fail"); }
    setTimeout(() => setExporting("idle"), 2500);
  };

  return (
    <Page>
      <TopBar title={t("Settings")} />
      <div style={{ padding: "8px 16px calc(var(--sab) + 16px)", display: "grid", gap: 12 }}>
        {/* theme switch */}
        <div className="card" style={{ padding: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div className="row"><Icon name={theme === "dark" ? "moon" : "sun"} size={20} /><span style={{ fontWeight: 600 }}>{t("Dark theme")}</span></div>
          <button onClick={toggle} aria-label="Toggle theme"
            style={{ width: 52, height: 30, borderRadius: 999, border: 0, padding: 3, background: theme === "dark" ? "var(--ember)" : "var(--surface-2)", display: "flex", justifyContent: theme === "dark" ? "flex-end" : "flex-start", transition: "background 160ms var(--ease)", cursor: "pointer" }}>
            <span style={{ width: 24, height: 24, borderRadius: 999, background: "#fff", boxShadow: "var(--sh-1)", transition: "transform .2s var(--ease)" }} />
          </button>
        </div>

        {/* graphics quality — inline segmented control */}
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 10 }}>{t("Graphics quality")}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
            {QUALITIES.map(([q, label, blurb]) => (
              <button key={q} onClick={() => setSetting("quality", q)} style={{
                padding: "10px 4px", borderRadius: 12, border: "1px solid",
                borderColor: quality === q ? "var(--ember)" : "var(--border)",
                background: quality === q ? "var(--ember-soft)" : "transparent",
                color: quality === q ? "var(--ember)" : "var(--text)",
                font: "inherit", cursor: "pointer", display: "grid", gap: 2,
              }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{t(label)}</span>
                <span className="muted" style={{ fontSize: 11 }}>{t(blurb)}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="card" style={{ overflow: "hidden" }}>
          <Row first label={t("Language")} value={language} onClick={() => setSub("language")} />
          <Row label={t("Voice")} value={voiceLabel} onClick={() => setSub("voice")} />
          <Row label={t("Privacy")} onClick={() => setSub("privacy")} />
          <Row
            label={t("Export avatar")}
            value={exporting === "busy" ? t("Preparing…") : exporting === "done" ? t("Saved ✓") : exporting === "fail" ? t("Failed — is the backend running?") : "GLB"}
            chevron={exporting === "idle"}
            onClick={exportAvatar}
          />
          <Row label={t("Subscription")} value={t("Free")} onClick={() => setSub("subscription")} />
          <Row label={t("About")} value={`v${VERSION}`} onClick={() => setSub("about")} />
          <Row label={t("Delete avatar")} danger chevron={false} onClick={() => setConfirmDelete(true)} />
        </div>
      </div>

      {/* sub-pages slide over the list */}
      <AnimatePresence>
        {sub === "language" && <LanguageSub key="l" onBack={() => setSub(null)} />}
        {sub === "voice" && <VoiceSub key="v" onBack={() => setSub(null)} />}
        {sub === "privacy" && <PrivacySub key="p" onBack={() => setSub(null)} />}
        {sub === "subscription" && <SubscriptionSub key="s" onBack={() => setSub(null)} />}
        {sub === "about" && <AboutSub key="a" onBack={() => setSub(null)} />}
      </AnimatePresence>

      {/* delete confirm */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", display: "grid", placeItems: "center", padding: 28 }}
            onClick={() => setConfirmDelete(false)}>
            <motion.div
              initial={{ scale: 0.94, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 10 }}
              transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
              className="card" style={{ padding: 22, width: "100%", maxWidth: 340 }}
              onClick={(e) => e.stopPropagation()}>
              <div className="h2">{t("Delete avatar?")}</div>
              <p className="muted" style={{ fontSize: 14, lineHeight: 1.5, margin: "10px 0 18px" }}>
                {t("Your face shape, outfit and voice go back to the defaults. This can't be undone.")}
              </p>
              <div style={{ display: "grid", gap: 8 }}>
                <button className="btn btn-block" style={{ background: "var(--danger)", color: "#fff" }}
                  onClick={() => { resetAvatar(); setConfirmDelete(false); back(); }}>
                  {t("Delete avatar")}
                </button>
                <button className="btn btn-ghost btn-block" onClick={() => setConfirmDelete(false)}>{t("Cancel")}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Page>
  );
}
