// Animation clip loading + retargeting, kept OUTSIDE the Canvas. The clips ship
// inside one big "animated avatar" GLB; we load it with a plain GLTFLoader
// (never useGLTF inside the Canvas — a mid-mount Suspense on an 87MB file kills
// the r3f render loop), keep only the AnimationClips, and dispose the meshes.
import { AnimationClip, NumberKeyframeTrack } from "three";
import type { Mesh, Object3D } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { clipsUrl } from "./api";

export type LoadedClips = { clips: AnimationClip[]; srcNames: Record<string, string[]> };

// Always-available baseline body pose — played whenever nothing else (talk,
// listen, fidget) claims the avatar, so "idle" is never the raw T-pose bind.
export const BASE_IDLE_CLIP = "idle_01";

// Clips authored as facial/expression-only (library_spec.json owner:"facial").
// The export still bakes a track for every OTHER bone too, but those were
// never posed by the animator — they hold a shared non-idle rest (reads as a
// T-pose: arms out). Swap those bones for the idle clip's natural pose in
// applyIdleBodyPose below; keep the bones + morphs these clips actually drive.
export const FACIAL_ONLY_CLIPS = new Set([
  "blink", "double_blink", "slow_blink", "eye_left", "eye_right", "eye_up", "eye_down",
  "focus", "lose_focus", "eye_dart", "neutral_alive", "happy", "big_smile", "soft_smile",
  "laugh", "giggle", "surprised", "confused", "thinking", "curious", "excited", "sad",
  "angry", "disappointed", "embarrassed", "proud", "listening_relaxed", "listening_interested",
  "listening_confused", "listening_thinking", "listening_happy", "listening_serious",
  "micro_face_layer",
  // talking clips (owner:"lipsync") are face/jaw-only too — same treatment the
  // sandbox gives them (idle body underneath, face clip layered on top)
  "talking_happy", "talking_excited", "talk_excited",
  // head-category clips only pose the head/neck — their baked body tracks are
  // the same non-idle rest (arms up) that flashed in the idle bug
  "nod_small", "nod_big", "shake_no", "tilt_left", "tilt_right", "head_micro",
]);

// Bones a facial-only clip actually animates (head/neck/face/jaw/eyes/mouth) —
// everything else gets replaced with the idle clip's track.
const KEEP_OWN_POSE = /^CC_Base_(Head|Neck|FacialBone|JawRoot|UpperJaw|Teeth|Tongue|L_Eye|R_Eye)/;

/** Replace a facial-only clip's baked (non-idle-rest) body tracks with the
 *  reference idle clip's tracks, so arms/hands/spine/legs hold a natural idle
 *  pose instead of the shared rest the animators never touched. */
export function applyIdleBodyPose(clip: AnimationClip, idleClip: AnimationClip): AnimationClip {
  const idleByName = new Map(idleClip.tracks.map((t) => [t.name, t]));
  const tracks = clip.tracks.map((t) => {
    if (t.name.endsWith(".morphTargetInfluences") || KEEP_OWN_POSE.test(t.name)) return t;
    return idleByName.get(t.name) ?? t;
  });
  return new AnimationClip(clip.name, clip.duration, tracks);
}

// The export bakes constant position/scale tracks on every bone; applied as-is
// they force the skeleton onto the source rest (distorts the mesh). Strip scale
// tracks (none animate) and constant position tracks; keep rotations, real root
// motion, and morphs.
const EPS = 1e-4;
function cleanClips(animations: AnimationClip[]): AnimationClip[] {
  return animations.map((clip) => {
    const tracks = clip.tracks.filter((t) => {
      if (t.name.endsWith(".scale")) return false;
      if (t.name.endsWith(".position")) {
        const v = t.values;
        for (let i = 3; i < v.length; i++) if (Math.abs(v[i] - v[i % 3]) > EPS) return true;
        return false;
      }
      return true;
    });
    return new AnimationClip(clip.name, clip.duration, tracks);
  });
}

/** Load the clip library once. Extracts + cleans the AnimationClips and the
 *  per-node shape-key order (for name-based morph retargeting), then frees the
 *  GLB's mesh/texture memory. */
export async function loadClipLibrary(): Promise<LoadedClips> {
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);   // .mobile.glb is meshopt-compressed
  const gltf = await loader.loadAsync(clipsUrl());
  const clips = cleanClips(gltf.animations);
  const srcNames: Record<string, string[]> = {};
  gltf.scene.traverse((o) => {
    const md = (o as Mesh).morphTargetDictionary;
    if (md) { const arr: string[] = []; for (const [n, i] of Object.entries(md)) arr[i] = n; srcNames[o.name] = arr; }
  });
  gltf.scene.traverse((o) => {           // we only need the clips — drop the meshes
    const m = o as Mesh;
    if (m.geometry) m.geometry.dispose();
    const mat = m.material;
    if (mat) (Array.isArray(mat) ? mat : [mat]).forEach((x) => x.dispose());
  });
  return { clips, srcNames };
}

/** Rebuild a clip's morph tracks against the CURRENT avatar's meshes, remapping
 *  weights by shape-key NAME (glTF morph tracks are index-based, so a
 *  male-authored track applied by index to a female mesh drives the wrong keys —
 *  e.g. head_size instead of eye-look). Bone tracks pass through untouched.
 *  Non-animated indices keep the mesh's current value so identity morphs survive. */
export function retargetMorphs(
  clip: AnimationClip, avatar: Object3D, srcNames: Record<string, string[]>,
): AnimationClip {
  const byName: Record<string, Mesh> = {};
  let bodyMesh: Mesh | null = null;
  avatar.traverse((o) => {
    const m = o as Mesh;
    if (m.morphTargetDictionary) { byName[o.name] = m; if (/_Body$/.test(o.name)) bodyMesh = m; }
  });
  const tracks = clip.tracks.map((t) => {
    if (!t.name.endsWith(".morphTargetInfluences")) return t;
    const node = t.name.slice(0, -".morphTargetInfluences".length);
    const names = srcNames[node];
    let mesh = byName[node];
    if (!mesh && /_Body$/.test(node) && bodyMesh) mesh = bodyMesh;
    if (!names || !mesh) return null;                       // node absent → drop
    const dict = mesh.morphTargetDictionary!;
    const base = mesh.morphTargetInfluences!;
    const tgtN = base.length;
    const frames = t.times.length;
    const vals = new Float32Array(frames * tgtN);
    for (let f = 0; f < frames; f++)
      for (let ti = 0; ti < tgtN; ti++) vals[f * tgtN + ti] = base[ti];
    for (let si = 0; si < names.length; si++) {
      const ti = dict[names[si]];
      if (ti === undefined) continue;                       // key not on target
      for (let f = 0; f < frames; f++) vals[f * tgtN + ti] = t.values[f * names.length + si];
    }
    return new NumberKeyframeTrack(`${mesh.name}.morphTargetInfluences`, t.times as unknown as number[], vals as unknown as number[]);
  }).filter(Boolean) as NumberKeyframeTrack[];
  return new AnimationClip(clip.name, clip.duration, tracks);
}
