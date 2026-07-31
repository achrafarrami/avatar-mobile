// Generated premium idle: a 10s seamless AnimationClip built at runtime from
// the extracted idle_01 anchor pose (idlePose.ts) + layered organic motion.
// Replaces the library's idle_01 as the base idle — plays instantly (no 28MB
// clip download needed) and fixes: straight/stiff arms (elbow bend deepened),
// hands glued to thighs (slight forward hang), rest-pose flashes, and the
// procedural feel (breath/sway/settle at different integer-cycle frequencies,
// so the loop is mathematically seamless with no obvious repetition).
//
// Axis semantics (from the backend anim framework, keying.py + gestures.py
// _HANG): Upperarm z=lower/raise (L-/R+ down), x=forward hang; Forearm x=elbow
// bend; Hand x=wrist droop; Clavicle z raise (L+/R-); head/neck/spine family
// +x pitch-down, +y yaw-left, +z roll; R side mirrors y,z sign vs L.
import {
  AnimationClip, NumberKeyframeTrack, QuaternionKeyframeTrack,
  VectorKeyframeTrack, Quaternion, Euler, Object3D, Mesh,
} from "three";
import { IDLE_POSE, IDLE_HIP_POS } from "./idlePose";

export const GENERATED_IDLE = "generated_idle";

const DUR = 10;           // seconds; all wave frequencies are integer cycles/DUR
const FPS = 30;
const DEG = Math.PI / 180;

// organic layers — sin(2π·k·t/DUR + φ) always loops seamlessly for integer k
const w = (k: number, phase = 0) => (t: number) => Math.sin((2 * Math.PI * k * t) / DUR + phase);
const breath = w(3);            // ~3.3s breathing cycle
const breathLag = w(3, -0.6);   // follow-through (shoulders/arms trail the chest)
const sway = w(1);              // one slow weight shift per loop
const settle = w(2, 1.1);       // secondary settle at a different beat

type MotionFn = (t: number) => [number, number, number];   // euler °, bone-local
// static° = posture delta added to the anchor pose; fn = live motion on top
const MOTION: Record<string, { static?: [number, number, number]; fn?: MotionFn }> = {
  // -- trunk: breathing from chest/abdomen + S-curve weight shift
  CC_Base_Hip:     { fn: (t) => [0.15 * settle(t), 0, 0.55 * sway(t)] },
  CC_Base_Waist:   { fn: (t) => [0.25 * breath(t), 0, -0.2 * sway(t)] },
  CC_Base_Spine01: { fn: (t) => [0.35 * breath(t), 0, -0.25 * sway(t)] },
  CC_Base_Spine02: { fn: (t) => [0.7 * breath(t), 0, -0.15 * sway(t)] },
  // -- shoulders ride the breath
  CC_Base_L_Clavicle: { fn: (t) => [0, 0, 0.6 * breathLag(t)] },
  CC_Base_R_Clavicle: { fn: (t) => [0, 0, -0.6 * breathLag(t)] },
  // -- arms: hang slightly forward, elbows visibly bent, tiny follow-through
  CC_Base_L_Upperarm: { static: [2.5, 0, 0], fn: (t) => [0.3 * settle(t), 0, 0.5 * breathLag(t) + 0.3 * sway(t)] },
  CC_Base_R_Upperarm: { static: [2.5, 0, 0], fn: (t) => [0.3 * settle(t), 0, -0.5 * breathLag(t) - 0.3 * sway(t)] },
  CC_Base_L_Forearm:  { static: [6, 0, 0], fn: (t) => [0.4 * breathLag(t), 0, 0] },
  CC_Base_R_Forearm:  { static: [6, 0, 0], fn: (t) => [0.4 * breathLag(t), 0, 0] },
  CC_Base_L_Hand:     { static: [1.5, 0, 0], fn: (t) => [0.3 * w(3, -1.0)(t), 0, 0] },
  CC_Base_R_Hand:     { static: [1.5, 0, 0], fn: (t) => [0.3 * w(3, -1.0)(t), 0, 0] },
  // -- neck relaxed, head mostly stable with micro balancing
  CC_Base_NeckTwist01: { fn: (t) => [0.25 * breath(t), 0, 0] },
  CC_Base_NeckTwist02: { fn: (t) => [0.15 * breath(t), 0, 0] },
  CC_Base_Head: { fn: (t) => [-0.2 * breath(t) + 0.15 * settle(t), 0.5 * sway(t), -0.2 * sway(t)] },
};

// extra outward arm clearance on the female base (wider hips; the anchor pose
// was authored on the male rig) — same 6° that was verified visually
const FEMALE_ARM_Z = 6;

const _e = new Euler();
const _q = new Quaternion();
const _base = new Quaternion();

/** Build the idle clip against the CURRENT avatar scene. `params` should
 *  already be applied to the meshes' morph influences (blink tracks copy them
 *  as the base so identity morphs survive). */
export function buildIdleClip(scene: Object3D, female: boolean): AnimationClip {
  const N = DUR * FPS;
  const tracks: (QuaternionKeyframeTrack | NumberKeyframeTrack | VectorKeyframeTrack)[] = [];

  for (const [bone, quat] of Object.entries(IDLE_POSE)) {
    if (!scene.getObjectByName(bone)) continue;
    const spec = MOTION[bone];
    _base.fromArray(quat);
    const st = spec?.static ?? [0, 0, 0];
    const sx = st[0], sy = st[1],
      sz = st[2] + (female && /_(L)_Upperarm/.test(bone) ? FEMALE_ARM_Z
        : female && /_(R)_Upperarm/.test(bone) ? -FEMALE_ARM_Z : 0);

    if (!spec?.fn) {           // constant pose bone (legs, fingers, twists…)
      _q.copy(_base);
      if (sx || sy || sz) _q.multiply(new Quaternion().setFromEuler(_e.set(sx * DEG, sy * DEG, sz * DEG)));
      tracks.push(new QuaternionKeyframeTrack(`${bone}.quaternion`,
        [0, DUR], [..._q.toArray(), ..._q.toArray()]));
      continue;
    }
    const times = new Float32Array(N + 1);
    const values = new Float32Array((N + 1) * 4);
    for (let i = 0; i <= N; i++) {
      const t = (i / N) * DUR;
      times[i] = t;
      const m = i === N ? spec.fn(0) : spec.fn(t);   // exact loop closure
      _q.copy(_base).multiply(new Quaternion().setFromEuler(
        _e.set((sx + m[0]) * DEG, (sy + m[1]) * DEG, (sz + m[2]) * DEG)));
      _q.toArray(values, i * 4);
    }
    tracks.push(new QuaternionKeyframeTrack(`${bone}.quaternion`,
      times as unknown as number[], values as unknown as number[]));
  }

  // pelvis position anchor (keeps the authored stance height)
  if (IDLE_HIP_POS && scene.getObjectByName("CC_Base_Hip"))
    tracks.push(new VectorKeyframeTrack("CC_Base_Hip.position",
      [0, DUR], [...IDLE_HIP_POS, ...IDLE_HIP_POS]));

  // occasional natural blinks (two, unevenly spaced) on every mesh that has
  // the blink keys — base influences copied so identity morphs are preserved
  scene.traverse((o) => {
    const mesh = o as Mesh;
    const dict = mesh.morphTargetDictionary;
    const infl = mesh.morphTargetInfluences;
    if (!dict || !infl) return;
    const bl = dict["Eye_Blink_L"], br = dict["Eye_Blink_R"];
    if (bl === undefined || br === undefined) return;
    const times: number[] = [0];
    const frames: number[][] = [[...infl]];
    for (const tb of [3.2, 7.7]) {
      for (const [dt, v] of [[-0.08, 0], [0.05, 1], [0.13, 1], [0.3, 0]] as const) {
        const f = [...infl];
        f[bl] = v; f[br] = v;
        times.push(tb + dt); frames.push(f);
      }
    }
    times.push(DUR); frames.push([...infl]);
    tracks.push(new NumberKeyframeTrack(`${mesh.name}.morphTargetInfluences`,
      times, frames.flat()));
  });

  return new AnimationClip(GENERATED_IDLE, DUR, tracks);
}
