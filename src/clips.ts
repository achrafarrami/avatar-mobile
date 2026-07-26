// Animation clip loading + retargeting, kept OUTSIDE the Canvas. The clips ship
// inside one big "animated avatar" GLB; we load it with a plain GLTFLoader
// (never useGLTF inside the Canvas — a mid-mount Suspense on an 87MB file kills
// the r3f render loop), keep only the AnimationClips, and dispose the meshes.
import { AnimationClip, NumberKeyframeTrack } from "three";
import type { Mesh, Object3D } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clipsUrl } from "./api";

export type LoadedClips = { clips: AnimationClip[]; srcNames: Record<string, string[]> };

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
  const gltf = await new GLTFLoader().loadAsync(clipsUrl());
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
