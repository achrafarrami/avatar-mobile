import { StrictMode, Component, ReactNode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/bricolage-grotesque";
import "./theme.css";
import App from "./App";

// React 18 unmounts the whole root on any uncaught render error — without this,
// one bad screen (e.g. Chat) blanks the entire app instead of just failing itself.
class RootBoundary extends Component<{ children: ReactNode }, { err: Error | null; info: string }> {
  state = { err: null as Error | null, info: "" };
  static getDerivedStateFromError(err: Error) { return { err }; }
  componentDidCatch(err: Error, info: { componentStack: string }) {
    console.error("RootBoundary caught:", err, info.componentStack);
    this.setState({ info: info.componentStack });
  }
  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div style={{ position: "fixed", inset: 0, display: "grid", placeItems: "center", padding: 24, textAlign: "center", background: "var(--bg, #0b0b12)", color: "var(--text, #fff)" }}>
        <div style={{ maxWidth: 480 }}>
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Something went wrong</div>
          <div style={{ opacity: 0.7, fontSize: 14, marginBottom: 16 }}>{this.state.err.message}</div>
          <button onClick={() => location.reload()} style={{ padding: "10px 20px", borderRadius: 999, border: 0, background: "var(--text, #fff)", color: "var(--bg, #000)" }}>Reload</button>
          <pre style={{ textAlign: "left", whiteSpace: "pre-wrap", fontSize: 11, opacity: 0.6, marginTop: 20, maxHeight: 240, overflow: "auto" }}>
            {this.state.err.stack}
            {this.state.info}
          </pre>
        </div>
      </div>
    );
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RootBoundary><App /></RootBoundary>
  </StrictMode>,
);
