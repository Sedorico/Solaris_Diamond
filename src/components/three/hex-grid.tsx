"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Hex-grid "lab" scene — a frosted hexagonal honeycomb glass grid that refracts
 * a background image, warped by an animated radial ripple (the dome/tunnel
 * wave). Theme-aware: loads a light leaf in light mode and a dark/gold leaf in
 * dark mode from /public/textures. Falls back to a procedural glow field if the
 * images aren't present yet. Self-contained vanilla three.js.
 *
 * Drop the two images here (cover-fit, any size):
 *   public/textures/leaf-light.avif
 *   public/textures/leaf-dark.avif
 */

const LIGHT_SRC = "/textures/leaf-light.avif";
const DARK_SRC = "/textures/leaf-dark.avif";

const vertexShader = /* glsl */ `
  void main() {
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;
  uniform float time;
  uniform vec2 resolution;
  uniform sampler2D uTex;
  uniform float uHasTex;
  uniform float uImageAspect;

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float hexDist(vec2 p) {
    p = abs(p);
    return max(dot(p, normalize(vec2(1.0, 1.73))), p.x);
  }

  vec4 hexCoords(vec2 uv) {
    vec2 r = vec2(1.0, 1.73);
    vec2 h = r * 0.5;
    vec2 a = mod(uv, r) - h;
    vec2 b = mod(uv - h, r) - h;
    vec2 gv = dot(a, a) < dot(b, b) ? a : b;
    vec2 id = uv - gv;
    return vec4(gv, id);
  }

  // Procedural fallback (used until the leaf images are added).
  vec3 sceneBG(vec2 p) {
    vec3 c = vec3(0.015, 0.02, 0.03);
    float t = time * 0.15;
    c += vec3(0.10, 0.85, 0.55) * exp(-3.0 * length(p - vec2(sin(t) * 0.3 + 0.25, 0.2)));
    c += vec3(1.00, 0.55, 0.18) * exp(-3.6 * length(p - vec2(-0.1, -0.25 + sin(t * 0.8) * 0.12)));
    c += vec3(0.85, 0.35, 0.95) * exp(-3.0 * length(p - vec2(0.7, -0.1 + cos(t) * 0.15)));
    c += vec3(0.25, 0.50, 1.00) * exp(-3.6 * length(p - vec2(-0.7, 0.12 + cos(t * 0.7) * 0.1)));
    return c;
  }

  // background-size: cover mapping from screen-uv (0..1) to texture-uv.
  vec2 coverUV(vec2 s, float screenA, float imgA) {
    if (screenA > imgA) return vec2(s.x, (s.y - 0.5) * (imgA / screenA) + 0.5);
    return vec2((s.x - 0.5) * (screenA / imgA) + 0.5, s.y);
  }

  void main() {
    float aspect = resolution.x / resolution.y;
    vec2 uv = (gl_FragCoord.xy - 0.5 * resolution) / resolution.y;

    // Animated radial ripple / dome wave.
    float d = length(uv);
    float wave = sin(d * 9.0 - time * 1.6) * 0.04 * smoothstep(1.3, 0.0, d);
    vec2 ruv = uv + normalize(uv + 1e-4) * wave;

    // Hexagonal tiling.
    float scale = 30.0;
    vec4 hc = hexCoords(ruv * scale);
    vec2 gv = hc.xy;
    vec2 id = hc.zw;

    // Clear background image — no per-hex refraction, but sampled on the rippled
    // uv so the picture undulates together with the hex grid (they move as one).
    vec3 col;
    if (uHasTex > 0.5) {
      vec2 sUV = vec2(ruv.x / aspect + 0.5, ruv.y + 0.5);
      col = texture2D(uTex, coverUV(sUV, aspect, uImageAspect)).rgb;
    } else {
      col = sceneBG(ruv);
    }

    // Hex mesh laid OVER the perfectly clear image — thin outlines only,
    // nothing that dims or distorts the picture.
    float edge = 0.5 - hexDist(gv);
    float line = smoothstep(0.045, 0.0, edge);
    col = mix(col, vec3(1.0), line * 0.28);

    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
  }
`;

export function HexGridScene() {
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

    const placeholder = new THREE.DataTexture(
      new Uint8Array([10, 12, 16, 255]),
      1,
      1,
      THREE.RGBAFormat,
    );
    placeholder.needsUpdate = true;

    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        resolution: { value: bufferSize.clone() },
        uTex: { value: placeholder },
        uHasTex: { value: 0 },
        uImageAspect: { value: 1 },
      },
      vertexShader,
      fragmentShader,
    });

    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(quad);

    // Theme-aware texture loading (light leaf / dark leaf).
    const loader = new THREE.TextureLoader();
    let loadedTheme = "";
    let loadedTex: THREE.Texture | null = null;
    const loadForTheme = () => {
      const dark = document.documentElement.classList.contains("dark");
      const theme = dark ? "dark" : "light";
      if (theme === loadedTheme) return;
      loadedTheme = theme;
      loader.load(
        dark ? DARK_SRC : LIGHT_SRC,
        (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          if (loadedTex) loadedTex.dispose();
          loadedTex = tex;
          material.uniforms.uTex.value = tex;
          material.uniforms.uImageAspect.value =
            tex.image.width / tex.image.height;
          material.uniforms.uHasTex.value = 1;
        },
        undefined,
        () => {
          // Image not present → keep the procedural fallback.
          material.uniforms.uHasTex.value = 0;
        },
      );
    };
    loadForTheme();
    const observer = new MutationObserver(loadForTheme);
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
      placeholder.dispose();
      if (loadedTex) loadedTex.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={mountRef} className="absolute inset-0 h-full w-full" />;
}

export default HexGridScene;
