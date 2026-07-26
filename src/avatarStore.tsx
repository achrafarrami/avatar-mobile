import { createContext, useContext, useState, ReactNode } from "react";
import { AVATARS } from "./api";

export type Equip = { file: string; attachType: "bone" | "skinned"; attachTo?: string };
type Equipped = Record<string, Equip | null>;         // slot -> item

// Chosen avatar base + identity morphs + TTS voice + equipped wardrobe.
// Lives outside the Canvas; the persistent <Avatar> reads it.
type AvatarState = {
  file: string;
  params: Record<string, number> | null;
  voice: string;
  equipped: Equipped;
  setAvatar: (file: string, params: Record<string, number> | null, voice?: string) => void;
  equip: (slot: string, item: Equip | null) => void;
};

export const voiceForGender = (g?: string) => (g === "female" ? "nova" : "onyx");

const Ctx = createContext<AvatarState>(null!);
export const useAvatar = () => useContext(Ctx);

export function AvatarProvider({ children }: { children: ReactNode }) {
  // realistic base: the wardrobe is authored to fit it directly (the meta/toon
  // head needs per-item refit that most items lack). Also reads more "like you".
  const [file, setFile] = useState<string>(AVATARS.male);
  const [params, setParams] = useState<Record<string, number> | null>(null);
  const [voice, setVoice] = useState("onyx");
  const [equipped, setEquipped] = useState<Equipped>({});
  return (
    <Ctx.Provider value={{
      file, params, voice, equipped,
      setAvatar: (f, p, v) => { setFile(f); setParams(p); if (v) setVoice(v); },
      equip: (slot, item) => setEquipped((e) => ({ ...e, [slot]: item })),
    }}>
      {children}
    </Ctx.Provider>
  );
}
