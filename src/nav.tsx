import { createContext, useContext, useState, ReactNode } from "react";

// ponytail: a tiny screen stack instead of react-router — 9 screens, custom
// page transitions, one dependency fewer. Add react-router if deep-linking/URLs
// become a real requirement.
export type Screen =
  | "splash"
  | "onboarding"
  | "home"
  | "wardrobe"
  | "customize"
  | "animations"
  | "chat"
  | "personality"
  | "settings";

type Nav = {
  screen: Screen;
  dir: 1 | -1; // transition direction: forward / back
  go: (s: Screen) => void;
  back: () => void;
  reset: (s: Screen) => void;
};

const Ctx = createContext<Nav>(null!);
export const useNav = () => useContext(Ctx);

export function NavProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<Screen[]>(["splash"]);
  const [dir, setDir] = useState<1 | -1>(1);
  const screen = stack[stack.length - 1];

  const go = (s: Screen) => { setDir(1); setStack((st) => [...st, s]); };
  const back = () =>
    setStack((st) => { setDir(-1); return st.length > 1 ? st.slice(0, -1) : st; });
  const reset = (s: Screen) => { setDir(1); setStack([s]); };

  return <Ctx.Provider value={{ screen, dir, go, back, reset }}>{children}</Ctx.Provider>;
}
