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

## Voice conversation

Real, powered by the backend (the OpenAI key stays server-side in
`avatar-backend`; the app never sees it). Backend routes: `POST /chat`
(gpt-4o-mini), `/tts` (returns MP3), `/stt` (Whisper). Flow: hold-to-talk →
record mic → `/stt` → `/chat` → play `/tts` while the avatar lip-syncs
(`signals.speaking` drives a mouth morph). The Chat screen also takes typed
input.

## Status

Built & interactive: **Splash, Onboarding, Creation (selfie → `/analyze` →
identity morphs → home), Home (full-body live avatar + real voice), Chat (OpenAI
text + hold-to-talk), Wardrobe (real catalog from the API), Settings**.

On-brand placeholders (reachable, styled): **Customize, Animations, Personality**.

### ponytail notes (deliberate ceilings)
- Mobile-first **PWA**, not React Native — reuses the backend's GLB + Three.js
  pipeline. Manifest only, no service worker yet.
- One `<Canvas>` at a time (router `mode="wait"`) — two live WebGL contexts blow
  the browser limit ("Context Lost").
- Lip-sync is a **cheap** mouth-morph oscillation while audio plays, not real
  visemes. Idle is procedural (backend serves static bases, not the 103-clip
  animated GLB).
- Hold-to-Talk needs mic permission (real device / https). Typed chat works
  anywhere.
- Creation applies identity morphs to a `--keep-identity` base (real "looks like
  me"); a fully custom generated GLB still needs the Blender pipeline as a
  service.
- Wardrobe is browse/select; **live 3D try-on** reuses the same items next.
- Avatar GLBs are 50–75 MB (dev builds) — fine on localhost, add Draco/meshopt
  compression before shipping over the network.
