"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Gradient-flow scene — a soft, glossy torus that morphs and tumbles, shaded
 * with a deep-blue → white gradient and a pink iridescent rim (the "m_strba"
 * soft-3D look). Vanilla three.js, typed; renders into an absolutely-positioned
 * canvas that fills its parent. Sits on the page's cream background.
 */

const vertexShader = /* glsl */ `
  uniform float time;
  varying vec3 vViewNormal;

  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
  }

  void main() {
    // Low-frequency, time-varying noise folds the torus into soft organic loops.
    float n1 = snoise(position * 0.8 + vec3(0.0, 0.0, time * 0.22));
    float n2 = snoise(position * 1.7 - vec3(time * 0.12, 0.0, 0.0));
    vec3 displaced = position + normal * (n1 * 0.36 + n2 * 0.12);

    vViewNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying vec3 vViewNormal;

  void main() {
    vec3 N = normalize(vViewNormal);
    vec3 L = normalize(vec3(-0.35, 0.65, 0.7));
    float d = dot(N, L) * 0.5 + 0.5; // 0 (shadowed) .. 1 (lit)

    vec3 navy  = vec3(0.03, 0.07, 0.42);
    vec3 blue  = vec3(0.18, 0.34, 0.96);
    vec3 white = vec3(0.98, 0.98, 1.0);
    vec3 pink  = vec3(0.97, 0.66, 0.84);

    vec3 col = mix(navy, blue, smoothstep(0.12, 0.55, d));
    col = mix(col, white, smoothstep(0.6, 0.96, d));

    // Pink iridescent rim at grazing angles
    float fres = pow(1.0 - max(N.z, 0.0), 3.0);
    col = mix(col, pink, fres * 0.45);

    gl_FragColor = vec4(col, 1.0);
  }
`;

export function GradientFlowScene() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      45,
      mount.clientWidth / mount.clientHeight,
      0.1,
      100,
    );
    camera.position.z = 3.4;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    const geometry = new THREE.TorusGeometry(1.0, 0.42, 64, 320);
    const material = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 } },
      vertexShader,
      fragmentShader,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = 0.6;
    scene.add(mesh);

    let frameId = 0;
    const animate = (t: number) => {
      material.uniforms.time.value = t * 0.001;
      mesh.rotation.y += 0.0016;
      mesh.rotation.z += 0.0004;
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    animate(0);

    const handleResize = () => {
      if (!mount.clientWidth || !mount.clientHeight) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(frameId);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Subtle blur for the soft, dreamy focus seen in the reference.
  return (
    <div
      ref={mountRef}
      className="absolute inset-0 h-full w-full"
      style={{ filter: "blur(1px)" }}
    />
  );
}

export default GradientFlowScene;
