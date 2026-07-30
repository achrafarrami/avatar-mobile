# Aura — Design System (warm dark + ember)

Recorded from the built world, 2026-07-27. Replaces the previous
indigo→violet→pink gradient glassmorphism identity. All tokens live in
`src/theme.css`; screens consume tokens only — no hex values in components
except the Avatar canvas lights.

## World
A warm, quiet frame around a living 3D avatar. The avatar carries the color;
the UI recedes. One accent. No gradients on controls, no gradient text, no
decorative glass.

## Color
- Ground: warm near-black `--bg #131110`, raised `--bg-2`, cards via
  translucent bone `--surface / --surface-2`, solid `--surface-solid #211d19`.
- Text: bone `--text #f3eee6`, `--muted`, `--faint`. Never blue-gray.
- Accent (the only one): ember `--ember #e8813c`, pressed `--ember-deep`,
  tint fill `--ember-soft`, text on ember is dark `--on-ember #2a1707`.
- `--danger #e5604c` for destructive/error only.
- Light theme: warm bone ground `#f4efe7`, ink `#201b15`, deeper ember
  `#d9701f` (contrast), `--on-ember` flips to near-white.
- Ambient: one faint ember radial "lamplight" at the top of `#root`.
  Avatar canvas rim lights match: `#e8813c` + `#ffd9b0`.

## Type
- Display voice: Bricolage Grotesque Variable (bundled via
  `@fontsource-variable/bricolage-grotesque`, imported in `main.tsx`) —
  `.display`, `.h1`, `.wordmark`. Tracking −0.02 to −0.03em, `text-wrap: balance`.
- UI body: native system stack (`--font`). `.num` for tabular figures.
- Wordmark: `.wordmark` renders "Aura" + an ember full stop via `::after`.

## Shape & elevation
- Radii: cards/tiles 14–16px (`--r-md/--r-lg`), sheets 20px (`--r-xl`),
  pills only on small controls.
- Elevation declared once: cards = 1px border, no shadow. Shadows (warm-tinted,
  real offset: `--sh-1/2/3`) are for floating elements; `--sh-ember` only under
  ember fills (mic, primary button).
- `.glass` is functional only — dock and status pill, where the live avatar
  passes underneath.

## Motion
- Ease: `--ease cubic-bezier(0.23,1,0.32,1)` (strong ease-out);
  `--ease-drawer cubic-bezier(0.32,0.72,0,1)` for sheets.
- Durations: press 160ms, UI transitions ≤280ms, sheet 320ms.
- Pressables scale 0.94–0.97 on active. Entrances start ≥0.92 scale + opacity,
  never scale(0). Grid items stagger 30ms (capped at 8).
- Width/size changes animate via framer `layout` (FLIP), not layout properties.
- Signature moment: the ember mic — breathing `.ember-orb` idiom (splash,
  creation, avatar loading) and the expanding ring while listening.
- `prefers-reduced-motion` collapses all animation.

## Patterns
- Home chrome (wordmark, dock) fades out under sheet screens (`onTop` in
  `Home.tsx`) — sheets own the header space.
- Sheets: `--bg` ground, top radius 20, warm shadow, drag-handle bar.
- Selection state: ember border + `--ember-soft` fill + ember check badge
  (wardrobe), ember fill + `--on-ember` text (chips, toggles, active buttons).
- Copy: sentence case everywhere; errors name the problem and recovery.

## Known follow-ups
- Wardrobe thumbnails ship a slate-blue background baked into the backend's
  images — regenerate thumbs on a warm/neutral ground to match (backend repo).
- Bundle is one ~1.3MB chunk (three.js); code-split if PWA install size matters.
