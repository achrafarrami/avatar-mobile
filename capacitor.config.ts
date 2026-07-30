import type { CapacitorConfig } from "@capacitor/cli";

// androidScheme: "http" — the backend the app talks to (127.0.0.1:8100, see
// api.ts) is plain http; serving the app itself over https would make that a
// blocked mixed-content request. Matching scheme keeps both same-protocol.
const config: CapacitorConfig = {
  appId: "com.aura.avatar",
  appName: "Aura",
  webDir: "dist",
  server: { androidScheme: "http" },
};

export default config;
