"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Silk-terrain scene — soft, flowing white/pale-blue dunes (raymarched FBM
 * height-field) with gentle matte lighting and fine combed striations. The
 * noise drifts over time so the waves slowly flow/breathe. Fully procedural, no
 * assets. Self-contained vanilla three.js (one fullscreen fragment shader).
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
  uniform float uDark;

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 345.45));
    p += dot(p, p + 34.345);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  float fbm(vec2 p) {
    float s = 0.0, a = 0.6;
    mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
    for (int i = 0; i < 3; i++) {
      s += a * noise(p);
      p = m * p;
      a *= 0.5;
    }
    return s;
  }

  // Animated dune height field — a few big flowing waves (cheap: 2 fbm calls).
  float terrainH(vec2 p) {
    float t = time * 0.06;
    vec2 q = p + vec2(t, t * 0.35);
    float h = fbm(q * 0.35);
    h += 0.28 * fbm(q * 0.95 + 5.0);
    return h * 1.65 - 0.28;
  }

  vec3 terrainNormal(vec2 p) {
    float e = 0.03;
    return normalize(vec3(
      terrainH(p - vec2(e, 0.0)) - terrainH(p + vec2(e, 0.0)),
      2.0 * e,
      terrainH(p - vec2(0.0, e)) - terrainH(p + vec2(0.0, e))
    ));
  }

  vec3 sky(vec2 uv) {
    float g = clamp(uv.y * 0.6 + 0.5, 0.0, 1.0);
    vec3 light = mix(vec3(0.80, 0.83, 0.88), vec3(0.91, 0.93, 0.96), g);
    vec3 dark = mix(vec3(0.030, 0.034, 0.05), vec3(0.07, 0.072, 0.10), g);
    return mix(light, dark, uDark);
  }

  void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * resolution) / resolution.y;

    // Camera skimming forward over the dunes.
    vec3 ro = vec3(0.0, 2.2, 0.0);
    vec3 ta = vec3(0.0, 0.6, -4.5);
    vec3 fwd = normalize(ta - ro);
    vec3 rgt = normalize(cross(vec3(0.0, 1.0, 0.0), fwd));
    vec3 upv = cross(fwd, rgt);
    vec3 rd = normalize(uv.x * rgt + uv.y * upv + 1.5 * fwd);

    // Raymarch the height field.
    float t = 0.0;
    float hit = -1.0;
    for (int i = 0; i < 56; i++) {
      vec3 p = ro + rd * t;
      float diff = p.y - terrainH(p.xz);
      if (diff < 0.0022 * t) { hit = t; break; }
      t += max(diff * 0.5, 0.03);
      if (t > 45.0) break;
    }

    vec3 col;
    if (hit > 0.0) {
      vec3 p = ro + rd * hit;
      vec3 N = terrainNormal(p.xz);
      vec3 L = normalize(vec3(-0.4, 0.75, -0.45));
      float dif = clamp(dot(N, L), 0.0, 1.0);
      float amb = 0.35 + 0.5 * clamp(N.y, 0.0, 1.0);

      // Theme-aware palette — pale-blue/white silk (light) or black × gold (dark).
      vec3 shadowC = mix(vec3(0.55, 0.66, 0.83), vec3(0.035, 0.04, 0.055), uDark); // valleys
      vec3 litC = mix(vec3(0.97, 0.975, 0.985), vec3(0.82, 0.69, 0.40), uDark);    // ridges
      float shade = clamp(dif * 1.0 + amb * 0.14, 0.0, 1.0);
      col = mix(shadowC, litC, shade);

      // Fine combed silk striations following the surface (two layers, crisper).
      float warp = fbm(p.xz * 1.1) * 10.0;
      float g1 = sin(p.z * 16.0 + p.x * 3.0 + warp);
      float g2 = sin(p.z * 34.0 - p.x * 1.5 + warp * 1.6);
      float grain = g1 * 0.6 + g2 * 0.4;
      col *= 1.0 + 0.06 * grain * (0.4 + 0.6 * shade);

      // Sheen highlight along the lit ridges.
      col += pow(dif, 5.0) * mix(0.08, 0.16, uDark) * litC;

      // Light haze only — kept low so it reads as fabric, not cloud.
      float fog = 1.0 - exp(-0.0006 * hit * hit);
      col = mix(col, sky(uv), clamp(fog, 0.0, 1.0) * 0.7);
    } else {
      col = sky(uv);
    }

    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
  }
`;

export function SilkTerrainScene() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    // Raymarching is fill-rate heavy, so render below device resolution — the
    // soft scene hides the upscale and it runs much lighter.
    renderer.setPixelRatio(0.75);
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    const bufferSize = new THREE.Vector2();
    renderer.getDrawingBufferSize(bufferSize);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        resolution: { value: bufferSize.clone() },
        uDark: { value: 0 },
      },
      vertexShader,
      fragmentShader,
    });

    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(quad);

    // Theme-aware: switch palette when the <html> dark class toggles.
    const applyTheme = () => {
      material.uniforms.uDark.value =
        document.documentElement.classList.contains("dark") ? 1 : 0;
    };
    applyTheme();
    const observer = new MutationObserver(applyTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

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
      observer.disconnect();
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

export default SilkTerrainScene;
