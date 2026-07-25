# Aura — AI Avatar Mobile App

Premium, mobile-first **React PWA** client for the AI-Avatar-Engine backend.
The avatar is the product: it renders live in 3D (react-three-fiber) from the
same GLBs the backend serves, and every screen supports it.

Sibling to `avatar-backend/` and `avatar-frontend/` inside the `avatar_blender/`
container. Reuses the backend API (avatars, wardrobe, data) — no asset copies.

## Run

```bash
# 1) backend on :8100 (in ../avatar-backend/AI-Avatar-Engine)
ai\.venv\Scripts\python ai\photo_analyzer\server.py
# 2) this app
npm install
npm run dev            # http://localhost:5173  (open on a phone via --host)
```
Backend URL: `VITE_API_BASE` (default `http://127.0.0.1:8100`). Copy
`.env.example` → `.env` to point at a deployed backend.

## Design system (`src/theme.css`)

All tokens are CSS variables; **dark is default**, light via `data-theme` or
`prefers-color-scheme`.

- **Color** — deep near-black canvas with layered violet/pink radial glows;
  brand gradient `--grad` (indigo `#6d6bff` → violet `#a25bff` → pink `#ff5bb0`).
  Surfaces are glass (`--surface`, `backdrop-filter`).
- **Type** — native system stack (SF Pro / Segoe), tight tracking. Scale
  `--fs-display … --fs-xs`. `.grad-text` for gradient headings.
- **Spacing** — 4-pt scale `--s1…--s8`. **Radius** `--r-sm…--r-xl` + `--r-pill`.
- **Elevation** `--sh-1..3` + `--glow`. **Motion** `--ease` (spring-out) + `--dur`.
- **Components** — `.btn`/`.btn-primary`/`.btn-ghost`, `.card`, `.glass`,
  `.icon-btn`, `.dots/.dot`, `.skeleton`. Icons: inline SVG (`<Icon>`), no lib.
- **Safe-area** insets wired (`--sat`/`--sab`) for notch + home indicator.
  Reduced-motion respected.

## Information architecture / flow

`Splash → Onboarding (4) → Home` (avatar ~70% + Hold-to-Talk + quick actions).
From Home: Customize · Wardrobe · Animations · Chat · Personality · Settings.
Navigation is a small screen stack (`src/nav.tsx`) with directional page
transitions (framer-motion `AnimatePresence`).

## Status

Built & interactive: **Splash, Onboarding, Home (live 3D avatar + voice states),
Wardrobe (real catalog from the API), Settings (theme + rows)**.

Designed as on-brand placeholders (reachable, styled, ready to flesh out):
**Customize, Animations, Chat, Personality**.

### ponytail notes (deliberate ceilings)
- Mobile-first **PWA**, not React Native — reuses the backend's GLB + Three.js
  pipeline. Manifest only, no service worker yet.
- Avatar idle is **procedural** (breathe/sway); the backend serves static bases,
  not the 103-clip animated GLB. Wire `useAnimations` when it exposes one.
- Hold-to-Talk runs a **mocked** listen→think→speak timeline; swap for a real
  `/chat` stream + lip-sync.
- Wardrobe is browse/select; **live 3D try-on** reuses the same items next.
- Avatar GLBs are 50–75 MB (dev builds) — fine on localhost, add Draco/meshopt
  compression before shipping over the network.
