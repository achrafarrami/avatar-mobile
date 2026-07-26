import { createContext, useContext, useState, useRef, ReactNode } from "react";
import { AVATARS } from "./api";
import { loadClipLibrary, LoadedClips } from "./clips";

export type Equip = {
  id: string;
  file: string;                 // may be the meta-specific glb
  attachType: "bone" | "skinned";
  attachTo?: string;
  offset?: [number, number, number]; // meta fit (world meters)
  scale?: number;                     // meta fit (uniform)
};
type Equipped = Record<string, Equip | null>;         // slot -> item

// Chosen avatar base + identity morphs + TTS voice + equipped wardrobe.
// Lives outside the Canvas; the persistent <Avatar> reads it.
type AvatarState = {
  file: string;
  params: Record<string, number> | null;
  voice: string;
  equipped: Equipped;
  clip: string | null;      // built animation clip currently playing (by name)
  clipLoop: boolean;
  clipLib: LoadedClips | null; // loaded clip library (outside the Canvas)
  clipLoading: boolean;
  setAvatar: (file: string, params: Record<string, number> | null, voice?: string) => void;
  equip: (slot: string, item: Equip | null) => void;
  playClip: (name: string) => void;
  stopClip: () => void;
  setClipLoop: (b: boolean) => void;
};

export const voiceForGender = (g?: string) => (g === "female" ? "nova" : "onyx");

const Ctx = createContext<AvatarState>(null!);
export const useAvatar = () => useContext(Ctx);

export function AvatarProvider({ children }: { children: ReactNode }) {
  const [file, setFile] = useState<string>(AVATARS.meta_male);
  const [params, setParams] = useState<Record<string, number> | null>(null);
  const [voice, setVoice] = useState("onyx");
  const [equipped, setEquipped] = useState<Equipped>({});
  const [clip, setClip] = useState<string | null>(null);
  const [clipLoop, setClipLoop] = useState(true);
  const [clipLib, setClipLib] = useState<LoadedClips | null>(null);
  const [clipLoading, setClipLoading] = useState(false);
  const wantClip = useRef<string | null>(null); // latest requested clip (race guard)

  // Load the (large) clip library once, then play. Loading happens outside the
  // Canvas so the render tree never suspends on it. If the caller stops (or asks
  // for another clip) while the library is still loading, don't start the stale
  // one — this is what makes a quick mic tap not spuriously play a clip.
  const playClip = async (name: string) => {
    wantClip.current = name;
    let lib = clipLib;
    if (!lib) {
      setClipLoading(true);
      try { lib = await loadClipLibrary(); setClipLib(lib); }
      catch { setClipLoading(false); return; }
      setClipLoading(false);
    }
    if (wantClip.current === name) setClip(name);
  };
  const stopClip = () => { wantClip.current = null; setClip(null); };

  return (
    <Ctx.Provider value={{
      file, params, voice, equipped, clip, clipLoop, clipLib, clipLoading,
      setAvatar: (f, p, v) => { setFile(f); setParams(p); if (v) setVoice(v); },
      equip: (slot, item) => setEquipped((e) => ({ ...e, [slot]: item })),
      playClip,
      stopClip,
      setClipLoop,
    }}>


      {children}
    </Ctx.Provider>
  );
}
