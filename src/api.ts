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
