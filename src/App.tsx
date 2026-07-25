import { ReactNode } from "react";
import { AnimatePresence } from "framer-motion";
import { NavProvider, useNav, Screen } from "./nav";
import { Placeholder } from "./ui";
import Splash from "./screens/Splash";
import Onboarding from "./screens/Onboarding";
import Home from "./screens/Home";
import Wardrobe from "./screens/Wardrobe";
import Settings from "./screens/Settings";

const SCREENS: Record<Screen, ReactNode> = {
  splash: <Splash />,
  onboarding: <Onboarding />,
  home: <Home />,
  wardrobe: <Wardrobe />,
  settings: <Settings />,
  customize: <Placeholder title="Customize" icon="sparkles" blurb="A full studio for hair, face, eyes, skin, brows, and colors — instant preview, randomize, undo/redo, favorites." />,
  animations: <Placeholder title="Animations" icon="play" blurb="Preview every animation — wave, smile, laugh, celebrate, dance, thinking — playing instantly on your avatar." />,
  chat: <Placeholder title="Chat" icon="chat" blurb="Voice-first, minimal bubbles. Your avatar looks at you, nods, smiles, and reacts as you talk." />,
  personality: <Placeholder title="Personality" icon="persona" blurb="Friendly, funny, professional, coach, teacher, storyteller — each reshapes voice, expressions, and tone." />,
};

function Router() {
  const { screen } = useNav();
  return <AnimatePresence mode="popLayout">{/* key by screen for enter/exit */}
    <div key={screen} style={{ position: "absolute", inset: 0 }}>{SCREENS[screen]}</div>
  </AnimatePresence>;
}

export default function App() {
  return <NavProvider><Router /></NavProvider>;
}
