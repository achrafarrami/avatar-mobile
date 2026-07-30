import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Icon } from "../ui";
import { useNav } from "../nav";
import { useAvatar, toEquip } from "../avatarStore";
import { fetchCatalog, wardrobeUrl, Catalog, WardrobeItem } from "../api";
import { useT } from "../i18n";

// Tint swatches offered for every slot (hair, tops, pants, shoes, …).
const SWATCHES = [
  "#1f1f1f", "#f5f2ea", "#8a8a8a", "#5b3a24", "#d9a15c", "#b8452c",
  "#e8813c", "#e6c84a", "#3c7a44", "#2e8b8b", "#2f5fa8", "#7a4fa3", "#d66ba0",
];

export default function Wardrobe() {
  const { back } = useNav();
  const t = useT();
  const { equipped, equip, setColor } = useAvatar();
  const [cat, setCat] = useState<Catalog | null>(null);
  const [err, setErr] = useState(false);
  const [slot, setSlot] = useState("all");

  useEffect(() => { fetchCatalog().then(setCat).catch(() => setErr(true)); }, []);

  const slots = useMemo(
    () => ["all", ...Object.keys(cat?.slots ?? {}).filter((s) => cat!.items.some((i) => i.slot === s))],
    [cat]);
  const items = (cat?.items ?? []).filter((i) => slot === "all" || i.slot === slot);
  const label = (s: string) => (s === "all" ? t("All") : cat?.slots[s]?.label ?? s);
  const toggle = (it: WardrobeItem) =>
    equipped[it.slot]?.id === it.id ? equip(it.slot, null) : equip(it.slot, toEquip(it));

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", pointerEvents: "none" }}>
      {/* back bar over the avatar (visible in the gap for live try-on) */}
      <div className="row" style={{ padding: "calc(var(--sat) + 12px) 16px 8px", background: "linear-gradient(var(--bg), transparent)", pointerEvents: "auto" }}>
        <button className="icon-btn" aria-label="Back" onClick={back}><Icon name="back" size={22} /></button>
        <div className="h2" style={{ marginLeft: 4 }}>{t("Wardrobe")}</div>
      </div>

      <div style={{ flex: 1 }} /> {/* avatar shows here — items appear on it live */}

      {/* sheet */}
      <div style={{ background: "var(--bg)", borderTopLeftRadius: 20, borderTopRightRadius: 20, boxShadow: "0 -12px 30px rgba(18,12,6,0.45)", borderTop: "1px solid var(--border)", height: "64%", display: "flex", flexDirection: "column", overflow: "hidden", pointerEvents: "auto" }}>
        <div style={{ width: 40, height: 5, borderRadius: 999, background: "var(--surface-2)", margin: "10px auto 4px", flexShrink: 0 }} />
        <div style={{
          display: "flex", gap: 8, flexShrink: 0,
          overflowX: "auto", overflowY: "hidden", overscrollBehaviorX: "contain",
          WebkitOverflowScrolling: "touch", scrollbarWidth: "none", padding: "6px 16px 10px",
          // fade the trailing edge so the cut-off chip reads as "scroll for more"
          WebkitMaskImage: "linear-gradient(to right, #000 92%, transparent)",
          maskImage: "linear-gradient(to right, #000 92%, transparent)",
        }}>
          {slots.map((s) => (
            <button key={s} onClick={() => setSlot(s)}
              style={{ flex: "0 0 auto", whiteSpace: "nowrap", padding: "9px 16px", borderRadius: 999, fontSize: 14, fontWeight: 600, border: `1px solid ${s === slot ? "transparent" : "var(--border)"}`, color: s === slot ? "var(--on-ember)" : "var(--muted)", background: s === slot ? "var(--ember)" : "var(--surface)", transition: "background 160ms var(--ease), color 160ms var(--ease)" }}>
              {label(s)}
            </button>
          ))}
        </div>

        {/* color row: tint whatever is equipped in the viewed slot (live on the avatar) */}
        {slot !== "all" && equipped[slot] && (
          <div style={{
            display: "flex", gap: 8, alignItems: "center", flexShrink: 0,
            overflowX: "auto", overflowY: "hidden", WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none", padding: "0 16px 10px",
          }}>
            <span className="muted" style={{ fontSize: 12, flex: "0 0 auto" }}>{t("Color")}</span>
            {SWATCHES.map((c) => (
              <button key={c} aria-label={`Color ${c}`} onClick={() => setColor(slot, c)}
                style={{ flex: "0 0 auto", width: 26, height: 26, borderRadius: 999, background: c,
                  border: equipped[slot]?.color === c ? "2.5px solid var(--ember)" : "1.5px solid var(--border)" }} />
            ))}
            {/* free pick — native color input, drags recolor the avatar live */}
            <label aria-label="Custom color" style={{ flex: "0 0 auto", width: 26, height: 26, borderRadius: 999,
              background: "conic-gradient(#f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)",
              border: "1.5px solid var(--border)", overflow: "hidden" }}>
              <input type="color" value={equipped[slot]?.color ?? "#808080"}
                onChange={(e) => setColor(slot, e.target.value)}
                style={{ opacity: 0, width: "100%", height: "100%", display: "block" }} />
            </label>
            <button onClick={() => setColor(slot, undefined)} className="muted"
              style={{ flex: "0 0 auto", fontSize: 12, padding: "4px 10px", borderRadius: 999,
                border: "1.5px solid var(--border)", background: "var(--surface)" }}>
              {t("Reset")}
            </button>
          </div>
        )}

        <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 12px" }}>
          {err && <p className="muted" style={{ textAlign: "center", padding: 24 }}>{t("Start the backend on :8100 to load the wardrobe.")}</p>}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            {!cat && !err && Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton" style={{ aspectRatio: 1, borderRadius: 14 }} />)}
            {items.map((it, idx) => {
              const on = equipped[it.slot]?.id === it.id;
              return (
                <motion.button key={it.id} whileTap={{ scale: 0.95 }} onClick={() => toggle(it)}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1], delay: Math.min(idx, 8) * 0.03 }}
                  style={{ position: "relative", aspectRatio: 1, borderRadius: 14, padding: 8, background: on ? "var(--ember-soft)" : "var(--surface)", border: `1.5px solid ${on ? "var(--ember)" : "var(--border)"}`, display: "grid", gridTemplateRows: "1fr auto", gap: 4, color: "var(--text)" }}>
                  <img src={wardrobeUrl(it.thumb)} alt={it.label} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "contain", minHeight: 0 }} />
                  <span style={{ fontSize: 11, textAlign: "center" }} className="muted">{it.label}</span>
                  {on && <span style={{ position: "absolute", top: 6, right: 6, width: 22, height: 22, borderRadius: 999, background: "var(--ember)", color: "var(--on-ember)", display: "grid", placeItems: "center" }}><Icon name="check" size={14} /></span>}
                </motion.button>
              );
            })}
          </div>
        </div>

        <div style={{ padding: "8px 16px calc(var(--sab) + 12px)", borderTop: "1px solid var(--border)" }}>
          <button className="btn btn-primary btn-block" onClick={back}>{t("Done")}</button>
        </div>
      </div>
    </div>
  );
}
