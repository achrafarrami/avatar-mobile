import { Page, TopBar, Icon } from "../ui";
import { useTheme } from "../useTheme";

const ROWS = [
  ["Language", "English"],
  ["Voice", "Aura · Warm"],
  ["Graphics Quality", "High"],
  ["Privacy", ""],
  ["Export Avatar", ""],
  ["Subscription", "Free"],
  ["About", "v0.1.0"],
];

export default function Settings() {
  const [theme, toggle] = useTheme();
  return (
    <Page>
      <TopBar title="Settings" />
      <div style={{ padding: "8px 16px", display: "grid", gap: 12 }}>
        {/* theme switch */}
        <div className="card" style={{ padding: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div className="row"><Icon name={theme === "dark" ? "moon" : "sun"} size={20} /><span style={{ fontWeight: 600 }}>Dark theme</span></div>
          <button onClick={toggle} aria-label="Toggle theme"
            style={{ width: 52, height: 30, borderRadius: 999, border: 0, padding: 3, background: theme === "dark" ? "var(--grad)" : "var(--surface-2)", display: "flex", justifyContent: theme === "dark" ? "flex-end" : "flex-start" }}>
            <span style={{ width: 24, height: 24, borderRadius: 999, background: "#fff", boxShadow: "var(--sh-1)", transition: "all .2s var(--ease)" }} />
          </button>
        </div>

        <div className="card" style={{ overflow: "hidden" }}>
          {ROWS.map(([k, v], n) => (
            <div key={k} style={{ padding: "16px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: n ? "1px solid var(--border)" : undefined, color: k === "Delete Avatar" ? "var(--a3)" : undefined }}>
              <span style={{ fontWeight: 500 }}>{k}</span>
              <span className="row muted" style={{ fontSize: 14 }}>{v}<span style={{ transform: "rotate(180deg)", display: "inline-flex" }}><Icon name="back" size={16} /></span></span>
            </div>
          ))}
          <div style={{ padding: "16px 18px", borderTop: "1px solid var(--border)", color: "var(--a3)", fontWeight: 600 }}>Delete Avatar</div>
        </div>
      </div>
    </Page>
  );
}
