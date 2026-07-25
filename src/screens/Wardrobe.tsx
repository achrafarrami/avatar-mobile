import { ReactNode, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Page, TopBar, Icon } from "../ui";
import { fetchCatalog, wardrobeUrl, Catalog, WardrobeItem } from "../api";

export default function Wardrobe() {
  const [cat, setCat] = useState<Catalog | null>(null);
  const [err, setErr] = useState(false);
  const [slot, setSlot] = useState("all");
  const [picked, setPicked] = useState<Record<string, string>>({});

  useEffect(() => { fetchCatalog().then(setCat).catch(() => setErr(true)); }, []);

  const slots = useMemo(
    () => ["all", ...Object.keys(cat?.slots ?? {}).filter((s) => cat!.items.some((i) => i.slot === s))],
    [cat],
  );
  const items = (cat?.items ?? []).filter((i) => slot === "all" || i.slot === slot);
  const label = (s: string) => (s === "all" ? "All" : cat?.slots[s]?.label ?? s);

  return (
    <Page>
      <TopBar title="Wardrobe" />
      {/* filters */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "6px 16px 12px", scrollbarWidth: "none" }}>
        {slots.map((s) => (
          <button key={s} onClick={() => setSlot(s)}
            className={s === slot ? "" : "glass"}
            style={{
              flex: "0 0 auto", padding: "9px 16px", borderRadius: 999, fontSize: 14, fontWeight: 600,
              border: "1px solid var(--border)", color: s === slot ? "#fff" : "var(--muted)",
              background: s === slot ? "var(--grad)" : undefined,
            }}>
            {label(s)}
          </button>
        ))}
      </div>

      {err && <Empty text="Start the backend on :8100 to load the wardrobe." />}
      {!cat && !err && <Grid>{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton" style={{ aspectRatio: "1", borderRadius: 22 }} />)}</Grid>}

      {cat && (
        <Grid>
          {items.map((it) => (
            <ItemCard key={it.id} item={it}
              on={picked[it.slot] === it.id}
              onTap={() => setPicked((p) => ({ ...p, [it.slot]: p[it.slot] === it.id ? "" : it.id }))} />
          ))}
        </Grid>
      )}
      <div className="faint" style={{ textAlign: "center", fontSize: 12, padding: "4px 24px calc(var(--sab) + 16px)" }}>
        Live try-on on the 3D avatar is wired to the same items next.
      </div>
    </Page>
  );
}

const Grid = ({ children }: { children: ReactNode }) => (
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, padding: "0 16px 16px" }}>{children}</div>
);

function ItemCard({ item, on, onTap }: { item: WardrobeItem; on: boolean; onTap: () => void }) {
  return (
    <motion.button whileTap={{ scale: 0.93 }} onClick={onTap}
      className="glass"
      style={{ position: "relative", aspectRatio: "1", borderRadius: 22, padding: 8, border: `1.5px solid ${on ? "var(--a2)" : "var(--border)"}`, display: "grid", gridTemplateRows: "1fr auto", gap: 4, color: "var(--text)", boxShadow: on ? "var(--glow)" : undefined }}>
      <img src={wardrobeUrl(item.thumb)} alt={item.label} loading="lazy"
        style={{ width: "100%", height: "100%", objectFit: "contain", minHeight: 0 }} />
      <span style={{ fontSize: 11, textAlign: "center" }} className="muted">{item.label}</span>
      {on && <span style={{ position: "absolute", top: 8, right: 8, width: 22, height: 22, borderRadius: 999, background: "var(--grad)", color: "#fff", display: "grid", placeItems: "center" }}><Icon name="check" size={14} /></span>}
    </motion.button>
  );
}

const Empty = ({ text }: { text: string }) => (
  <div className="col" style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: "0 40px", textAlign: "center" }}>
    <div style={{ width: 84, height: 84, borderRadius: 26, background: "var(--grad-soft)", display: "grid", placeItems: "center" }}><Icon name="wardrobe" size={34} /></div>
    <p className="muted">{text}</p>
  </div>
);
