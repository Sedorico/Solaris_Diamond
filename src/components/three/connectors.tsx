"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import * as STDLIB from "three-stdlib";

/**
 * Interactive connector field — hundreds of instanced "jack" objects (three
 * crossed rounded arms) drifting in 3D, with cursor-driven camera parallax and
 * a soft repulsion around the pointer. Brand palette: matte white → charcoal →
 * black with rare orange accents. Instanced + no shadow maps for a steady 60fps.
 */

// three-stdlib exposes one of these depending on version
const _std = STDLIB as unknown as {
  mergeGeometries?: (geos: THREE.BufferGeometry[], useGroups?: boolean) => THREE.BufferGeometry;
  mergeBufferGeometries?: (geos: THREE.BufferGeometry[], useGroups?: boolean) => THREE.BufferGeometry;
};
const mergeGeometries = (_std.mergeGeometries ?? _std.mergeBufferGeometries)!;

const PALETTE = ["#f5f5f3", "#dcdcd9", "#a6a6a4", "#5c5c5e", "#2b2b2e", "#161618"];
const ACCENT = "#e0691f";

function useJackGeometry() {
  return useMemo(() => {
    const make = () => new THREE.CapsuleGeometry(0.24, 0.85, 10, 22);
    const gx = make();
    gx.rotateZ(Math.PI / 2);
    const gy = make();
    const gz = make();
    gz.rotateX(Math.PI / 2);
    const merged = mergeGeometries([gx, gy, gz], false);
    merged.computeVertexNormals();
    return merged;
  }, []);
}

function Field({ count }: { count: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const accentRef = useRef<THREE.InstancedMesh>(null);
  const geometry = useJackGeometry();
  const { pointer } = useThree();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Pre-split: which instances are accents (the rare orange "glowing" ones).
  const accentMask = useMemo(
    () => Array.from({ length: count }, () => Math.random() < 0.08),
    [count],
  );
  const accentCount = useMemo(() => accentMask.filter(Boolean).length, [accentMask]);

  const data = useMemo(() => {
    return Array.from({ length: count }, () => {
      const r = 6 + Math.random() * 9;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      return {
        base: new THREE.Vector3(
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.sin(phi) * Math.sin(theta) * 0.6,
          (Math.random() - 0.5) * 14 - 1,
        ),
        rot: new THREE.Vector3(Math.random() * 6, Math.random() * 6, Math.random() * 6),
        // Decoupled per-axis rotation — feels less mechanical than uniform speed.
        rotSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 0.28,
          (Math.random() - 0.5) * 0.42,
          (Math.random() - 0.5) * 0.22,
        ),
        // Three independent phases for x/y/z float — no more "everyone bobs in sync".
        phaseX: Math.random() * Math.PI * 2,
        phaseY: Math.random() * Math.PI * 2,
        phaseZ: Math.random() * Math.PI * 2,
        // Two frequencies layered for organic, non-repeating drift.
        freqLow: 0.18 + Math.random() * 0.32,
        freqHigh: 0.7 + Math.random() * 0.6,
        // Per-axis float amplitude — some drift mostly vertically, some sideways.
        ampX: 0.35 + Math.random() * 0.65,
        ampY: 0.6 + Math.random() * 1.0,
        ampZ: 0.45 + Math.random() * 0.75,
        scale: 0.75 + Math.random() * 1.65,
        // Per-instance "weight" — heavier ones drift slower & rotate less, lighter ones flutter.
        weight: 0.6 + Math.random() * 0.8,
      };
    });
  }, [count]);

  // Per-instance colours.
  useEffect(() => {
    const neutral = ref.current;
    const accent = accentRef.current;
    if (!neutral || !accent) return;
    const c = new THREE.Color();

    let ni = 0;
    let ai = 0;
    for (let i = 0; i < count; i++) {
      if (accentMask[i]) {
        accent.setColorAt(ai, c.set(ACCENT));
        ai++;
      } else {
        const hex = PALETTE[Math.floor(Math.random() * PALETTE.length)];
        neutral.setColorAt(ni, c.set(hex));
        ni++;
      }
    }
    if (neutral.instanceColor) neutral.instanceColor.needsUpdate = true;
    if (accent.instanceColor) accent.instanceColor.needsUpdate = true;
  }, [count, accentMask]);

  useFrame((state) => {
    const neutral = ref.current;
    const accent = accentRef.current;
    if (!neutral || !accent) return;

    const t = state.clock.elapsedTime;
    const mx = pointer.x;
    const my = pointer.y;

    let ni = 0;
    let ai = 0;

    for (let i = 0; i < count; i++) {
      const d = data[i];
      const w = d.weight;

      // Layered low + high frequency drift = organic, non-repeating motion.
      const fx =
        d.base.x +
        (Math.sin(t * d.freqLow + d.phaseX) * d.ampX +
          Math.sin(t * d.freqHigh + d.phaseX * 1.7) * 0.18) /
          w;
      const fy =
        d.base.y +
        (Math.sin(t * d.freqLow * 1.1 + d.phaseY) * d.ampY +
          Math.cos(t * d.freqHigh * 0.9 + d.phaseY * 1.3) * 0.22) /
          w;
      const fz =
        d.base.z +
        (Math.cos(t * d.freqLow * 0.85 + d.phaseZ) * d.ampZ +
          Math.sin(t * d.freqHigh * 1.2 + d.phaseZ * 0.8) * 0.16) /
          w;

      // Pointer repulsion — projected into world space.
      const px = mx * 10;
      const py = my * 5.5;
      const dx = fx - px;
      const dy = fy - py;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const force = Math.min(3.0, 11 / (dist * dist + 1.2));

      dummy.position.set(
        fx + (dx / (dist + 0.001)) * force + mx * 1.4,
        fy + (dy / (dist + 0.001)) * force + my * 0.9,
        fz,
      );
      dummy.rotation.set(
        d.rot.x + (t * d.rotSpeed.x) / w,
        d.rot.y + (t * d.rotSpeed.y) / w,
        d.rot.z + (t * d.rotSpeed.z) / w,
      );
      dummy.scale.setScalar(d.scale);
      dummy.updateMatrix();

      if (accentMask[i]) {
        accent.setMatrixAt(ai, dummy.matrix);
        ai++;
      } else {
        neutral.setMatrixAt(ni, dummy.matrix);
        ni++;
      }
    }
    neutral.instanceMatrix.needsUpdate = true;
    accent.instanceMatrix.needsUpdate = true;

    // Idle camera drift + cursor parallax — "breathing" feel even with no mouse.
    const driftX = Math.sin(t * 0.12) * 0.6;
    const driftY = Math.cos(t * 0.09) * 0.4;
    state.camera.position.x += (mx * 2.6 + driftX - state.camera.position.x) * 0.04;
    state.camera.position.y += (my * 1.7 + driftY - state.camera.position.y) * 0.04;
    state.camera.lookAt(0, 0, -2);
  });

  return (
    <>
      <instancedMesh
        ref={ref}
        args={[geometry, undefined, count - accentCount]}
        frustumCulled={false}
        castShadow={false}
        receiveShadow={false}
      >
        <meshPhysicalMaterial
          roughness={0.32}
          metalness={0.22}
          clearcoat={0.65}
          clearcoatRoughness={0.18}
          envMapIntensity={0.55}
          sheen={0.15}
          sheenRoughness={0.6}
        />
      </instancedMesh>
      <instancedMesh
        ref={accentRef}
        args={[geometry, undefined, accentCount]}
        frustumCulled={false}
      >
        <meshStandardMaterial
          color={ACCENT}
          emissive={ACCENT}
          emissiveIntensity={1.4}
          roughness={0.35}
          metalness={0.3}
          toneMapped={false}
        />
      </instancedMesh>
    </>
  );
}

export function ConnectorsScene({ count = 150 }: { count?: number }) {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0, 12], fov: 38 }}
      gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping }}
      style={{ width: "100%", height: "100%" }}
    >
      <ambientLight intensity={0.45} />
      {/* Key light — warm top-right */}
      <directionalLight position={[7, 9, 6]} intensity={1.55} color="#fff1de" />
      {/* Fill — cool bounce from below-left */}
      <directionalLight position={[-8, -2, 2]} intensity={0.5} color="#ffb27a" />
      {/* Rim — picks out the silhouettes from behind */}
      <directionalLight position={[0, 3, -10]} intensity={0.6} color="#ffd9b5" />
      {/* Hero pop — strong warm point near the camera */}
      <pointLight position={[0, 0, 8]} intensity={22} distance={28} decay={2} color="#fff3e8" />
      {/* Accent kick — subtle orange ambient near the action */}
      <pointLight position={[4, -1, 4]} intensity={6} distance={14} decay={2} color="#e0691f" />
      <Field count={count} />
      {/* Tighter fog falloff — depth atmosphere, foreground crisp, background fades to bg */}
      <fog attach="fog" args={["#0c0b0a", 11, 26]} />
    </Canvas>
  );
}

export default ConnectorsScene;
