import { ReactNode } from "react";
import { AnimatePresence } from "framer-motion";
import { NavProvider, useNav, Screen } from "./nav";
import { AvatarProvider } from "./avatarStore";
import { Placeholder } from "./ui";
import Splash from "./screens/Splash";
import Onboarding from "./screens/Onboarding";
import Creation from "./screens/Creation";
import Home from "./screens/Home";
import Chat from "./screens/Chat";
import Wardrobe from "./screens/Wardrobe";
import Settings from "./screens/Settings";

const SCREENS: Record<Screen, ReactNode> = {
  splash: <Splash />,
  onboarding: <Onboarding />,
  creation: <Creation />,
  home: <Home />,
  chat: <Chat />,
  wardrobe: <Wardrobe />,
  settings: <Settings />,
  customize: <Placeholder title="Customize" icon="sparkles" blurb="A full studio for hair, face, eyes, skin, brows, and colors — instant preview, randomize, undo/redo, favorites." />,
  animations: <Placeholder title="Animations" icon="play" blurb="Preview every animation — wave, smile, laugh, celebrate, dance, thinking — playing instantly on your avatar." />,
  personality: <Placeholder title="Personality" icon="persona" blurb="Friendly, funny, professional, coach, teacher, storyteller — each reshapes voice, expressions, and tone." />,
};

function Router() {
  const { screen } = useNav();
  // mode="wait": one screen (and one WebGL canvas) mounted at a time — two live
  // <Canvas> during a transition blows the browser's WebGL context limit.
  return (
    <AnimatePresence mode="wait">
      <div key={screen} style={{ position: "absolute", inset: 0 }}>{SCREENS[screen]}</div>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <AvatarProvider>
      <NavProvider><Router /></NavProvider>
    </AvatarProvider>
  );
}
