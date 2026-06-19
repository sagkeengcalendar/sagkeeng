"use client";
import { useEffect, useRef } from "react";

interface SmudgeCanvasProps { className?: string; }
interface SmokeParticle { x: number; y: number; vx: number; vy: number; radius: number; maxRadius: number; life: number; maxLife: number; opacity: number; hue: number; }
interface GlowOrb { x: number; y: number; radius: number; color: string; baseX: number; baseY: number; drift: number; phase: number; }

export function SmudgeCanvas({ className = "" }: SmudgeCanvasProps) {
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

    const getShellPos = () => ({
      x: width * 0.72, y: height * 0.78,
      sw: Math.min(width * 0.16, 130), sh: Math.min(width * 0.16, 130) * 0.5,
      tilt: -0.6,
    });

    const burnIntensity = 0.6 + Math.random() * 0.6;
    const smokeSpawnRate = Math.floor(4 / burnIntensity);
    const maxSmoke = 100;
    const smoke: SmokeParticle[] = [];

    const getTipPos = () => { const s = getShellPos(); return { x: s.x - Math.sin(s.tilt) * s.sw * 0.25, y: s.y - s.sh * 0.4 }; };

    const spawnSmokeParticle = (initialAge = 0) => {
      const tip = getTipPos();
      smoke.push({
        x: tip.x + (Math.random() - 0.5) * 18, y: tip.y - (initialAge * 0.9),
        vx: (Math.random() - 0.5) * 0.4 + 0.1, vy: -(0.5 + Math.random() * 0.6),
        radius: 4 + Math.random() * 4, maxRadius: 25 + Math.random() * 35,
        life: initialAge, maxLife: 200 + Math.random() * 150,
        opacity: 0.35 + Math.random() * 0.2, hue: 30 + Math.random() * 20,
      });
    };

    const prePopulate = () => { const c = Math.floor(35 * burnIntensity); for (let i = 0; i < c; i++) spawnSmokeParticle(Math.random() * 200); };
    const onResize = () => { width = canvas.width = canvas.offsetWidth; height = canvas.height = canvas.offsetHeight; };
    window.addEventListener("resize", onResize);

    const drawShell = () => {
      const s = getShellPos();
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.tilt);

      const shellGrad = ctx.createLinearGradient(-s.sw / 2, 0, s.sw / 2, s.sh);
      shellGrad.addColorStop(0, "#1a4d5c"); shellGrad.addColorStop(0.15, "#2a8a9a");
      shellGrad.addColorStop(0.3, "#4a2a7a"); shellGrad.addColorStop(0.5, "#1a6a5a");
      shellGrad.addColorStop(0.7, "#2a5a8a"); shellGrad.addColorStop(0.85, "#3a3a6a"); shellGrad.addColorStop(1, "#1a3a4a");
      ctx.beginPath(); ctx.ellipse(0, 0, s.sw / 2, s.sh, 0, 0, Math.PI, false); ctx.closePath();
      ctx.fillStyle = shellGrad; ctx.fill();

      const hl = ctx.createLinearGradient(-s.sw / 2, -s.sh * 0.3, 0, 0);
      hl.addColorStop(0, "rgba(120, 210, 230, 0.35)"); hl.addColorStop(0.4, "rgba(160, 110, 210, 0.2)"); hl.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = hl; ctx.fill();

      ctx.beginPath(); ctx.ellipse(0, 0, s.sw / 2, s.sh * 0.3, 0, 0, Math.PI, true);
      ctx.strokeStyle = "rgba(200, 220, 230, 0.5)"; ctx.lineWidth = 1.5; ctx.stroke();

      ctx.fillStyle = "rgba(45, 38, 28, 0.85)";
      ctx.beginPath(); ctx.ellipse(-s.sw * 0.05, -s.sh * 0.15, s.sw * 0.28, s.sh * 0.14, -0.2, 0, Math.PI * 2); ctx.fill();

      ctx.strokeStyle = "rgba(80, 70, 50, 0.6)"; ctx.lineWidth = 0.8;
      for (let i = 0; i < 8; i++) { const ax = -s.sw * 0.15 + i * 3; ctx.beginPath(); ctx.moveTo(ax, -s.sh * 0.2); ctx.lineTo(ax + 2, -s.sh * 0.08); ctx.stroke(); }

      ctx.strokeStyle = "rgba(200, 175, 110, 0.85)"; ctx.lineWidth = 2;
      for (let i = 0; i < 6; i++) { const ax = -s.sw * 0.12 + i * 5; ctx.beginPath(); ctx.moveTo(ax, -s.sh * 0.15); ctx.quadraticCurveTo(ax + 8, -s.sh * 0.4, ax + 14, -s.sh * 0.6); ctx.stroke(); }
      ctx.strokeStyle = "rgba(230, 210, 150, 0.6)"; ctx.lineWidth = 1;
      for (let i = 0; i < 4; i++) { const ax = -s.sw * 0.1 + i * 6; ctx.beginPath(); ctx.moveTo(ax, -s.sh * 0.15); ctx.quadraticCurveTo(ax + 7, -s.sh * 0.38, ax + 12, -s.sh * 0.55); ctx.stroke(); }

      const tipFlicker = 0.7 + Math.sin(frameCount * 0.15) * 0.3;
      const tipX = -s.sw * 0.12, tipY = -s.sh * 0.22;
      const tipGlow = ctx.createRadialGradient(tipX, tipY, 0, tipX, tipY, 14);
      tipGlow.addColorStop(0, `rgba(255, 220, 120, ${0.7 * tipFlicker})`); tipGlow.addColorStop(0.4, `rgba(255, 160, 60, ${0.4 * tipFlicker})`); tipGlow.addColorStop(1, "rgba(232, 96, 44, 0)");
      ctx.fillStyle = tipGlow; ctx.beginPath(); ctx.arc(tipX, tipY, 14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `rgba(255, 240, 180, ${0.9 * tipFlicker})`; ctx.beginPath(); ctx.arc(tipX, tipY, 3, 0, Math.PI * 2); ctx.fill();

      const emberGrad = ctx.createRadialGradient(-s.sw * 0.08, -s.sh * 0.1, 0, -s.sw * 0.08, -s.sh * 0.1, s.sw * 0.3);
      emberGrad.addColorStop(0, "rgba(255, 180, 80, 0.4)"); emberGrad.addColorStop(0.5, "rgba(232, 96, 44, 0.2)"); emberGrad.addColorStop(1, "rgba(199, 91, 57, 0)");
      ctx.fillStyle = emberGrad; ctx.beginPath(); ctx.ellipse(-s.sw * 0.08, -s.sh * 0.1, s.sw * 0.3, s.sh * 0.2, 0, 0, Math.PI * 2); ctx.fill();

      ctx.restore();
    };

    const drawSmoke = (p: SmokeParticle) => {
      const lifeRatio = p.life / p.maxLife;
      const currentRadius = p.radius + (p.maxRadius - p.radius) * lifeRatio;
      let alpha: number;
      if (lifeRatio < 0.1) alpha = (lifeRatio / 0.1) * p.opacity;
      else if (lifeRatio > 0.6) alpha = ((1 - lifeRatio) / 0.4) * p.opacity;
      else alpha = p.opacity;
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, currentRadius);
      grad.addColorStop(0, `hsla(${p.hue}, 15%, 80%, ${alpha * 0.7})`); grad.addColorStop(0.4, `hsla(${p.hue}, 10%, 70%, ${alpha * 0.4})`); grad.addColorStop(1, `hsla(${p.hue}, 5%, 55%, 0)`);
      ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(p.x, p.y, currentRadius, 0, Math.PI * 2); ctx.fill();
    };

    const updateSmoke = (p: SmokeParticle) => {
      p.x += p.vx; p.y += p.vy; p.life++;
      p.vx += Math.sin(p.life * 0.04 + p.x * 0.01) * 0.05; p.vx *= 0.99; p.vy *= 0.998;
      if (p.life > p.maxLife * 0.5) p.vy *= 0.99;
      return p.life < p.maxLife && p.y > -50;
    };

    const drawGlow = () => {
      const s = getShellPos();
      const glowRadius = Math.max(width, height) * 0.45;
      const glowGrad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, glowRadius);
      const flicker = 0.7 + Math.sin(frameCount * 0.08) * 0.15 + Math.sin(frameCount * 0.13) * 0.1;
      glowGrad.addColorStop(0, `rgba(199, 91, 57, ${0.15 * flicker})`); glowGrad.addColorStop(0.3, `rgba(232, 96, 44, ${0.06 * flicker})`); glowGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = glowGrad; ctx.fillRect(0, 0, width, height);
    };

    const animate = () => {
      frameCount++;
      ctx.fillStyle = "#0e1c20"; ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = "screen"; drawGlow(); ctx.globalCompositeOperation = "source-over";
      if (frameCount % smokeSpawnRate === 0 && smoke.length < maxSmoke) { spawnSmokeParticle(); if (Math.random() < burnIntensity * 0.5) spawnSmokeParticle(); }
      for (let i = smoke.length - 1; i >= 0; i--) { if (!updateSmoke(smoke[i])) smoke.splice(i, 1); else drawSmoke(smoke[i]); }
      drawShell();
      animationId = requestAnimationFrame(animate);
    };

    if (prefersReducedMotion) { ctx.fillStyle = "#0e1c20"; ctx.fillRect(0, 0, width, height); drawGlow(); drawShell(); }
    else { prePopulate(); animationId = requestAnimationFrame(animate); }

    return () => { cancelAnimationFrame(animationId); window.removeEventListener("resize", onResize); };
  }, []);

  return <canvas ref={canvasRef} className={className} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} aria-hidden="true" />;
}
