"use client";

import { useEffect, useRef } from "react";

/**
 * Direct adaptation of the flow-field/neural particle shader: particles
 * driven by a cosine/sine noise field, with mouse repulsion, rendered with
 * a trail-fade effect (semi-transparent overlay each frame instead of a
 * hard clear — this is what produces the long streaking trails).
 * Colors and the fade-overlay tint are swapped per light/dark theme so it
 * reads correctly on this site instead of assuming a pure-black canvas.
 */
export function PremiumBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = container.clientWidth;
    let height = container.clientHeight;
    let particles: Particle[] = [];
    let animationFrameId: number;
    const mouse = { x: -1000, y: -1000 };

    const speed = 0.8;
    const trailOpacity = 0.06;
    const particleCount = 260;

    const isDark = () => document.documentElement.classList.contains("dark");

    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      age: number;
      life: number;

      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = 0;
        this.vy = 0;
        this.age = 0;
        this.life = Math.random() * 200 + 100;
      }

      update() {
        // Flow field
        const angle =
          (Math.cos(this.x * 0.005) + Math.sin(this.y * 0.005)) * Math.PI;
        this.vx += Math.cos(angle) * 0.2 * speed;
        this.vy += Math.sin(angle) * 0.2 * speed;

        // Mouse repulsion
        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const interactionRadius = 150;
        if (distance < interactionRadius) {
          const force = (interactionRadius - distance) / interactionRadius;
          this.vx -= dx * force * 0.05;
          this.vy -= dy * force * 0.05;
        }

        // Velocity + friction
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= 0.95;
        this.vy *= 0.95;

        // Aging
        this.age++;
        if (this.age > this.life) this.reset();

        // Wrap
        if (this.x < 0) this.x = width;
        if (this.x > width) this.x = 0;
        if (this.y < 0) this.y = height;
        if (this.y > height) this.y = 0;
      }

      reset() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = 0;
        this.vy = 0;
        this.age = 0;
        this.life = Math.random() * 200 + 100;
      }

      draw(context: CanvasRenderingContext2D, dark: boolean) {
        context.fillStyle = dark ? "#C49426" : "#9C6A1A";
        const alpha = 1 - Math.abs(this.age / this.life - 0.5) * 2;
        context.globalAlpha = alpha;
        context.fillRect(this.x, this.y, 1.5, 1.5);
      }
    }

    function init() {
      const dpr = window.devicePixelRatio || 1;
      canvas!.width = width * dpr;
      canvas!.height = height * dpr;
      ctx!.scale(dpr, dpr);
      canvas!.style.width = `${width}px`;
      canvas!.style.height = `${height}px`;

      particles = [];
      for (let i = 0; i < particleCount; i++) particles.push(new Particle());
    }

    function animate() {
      // Trail-fade overlay — tinted per theme instead of hardcoded black
      const dark = isDark();
      ctx!.fillStyle = dark
        ? `rgba(10, 9, 7, ${trailOpacity})`
        : `rgba(250, 248, 244, ${trailOpacity})`;
      ctx!.fillRect(0, 0, width, height);

      particles.forEach((p) => {
        p.update();
        p.draw(ctx!, dark);
      });

      animationFrameId = requestAnimationFrame(animate);
    }

    function handleResize() {
      width = container!.clientWidth;
      height = container!.clientHeight;
      init();
    }

    function handleMouseMove(e: MouseEvent) {
      const rect = canvas!.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    }

    function handleMouseLeave() {
      mouse.x = -1000;
      mouse.y = -1000;
    }

    init();
    animate();

    window.addEventListener("resize", handleResize);
    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("resize", handleResize);
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseleave", handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-background"
    >
      <canvas ref={canvasRef} className="block size-full" />
    </div>
  );
}