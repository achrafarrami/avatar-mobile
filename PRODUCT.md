# Aura — Product Context

## What it is
A mobile PWA companion app for the AI-Avatar-Engine backend. The user creates a
3D avatar from a selfie, then talks to it (hold-to-talk voice or text). The
avatar listens, thinks, speaks with lip-sync, and wears wardrobe items live.
The 3D avatar is the product; the UI frames it.

## Audience & scene
Personal companion use — evenings, phone in hand, low ambient light, one-handed.
Dark is the primary theme for this scene; a warm light theme exists for daytime.

## Surfaces (all Operate mode)
Splash → Onboarding → Creation (selfie → avatar), then Home (avatar full-screen,
dock, hold-to-talk mic) with sheet overlays: Chat, Wardrobe (live try-on),
Animations (test bench), and opaque screens: Settings, Customize/Personality
(placeholders).

## Product truth
- Backend on :8100 serves catalog, animations, analyze-photo, chat/voice.
- Every screen must degrade gracefully with the backend down (defaults, notes).
- Avatar canvas sits behind sheet screens; wrappers stay pointer-transparent.
- No router — internal screen stack (nav.tsx). No new heavy dependencies.

## Brand commitment (chosen 2026-07-27)
Visual world: **warm dark + ember** — warm near-black charcoal surfaces, bone
text, a single ember (amber-orange) accent, warm-tinted shadows. Display face:
Bricolage Grotesque (bundled). Wordmark: "Aura." with an ember full stop.
The avatar carries the color; the UI recedes. Replaces the earlier
indigo→violet→pink gradient glassmorphism identity.

*Assumptions (inferred from code + brief, unconfirmed): app name "Aura" is
final; subscription/privacy rows in Settings are placeholders; PWA remains the
target (no native shell).*
