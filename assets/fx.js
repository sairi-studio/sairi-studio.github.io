(() => {
  const $ = s => document.querySelector(s);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

    const hud = $(".hud");
  if (hud) {
    const check = () => {
      const y = hud.offsetHeight + 4;
      const el = document.elementFromPoint(innerWidth / 2, y);
      hud.classList.toggle("is-dark", !!(el && el.closest(".hero,.library,.foot,.slate")));
    };
    addEventListener("scroll", () => requestAnimationFrame(check), { passive: true });
    addEventListener("resize", check); setTimeout(check, 300);
  }

    const box = $(".chibi"), shadow = $(".chibi__shadow");
  if (!box || reduce) return;
  const img = box.querySelector("img"), say = box.querySelector(".chibi__say");
  const SRC = { front: "assets/chibi/front.png", side: "assets/chibi/side.png", back: "assets/chibi/back.png",
                happy: "assets/chibi/happy.png", kiri: "assets/chibi/kiri.png", think: "assets/chibi/think.png" };
  const ORIGH = { front: 1079, side: 1079, back: 1079, happy: 956, kiri: 1045, think: 1045 };
  Object.values(SRC).forEach(s => { const i = new Image(); i.src = s; });
  const touch = matchMedia("(hover: none)").matches;
  const HS = touch ? 118 : 140;
  const W = HS * .45;
  box.style.width = "auto";

  const p = { x: 70, y: innerHeight - 30, vx: 0, vy: 0 };
  const target = { x: p.x, y: p.y };
  let talked = false, pose = "front", flip = 1, phase = 0, lastStep = 0, idleT = 0, hopT = -1, sayT = 0;

  function setPose(n) { if (n !== pose) { pose = n; img.src = SRC[n]; img.style.height = Math.round(ORIGH[n] / 1079 * HS) + "px"; img.style.width = "auto"; } }
  img.style.height = HS + "px"; img.style.width = "auto";
    let overCard = false, mood = "", moodT = 0, fxT = 0;
  addEventListener("pointerover", e => { overCard = !!(e.target.closest && e.target.closest(".card,.tl-btn")); }, { passive: true });
  const inRect = (el, x, y, padTop = 0) => { if (!el) return false; const r = el.getBoundingClientRect(); return x >= r.left - 40 && x <= r.right + 40 && y >= r.top - padTop && y <= r.bottom + 40; };
  const aboutEl = $("#about"), journeyEl = $("#journey");
  function puff(ch, cls) {
    const f = document.createElement("span"); f.className = "chibi__fx " + (cls || ""); f.textContent = ch;
    const h = box.offsetHeight || W * 2.2;
    f.style.left = (p.x + (Math.random() - .5) * W * .9) + "px"; f.style.top = (p.y - h * .85 + (Math.random() - .5) * 16) + "px";
    document.body.append(f); f.addEventListener("animationend", () => f.remove());
  }
  function talk(t, ms = 1600) { say.textContent = t; box.classList.add("is-say"); sayT = performance.now() + ms; }

  if (!touch) {
    addEventListener("pointermove", e => {
      target.x = e.clientX - (overCard ? 96 : 46); target.y = e.clientY + (overCard ? 84 : 70);
    }, { passive: true });
  } else {
    addEventListener("pointerdown", e => { target.x = e.clientX; target.y = Math.min(e.clientY + 60, innerHeight - 20); }, { passive: true });
  }
  addEventListener("pointerdown", () => { if (!touch) hopT = 0; });

  const cur = $("#cursor");
  if (cur) new MutationObserver(() => {
    if (cur.classList.contains("is-play") && !cur.classList.contains("is-wait") && Math.random() < .5) talk("♪");
  }).observe(cur, { attributes: true, attributeFilter: ["class"] });

    let rects = [], rectT = 0;
  function avoidCards(x, y, now) {
    if (now - rectT > 120) {
      rectT = now;
      rects = [...document.querySelectorAll(".card__media")].filter(m => !m.closest("#journey"))
        .map(m => m.getBoundingClientRect()).filter(r => r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth);
    }
    const h = HS, half = W / 2;
    for (let k = 0; k < 4; k++) {
      const r = rects.find(r => x + half > r.left && x - half < r.right && y > r.top && y - h < r.bottom);
      if (!r) break;
      const below = r.bottom + h + 6, above = r.top - 6;
      const okB = below <= innerHeight - 8, okA = above - h >= 60;
      if (okB && (!okA || Math.abs(below - y) <= Math.abs(y - above))) y = below; else if (okA) y = above; else break;
    }
    return [x, y];
  }

  let last = performance.now();
  (function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(48, now - last) / 16.67; last = now;
    if (document.body.classList.contains("is-loading")) { box.style.opacity = 0; shadow.style.opacity = 0; return; }
    box.style.opacity = 1; shadow.style.opacity = 1;

    let tx = Math.max(W / 2, Math.min(innerWidth - W / 2, target.x));
    let ty = Math.max(150, Math.min(innerHeight - 8, target.y));
    if (touch) [tx, ty] = avoidCards(tx, ty, now);
    const dx = tx - p.x, dy = ty - p.y, dist = Math.hypot(dx, dy);
    const maxV = 10, acc = .9;
    if (dist > 6) {
      p.vx += (dx / dist) * acc * dt; p.vy += (dy / dist) * acc * dt;
      const sp = Math.hypot(p.vx, p.vy), lim = Math.min(maxV, dist * .16 + 1.5);
      if (sp > lim) { p.vx *= lim / sp; p.vy *= lim / sp; }
    } else { p.vx *= .6; p.vy *= .6; }
    p.vx *= .92; p.vy *= .92;
    p.x += p.vx * dt; p.y += p.vy * dt;

    const speed = Math.hypot(p.vx, p.vy);
    const running = speed > .8;
    let bob = 0, tilt = 0, sq = 1, want = null;
    if (running) {
      idleT = 0; talked = false;
      phase += speed * .055 * dt;
      const s = Math.sin(phase * Math.PI * 2);
      bob = Math.abs(s) * Math.min(9, 3 + speed * .7);
      sq = 1 - (1 - Math.abs(s)) * .05;
      if (Math.abs(p.vx) > Math.abs(p.vy) * .55) { setPose("side"); flip = p.vx < 0 ? -1 : 1; tilt = flip * Math.min(8, speed * .9); }
      else { setPose(p.vy < 0 ? "back" : "front"); flip = 1; tilt = Math.max(-5, Math.min(5, p.vx * .8)); }
      const stepIdx = Math.floor(phase * 2);
      if (stepIdx !== lastStep) { lastStep = stepIdx; dispatchEvent(new CustomEvent("chibi-step", { detail: { x: p.x, y: p.y, power: Math.min(1, speed / maxV) } })); }
    } else {
      idleT += dt;
      want = "front"; flip = 1;
      bob = Math.sin(now / 520) * 1.2 + 1.2;
    }
    const m = overCard ? "happy" : inRect(aboutEl, p.x, p.y) ? "kiri" : inRect(journeyEl, p.x, p.y) ? "think" : "";
    if (m !== mood) {
      mood = m; moodT = 0; box.classList.toggle("is-think", m === "think");
      if (m === "kiri") { talk("キリッ", 1300); for (let i = 0; i < 4; i++) setTimeout(() => puff("✦", "is-spark"), i * 90); }
      if (m === "happy") puff("♡", "is-heart");
      if (m === "think") { say.textContent = "…"; box.classList.add("is-say"); sayT = 0; }
      else if (box.classList.contains("is-say") && say.textContent === "…") box.classList.remove("is-say");
    }
    moodT += dt;
    if (mood === "happy") {
      if (!running) { want = "happy"; bob = Math.abs(Math.sin(now / 150)) * 10; sq = 1 + Math.sin(now / 75) * .03; }
      if (now > fxT) { puff("♡", "is-heart"); fxT = now + 520; }
    } else if (mood === "kiri" && !running) {
      want = "kiri"; sq = 1.04; tilt = -2; bob = 2;
      if (now > fxT) { puff("✦", "is-spark"); fxT = now + 1400; }
    } else if (mood === "think" && !running) {
      want = "think"; tilt = Math.sin(now / 900) * 3; bob = 1;
    }
    if (want) setPose(want);
    if (hopT >= 0) { hopT += dt; const h = Math.sin(Math.min(1, hopT / 14) * Math.PI); bob += h * 22; if (hopT >= 14) { hopT = -1; dispatchEvent(new CustomEvent("chibi-step", { detail: { x: p.x, y: p.y, power: 1 } })); } }
    if (sayT && now > sayT) { box.classList.remove("is-say"); sayT = 0; }

    const h = box.offsetHeight || W * 2.2;
    box.style.transform = `translate(${p.x - (box.offsetWidth || W) / 2}px,${p.y - h - bob}px) rotate(${tilt}deg) scale(${flip},${sq})`;
    say.style.transform = flip < 0 ? "translateX(-50%) scale(-1,1)" : "";
    const sh = 1 - Math.min(.5, bob / 40);
    shadow.style.transform = `translate(${p.x}px,${p.y}px) scale(${sh})`;
  })(last);
})();
