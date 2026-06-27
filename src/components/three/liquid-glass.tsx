"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Liquid-glass scene — raymarched metaballs shaded like clear water/glass:
 * fresnel rim, specular sparkles and a faint refraction tint, with a few small
 * droplets breaking off. Captures the "water" vibe on black. Self-contained
 * vanilla three.js (one fullscreen fragment shader), typed for this codebase.
 */

const vertexShader = /* glsl */ `
  void main() {
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;
  uniform float time;
  uniform vec2 resolution;

  float sdSphere(vec3 p, vec3 c, float r) { return length(p - c) - r; }

  float smin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
  }

  float map(vec3 p) {
    float t = time;
    float d = 1e9;

    // Main merging cluster
    for (int i = 0; i < 6; i++) {
      float fi = float(i);
      vec3 c = vec3(
        sin(t * 0.6 + fi * 1.7) * 0.5,
        cos(t * 0.5 + fi * 2.1) * 0.5,
        sin(t * 0.4 + fi * 1.1) * 0.4
      );
      float r = 0.30 + 0.06 * sin(t + fi);
      d = smin(d, sdSphere(p, c, r), 0.28);
    }

    // Small detached droplets
    for (int j = 0; j < 3; j++) {
      float fj = float(j);
      vec3 c = vec3(
        sin(t * 1.2 + fj * 2.0) * 0.95,
        cos(t * 1.0 + fj * 3.0) * 0.85 + 0.1,
        sin(t * 0.8 + fj) * 0.5
      );
      d = min(d, sdSphere(p, c, 0.06));
    }

    return d;
  }

  vec3 calcNormal(vec3 p) {
    vec2 e = vec2(0.0012, 0.0);
    return normalize(vec3(
      map(p + e.xyy) - map(p - e.xyy),
      map(p + e.yxy) - map(p - e.yxy),
      map(p + e.yyx) - map(p - e.yyx)
    ));
  }

  void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * resolution) / resolution.y;
    vec3 ro = vec3(0.0, 0.0, 2.6);
    vec3 rd = normalize(vec3(uv, -1.4));

    float tcur = 0.0;
    bool hit = false;
    for (int i = 0; i < 90; i++) {
      vec3 p = ro + rd * tcur;
      float dist = map(p);
      if (dist < 0.001) { hit = true; break; }
      tcur += dist;
      if (tcur > 7.0) break;
    }

    vec3 col = vec3(0.0); // black background

    if (hit) {
      vec3 p = ro + rd * tcur;
      vec3 N = calcNormal(p);
      vec3 V = -rd;
      float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);

      // Fake environment reflection — bright toward the top
      vec3 R = reflect(rd, N);
      float envTop = smoothstep(-0.2, 0.85, R.y);
      vec3 envCol = mix(vec3(0.04), vec3(0.9, 0.95, 1.0), envTop);

      // Refraction through dark water — faint cool tint
      vec3 refr = vec3(0.02, 0.035, 0.06);

      col = mix(refr, envCol, fres);

      // Specular sparkles from two lights
      vec3 L1 = normalize(vec3(0.6, 0.85, 0.6));
      vec3 L2 = normalize(vec3(-0.55, 0.2, 0.7));
      vec3 H1 = normalize(L1 + V);
      vec3 H2 = normalize(L2 + V);
      col += vec3(1.0) * pow(max(dot(N, H1), 0.0), 90.0);
      col += vec3(0.8, 0.9, 1.0) * pow(max(dot(N, H2), 0.0), 60.0) * 0.6;

      // Cool rim glow
      col += vec3(0.55, 0.68, 0.95) * fres * 0.35;
    }

    gl_FragColor = vec4(col, 1.0);
  }
`;

export function LiquidGlassScene() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    const bufferSize = new THREE.Vector2();
    renderer.getDrawingBufferSize(bufferSize);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        resolution: { value: bufferSize.clone() },
      },
      vertexShader,
      fragmentShader,
    });

    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(quad);

    let frameId = 0;
    const animate = (t: number) => {
      material.uniforms.time.value = t * 0.001;
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    animate(0);

    const handleResize = () => {
      if (!mount.clientWidth || !mount.clientHeight) return;
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      renderer.getDrawingBufferSize(bufferSize);
      (material.uniforms.resolution.value as THREE.Vector2).copy(bufferSize);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(frameId);
      quad.geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={mountRef} className="absolute inset-0 h-full w-full" />;
}

export default LiquidGlassScene;
