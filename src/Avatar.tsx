import { Suspense, useRef, Component, ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, ContactShadows, OrbitControls, Html } from "@react-three/drei";
import type { Group } from "three";
import { avatarUrl, AVATARS } from "./api";

// ponytail: procedural idle (breathe + sway) instead of clip playback — the
// backend's /avatars bases are static meshes; the 103-clip animated GLB isn't
// served yet. Wire useAnimations when the backend exposes an animated avatar.
function Model({ file }: { file: string }) {
  const { scene } = useGLTF(avatarUrl(file));
  const g = useRef<Group>(null!);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (!g.current) return;
    g.current.position.y = Math.sin(t * 0.9) * 0.008;     // breathing
    g.current.rotation.y = Math.sin(t * 0.32) * 0.07;      // gentle sway
  });
  return <primitive ref={g} object={scene} />;
}

/* soft glowing orb — used for both loading and backend-offline states */
function Orb({ label }: { label?: string }) {
  return (
    <div style={{ display: "grid", placeItems: "center", gap: 14, textAlign: "center" }}>
      <div style={{
        width: 120, height: 120, borderRadius: "50%", background: "var(--grad)",
        filter: "blur(2px)", boxShadow: "var(--glow)", animation: "breathe 2.6s var(--ease) infinite",
      }} />
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

export function AvatarStage({ file = AVATARS.meta_male }: { file?: string }) {
  return (
    <Boundary>
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 1.5, 2.0], fov: 30 }}
        gl={{ antialias: true, alpha: true }}
        style={{ width: "100%", height: "100%" }}
      >
        <ambientLight intensity={0.7} />
        <directionalLight position={[3, 6, 4]} intensity={2.2} />
        <directionalLight position={[-4, 3, -2]} intensity={1.1} color="#a25bff" />
        <directionalLight position={[0, 3, -5]} intensity={1.4} color="#6d6bff" />
        <Suspense fallback={<Html center><Orb label="Waking your avatar…" /></Html>}>
          <Model file={file} />
          <ContactShadows position={[0, 0.01, 0]} opacity={0.5} scale={6} blur={2.6} far={3} />
        </Suspense>
        <OrbitControls
          target={[0, 1.5, 0]} enablePan={false} enableZoom={false}
          minPolarAngle={Math.PI / 2.6} maxPolarAngle={Math.PI / 1.9}
          rotateSpeed={0.5} enableDamping dampingFactor={0.08}
        />
      </Canvas>
    </Boundary>
  );
}

// preload the default base so Home feels instant after onboarding
useGLTF.preload(avatarUrl(AVATARS.meta_male));
