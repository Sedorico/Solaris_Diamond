"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Smoke scene — wispy flowing smoke built from domain-warped FBM noise. A
 * centred vertical mask keeps the plume in one place while the noise drifts, so
 * it churns/breathes without rising off-screen. Theme-aware: white smoke on
 * black (dark) or charcoal smoke on cream (light). Fully procedural, no assets.
 * Self-contained vanilla three.js (one fullscreen fragment shader).
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
    float s = 0.0, a = 0.5;
    mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
    for (int i = 0; i < 4; i++) {
      s += a * noise(p);
      p = m * p;
      a *= 0.5;
    }
    return s;
  }

  void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * resolution) / resolution.y;
    float t = time * 0.08;
    vec2 p = uv * 2.2;

    // Three-level domain warp → flowing wispy smoke filaments.
    vec2 q = vec2(
      fbm(p + vec2(0.0, t)),
      fbm(p + vec2(5.2, 1.3) - vec2(0.0, t))
    );
    vec2 r = vec2(
      fbm(p + 4.0 * q + vec2(1.7, 9.2) + 0.15 * t),
      fbm(p + 4.0 * q + vec2(8.3, 2.8) - 0.126 * t)
    );
    float f = fbm(p + 4.0 * r);

    // Shape into wisps + fine filaments.
    float dens = f + 0.25 * (fbm(p * 3.0 + r * 3.0) - 0.5);
    dens = clamp(dens, 0.0, 1.0);
    dens = pow(dens, 1.6) * 1.85;

    // Keep it in one place — centred vertical-plume mask.
    float mask = smoothstep(1.15, 0.15, length(uv * vec2(1.15, 0.62)));
    dens = clamp(dens * mask, 0.0, 1.0);

    // Theme-aware "black & gold silk" palette (matches the page mesh shader).
    // A density ramp gives glowing champagne in the dense cores and deeper gold
    // in the wisps.
    vec3 bg = mix(vec3(0.955, 0.935, 0.895), vec3(0.02, 0.02, 0.025), uDark);
    vec3 smokeLo = mix(vec3(0.85, 0.74, 0.50), vec3(0.45, 0.34, 0.13), uDark);
    vec3 smokeHi = mix(vec3(0.55, 0.40, 0.13), vec3(0.96, 0.88, 0.66), uDark);
    vec3 col = mix(bg, smokeLo, smoothstep(0.0, 0.5, dens));
    col = mix(col, smokeHi, smoothstep(0.45, 1.0, dens));

    gl_FragColor = vec4(col, 1.0);
  }
`;

export function SmokeScene() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
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
    // Track the container itself — `resize` doesn't fire when a scrollbar
    // appears/disappears, which would otherwise leave an uncovered edge strip.
    const ro = new ResizeObserver(handleResize);
    ro.observe(mount);

    return () => {
      observer.disconnect();
      ro.disconnect();
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

export default SmokeScene;
