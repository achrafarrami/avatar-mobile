import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Icon } from "../ui";
import { useNav } from "../nav";
import { useAvatar } from "../avatarStore";
import { fetchCatalog, wardrobeUrl, Catalog, WardrobeItem } from "../api";

export default function Wardrobe() {
  const { back } = useNav();
  const { equipped, equip } = useAvatar();
  const [cat, setCat] = useState<Catalog | null>(null);
  const [err, setErr] = useState(false);
  const [slot, setSlot] = useState("all");

  useEffect(() => { fetchCatalog().then(setCat).catch(() => setErr(true)); }, []);

  const slots = useMemo(
    () => ["all", ...Object.keys(cat?.slots ?? {}).filter((s) => cat!.items.some((i) => i.slot === s))],
    [cat]);
  const items = (cat?.items ?? []).filter((i) => slot === "all" || i.slot === slot);
  const label = (s: string) => (s === "all" ? "All" : cat?.slots[s]?.label ?? s);
  const toggle = (it: WardrobeItem) =>
    equip(it.slot, equipped[it.slot]?.file === it.file ? null : { file: it.file });

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }}>
      {/* back bar over the avatar (visible in the gap for live try-on) */}
      <div className="row" style={{ padding: "calc(var(--sat) + 12px) 16px 8px", background: "linear-gradient(var(--bg), transparent)" }}>
        <button className="icon-btn" aria-label="Back" onClick={back}><Icon name="back" size={22} /></button>
        <div className="h2" style={{ marginLeft: 4 }}>Wardrobe</div>
      </div>

      <div style={{ flex: 1 }} /> {/* avatar shows here — items appear on it live */}

      {/* sheet */}
      <div style={{ background: "var(--bg)", borderTopLeftRadius: 28, borderTopRightRadius: 28, boxShadow: "0 -12px 30px rgba(0,0,0,0.4)", borderTop: "1px solid var(--border)", height: "64%", display: "flex", flexDirection: "column" }}>
        <div style={{ width: 40, height: 5, borderRadius: 999, background: "var(--surface-2)", margin: "10px auto 4px" }} />
        <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "6px 16px 10px", scrollbarWidth: "none" }}>
          {slots.map((s) => (
            <button key={s} onClick={() => setSlot(s)}
              style={{ flex: "0 0 auto", padding: "9px 16px", borderRadius: 999, fontSize: 14, fontWeight: 600, border: "1px solid var(--border)", color: s === slot ? "#fff" : "var(--muted)", background: s === slot ? "var(--grad)" : "var(--surface)" }}>
              {label(s)}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 12px" }}>
          {err && <p className="muted" style={{ textAlign: "center", padding: 24 }}>Start the backend on :8100 to load the wardrobe.</p>}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            {!cat && !err && Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton" style={{ aspectRatio: 1, borderRadius: 20 }} />)}
            {items.map((it) => {
              const on = equipped[it.slot]?.file === it.file;
              return (
                <motion.button key={it.id} whileTap={{ scale: 0.93 }} onClick={() => toggle(it)}
                  style={{ position: "relative", aspectRatio: 1, borderRadius: 20, padding: 8, background: "var(--surface)", border: `1.5px solid ${on ? "var(--a2)" : "var(--border)"}`, display: "grid", gridTemplateRows: "1fr auto", gap: 4, color: "var(--text)", boxShadow: on ? "var(--glow)" : undefined }}>
                  <img src={wardrobeUrl(it.thumb)} alt={it.label} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "contain", minHeight: 0 }} />
                  <span style={{ fontSize: 11, textAlign: "center" }} className="muted">{it.label}</span>
                  {on && <span style={{ position: "absolute", top: 6, right: 6, width: 22, height: 22, borderRadius: 999, background: "var(--grad)", color: "#fff", display: "grid", placeItems: "center" }}><Icon name="check" size={14} /></span>}
                </motion.button>
              );
            })}
          </div>
        </div>

        <div style={{ padding: "8px 16px calc(var(--sab) + 12px)", borderTop: "1px solid var(--border)" }}>
          <button className="btn btn-primary btn-block" onClick={back}>Done</button>
        </div>
      </div>
    </div>
  );
}
