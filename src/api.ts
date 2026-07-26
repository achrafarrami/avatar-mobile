// Backend "brain" — same API the web client uses. One base, override with
// VITE_API_BASE (see .env.example). The future is: photos -> avatar here too.
export const API_BASE =
  (import.meta.env.VITE_API_BASE as string) || "http://127.0.0.1:8100";

export const avatarUrl = (name: string) => `${API_BASE}/avatars/${name}`;
export const wardrobeUrl = (rel: string) => `${API_BASE}/wardrobe/${rel}`;

// Default avatar bases the backend serves (dev builds).
export const AVATARS = {
  meta_male: "sandbox_meta_male.glb",
  meta_female: "sandbox_meta_female.glb",
  male: "sandbox_male.glb",
  female: "sandbox_female.glb",
} as const;

export type WardrobeItem = {
  id: string;
  slot: string;
  label: string;
  thumb: string; // e.g. "clothes/hoodie/thumbnail.png"
  file: string;
  attach_type: "bone" | "skinned";
  attach_to?: string; // bone name for bone-attached items
};
export type Catalog = {
  slots: Record<string, { label: string; tab?: string }>;
  items: WardrobeItem[];
};

export async function fetchCatalog(): Promise<Catalog> {
  const r = await fetch(wardrobeUrl("catalog.json"));
  if (!r.ok) throw new Error(`catalog ${r.status}`);
  return r.json();
}

/* ---- voice conversation (all OpenAI work happens on the backend) -------- */
export type Msg = { role: "user" | "assistant"; content: string };

async function post(path: string, body: unknown) {
  const r = await fetch(`${API_BASE}${path}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error((await r.json().catch(() => null))?.detail || `${path} ${r.status}`);
  return r;
}

export const chat = (message: string, history: Msg[]) =>
  post("/chat", { message, history }).then((r) => r.json()).then((d) => d.reply as string);

/** Text -> spoken audio as raw bytes (decoded via Web Audio for lip-sync). */
export const speakBuffer = (text: string, voice?: string) =>
  post("/tts", { text, voice }).then((r) => r.arrayBuffer());

/** Recorded audio -> transcript (Whisper on the backend). */
export async function transcribe(blob: Blob): Promise<string> {
  const fd = new FormData();
  fd.append("audio", blob, "clip.webm");
  const r = await fetch(`${API_BASE}/stt`, { method: "POST", body: fd });
  if (!r.ok) throw new Error(`stt ${r.status}`);
  return (await r.json()).text as string;
}

// morph definitions (served) -> translate semantic params to shape-key values.
// Same math as the Blender morph_controller / web sandbox: (p-0.5)*2*weight.
type MorphDefs = { params: Record<string, { targets: { shape_key: string; weight: number }[] }> };

export async function morphInfluences(engineParams: Record<string, number>): Promise<Record<string, number>> {
  const defs: MorphDefs = await fetch(`${API_BASE}/data/morph_definitions.json`).then((r) => r.json());
  const out: Record<string, number> = {};
  for (const [name, val] of Object.entries(engineParams)) {
    const spec = defs.params[name];
    if (!spec) continue;
    for (const t of spec.targets) out[t.shape_key] = (out[t.shape_key] || 0) + (val - 0.5) * 2 * t.weight;
  }
  return out;
}

/** Photo -> identity engine params (the "looks like me" analysis). */
export async function analyzePhoto(front: File): Promise<{ gender?: string; engine_params?: Record<string, number> }> {
  const fd = new FormData();
  fd.append("front", front);
  const r = await fetch(`${API_BASE}/analyze?appearance=false`, { method: "POST", body: fd });
  if (!r.ok) throw new Error((await r.json().catch(() => null))?.detail || `analyze ${r.status}`);
  const d = await r.json();
  return { gender: d.parameters?.gender, engine_params: d.engine_params };
}
