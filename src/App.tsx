import { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { NavProvider, useNav, Screen } from "./nav";
import { AvatarProvider } from "./avatarStore";
import { PersistentAvatar } from "./Avatar";
import { Placeholder } from "./ui";
import Splash from "./screens/Splash";
import Onboarding from "./screens/Onboarding";
import Creation from "./screens/Creation";
import Home from "./screens/Home";
import Chat from "./screens/Chat";
import Wardrobe from "./screens/Wardrobe";
import Settings from "./screens/Settings";
import Animations from "./screens/Animations";

// detail screens rendered as overlays above the persistent avatar + Home
const DETAIL: Partial<Record<Screen, ReactNode>> = {
  chat: <Chat />,
  wardrobe: <Wardrobe />,
  settings: <Settings />,
  customize: <Placeholder title="Customize" icon="sparkles" blurb="A full studio for hair, face, eyes, skin, brows, and colors — instant preview, randomize, undo/redo, favorites." />,
  animations: <Animations />,
  personality: <Placeholder title="Personality" icon="persona" blurb="Friendly, funny, professional, coach, teacher, storyteller — each reshapes voice, expressions, and tone." />,
};
// overlays that reveal the avatar behind them (transparent regions)
const SHEET = new Set<Screen>(["chat", "wardrobe", "animations"]);

function Router() {
  const { screen } = useNav();

  // pre-home: opaque full screens, no avatar yet
  if (screen === "splash" || screen === "onboarding" || screen === "creation") {
    return (
      <AnimatePresence mode="wait">
        <div key={screen} style={{ position: "absolute", inset: 0 }}>
          {screen === "splash" ? <Splash /> : screen === "onboarding" ? <Onboarding /> : <Creation />}
        </div>
      </AnimatePresence>
    );
  }

  // home + beyond: one persistent avatar, Home as base, detail screens overlay
  return (
    <>
      <PersistentAvatar />
      {/* wrappers are pointer-transparent so drags/pinches reach the avatar
          canvas behind; each screen re-enables pointer events on its own panels.
          Opaque (non-sheet) screens keep events since they fully cover the avatar. */}
      <div style={{ position: "absolute", inset: 0, zIndex: 10, pointerEvents: "none" }}><Home /></div>
      <AnimatePresence>
        {screen !== "home" && (
          <motion.div key={screen}
            initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 28 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            style={{ position: "absolute", inset: 0, zIndex: 20, background: SHEET.has(screen) ? "transparent" : "var(--bg)", pointerEvents: SHEET.has(screen) ? "none" : "auto" }}>
            {DETAIL[screen]}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default function App() {
  return (
    <AvatarProvider>
      <NavProvider><Router /></NavProvider>
    </AvatarProvider>
  );
}
