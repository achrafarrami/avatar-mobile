import { Suspense, useRef, useState, useEffect, useMemo, Component, ReactNode, PointerEvent, MouseEvent } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, ContactShadows, OrbitControls } from "@react-three/drei";
import { motion, AnimatePresence } from "framer-motion";
import { Group, Vector3, Quaternion, Matrix4, Skeleton, Euler,
  AnimationMixer, LoopRepeat, LoopOnce, Color } from "three";
import type { Mesh, Object3D, Bone, SkinnedMesh, MeshStandardMaterial } from "three";
import { clone as skeletonClone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { avatarUrl, wardrobeUrl, AVATARS } from "./api";
import { useAvatar, Equip } from "./avatarStore";
import { useSettings } from "./settings";

// Start fetching the default avatar the moment the app boots — the download
// runs during the splash/onboarding screens instead of after Home mounts.
useGLTF.preload(avatarUrl(AVATARS.meta_male));
import { signals } from "./avatarSignals";
import { retargetMorphs, LoadedClips, FACIAL_ONLY_CLIPS, applyIdleBodyPose, BASE_IDLE_CLIP } from "./clips";
import { buildIdleClip } from "./idle";
import { applyLook, Look } from "./appearance";
import { useNav, SHEET_SCREENS } from "./nav";
import { t } from "./i18n";
import { SilhouetteTrace } from "./SilhouetteTrace";

type Params = Record<string, number> | null;

// Jaw lip-sync calibration (from the rig/export: talk clips bake ~0–4° for
// normal speech, 10° ≈ 1cm chin drop; morph key ≈ jaw°/15). Lips need the
// V_Open viseme on top of the jaw — Jaw_Open alone barely parts the toon lips.
const JAW_MAX_DEG = 12;                                 // openness 1.0 → this many degrees (rig max)
const JAW_MAX_RAD = (JAW_MAX_DEG * Math.PI) / 180;
const JAW_MORPH_PER = JAW_MAX_DEG / 15;                 // Jaw_Open key at openness 1.0
const V_OPEN_PER = 0.85;                                // V_Open viseme at openness 1.0 (lip parting)
const WIDE_PER = 0.6;                                   // V_Wide cap (ee/s)
const ROUND_PER = 0.7;                                  // V_Tight_O cap (oo/o)
const _JAW_AXIS = new Vector3(0, 0, 1);                 // JawRoot local +z opens (verified in export)
const _jawDelta = new Quaternion();

// Female-base arm clearance in degrees (mirrored onto the right side);
// tuned visually — dev override via window.__armFix.
const ARM_CLEAR = { x: 0, y: 0, z: 6 };
const DEG = Math.PI / 180;
const _armDelta = new Quaternion();
const _armEuler = new Euler();

// Attach a wardrobe item to the avatar — ported from the web WardrobeManager.
//  - bone: rigid item parented to a bone (hair, glasses, hats), baking the
//    bone's inverse world transform so it sits at the bone in world space.
//  - skinned: re-bind the item's skinned meshes to the AVATAR's bones by name
//    so they deform with it (beard, clothes).
/** Tint every material under `root` (user color pick), or restore the item's
 *  authored colors when `color` is undefined. Originals are stashed on first use. */
function tintItem(root: Object3D, color?: string) {
  root.traverse((o) => {
    const mesh = o as Mesh;
    if (!mesh.isMesh || !mesh.material) return;
    for (const mat of (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) as MeshStandardMaterial[]) {
      if (!mat.color) continue;
      mat.userData.origColor ??= mat.color.clone();
      if (color) mat.color.set(color); else mat.color.copy(mat.userData.origColor as Color);
    }
  });
}

function EquipItem({ avatar, info }: { avatar: Object3D; info: Equip }) {
  const { scene } = useGLTF(wardrobeUrl(info.file));
  const holderRef = useRef<Object3D | null>(null);
  const colorRef = useRef(info.color); colorRef.current = info.color;
  useEffect(() => {
    avatar.updateMatrixWorld(true);
    const src = skeletonClone(scene) as Object3D;   // clone (skeleton-safe) so the cache isn't mutated
    // materials are still shared with the cached GLTF — clone them so a tint
    // on this instance never leaks into the cache (or other equipped items)
    src.traverse((o) => {
      const m = o as Mesh;
      if (m.isMesh && m.material)
        m.material = Array.isArray(m.material) ? m.material.map((x) => x.clone()) : m.material.clone();
    });
    src.updateMatrixWorld(true);
    let holder: Object3D;

    if (info.attachType === "skinned") {
      const bones: Record<string, Bone> = {};
      avatar.traverse((o) => { if ((o as Bone).isBone) bones[o.name] = o as Bone; });
      const h = new Group();
      const sms: SkinnedMesh[] = [];
      src.traverse((o) => { if ((o as SkinnedMesh).isSkinnedMesh) sms.push(o as SkinnedMesh); });
      for (const sm of sms) {
        const mapped = sm.skeleton.bones.map((b) => bones[b.name] || null);
        const world = sm.matrixWorld.clone();
        h.add(sm);
        sm.matrix.copy(world);
        sm.matrix.decompose(sm.position, sm.quaternion, sm.scale);
        sm.bind(new Skeleton(mapped.map((b, i) => b || sm.skeleton.bones[i]), sm.skeleton.boneInverses), sm.bindMatrix);
        sm.frustumCulled = false;
      }
      avatar.add(h);
      // meta fit: skinned holder sits in avatar/world space, so nudge directly
      if (info.offset) h.position.set(info.offset[0], info.offset[1], info.offset[2]);
      if (info.scale) h.scale.setScalar(info.scale);
      holder = h;
    } else {
      let parent: Object3D = avatar;
      if (info.attachTo) avatar.traverse((o) => { if ((o as Bone).isBone && o.name === info.attachTo) parent = o; });
      parent.add(src);
      parent.updateWorldMatrix(true, false);
      const pos = new Vector3().setFromMatrixPosition(parent.matrixWorld);
      if (info.offset) pos.add(new Vector3(info.offset[0], info.offset[1], info.offset[2])); // meta fit (world m)
      const s = info.scale ?? 1;
      const desired = new Matrix4().compose(pos, new Quaternion(), new Vector3(s, s, s));
      src.matrix.copy(parent.matrixWorld.clone().invert().multiply(desired));
      src.matrix.decompose(src.position, src.quaternion, src.scale);
      holder = src;
    }
    holderRef.current = holder;
    tintItem(holder, colorRef.current);
    return () => { holderRef.current = null; holder.parent?.remove(holder); };
  }, [scene, avatar, info.attachType, info.attachTo, info.file, info.offset, info.scale]);
  // recolor in place — no re-clone/re-bind, so dragging a color picker stays smooth
  useEffect(() => { if (holderRef.current) tintItem(holderRef.current, info.color); }, [info.color]);
  return null;
}

function Model({ file, params, equipped, clip, loop, lib, look, onReady }:
  { file: string; params: Params; equipped: (Equip | null)[]; clip: string | null; loop: boolean; lib: LoadedClips | null; look: Look | null; onReady?: () => void }) {
  const { scene } = useGLTF(avatarUrl(file));
  const g = useRef<Group>(null!);

  // Mounting means the GLB resolved and the avatar renders this frame — tell
  // the parent so it can start the (much larger) clip-library download without
  // competing with the avatar for bandwidth.
  const onReadyRef = useRef(onReady); onReadyRef.current = onReady;
  useEffect(() => { onReadyRef.current?.(); }, [scene]);

  // dev-only: expose the scene for console pose experiments
  if (import.meta.env.DEV) (window as unknown as { __avatar: Object3D }).__avatar = scene;

  // Measured photo colors (skin/brows/iris) — applied to the template
  // materials; re-applied when the base swaps, restored when look clears.
  useEffect(() => { applyLook(scene, look); }, [scene, look]);

  const meshes = useMemo(() => {
    const list: Mesh[] = [];
    scene.traverse((o) => { if ((o as Mesh).isMesh && (o as Mesh).morphTargetDictionary) list.push(o as Mesh); });
    return list;
  }, [scene]);
  // The mouth OPENER on this rig is the CC_Base_JawRoot BONE (local +z,
  // rest-relative; ~1cm chin drop per 10°) — the Jaw_Open morph only shapes the
  // lips (≈ jaw°/15) and alone leaves the toon lips closed. Lip-sync must drive
  // the bone, with the morph layered at the calibrated ratio.
  const jaw = useMemo(() => {
    const b = scene.getObjectByName("CC_Base_JawRoot") as Bone | undefined;
    return b ? { bone: b, rest: b.quaternion.clone() } : null;
  }, [scene]);
  // Idle/gesture clips were authored on the meta MALE rig; on the female base
  // the hanging hands sink into the wider hips/thighs. Nudge the upper arms
  // outward AFTER the mixer each frame (post-multiply in bone-local space so
  // it rides on top of whatever the clip does). Male base: no offset needed.
  const arms = useMemo(() => {
    if (!/female/.test(file)) return null;
    const L = scene.getObjectByName("CC_Base_L_Upperarm") as Bone | undefined;
    const R = scene.getObjectByName("CC_Base_R_Upperarm") as Bone | undefined;
    return L && R ? { L, R } : null;
  }, [scene, file]);
  // Lip-sync morph channels, each fanned out across EVERY mesh that carries the
  // key (body + teeth + tongue), not just the first mesh:
  //   jawMorph Jaw_Open  — chin/lip follow of the jaw bone (≈ deg/15)
  //   open     V_Open    — the actual lip-parting viseme (this is what shows)
  //   wide     V_Wide    — lip spread for ee/s sounds
  //   round    V_Tight_O — lip rounding for oo/o sounds
  const mouthTargets = useMemo(() => {
    const find = (key: string) => {
      const out: { infl: number[]; i: number }[] = [];
      for (const m of meshes) {
        const i = m.morphTargetDictionary![key];
        if (i !== undefined) out.push({ infl: m.morphTargetInfluences as unknown as number[], i });
      }
      return out;
    };
    return { jawMorph: find("Jaw_Open"), open: find("V_Open"), wide: find("V_Wide"), round: find("V_Tight_O") };
  }, [meshes]);

  // The AnimationMixer lives HERE (not a child) so mixer.update() and the
  // lip-sync override run in one frame callback, mixer first — lip-sync always
  // wins the mouth even while a talking clip animates the body/face.
  const mixerRef = useRef<AnimationMixer | null>(null);
  const mouthSmooth = useRef({ open: 0, wide: 0, round: 0 }); // smoothed lip-sync channels (absolute)

  // Identity morphs (photo params) written straight onto the meshes. Must run
  // BEFORE a clip is built/retargeted: both paths copy the current influences
  // as their morph baseline, which is how identity survives under animation.
  const applyParamsNow = () => {
    for (const m of meshes) {
      const dict = m.morphTargetDictionary!, infl = m.morphTargetInfluences!;
      for (const [k, idx] of Object.entries(dict)) if (params?.[k] === undefined) infl[idx] = 0;
      if (params) for (const [k, v] of Object.entries(params)) if (dict[k] !== undefined) infl[dict[k]] = v;
    }
  };
  const applyParamsRef = useRef(applyParamsNow); applyParamsRef.current = applyParamsNow;
  useEffect(() => { applyParamsRef.current(); }, [meshes, params]);

  // The generated premium idle (idle.ts), built once per avatar base — needs
  // no clip-library download, so the avatar is alive from the first frame.
  const idleCache = useRef<{ key: string; clip: ReturnType<typeof buildIdleClip> } | null>(null);
  const getIdleClip = () => {
    if (idleCache.current?.key !== file)
      idleCache.current = { key: file, clip: buildIdleClip(scene, /female/.test(file)) };
    if (import.meta.env.DEV)
      (window as unknown as { __idleClip: unknown }).__idleClip = idleCache.current.clip;
    return idleCache.current.clip;
  };

  // ONE mixer for the scene's lifetime. The generated idle action NEVER stops —
  // library clips (fidgets/talk/gestures) crossfade in over it and back out, so
  // every transition is smooth and the idle keeps its phase (no restart pop).
  const idleActionRef = useRef<ReturnType<AnimationMixer["clipAction"]> | null>(null);
  const overlayRef = useRef<ReturnType<AnimationMixer["clipAction"]> | null>(null);
  const retargetCache = useRef(new Map<string, ReturnType<typeof buildIdleClip>>());
  useEffect(() => {
    applyParamsRef.current();          // morph baseline for the idle build
    const mixer = new AnimationMixer(scene);
    mixerRef.current = mixer;
    const idleAction = mixer.clipAction(getIdleClip());
    idleAction.play();
    idleActionRef.current = idleAction;
    mixer.update(0);                   // pose the first frame NOW — no rest flash
    return () => {
      mixer.stopAllAction();
      mixer.uncacheRoot(scene);
      mixerRef.current = null;
      idleActionRef.current = null;
      overlayRef.current = null;
      retargetCache.current.clear();
    };
  }, [scene, file]);

  const FADE = 0.35;                   // s — transition crossfade
  useEffect(() => {
    const mixer = mixerRef.current, idleAction = idleActionRef.current;
    if (!mixer || !idleAction) return;
    if (!clip || clip === BASE_IDLE_CLIP) {
      // back to base idle: fade the overlay out, fade the (still-running,
      // never-reset) idle back in — it resumes its own phase, never frame 0.
      if (overlayRef.current) {
        idleAction.enabled = true;
        idleAction.paused = false;
        idleAction.fadeIn(FADE);
        overlayRef.current.fadeOut(FADE);
        overlayRef.current = null;
      }
      return;
    }
    if (!lib) return;                  // library still downloading
    let src = retargetCache.current.get(clip);
    if (!src) {
      const found = lib.clips.find((c) => c.name === clip);
      if (!found) return;
      applyParamsRef.current();        // morph baseline for the retarget
      let retargeted = retargetMorphs(found, scene, lib.srcNames);
      if (FACIAL_ONLY_CLIPS.has(clip))
        // facial-only clip: its baked body pose is a non-idle rest (arms up) —
        // hold the generated idle's natural stance underneath the expression.
        retargeted = applyIdleBodyPose(retargeted, getIdleClip());
      src = retargeted;
      retargetCache.current.set(clip, src);
    }
    const action = mixer.clipAction(src);
    action.reset();
    action.setLoop(loop ? LoopRepeat : LoopOnce, Infinity);
    action.clampWhenFinished = true;
    action.play();
    action.fadeIn(FADE);
    (overlayRef.current ?? idleAction).fadeOut(FADE);
    overlayRef.current = action;
  }, [scene, clip, loop, lib, file]);

  useFrame(({ clock }, dt) => {
    mixerRef.current?.update(dt);   // 1) advance any playing clip FIRST
    // 1b) female arm clearance — only for LIBRARY body clips (gestures/loco);
    // the generated idle (and the facial-clip underlay built from it) already
    // bakes the clearance in, so adding it again would over-rotate the arms.
    if (arms && clip && clip !== BASE_IDLE_CLIP && !FACIAL_ONLY_CLIPS.has(clip)) {
      // dev builds: tune live via window.__armFix; prod compiles to the constant
      const t = import.meta.env.DEV
        ? (window as unknown as { __armFix?: { x: number; y: number; z: number } }).__armFix ?? ARM_CLEAR
        : ARM_CLEAR;
      arms.L.quaternion.multiply(_armDelta.setFromEuler(_armEuler.set(t.x * DEG, t.y * DEG, t.z * DEG)));
      arms.R.quaternion.multiply(_armDelta.setFromEuler(_armEuler.set(t.x * DEG, -t.y * DEG, -t.z * DEG)));
    }
    // dev-only bone pose lab: window.__pose = { "CC_Base_L_Forearm": [x°,y°,z°] }
    // applied additively post-mixer — for calibrating axes from the console.
    if (import.meta.env.DEV) {
      const posed = (window as unknown as { __pose?: Record<string, [number, number, number]> }).__pose;
      if (posed) for (const [name, e] of Object.entries(posed)) {
        const b = scene.getObjectByName(name) as Bone | undefined;
        if (b) b.quaternion.multiply(_armDelta.setFromEuler(_armEuler.set(e[0] * DEG, e[1] * DEG, e[2] * DEG)));
      }
    }
    const t = clock.elapsedTime;
    if (g.current) {
      if (clip) {
        // a built clip owns the pose — ease the procedural group motion to rest
        g.current.position.y += (0 - g.current.position.y) * 0.1;
        g.current.rotation.z += (0 - g.current.rotation.z) * 0.1;
        g.current.rotation.y += (0 - g.current.rotation.y) * 0.1;
      } else {
        g.current.position.y = Math.sin(t * 0.9) * 0.008;
        // attentive lean while listening: head tilts in, then eases back out
        const tilt = signals.listening ? 0.1 : 0;
        g.current.rotation.z += (tilt - g.current.rotation.z) * 0.08;
        g.current.rotation.y = Math.sin(t * 0.32) * 0.06
          + (signals.speaking ? Math.sin(t * 6) * 0.05 : 0)      // talking head-bob
          + (signals.listening ? Math.sin(t * 1.5) * 0.05 : 0);  // slow curious sway
      }
    }
    // 2) lip-sync AFTER the mixer so it fully overrides the clip's baked jaw +
    // mouth visemes each frame (bone quaternion + morphs assigned absolutely).
    // Fast attack / slower release keeps syllables crisp without flicker.
    const sm = mouthSmooth.current;
    const ease = (cur: number, target: number) =>
      cur + (target - cur) * (target > cur ? 0.65 : 0.35);
    sm.open = ease(sm.open, signals.speaking ? signals.mouth : 0);
    sm.wide = ease(sm.wide, signals.speaking ? signals.mouthWide : 0);
    sm.round = ease(sm.round, signals.speaking ? signals.mouthRound : 0);
    const v = sm.open;
    if (signals.speaking || v + sm.wide + sm.round > 0.002) {
      if (jaw) jaw.bone.quaternion.copy(jaw.rest).multiply(_jawDelta.setFromAxisAngle(_JAW_AXIS, v * JAW_MAX_RAD));
      for (const { infl, i } of mouthTargets.jawMorph) infl[i] = v * JAW_MORPH_PER;
      for (const { infl, i } of mouthTargets.open) infl[i] = v * V_OPEN_PER;
      for (const { infl, i } of mouthTargets.wide) infl[i] = sm.wide * WIDE_PER;
      for (const { infl, i } of mouthTargets.round) infl[i] = sm.round * ROUND_PER;
    }
    // else: mouth is closed and nothing is speaking — the clip owns jaw + morphs
  });

  return (
    <group ref={g}>
      <primitive object={scene} />
      {equipped.map((e) => e && <EquipItem key={e.file} avatar={scene} info={e} />)}
    </group>
  );
}

function Orb({ label }: { label?: string }) {
  return (
    <div style={{ display: "grid", placeItems: "center", gap: 14, textAlign: "center" }}>
      <div className="ember-orb" style={{ width: 24, height: 24 }} />
      {label && <div className="faint" style={{ fontSize: 13, maxWidth: 220 }}>{label}</div>}
      <style>{`@keyframes breathe{0%,100%{transform:scale(0.92);opacity:.75}50%{transform:scale(1.06);opacity:1}}`}</style>
    </div>
  );
}

class Boundary extends Component<{ children: ReactNode }, { err: boolean }> {
  state = { err: false };
  static getDerivedStateFromError() { return { err: true }; }
  render() {
    return this.state.err
      ? <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}><Orb label={t("Start the backend on :8100 to bring your avatar to life")} /></div>
      : this.props.children;
  }
}

/** One always-mounted avatar for the whole app — never re-uploads on nav, so
 *  it never blinks out, and only one WebGL context ever exists. Home/Chat show
 *  it (transparent regions); other screens cover it. */
// Idle fidgets: occasional one-shot gestures on top of the baseline idle clip,
// so waiting for the user to speak doesn't read as a frozen statue.
const IDLE_FIDGETS = ["look_around", "excited"];
const IDLE_FIDGET_MIN_MS = 6000;
const IDLE_FIDGET_MAX_MS = 14000;

export function PersistentAvatar() {
  const { file, params, equipped, clip, clipLoop, clipLib, look, playClip, stopClip, ensureClips } = useAvatar();
  const list = useMemo(() => Object.values(equipped), [equipped]);
  const { screen, back } = useNav();

  // Tap the avatar (not a drag — OrbitControls owns those) to close whichever
  // sheet screen is showing it through the transparent gap.
  const downPos = useRef<{ x: number; y: number } | null>(null);
  const onPointerDown = (e: PointerEvent) => { downPos.current = { x: e.clientX, y: e.clientY }; };
  const onClick = (e: MouseEvent) => {
    if (!SHEET_SCREENS.has(screen)) return;
    const start = downPos.current;
    const moved = start ? Math.hypot(e.clientX - start.x, e.clientY - start.y) : 0;
    if (moved < 8) back();
  };

  // Refs so the scheduler (mounted once, for the app's lifetime) always sees
  // the latest clip/lib/actions without resetting its own timer on every
  // avatarStore re-render (playClip/stopClip are fresh functions each render).
  const clipRef = useRef(clip); clipRef.current = clip;
  const clipLibRef = useRef(clipLib); clipLibRef.current = clipLib;
  const playClipRef = useRef(playClip); playClipRef.current = playClip;
  const stopClipRef = useRef(stopClip); stopClipRef.current = stopClip;
  // Base idle is generated in-app and starts instantly; the 28MB clip library
  // (fidgets/talk/gestures) prefetches in the background only once the avatar
  // itself is visible, so it never competes with the avatar GLB for bandwidth.
  const ensureClipsRef = useRef(ensureClips); ensureClipsRef.current = ensureClips;
  const clipsKicked = useRef(false);
  // Loading overlay: Suspense alone leaves a black gap (drei Html fallback +
  // the first-frame shader-compile jank happen outside it) — so a plain DOM
  // HoloScan covers the canvas from mount (and again on base swaps) until the
  // model's first rendered frame, then fades out.
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(false); }, [file]);
  const onModelReady = () => {
    setReady(true);
    if (clipsKicked.current) return;
    clipsKicked.current = true;
    playClipRef.current(BASE_IDLE_CLIP);
    ensureClipsRef.current();
  };
  useEffect(() => {
    let stopTimer: ReturnType<typeof setTimeout> | undefined;
    let nextTimer: ReturnType<typeof setTimeout>;
    const tick = () => {
      if (!signals.listening && !signals.speaking && clipRef.current === BASE_IDLE_CLIP) {
        const name = IDLE_FIDGETS[Math.floor(Math.random() * IDLE_FIDGETS.length)];
        playClipRef.current(name);
        const dur = clipLibRef.current?.clips.find((c) => c.name === name)?.duration ?? 2;
        stopTimer = setTimeout(() => stopClipRef.current(), dur * 1000);
      }
      nextTimer = setTimeout(tick, IDLE_FIDGET_MIN_MS + Math.random() * (IDLE_FIDGET_MAX_MS - IDLE_FIDGET_MIN_MS));
    };
    nextTimer = setTimeout(tick, IDLE_FIDGET_MIN_MS);
    return () => { clearTimeout(nextTimer); clearTimeout(stopTimer); };
  }, []);

  // Graphics quality (Settings): render scale + ground shadow. dpr updates
  // live; antialias is fixed at context creation so it stays on.
  const { quality } = useSettings();
  const DPR: Record<string, [number, number]> = { low: [0.75, 1], medium: [1, 1.5], high: [1, 2] };

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 0 }} onPointerDown={onPointerDown} onClick={onClick}>
      <Boundary>
        <Canvas
          dpr={DPR[quality] ?? DPR.high}
          camera={{ position: [0, 1.5, 1.75], fov: 30 }}   // portrait: face clearly visible
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
          style={{ width: "100%", height: "100%" }}
        >
          <ambientLight intensity={0.75} />
          <directionalLight position={[3, 6, 4]} intensity={2.2} />
          {/* warm ember rim + soft candlelight back fill — matches the UI world */}
          <directionalLight position={[-4, 3, -2]} intensity={1.0} color="#e8813c" />
          <directionalLight position={[0, 3, -5]} intensity={1.2} color="#ffd9b0" />
          <Suspense fallback={null}>
            <Model file={file} params={params} equipped={list} clip={clip} loop={clipLoop} lib={clipLib} look={look} onReady={onModelReady} />
            {quality !== "low" &&
              <ContactShadows position={[0, 0, 0]} opacity={0.45} scale={7} blur={2.6} far={3} resolution={256} frames={1} />}
          </Suspense>
          <OrbitControls
            target={[0, 1.45, 0]} enablePan={false}
            enableZoom minDistance={1.1} maxDistance={5}
            minPolarAngle={Math.PI / 3.2} maxPolarAngle={Math.PI / 1.9}
            rotateSpeed={0.5} enableDamping dampingFactor={0.08}
          />
        </Canvas>
        <AnimatePresence>
          {!ready && (
            <motion.div key="load" exit={{ opacity: 0 }}
              transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
              style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", pointerEvents: "none", zIndex: 1 }}>
              <SilhouetteTrace size={140} label={t("Waking your avatar…")} />
            </motion.div>
          )}
        </AnimatePresence>
      </Boundary>
    </div>
  );
}
