import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// ponytail: no PWA plugin / service worker yet — add vite-plugin-pwa when you
// actually need offline + installability beyond the manifest.
export default defineConfig({
  plugins: [react()],
  server: { host: true },
});
