"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import * as THREE from "three";

/**
 * Minimalist abstract line form — the hero centerpiece.
 *
 * A single wireframe knot cradled by thin orbiting rings and a faint drift of
 * particles. Pure monochrome (colour follows the theme), cursor-reactive, and
 * deliberately lightweight so the page stays fast.
 */
function Form({ color }: { color: string }) {
  const group = useRef<THREE.Group>(null);
  const ringA = useRef<THREE.Mesh>(null);
  const ringB = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (group.current) {
      group.current.rotation.y += delta * 0.18;
      // Cursor-reactive parallax tilt
      const tx = state.pointer.y * 0.35;
      const tz = -state.pointer.x * 0.3;
      group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, tx, 0.04);
      group.current.rotation.z = THREE.MathUtils.lerp(group.current.rotation.z, tz, 0.04);
    }
    if (ringA.current) ringA.current.rotation.z += delta * 0.25;
    if (ringB.current) ringB.current.rotation.x -= delta * 0.2;
  });

  return (
    <Float speed={1.2} rotationIntensity={0.25} floatIntensity={0.9}>
      <group ref={group}>
        {/* Central wireframe knot */}
        <mesh scale={1.18}>
          <torusKnotGeometry args={[1.05, 0.3, 140, 10, 2, 3]} />
          <meshBasicMaterial color={color} wireframe transparent opacity={0.5} />
        </mesh>

        {/* Solid thin core for subtle depth */}
        <mesh scale={1.18}>
          <torusKnotGeometry args={[1.05, 0.018, 140, 8, 2, 3]} />
          <meshBasicMaterial color={color} transparent opacity={0.85} />
        </mesh>

        {/* Thin orbiting rings */}
        <mesh ref={ringA} rotation={[Math.PI / 2.4, 0, 0]}>
          <torusGeometry args={[2.05, 0.004, 16, 120]} />
          <meshBasicMaterial color={color} transparent opacity={0.45} />
        </mesh>
        <mesh ref={ringB} rotation={[0, Math.PI / 3, Math.PI / 5]}>
          <torusGeometry args={[2.35, 0.004, 16, 120]} />
          <meshBasicMaterial color={color} transparent opacity={0.3} />
        </mesh>
      </group>
    </Float>
  );
}

function Particles({ color }: { color: string }) {
  const ref = useRef<THREE.Points>(null);
  const count = 60;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = 2.6 + Math.random() * 1.8;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.6;
    positions[i * 3 + 2] = r * Math.cos(phi);
  }

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.04;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial color={color} size={0.028} transparent opacity={0.5} sizeAttenuation />
    </points>
  );
}

export function DiamondScene({ color = "#15151a" }: { color?: string }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 6.2], fov: 38 }}
      dpr={[1, 1.8]}
      gl={{ antialias: true, alpha: true }}
      style={{ width: "100%", height: "100%" }}
    >
      <Form color={color} />
      <Particles color={color} />
    </Canvas>
  );
}

export default DiamondScene;
