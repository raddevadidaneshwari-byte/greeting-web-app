(() => {
  "use strict";

  const $ = (id) => {
    const el = document.getElementById(id);
    if (!el) throw new Error(`Missing element #${id}`);
    return el;
  };

  const nameInput = $("nameInput");
  const greetBtn = $("greetBtn");
  const greeting = $("greeting");

  const canvas = $("fx");
  /** @type {CanvasRenderingContext2D} */
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  const state = {
    dpr: 1,
    w: 0,
    h: 0,
  };

  function resizeCanvas() {
    const dpr = Math.max(1, Math.min(2.5, window.devicePixelRatio || 1));
    state.dpr = dpr;
    state.w = Math.floor(window.innerWidth);
    state.h = Math.floor(window.innerHeight);
    canvas.width = Math.floor(state.w * dpr);
    canvas.height = Math.floor(state.h * dpr);
    canvas.style.width = `${state.w}px`;
    canvas.style.height = `${state.h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, state.w, state.h);
  }

  window.addEventListener("resize", resizeCanvas, { passive: true });
  resizeCanvas();

  // ---- Animation manager (ensures no overlap) ----

  /** @type {{ stop: () => void } | null} */
  let current = null;

  function stopCurrent() {
    if (current) current.stop();
    current = null;
    ctx.clearRect(0, 0, state.w, state.h);
  }

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function pick(arr) {
    return arr[(Math.random() * arr.length) | 0];
  }

  const palette = [
    "#7FBBFF",
    "#B77DFF",
    "#58FFD7",
    "#FFD36A",
    "#FF6AA6",
    "#FFFFFF",
  ];

  function makeConfetti() {
    const pieces = [];
    const count = clamp(Math.floor((state.w * state.h) / 22000), 42, 140);
    for (let i = 0; i < count; i++) {
      pieces.push({
        x: rand(0, state.w),
        y: rand(-state.h * 0.25, 0),
        w: rand(5, 10),
        h: rand(8, 14),
        r: rand(0, Math.PI * 2),
        vr: rand(-5, 5),
        vx: rand(-30, 30),
        vy: rand(110, 240),
        drift: rand(-25, 25),
        color: pick(palette),
        life: rand(1.6, 2.6),
      });
    }

    let raf = 0;
    let last = performance.now();
    let t = 0;

    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    function frame(now) {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      t += dt;

      ctx.clearRect(0, 0, state.w, state.h);
      ctx.globalCompositeOperation = "source-over";

      for (const p of pieces) {
        p.life -= dt;
        p.x += (p.vx + p.drift * Math.sin((p.y / 80) + t * 2)) * dt;
        p.y += p.vy * dt;
        p.r += p.vr * dt;

        const alpha = clamp(Math.min(1, p.life / 0.6), 0, 1);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.globalAlpha = alpha * 0.95;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();

        if (p.y > state.h + 30 || p.x < -60 || p.x > state.w + 60) {
          p.y = rand(-60, -10);
          p.x = rand(0, state.w);
          p.life = rand(0.8, 1.4);
        }
      }

      const alive = pieces.some((p) => p.life > 0);
      if (t < 2.2 && alive) {
        raf = requestAnimationFrame(frame);
      } else {
        stopCurrent();
      }
    }

    raf = requestAnimationFrame(frame);
    return { stop };
  }

  function makePartyPoppers() {
    const bursts = [];
    const popCount = 2;
    const origins = [
      { x: state.w * 0.18, y: state.h * 0.82, dir: -1 },
      { x: state.w * 0.82, y: state.h * 0.82, dir: 1 },
    ];

    for (let b = 0; b < popCount; b++) {
      const o = origins[b];
      const n = clamp(Math.floor(state.w / 14), 44, 84);
      for (let i = 0; i < n; i++) {
        const speed = rand(220, 620);
        const angle = rand(-Math.PI * 0.95, -Math.PI * 0.25) + (o.dir * rand(-0.08, 0.08));
        bursts.push({
          x: o.x,
          y: o.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          g: rand(540, 820),
          size: rand(3, 6),
          color: pick(palette),
          life: rand(1.0, 1.6),
          spin: rand(-9, 9),
          rot: rand(0, Math.PI * 2),
        });
      }
    }

    let raf = 0;
    let last = performance.now();
    let age = 0;

    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    function frame(now) {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      age += dt;

      ctx.clearRect(0, 0, state.w, state.h);
      ctx.globalCompositeOperation = "source-over";

      for (const p of bursts) {
        p.life -= dt;
        p.vy += p.g * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.spin * dt;

        const alpha = clamp(Math.min(1, p.life / 0.5), 0, 1);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size, -p.size * 0.5, p.size * 2, p.size);
        ctx.restore();
      }

      const alive = bursts.some((p) => p.life > 0 && p.y < state.h + 80);
      if (age < 1.8 && alive) {
        raf = requestAnimationFrame(frame);
      } else {
        stopCurrent();
      }
    }

    raf = requestAnimationFrame(frame);
    return { stop };
  }

  function makeGlowingBurst() {
    const particles = [];
    const cx = state.w * rand(0.35, 0.65);
    const cy = state.h * rand(0.30, 0.55);

    const count = clamp(Math.floor((state.w + state.h) / 8), 90, 170);
    for (let i = 0; i < count; i++) {
      const a = rand(0, Math.PI * 2);
      const sp = rand(120, 520);
      particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        drag: rand(1.6, 3.4),
        r: rand(2, 4.5),
        color: pick(palette),
        life: rand(0.9, 1.4),
      });
    }

    let raf = 0;
    let last = performance.now();
    let age = 0;

    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    function frame(now) {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      age += dt;

      ctx.clearRect(0, 0, state.w, state.h);
      ctx.globalCompositeOperation = "lighter";

      // soft halo
      const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(state.w, state.h) * 0.45);
      const haloAlpha = clamp(1 - age / 1.2, 0, 1) * 0.32;
      halo.addColorStop(0, `rgba(127,187,255,${haloAlpha})`);
      halo.addColorStop(0.35, `rgba(183,125,255,${haloAlpha * 0.75})`);
      halo.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, state.w, state.h);

      for (const p of particles) {
        p.life -= dt;
        const drag = Math.exp(-p.drag * dt);
        p.vx *= drag;
        p.vy *= drag;
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        const a = clamp(p.life / 0.8, 0, 1);
        ctx.globalAlpha = a;
        ctx.beginPath();
        ctx.fillStyle = p.color;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      const alive = particles.some((p) => p.life > 0);
      if (age < 1.35 && alive) {
        raf = requestAnimationFrame(frame);
      } else {
        stopCurrent();
      }
    }

    raf = requestAnimationFrame(frame);
    return { stop };
  }

  function runRandomAnimation() {
    stopCurrent();

    // Respect reduced motion. (Keep app functional, just skip effects.)
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const effects = [makeConfetti, makePartyPoppers, makeGlowingBurst];
    current = pick(effects)();
  }

  function showGreeting() {
    greeting.textContent = "Hello";
    greeting.hidden = false;
  }

  greetBtn.addEventListener("click", () => {
    // Keep name input in the UI as requested; greeting stays exactly "Hello".
    showGreeting();
    runRandomAnimation();
  });

  nameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      greetBtn.click();
    }
  });
})();
