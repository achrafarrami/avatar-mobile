import { Suspense, useRef, useEffect, useMemo, Component, ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, ContactShadows, OrbitControls, Html } from "@react-three/drei";
import type { Group, Mesh } from "three";
import { avatarUrl, AVATARS } from "./api";
import { signals } from "./avatarSignals";

type Params = Record<string, number> | null;

function Model({ file, params }: { file: string; params: Params }) {
  const { scene } = useGLTF(avatarUrl(file));
  const g = useRef<Group>(null!);

  // collect skinned meshes + a "mouth open" morph index for cheap lip-sync
  const meshes = useMemo(() => {
    const list: Mesh[] = [];
    scene.traverse((o) => { if ((o as Mesh).isMesh && (o as Mesh).morphTargetDictionary) list.push(o as Mesh); });
    return list;
  }, [scene]);
  const mouth = useMemo(() => {
    for (const m of meshes) {
      const dict = m.morphTargetDictionary!;
      const key = Object.keys(dict).find((k) => /jaw.?open|mouth.?open|v_?open|^open/i.test(k));
      if (key) return { m, i: dict[key] };
    }
    return null;
  }, [meshes]);

  // apply identity morphs ("looks like me") — reset first, then set provided keys
  useEffect(() => {
    for (const m of meshes) {
      const dict = m.morphTargetDictionary!;
      const infl = m.morphTargetInfluences!;
      for (const [k, idx] of Object.entries(dict)) if (params?.[k] === undefined) infl[idx] = 0;
      if (params) for (const [k, v] of Object.entries(params)) if (dict[k] !== undefined) infl[dict[k]] = v;
    }
  }, [meshes, params]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (g.current) {
      g.current.position.y = Math.sin(t * 0.9) * 0.008;               // breathe
      g.current.rotation.y = Math.sin(t * 0.32) * 0.06 + (signals.speaking ? Math.sin(t * 6) * 0.01 : 0);
    }
    if (mouth) {
      // lip-sync: chase the live waveform openness (signals.mouth), smoothed
      const target = signals.speaking ? signals.mouth * 0.85 : 0;
      const infl = mouth.m.morphTargetInfluences!;
      infl[mouth.i] += (target - infl[mouth.i]) * 0.45;
    }
  });

  return <primitive ref={g} object={scene} />;
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
      ? <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
          <Orb label="Start the backend on :8100 to bring your avatar to life" />
        </div>
      : this.props.children;
  }
}

export function AvatarStage({ file = AVATARS.meta_male, params = null }: { file?: string; params?: Params }) {
  return (
    <Boundary>
      <Canvas
        dpr={[1, 1.5]}                                   // cap for perf on phones
        camera={{ position: [0, 0.95, 3.3], fov: 30 }}   // full body in frame
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        style={{ width: "100%", height: "100%" }}
      >
        <ambientLight intensity={0.7} />
        <directionalLight position={[3, 6, 4]} intensity={2.2} />
        <directionalLight position={[-4, 3, -2]} intensity={1.1} color="#a25bff" />
        <directionalLight position={[0, 3, -5]} intensity={1.4} color="#6d6bff" />
        <Suspense fallback={<Html center><Orb label="Waking your avatar…" /></Html>}>
          <Model file={file} params={params} />
          {/* frames={1}: bake the contact shadow once — big perf win vs re-render */}
          <ContactShadows position={[0, 0, 0]} opacity={0.45} scale={7} blur={2.6} far={3} resolution={256} frames={1} />
        </Suspense>
        <OrbitControls
          target={[0, 0.95, 0]} enablePan={false}
          enableZoom minDistance={1.4} maxDistance={5}
          minPolarAngle={Math.PI / 3} maxPolarAngle={Math.PI / 1.9}
          rotateSpeed={0.5} enableDamping dampingFactor={0.08}
        />
      </Canvas>
    </Boundary>
  );
}

useGLTF.preload(avatarUrl(AVATARS.meta_male));
