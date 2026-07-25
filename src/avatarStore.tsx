import { createContext, useContext, useState, ReactNode } from "react";
import { AVATARS } from "./api";

// The chosen avatar base + identity morph params (from photo analysis). Lives
// outside the Canvas; Home reads it and passes it down as props (no r3f context
// bridging needed).
type AvatarState = {
  file: string;
  params: Record<string, number> | null;
  setAvatar: (file: string, params: Record<string, number> | null) => void;
};

const Ctx = createContext<AvatarState>(null!);
export const useAvatar = () => useContext(Ctx);

export function AvatarProvider({ children }: { children: ReactNode }) {
  const [file, setFile] = useState<string>(AVATARS.meta_male);
  const [params, setParams] = useState<Record<string, number> | null>(null);
  return (
    <Ctx.Provider value={{ file, params, setAvatar: (f, p) => { setFile(f); setParams(p); } }}>
      {children}
    </Ctx.Provider>
  );
}
