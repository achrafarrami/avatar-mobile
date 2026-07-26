import { Suspense, useRef, useEffect, useMemo, Component, ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, ContactShadows, OrbitControls, Html } from "@react-three/drei";
import { Group, Vector3, Quaternion, Matrix4, Skeleton } from "three";
import type { Mesh, Object3D, Bone, SkinnedMesh } from "three";
import { clone as skeletonClone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { avatarUrl, wardrobeUrl } from "./api";
import { useAvatar, Equip } from "./avatarStore";
import { signals } from "./avatarSignals";

type Params = Record<string, number> | null;

// Attach a wardrobe item to the avatar — ported from the web WardrobeManager.
//  - bone: rigid item parented to a bone (hair, glasses, hats), baking the
//    bone's inverse world transform so it sits at the bone in world space.
//  - skinned: re-bind the item's skinned meshes to the AVATAR's bones by name
//    so they deform with it (beard, clothes).
function EquipItem({ avatar, info }: { avatar: Object3D; info: Equip }) {
  const { scene } = useGLTF(wardrobeUrl(info.file));
  useEffect(() => {
    avatar.updateMatrixWorld(true);
    const src = skeletonClone(scene) as Object3D;   // clone (skeleton-safe) so the cache isn't mutated
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
    return () => { holder.parent?.remove(holder); };
  }, [scene, avatar, info.attachType, info.attachTo, info.file, info.offset, info.scale]);
  return null;
}

function Model({ file, params, equipped }: { file: string; params: Params; equipped: (Equip | null)[] }) {
  const { scene } = useGLTF(avatarUrl(file));
  const g = useRef<Group>(null!);

  const meshes = useMemo(() => {
    const list: Mesh[] = [];
    scene.traverse((o) => { if ((o as Mesh).isMesh && (o as Mesh).morphTargetDictionary) list.push(o as Mesh); });
    return list;
  }, [scene]);
  const mouth = useMemo(() => {
    for (const m of meshes) {
      const key = Object.keys(m.morphTargetDictionary!).find((k) => /jaw.?open|mouth.?open|v_?open|^open/i.test(k));
      if (key) return { m, i: m.morphTargetDictionary![key] };
    }
    return null;
  }, [meshes]);

  useEffect(() => {
    for (const m of meshes) {
      const dict = m.morphTargetDictionary!, infl = m.morphTargetInfluences!;
      for (const [k, idx] of Object.entries(dict)) if (params?.[k] === undefined) infl[idx] = 0;
      if (params) for (const [k, v] of Object.entries(params)) if (dict[k] !== undefined) infl[dict[k]] = v;
    }
  }, [meshes, params]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (g.current) {
      g.current.position.y = Math.sin(t * 0.9) * 0.008;
      g.current.rotation.y = Math.sin(t * 0.32) * 0.06 + (signals.speaking ? Math.sin(t * 6) * 0.012 : 0);
    }
    if (mouth) {
      const target = signals.speaking ? signals.mouth : 0;
      const infl = mouth.m.morphTargetInfluences!;
      infl[mouth.i] += (target - infl[mouth.i]) * 0.5;   // smoothed lip-sync
    }
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
      <div style={{ width: 120, height: 120, borderRadius: "50%", background: "var(--grad)", filter: "blur(2px)", boxShadow: "var(--glow)", animation: "breathe 2.6s var(--ease) infinite" }} />
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
      ? <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}><Orb label="Start the backend on :8100 to bring your avatar to life" /></div>
      : this.props.children;
  }
}

/** One always-mounted avatar for the whole app — never re-uploads on nav, so
 *  it never blinks out, and only one WebGL context ever exists. Home/Chat show
 *  it (transparent regions); other screens cover it. */
export function PersistentAvatar() {
  const { file, params, equipped } = useAvatar();
  const list = useMemo(() => Object.values(equipped), [equipped]);
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
      <Boundary>
        <Canvas
          dpr={[1, 1.5]}
          camera={{ position: [0, 1.5, 1.75], fov: 30 }}   // portrait: face clearly visible
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
          style={{ width: "100%", height: "100%" }}
        >
          <ambientLight intensity={0.75} />
          <directionalLight position={[3, 6, 4]} intensity={2.2} />
          <directionalLight position={[-4, 3, -2]} intensity={1.1} color="#a25bff" />
          <directionalLight position={[0, 3, -5]} intensity={1.4} color="#6d6bff" />
          <Suspense fallback={<Html center><Orb label="Waking your avatar…" /></Html>}>
            <Model file={file} params={params} equipped={list} />
            <ContactShadows position={[0, 0, 0]} opacity={0.45} scale={7} blur={2.6} far={3} resolution={256} frames={1} />
          </Suspense>
          <OrbitControls
            target={[0, 1.45, 0]} enablePan={false}
            enableZoom minDistance={1.1} maxDistance={5}
            minPolarAngle={Math.PI / 3.2} maxPolarAngle={Math.PI / 1.9}
            rotateSpeed={0.5} enableDamping dampingFactor={0.08}
          />
        </Canvas>
      </Boundary>
    </div>
  );
}
