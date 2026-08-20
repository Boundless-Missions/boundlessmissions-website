"use client";

import { useEffect, useRef } from "react";

interface Star {
  x: number;
  y: number;
  r: number;
  alpha: number;
  layer: number; // 0 = far, LAYERS-1 = near
}

const LAYERS = 3;
// Max parallax shift (px) per depth layer — nearer layers move more.
const LAYER_SHIFT = [5, 12, 22];
// Offscreen layers are oversized by this margin so parallax never exposes edges.
const MARGIN = 28;

/**
 * Full-screen starfield ("spacebox") behind all page content. Stars are split
 * into a few depth layers, each pre-rendered once to an offscreen canvas. Every
 * frame just blits those layers with a parallax offset toward the mouse, so the
 * field drifts with subtle depth. The animation loop sleeps once the motion
 * settles and wakes on pointer movement, so it costs nothing while idle.
 * Purely decorative — pointer-events are off.
 */
export function SpaceBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    const context = canvasEl.getContext("2d");
    if (!context) return;
    // Non-null aliases so the hoisted closures below keep a non-null type.
    const el: HTMLCanvasElement = canvasEl;
    const ctx: CanvasRenderingContext2D = context;

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let layers: HTMLCanvasElement[] = [];

    // Eased pointer offset (-1..1) for smooth, slightly-laggy parallax.
    const pointer = { x: 0, y: 0 };
    const target = { x: 0, y: 0 };

    function buildLayers() {
      const ow = width + MARGIN * 2;
      const oh = height + MARGIN * 2;
      // Density scales with viewport area, capped so big screens stay light.
      const count = Math.min(300, Math.floor((ow * oh) / 9000));

      const stars: Star[] = Array.from({ length: count }, () => {
        const z = Math.random();
        return {
          x: Math.random() * ow,
          y: Math.random() * oh,
          r: z * 1.3 + 0.3,
          alpha: 0.25 + z * 0.6,
          layer: Math.min(LAYERS - 1, Math.floor(z * LAYERS)),
        };
      });

      layers = Array.from({ length: LAYERS }, (_, l) => {
        const lc = document.createElement("canvas");
        lc.width = Math.floor(ow * dpr);
        lc.height = Math.floor(oh * dpr);
        const lctx = lc.getContext("2d");
        if (lctx) {
          lctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          for (const s of stars) {
            if (s.layer !== l) continue;
            lctx.beginPath();
            lctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            lctx.fillStyle = `rgba(220, 240, 220, ${s.alpha})`;
            lctx.fill();
          }
        }
        return lc;
      });
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);
      const ow = width + MARGIN * 2;
      const oh = height + MARGIN * 2;
      for (let l = 0; l < layers.length; l++) {
        const sh = LAYER_SHIFT[l] ?? 0;
        ctx.drawImage(
          layers[l],
          -MARGIN - pointer.x * sh,
          -MARGIN - pointer.y * sh,
          ow,
          oh
        );
      }
    }

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      el.width = Math.floor(width * dpr);
      el.height = Math.floor(height * dpr);
      el.style.width = `${width}px`;
      el.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildLayers();
      draw();
    }

    let raf = 0;
    let running = false;

    function loop() {
      pointer.x += (target.x - pointer.x) * 0.06;
      pointer.y += (target.y - pointer.y) * 0.06;
      draw();

      // Sleep once the field has settled; pointer movement wakes us again.
      if (
        Math.abs(target.x - pointer.x) < 0.001 &&
        Math.abs(target.y - pointer.y) < 0.001
      ) {
        running = false;
        return;
      }
      raf = window.requestAnimationFrame(loop);
    }

    function wake() {
      if (!running) {
        running = true;
        raf = window.requestAnimationFrame(loop);
      }
    }

    function onPointerMove(e: PointerEvent) {
      target.x = (e.clientX / width) * 2 - 1;
      target.y = (e.clientY / height) * 2 - 1;
      wake();
    }

    resize();
    window.addEventListener("resize", resize);
    if (!prefersReduced) {
      window.addEventListener("pointermove", onPointerMove);
    }

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full"
    />
  );
}
