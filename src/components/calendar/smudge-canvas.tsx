"use client";
import { useEffect, useRef } from "react";

interface EmberCanvasProps { className?: string; }
interface Ember {
  x: number; y: number; vx: number; vy: number;
  radius: number; life: number; maxLife: number;
  hue: number; brightness: number;
}

/**
 * EMBER CANVAS — small embers rising from a fire at the bottom, burning out
 * - Embers spawn from bottom, rise upward with gentle drift
 * - Each ember glows orange/amber, flickers, then fades out
 * - Warm fire glow at the bottom (breathing effect)
 * - Pre-populated so it looks like the fire has always been burning
 */
export function SmudgeCanvas({ className = "" }: EmberCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);
    let animationId: number;
    let frameCount = 0;

    const maxEmbers = 120;
    const embers: Ember[] = [];

    const spawnEmber = (initialAge = 0) => {
      // Spawn from bottom center area, spread across 60% of width
      const x = width * 0.2 + Math.random() * width * 0.6;
      const y = height + 5;
      embers.push({
        x, y,
        y: y - (initialAge * 1.2),
        vx: (Math.random() - 0.5) * 0.6,
        vy: -(0.6 + Math.random() * 1.4),
        radius: Math.random() * 2 + 0.8,
        life: initialAge,
        maxLife: 120 + Math.random() * 180,
        hue: 15 + Math.random() * 30, // 15-45 (deep orange to amber)
        brightness: 50 + Math.random() * 25,
      });
    };

    // Pre-populate so it looks like the fire has always been burning
    const prePopulate = () => {
      for (let i = 0; i < 60; i++) {
        spawnEmber(Math.random() * 150);
      }
    };

    const onResize = () => {
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener("resize", onResize);

    const drawEmber = (e: Ember) => {
      const lifeRatio = e.life / e.maxLife;
      let alpha: number;
      if (lifeRatio < 0.1) alpha = lifeRatio / 0.1;
      else if (lifeRatio > 0.6) alpha = (1 - lifeRatio) / 0.4;
      else alpha = 1;

      // Flicker
      const flicker = 0.6 + Math.sin(e.life * 0.25) * 0.4;
      alpha *= flicker;

      // Outer glow
      const glowR = e.radius * 5;
      const glow = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, glowR);
      glow.addColorStop(0, `hsla(${e.hue}, 100%, ${e.brightness}%, ${alpha * 0.5})`);
      glow.addColorStop(0.4, `hsla(${e.hue}, 100%, ${e.brightness - 10}%, ${alpha * 0.2})`);
      glow.addColorStop(1, `hsla(${e.hue}, 100%, ${e.brightness}%, 0)`);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(e.x, e.y, glowR, 0, Math.PI * 2);
      ctx.fill();

      // Bright core
      ctx.fillStyle = `hsla(${e.hue}, 100%, ${Math.min(95, e.brightness + 25)}%, ${alpha})`;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
      ctx.fill();
    };

    const updateEmber = (e: Ember) => {
      e.x += e.vx;
      e.y += e.vy;
      e.life++;
      e.vx += (Math.random() - 0.5) * 0.08;
      e.vx *= 0.98;
      e.vy *= 0.996;
      return e.life < e.maxLife && e.y > -30;
    };

    // Warm fire glow at the bottom
    const drawFireGlow = () => {
      const flicker = 0.65 + Math.sin(frameCount * 0.07) * 0.15 + Math.sin(frameCount * 0.11) * 0.1;
      const glowGrad = ctx.createRadialGradient(
        width / 2, height * 0.95, 0,
        width / 2, height * 0.95, Math.max(width, height) * 0.6,
      );
      glowGrad.addColorStop(0, `rgba(232, 96, 44, ${0.22 * flicker})`);
      glowGrad.addColorStop(0.2, `rgba(199, 91, 57, ${0.12 * flicker})`);
      glowGrad.addColorStop(0.5, `rgba(199, 91, 57, ${0.04 * flicker})`);
      glowGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, width, height);
    };

    const animate = () => {
      frameCount++;
      ctx.fillStyle = "#0e1c20";
      ctx.fillRect(0, 0, width, height);

      // Fire glow
      ctx.globalCompositeOperation = "screen";
      drawFireGlow();

      // Spawn new embers
      if (frameCount % 2 === 0 && embers.length < maxEmbers) {
        spawnEmber();
        if (Math.random() < 0.6) spawnEmber();
      }

      // Update and draw embers
      for (let i = embers.length - 1; i >= 0; i--) {
        if (!updateEmber(embers[i])) {
          embers.splice(i, 1);
        } else {
          drawEmber(embers[i]);
        }
      }
      ctx.globalCompositeOperation = "source-over";

      animationId = requestAnimationFrame(animate);
    };

    if (prefersReducedMotion) {
      ctx.fillStyle = "#0e1c20";
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = "screen";
      drawFireGlow();
      ctx.globalCompositeOperation = "source-over";
    } else {
      prePopulate();
      animationId = requestAnimationFrame(animate);
    }

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
      aria-hidden="true"
    />
  );
}
