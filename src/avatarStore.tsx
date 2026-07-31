import { createContext, useContext, useState, useRef, useEffect, ReactNode } from "react";
import { AVATARS, fetchCatalog, WardrobeItem } from "./api";
import { loadClipLibrary, LoadedClips, BASE_IDLE_CLIP } from "./clips";
import { Look } from "./appearance";

export type Equip = {
  id: string;
  file: string;                 // may be the meta-specific glb
  attachType: "bone" | "skinned";
  attachTo?: string;
  offset?: [number, number, number]; // meta fit (world meters)
  scale?: number;                     // meta fit (uniform)
  color?: string;                     // user tint (hex) — undefined = original
};

/** Catalog item -> Equip, resolving the meta-head fit (glb swap + offset/scale). */
export const toEquip = (it: WardrobeItem): Equip => {
  const m = it.styles?.meta;
  return {
    id: it.id, file: m?.glb ?? it.file, attachType: it.attach_type, attachTo: it.attach_to,
    offset: m?.offset, scale: m?.scale,
  };
};

// Starting outfit, equipped on first load (catalog ids).
const DEFAULT_OUTFIT = ["hair_w03", "tshirt", "jeans", "sneakers"];
type Equipped = Record<string, Equip | null>;         // slot -> item

// Chosen avatar base + identity morphs + TTS voice + equipped wardrobe.
// Lives outside the Canvas; the persistent <Avatar> reads it.
type AvatarState = {
  file: string;
  params: Record<string, number> | null;
  voice: string;
  look: Look | null;        // measured photo colors (skin/brows/iris)
  setLook: (l: Look | null) => void;
  equipped: Equipped;
  clip: string | null;      // built animation clip currently playing (by name)
  clipLoop: boolean;
  clipLib: LoadedClips | null; // loaded clip library (outside the Canvas)
  clipLoading: boolean;
  setAvatar: (file: string, params: Record<string, number> | null, voice?: string) => void;
  setVoice: (v: string) => void;
  resetAvatar: () => void;
  equip: (slot: string, item: Equip | null) => void;
  setColor: (slot: string, color?: string) => void;
  playClip: (name: string) => void;
  stopClip: () => void;
  ensureClips: () => void;   // prefetch the clip library in the background
  setClipLoop: (b: boolean) => void;
};

export const voiceForGender = (g?: string) => (g === "female" ? "nova" : "onyx");

const Ctx = createContext<AvatarState>(null!);
export const useAvatar = () => useContext(Ctx);

export function AvatarProvider({ children }: { children: ReactNode }) {
  const [file, setFile] = useState<string>(AVATARS.meta_male);
  const [params, setParams] = useState<Record<string, number> | null>(null);
  const [voice, setVoice] = useState(() => localStorage.getItem("aura-voice") || "onyx");
  const [look, setLook] = useState<Look | null>(null);
  const [equipped, setEquipped] = useState<Equipped>({});
  const [clip, setClip] = useState<string | null>(BASE_IDLE_CLIP);
  const [clipLoop, setClipLoop] = useState(true);
  const [clipLib, setClipLib] = useState<LoadedClips | null>(null);
  const [clipLoading, setClipLoading] = useState(false);
  const wantClip = useRef<string | null>(null); // latest requested clip (race guard)

  // Default outfit: equip into slots the user hasn't touched (fresh = all).
  const equipDefaults = (fresh: boolean) =>
    fetchCatalog().then((cat) => {
      setEquipped((e) => {
        const next: Equipped = fresh ? {} : { ...e };
        for (const id of DEFAULT_OUTFIT) {
          const it = cat.items.find((i) => i.id === id);
          if (it && next[it.slot] === undefined) next[it.slot] = toEquip(it);
        }
        return next;
      });
    }).catch(() => {}); // backend down: avatar just starts unclothed as before
  useEffect(() => { equipDefaults(false); }, []);

  // Load the (large) clip library once, then play. Loading happens outside the
  // Canvas so the render tree never suspends on it. If the caller stops (or asks
  // for another clip) while the library is still loading, don't start the stale
  // one — this is what makes a quick mic tap not spuriously play a clip.
  // The BASE idle needs no library at all (it's generated in-app, idle.ts).
  const libPromise = useRef<Promise<LoadedClips> | null>(null);
  const ensureClips = () => {
    if (clipLib) return Promise.resolve(clipLib);
    libPromise.current ??= (async () => {
      setClipLoading(true);
      try { const lib = await loadClipLibrary(); setClipLib(lib); return lib; }
      finally { setClipLoading(false); }
    })();
    return libPromise.current;
  };
  const playClip = async (name: string) => {
    wantClip.current = name;
    if (name === BASE_IDLE_CLIP) { setClip(name); return; }   // generated, instant
    try { await ensureClips(); } catch { return; }
    if (wantClip.current === name) setClip(name);
  };
  // "stop" means back to the baseline idle body clip, not a blank T-pose.
  const stopClip = () => { wantClip.current = BASE_IDLE_CLIP; setClip(BASE_IDLE_CLIP); };

  return (
    <Ctx.Provider value={{
      file, params, voice, look, setLook, equipped, clip, clipLoop, clipLib, clipLoading,
      setAvatar: (f, p, v) => { setFile(f); setParams(p); if (v) { setVoice(v); localStorage.setItem("aura-voice", v); } },
      setVoice: (v) => { setVoice(v); localStorage.setItem("aura-voice", v); },
      // "Delete avatar": back to the stock base, no identity, default outfit + voice.
      resetAvatar: () => {
        setFile(AVATARS.meta_male); setParams(null); setLook(null);
        setVoice("onyx"); localStorage.removeItem("aura-voice");
        equipDefaults(true);
      },
      equip: (slot, item) => setEquipped((e) => ({ ...e, [slot]: item })),
      setColor: (slot, color) =>
        setEquipped((e) => (e[slot] ? { ...e, [slot]: { ...e[slot]!, color } } : e)),
      playClip,
      stopClip,
      ensureClips: () => { ensureClips().catch(() => {}); },
      setClipLoop,
    }}>


      {children}
    </Ctx.Provider>
  );
}
