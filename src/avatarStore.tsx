import { createContext, useContext, useState, ReactNode } from "react";
import { AVATARS } from "./api";

// The chosen avatar base + identity morphs (from photo analysis) + the TTS voice
// matched to the detected gender. Lives outside the Canvas; Home/Chat read it.
type AvatarState = {
  file: string;
  params: Record<string, number> | null;
  voice: string; // OpenAI TTS voice — onyx (male) / nova (female) / …
  setAvatar: (file: string, params: Record<string, number> | null, voice?: string) => void;
};

export const voiceForGender = (g?: string) => (g === "female" ? "nova" : "onyx");

const Ctx = createContext<AvatarState>(null!);
export const useAvatar = () => useContext(Ctx);

export function AvatarProvider({ children }: { children: ReactNode }) {
  const [file, setFile] = useState<string>(AVATARS.meta_male);
  const [params, setParams] = useState<Record<string, number> | null>(null);
  const [voice, setVoice] = useState("onyx");
  return (
    <Ctx.Provider value={{
      file, params, voice,
      setAvatar: (f, p, v) => { setFile(f); setParams(p); if (v) setVoice(v); },
    }}>
      {children}
    </Ctx.Provider>
  );
}
