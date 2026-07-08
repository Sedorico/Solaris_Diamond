"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Liquid ripple surface — an original "liquid glass" overlay.
 *
 * Plain three.js (no react-three-fiber): a ping-pong half-float FBO
 * integrates the 2-D wave equation (height + velocity in one texture), so
 * pointer strokes accumulate and propagate like real water instead of
 * restarting every frame. The visible pass draws a TRANSPARENT overlay:
 * signed emboss shading (highlights toward the key light, alpha-darkening
 * away from it) plus specular glints and a fresnel rim — the silk backdrop
 * underneath appears to bend without the DOM ever distorting. A drifting fbm
 * term keeps the surface breathing when idle; pointer speed amplifies it.
 *
 * Same implementation as the verified standalone harness — kept vanilla on
 * purpose. Hidden tabs pause via requestAnimationFrame throttling.
 */

const SIM_STEP = 1 / 60;
const SIM_RES = 512;

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

// ── Simulation pass ── wave equation + pointer splats ──────────────────────
const simFragmentShader = /* glsl */ `
  precision highp float;

  uniform sampler2D uPrev;
  uniform vec2 uTexel;
  uniform float uAspect;
  uniform vec2 uPointerA;  // previous splat position (uv)
  uniform vec2 uPointerB;  // current smoothed pointer (uv)
  uniform float uStroke;   // movement splat strength
  uniform float uPress;    // resting dimple strength

  varying vec2 vUv;

  float sdSegment(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
    return length(pa - ba * h);
  }

  void main() {
    vec4 prev = texture2D(uPrev, vUv);
    float h = prev.x;
    float v = prev.y;

    float n = texture2D(uPrev, vUv + vec2(0.0, uTexel.y)).x;
    float s = texture2D(uPrev, vUv - vec2(0.0, uTexel.y)).x;
    float e = texture2D(uPrev, vUv + vec2(uTexel.x, 0.0)).x;
    float w = texture2D(uPrev, vUv - vec2(uTexel.x, 0.0)).x;

    // pull toward the neighbour average, damp, integrate
    v += ((n + s + e + w) * 0.25 - h) * 1.3;
    v *= 0.975;
    h += v;
    h *= 0.997;

    // absorb waves at the borders so they never reflect back
    float edge =
      smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.92, vUv.x) *
      smoothstep(0.0, 0.08, vUv.y) * smoothstep(1.0, 0.92, vUv.y);
    h *= mix(0.9, 1.0, edge);
    v *= mix(0.9, 1.0, edge);

    // aspect-corrected space so ripples stay circular on wide screens
    vec2 p = vec2(vUv.x * uAspect, vUv.y);
    vec2 a = vec2(uPointerA.x * uAspect, uPointerA.y);
    vec2 b = vec2(uPointerB.x * uAspect, uPointerB.y);

    // moving stroke — soft gaussian pressed along the pointer's path
    float d = sdSegment(p, a, b);
    h -= uStroke * exp(-d * d * 400.0);

    // resting presence — small, gentle dimple under a hovering cursor
    float dp = length(p - b);
    h -= uPress * exp(-dp * dp * 260.0);

    h = clamp(h, -1.2, 1.2);
    v = clamp(v, -1.2, 1.2);

    gl_FragColor = vec4(h, v, 0.0, 1.0);
  }
`;

// ── Render pass ── transparent liquid overlay above the silk backdrop ──────
const renderFragmentShader = /* glsl */ `
  precision highp float;

  uniform sampler2D uHeight;
  uniform vec2 uTexel;
  uniform float uTime;
  uniform float uAspect;
  uniform float uActivity;
  uniform vec3 uHighlight;
  uniform vec3 uGold;
  uniform float uHiGain;
  uniform float uShadow;

  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y);
  }
  float fbm(vec2 p) {
    float a = 0.5, r = 0.0;
    for (int i = 0; i < 3; i++) {
      r += a * noise(p);
      p = p * 2.03 + vec2(17.3, 9.1);
      a *= 0.5;
    }
    return r;
  }

  void main() {
    vec2 uv = vUv;

    // height-field slope (central difference)
    float hl = texture2D(uHeight, uv - vec2(uTexel.x, 0.0)).x;
    float hr = texture2D(uHeight, uv + vec2(uTexel.x, 0.0)).x;
    float hd = texture2D(uHeight, uv - vec2(0.0, uTexel.y)).x;
    float hu = texture2D(uHeight, uv + vec2(0.0, uTexel.y)).x;
    float hc = texture2D(uHeight, uv).x;

    vec2 grad = vec2(hr - hl, hu - hd) * 16.0;

    // idle breathing — slow drifting shimmer so the surface is never still;
    // pointer activity widens it
    vec2 q = vec2(uv.x * uAspect, uv.y) * 2.6;
    float t = uTime * 0.05;
    float f1 = fbm(q + vec2(t * 1.7, -t));
    float f2 = fbm(q * 1.31 - vec2(t, t * 1.3) + 4.7);
    grad += (vec2(f1, f2) - 0.5) * (0.13 + uActivity * 0.15);

    vec3 nrm = normalize(vec3(-grad.x, -grad.y, 1.0));

    // signed emboss against the key light — slopes toward it catch light,
    // slopes away carve shadow into the silk, so the backdrop reads as
    // bending without touching the DOM
    vec2 L = normalize(vec2(-0.55, 0.83));
    float e = dot(nrm.xy, L);
    float hi = max(e, 0.0);
    float sh = max(-e, 0.0);

    vec3 V = vec3(0.0, 0.0, 1.0);
    vec3 H1 = normalize(normalize(vec3(-0.42, 0.62, 0.66)) + V);
    float spec1 = pow(max(dot(nrm, H1), 0.0), 60.0);
    vec3 H2 = normalize(normalize(vec3(0.55, -0.35, 0.75)) + V);
    float spec2 = pow(max(dot(nrm, H2), 0.0), 40.0);
    float fres = pow(1.0 - max(nrm.z, 0.0), 2.0);

    // crests brighten, troughs darken — makes the ripple rings themselves
    // read clearly, not just the glints on their slopes
    float crest = smoothstep(0.02, 0.5, hc);
    float trough = smoothstep(0.02, 0.6, -hc);

    vec3 rgb =
      uHighlight * (hi * 0.35 + hi * hi * 0.9 + spec1 * 1.2 + crest * 0.35) *
        uHiGain +
      uGold * (spec2 * 0.65 + fres * 1.0) * (0.5 + uActivity * 0.5);

    float darken =
      (sh * 0.3 + sh * sh * 1.0 + fres * 0.2 + trough * 0.45) * uShadow;

    // overall effect level — highlights vs how much the silk darkens;
    // raise toward 1.0 for a stronger surface
    rgb *= 0.15;
    darken *= 0.15;

    // premultiplied overlay: rgb adds light, alpha carves shadow underneath
    float lum = dot(rgb, vec3(0.35));
    float alpha = clamp(darken + lum * 0.6, 0.0, 0.9);

    float dth = (hash(gl_FragCoord.xy) - 0.5) / 255.0;
    gl_FragColor = vec4(rgb + dth, alpha + dth);
  }
`;

const PALETTES = {
  dark: {
    highlight: new THREE.Vector3(1.0, 0.97, 0.9),
    gold: new THREE.Vector3(0.85, 0.6, 0.28),
    hiGain: 1.0,
    shadow: 0.9,
  },
  light: {
    highlight: new THREE.Vector3(1.0, 1.0, 1.0),
    gold: new THREE.Vector3(0.78, 0.55, 0.25),
    hiGain: 0.6,
    shadow: 1.3,
  },
};

function makeTarget(w: number, h: number) {
  return new THREE.WebGLRenderTarget(w, h, {
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
    depthBuffer: false,
    stencilBuffer: false,
  });
}

export function LiquidHeroScene() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const canvas = document.createElement("canvas");
    canvas.style.cssText =
      "position:absolute;inset:0;width:100%;height:100%;display:block;";
    host.appendChild(canvas);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    // ── sim state (rebuilt on resize) ──
    let read: THREE.WebGLRenderTarget | null = null;
    let write: THREE.WebGLRenderTarget | null = null;
    let aspect = 1;

    const simUniforms = {
      uPrev: { value: null as THREE.Texture | null },
      uTexel: { value: new THREE.Vector2(1 / SIM_RES, 1 / SIM_RES) },
      uAspect: { value: 1 },
      uPointerA: { value: new THREE.Vector2(0.5, 0.5) },
      uPointerB: { value: new THREE.Vector2(0.5, 0.5) },
      uStroke: { value: 0 },
      uPress: { value: 0 },
    };
    const dark = document.documentElement.classList.contains("dark");
    const p0 = dark ? PALETTES.dark : PALETTES.light;
    const renderUniforms = {
      uHeight: { value: null as THREE.Texture | null },
      uTexel: { value: new THREE.Vector2(1 / SIM_RES, 1 / SIM_RES) },
      uTime: { value: 0 },
      uAspect: { value: 1 },
      uActivity: { value: 0 },
      uHighlight: { value: p0.highlight.clone() },
      uGold: { value: p0.gold.clone() },
      uHiGain: { value: p0.hiGain },
      uShadow: { value: p0.shadow },
    };

    const simScene = new THREE.Scene();
    const simCamera = new THREE.Camera();
    const simMaterial = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader: simFragmentShader,
      uniforms: simUniforms,
      depthTest: false,
      depthWrite: false,
    });
    const simMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), simMaterial);
    simMesh.frustumCulled = false;
    simScene.add(simMesh);

    const scene = new THREE.Scene();
    const camera = new THREE.Camera();
    const renderMaterial = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader: renderFragmentShader,
      uniforms: renderUniforms,
      transparent: true,
      premultipliedAlpha: true,
      depthTest: false,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), renderMaterial);
    mesh.frustumCulled = false;
    scene.add(mesh);

    const resize = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (w < 2 || h < 2) return;
      renderer.setSize(w, h, false);
      aspect = w / h;
      const simW = aspect >= 1 ? SIM_RES : Math.round(SIM_RES * aspect);
      const simH = aspect >= 1 ? Math.round(SIM_RES / aspect) : SIM_RES;
      read?.dispose();
      write?.dispose();
      read = makeTarget(simW, simH);
      write = makeTarget(simW, simH);
      simUniforms.uTexel.value.set(1 / simW, 1 / simH);
      renderUniforms.uTexel.value.set(1 / simW, 1 / simH);
      simUniforms.uAspect.value = aspect;
      renderUniforms.uAspect.value = aspect;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    // ── theme (lerped in the loop so flips glide) ──
    let paletteTarget = dark ? PALETTES.dark : PALETTES.light;
    const mo = new MutationObserver(() => {
      paletteTarget = document.documentElement.classList.contains("dark")
        ? PALETTES.dark
        : PALETTES.light;
    });
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    // ── pointer (window-level so content stays clickable) ──
    const pointerTarget = new THREE.Vector2(0.5, 0.5);
    const pointerSmooth = new THREE.Vector2(0.5, 0.5);
    const lastSplat = new THREE.Vector2(0.5, 0.5);
    let wasInside = false;
    let hoverTarget = 0;
    let press = 0;
    let activity = 0;
    let acc = 0;

    const onMove = (ev: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      const x = (ev.clientX - rect.left) / rect.width;
      const y = 1 - (ev.clientY - rect.top) / rect.height;
      pointerTarget.set(x, y);
      const inside = x >= 0 && x <= 1 && y >= 0 && y <= 1;
      if (inside && !wasInside) {
        // entering: snap so a stale position can't streak across the surface
        pointerSmooth.set(x, y);
        lastSplat.set(x, y);
      }
      wasInside = inside;
      hoverTarget = inside ? 1 : 0;
    };
    const onLeave = () => {
      hoverTarget = 0;
      wasInside = false;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);

    // ── loop ──
    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (!read || !write) return;
      let r: THREE.WebGLRenderTarget = read;
      let w: THREE.WebGLRenderTarget = write;

      pointerSmooth.lerp(pointerTarget, 1 - Math.exp(-dt * 16));
      press += (hoverTarget - press) * (1 - Math.exp(-dt * 5));
      activity *= Math.exp(-dt * 1.1);

      acc = Math.min(acc + dt, SIM_STEP * 3);
      let steps = 0;
      while (acc >= SIM_STEP && steps < 2) {
        const a = lastSplat;
        const b = pointerSmooth;
        const dist = Math.hypot((b.x - a.x) * aspect, b.y - a.y);
        activity = Math.min(1, activity + dist * 10);

        simUniforms.uPrev.value = r.texture;
        simUniforms.uPointerA.value.copy(a);
        simUniforms.uPointerB.value.copy(b);
        simUniforms.uStroke.value = Math.min(dist * 40, 1) * 0.22;
        simUniforms.uPress.value = press * 0.01;

        renderer.setRenderTarget(w);
        renderer.render(simScene, simCamera);
        renderer.setRenderTarget(null);

        const swap: THREE.WebGLRenderTarget = r;
        r = w;
        w = swap;
        lastSplat.copy(b);

        acc -= SIM_STEP;
        steps++;
      }
      read = r;
      write = w;

      renderUniforms.uHeight.value = r.texture;
      renderUniforms.uTime.value += dt;
      renderUniforms.uActivity.value = activity;

      // theme palette glides instead of snapping
      const k = 1 - Math.exp(-dt * 3);
      renderUniforms.uHighlight.value.lerp(paletteTarget.highlight, k);
      renderUniforms.uGold.value.lerp(paletteTarget.gold, k);
      renderUniforms.uHiGain.value +=
        (paletteTarget.hiGain - renderUniforms.uHiGain.value) * k;
      renderUniforms.uShadow.value +=
        (paletteTarget.shadow - renderUniforms.uShadow.value) * k;

      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      read?.dispose();
      write?.dispose();
      simMaterial.dispose();
      renderMaterial.dispose();
      simMesh.geometry.dispose();
      mesh.geometry.dispose();
      renderer.dispose();
      canvas.remove();
    };
  }, []);

  return (
    <div
      ref={hostRef}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    />
  );
}

export default LiquidHeroScene;
