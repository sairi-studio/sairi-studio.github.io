(() => {
  if ("scrollRestoration" in history) history.scrollRestoration = "manual"; scrollTo(0, 0);
  const S = window.SITE, W = window.WORKS || [], J = window.JOURNEY || [], G = window.GENRES;
  const $ = (q, el = document) => el.querySelector(q);
  const $$ = (q, el = document) => [...el.querySelectorAll(q)];
  const byId = Object.fromEntries(W.map(w => [w.id, w]));
  const MAN = {};
  const isBiz = document.body.dataset.page === "business";
  const hoverable = matchMedia("(hover:hover)").matches;
  let soundOn = false, revObs;

    $$(".js-name").forEach(e => e.textContent = S.name);
  $$(".js-role").forEach(e => e.textContent = S.role);
  $$(".js-since").forEach(e => e.textContent = S.since.replace("-", "."));
  $$(".js-tagline").forEach(e => e.textContent = S.tagline);
  const lx = $("#linkX"); if (lx) lx.href = S.links.x;
  document.querySelectorAll(".js-linkX").forEach(a => a.href = S.links.x);

  const ICON = k => `https://cdn.jsdelivr.net/npm/simple-icons@13.21.0/icons/${k}.svg`;
  const SNS = {
    x:         { name: "X",         color: "#ffffff" },
    tiktok:    { name: "TikTok",    color: "#ff0050" },
    spotify:   { name: "Spotify",   color: "#1ed760" },
    suno:      { name: "Suno",      color: "#ffffff" },
    youtube:   { name: "YouTube",   color: "#ff0000" },
    instagram: { name: "Instagram", color: "#ff0069" }
  };
  const snsList = Object.keys(S.links || {}).filter(k => SNS[k]);
  $$("[data-sns]").forEach(box => {
    const big = box.dataset.sns === "big";
    box.innerHTML = snsList.map(k => {
      const u = S.links[k], s = SNS[k];
      const ico = `<i class="sns__ico" style="--ico:url('${ICON(k)}');--brand:${s.color}"></i>`;
      const inner = ico + `<span class="sns__name">${s.name}</span>` + (u ? "" : `<em class="sns__soon mono">COMING SOON</em>`);
      if (!big && !u) return "";
      return u ? `<a class="sns sns--${k}" href="${u}" target="_blank" rel="noopener" aria-label="${s.name}">${inner}</a>`
               : `<span class="sns sns--${k} is-soon" aria-label="${s.name}（準備中）">${inner}</span>`;
    }).join("");
  });

  const fmtDur = s => s ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}` : "";
  const fmtDate = d => d.slice(0, 7).replace("-", ".");
  const media = w => `media/${w.media || w.id}`;
  const href = w => w.youtube || w.x || "";
  const pd = w => w.postedAt || w.date;
  const isLong = w => w.long ?? ((MAN[w.id]?.duration_sec || 0) >= 150);

    function card(w, opts = {}) {
    const a = document.createElement(href(w) ? "a" : "div");
    const poster = w.thumb || media(w) + ".jpg";
    const m = MAN[w.id], tall = (w.thumb ? w.thumbFit === "contain" : (m && m.height > m.width));
    a.className = `card g-${w.genre} reveal` + (opts.long && isLong(w) ? " is-long" : "") + (tall ? " is-tall" : "");
    if (tall) a.style.setProperty("--poster", `url(${new URL(poster, location.href).href})`);
    a.dataset.id = w.id; a.dataset.genre = w.genre;
    if (href(w)) { a.href = href(w); a.target = "_blank"; a.rel = "noopener"; }
    const dur = fmtDur(MAN[w.id]?.duration_sec);
    a.innerHTML = `
      ${opts.no ? `<span class="card__no">${opts.no}</span>` : ""}
      <div class="card__media">
        <img src="${poster}" alt="" loading="lazy" onerror="this.style.opacity=0">
        <span class="card__spin" aria-hidden="true"></span>
        <video muted playsinline loop preload="none" data-src="${media(w)}.mp4?b=${MAN[w.id]?.preview_bytes || 0}"></video>
        <div class="card__badges">${w.style === "live" ? `<span class="badge">実写</span>` : ""}</div>
        <span class="card__tc">${dur}</span>
      </div>
      <div class="card__meta">
        <div><h3 class="card__title">${w.title}</h3><p class="card__sub">${pd(w).replace(/-/g, ".")}${w.showSub && w.sub ? ` · ${w.sub}` : ""}</p></div>
        <span class="card__genre">${G[w.genre]?.label || ""}</span>
      </div>
      ${opts.note ? `<p class="card__learn">${opts.note}</p>`
        : (w.learned && !opts.noLearn ? `<p class="card__learn"><b>学んだこと</b>${w.learned}</p>` : "")}`;
    bindPlay(a, w);
    return a;
  }

    let current = null;
  let sharedV = null;
  const vid = el => (sharedV && el.contains(sharedV)) ? sharedV : $("video", el);
  function playShared(el) {
    const own = $("video", el); if (!own) return;
    if (!sharedV) {
      sharedV = document.createElement("video"); sharedV.loop = true; sharedV.playsInline = true; sharedV.setAttribute("playsinline", ""); sharedV.preload = "auto";
      sharedV.addEventListener("waiting", () => current && current.classList.add("is-buffering"));
      sharedV.addEventListener("playing", () => current && current.classList.remove("is-buffering"));
    }
    el.classList.add("is-buffering");
    if (sharedV.previousElementSibling !== own) own.after(sharedV);
    const src = own.dataset.src; if (sharedV.getAttribute("src") !== src) sharedV.src = src;
    sharedV.muted = !(soundOn && touched);
    const ok = () => el.classList.add("is-playing");
    sharedV.play().then(ok).catch(() => { sharedV.muted = true; sharedV.play().then(ok).catch(() => {}); });
    current = el;
  }
  function play(el) {
    if (current && current !== el) stop(current);
    if (!hoverable) return playShared(el);
    const v = $("video", el); if (!v) return;
    el.classList.add("is-buffering");
    if (!v._buf) { v._buf = 1; v.addEventListener("waiting", () => el.classList.add("is-buffering")); v.addEventListener("playing", () => el.classList.remove("is-buffering")); }
    if (!v.src) v.src = v.dataset.src;
    v.muted = hoverable ? !soundOn : !(soundOn && touched); v.volume = 0;
    v.play().then(() => { el.classList.add("is-playing"); fade(v, soundOn ? .9 : 0); }).catch(() => {
      v.muted = true; v.play().then(() => el.classList.add("is-playing")).catch(() => {});
    });
    current = el;
  }
  function stop(el, now) {
    const v = vid(el); el.classList.remove("is-playing", "is-buffering");
    if (v) { if (now || !hoverable) { cancelAnimationFrame(v._f); v.pause(); } else fade(v, 0, () => v.pause()); }
    if (current === el) current = null;
  }
  function unload(el) {
    const v = vid(el); if (!v || !v.getAttribute("src")) return;
    v.pause(); v.removeAttribute("src"); try { v.load(); } catch (e) {}
  }
  function fade(v, to, done) {
    cancelAnimationFrame(v._f);
    let n = 0;
    const step = () => {
      v.volume = Math.max(0, Math.min(1, v.volume + (to > v.volume ? .06 : -.08)));
      if (Math.abs(v.volume - to) > .05 && ++n < 40) v._f = requestAnimationFrame(step); else { try { v.volume = to; } catch (e) {} done && done(); }
    };
    step();
  }
  function bindPlay(el, w) {
    if (hoverable) {
      el.addEventListener("mouseenter", () => {
        const v = $("video", el); if (v && !v.src) { v.preload = "auto"; v.src = v.dataset.src; }
        setCursor("まもなく\n再生", "wait");
        clearTimeout(el._wait);
        el._wait = setTimeout(() => { play(el); setCursor(href(w) ? "クリックで\n本編へ" : "COMING\nSOON"); }, 1000);
      });
      el.addEventListener("mouseleave", () => { clearTimeout(el._wait); stop(el); setCursor(""); });
    } else {
      autoObs.observe(el);
      $(".card__media", el).insertAdjacentHTML("beforeend",
        `<span class="card__pause" aria-hidden="true">❚❚</span><div class="card__ctrl"><button type="button" class="card__resume" aria-label="もう一度再生">▶</button>${href(w) ? `<span class="card__go">X で本編を見る →</span>` : `<span class="card__go is-soon">COMING SOON</span>`}</div>`);
      el.addEventListener("click", e => {
        e.preventDefault();
        if (e.target.closest(".card__go")) { if (href(w)) openPost(href(w), w.title); return; }
        if (el.classList.contains("is-paused")) { el.classList.remove("is-paused"); el._userPaused = false; play(el); }
        else { stop(el, true); el.classList.add("is-paused"); el._userPaused = true; }
      });
    }
  }
    let postBox = null;
  function openPost(url, title) {
    if (current) stop(current, true);
    if (!postBox) {
      postBox = document.createElement("div"); postBox.className = "post-modal";
      postBox.innerHTML = `<div class="post-modal__bar"><b class="post-modal__title"></b><a class="post-modal__open" target="_blank" rel="noopener">X で開く ↗</a><button type="button" class="post-modal__close" aria-label="閉じる">×</button></div><div class="post-modal__body"></div>`;
      document.body.append(postBox);
      $(".post-modal__close", postBox).addEventListener("click", closePost);
      postBox.addEventListener("click", e => { if (e.target === postBox) closePost(); });
    }
    $(".post-modal__title", postBox).textContent = title || "";
    $(".post-modal__open", postBox).href = url;
    const body = $(".post-modal__body", postBox);
    const tw = url.replace("://x.com/", "://twitter.com/");
    body.innerHTML = `<blockquote class="twitter-tweet" data-theme="dark" data-lang="ja" data-dnt="true"><a href="${tw}">${title || "X の投稿"}</a></blockquote><p class="post-modal__wait">読み込み中…</p>`;
    postBox.classList.add("is-open"); document.documentElement.classList.add("no-scroll");
    const load = () => window.twttr.widgets.load(body).then(() => { const w = $(".post-modal__wait", body); w && w.remove(); });
    if (window.twttr && window.twttr.widgets) load();
    else if (!openPost._s) {
      openPost._s = document.createElement("script"); openPost._s.src = "https://platform.twitter.com/widgets.js"; openPost._s.async = true;
      openPost._s.onload = () => window.twttr.ready(load); document.head.append(openPost._s);
    } else window.twttr && window.twttr.ready && window.twttr.ready(load);
  }
  function closePost() {
    if (!postBox) return;
    postBox.classList.remove("is-open"); document.documentElement.classList.remove("no-scroll");
    $(".post-modal__body", postBox).innerHTML = "";
  }
  addEventListener("keydown", e => { if (e.key === "Escape") closePost(); });

  let touched = false;
  addEventListener("touchstart", () => {
    touched = true;
    if (current && soundOn) { const v = vid(current); if (v) { if (v.muted) v.muted = false; if (v.paused && !current._userPaused) v.play().catch(() => {}); } }
  }, { passive: true, capture: true });
  const retry = () => {
    if (hoverable) return;
    const c = $$(".card.is-center").filter(x => x.isConnected && !x._userPaused).pop(); if (!c) return;
    $$(".card.is-playing").forEach(x => { if (x !== c) stop(x, true); });
    const v = vid(c); if (!v || v.paused || !c.classList.contains("is-playing")) play(c);
  };
  ["touchend", "scroll"].forEach(ev => addEventListener(ev, () => { clearTimeout(retry._t); retry._t = setTimeout(retry, 250); }, { passive: true, capture: true }));
  const autoObs = new IntersectionObserver(es => es.forEach(e => {
    const el = e.target;
    el.classList.toggle("is-center", e.isIntersecting);
    clearTimeout(el._t);
    if (e.isIntersecting) { el._t = setTimeout(() => { if (el.isConnected && el.classList.contains("is-center") && !el._userPaused) play(el); }, 350); }
    else { stop(el, true); unload(el); el._userPaused = false; el.classList.remove("is-paused"); }
  }), { rootMargin: "-46% -46% -46% -46%" });

    const st = $("#soundToggle");
  function setSound(on) {
    soundOn = on;
    if (st) { st.setAttribute("aria-pressed", on); $(".lbl", st).textContent = on ? "SOUND ON" : "SOUND OFF"; }
    if (current) { const v = vid(current); v.muted = !on; fade(v, on ? .9 : 0); }
    if (heroV) heroV.muted = true;
  }
  st && st.addEventListener("click", () => setSound(!soundOn));
  const saved = (() => { try { return sessionStorage.getItem("sound"); } catch (e) { return null; } })();
  if (isBiz || saved) setTimeout(() => setSound(saved ? saved === "on" : true));
  const _set = setSound;
  setSound = on => { _set(on); try { sessionStorage.setItem("sound", on ? "on" : "off"); } catch (e) {} };
  const unlock = () => { if (soundOn && current) { const v = vid(current); if (v && v.muted) { v.muted = false; fade(v, .9); } } };
  addEventListener("pointerdown", unlock, true); addEventListener("keydown", unlock, true);

    const cur = $("#cursor");
  const cpos = { x: -100, y: -100, tx: -100, ty: -100 };
  function setCursor(t, mode) {
    if (!cur) return;
    cur.classList.toggle("is-play", !!t);
    cur.classList.remove("is-wait");
    if (mode === "wait") { void cur.offsetWidth; cur.classList.add("is-wait"); }
    $(".cursor__label", cur).textContent = t;
  }
  if (cur && hoverable) {
    addEventListener("pointermove", e => { cpos.tx = e.clientX; cpos.ty = e.clientY; });
    (function cl() { cpos.x += (cpos.tx - cpos.x) * .2; cpos.y += (cpos.ty - cpos.y) * .2; cur.style.transform = `translate(${cpos.x}px,${cpos.y}px)`; requestAnimationFrame(cl); })();
  }

    const heroV = $("#heroVideo"), heroReel = $("#heroReel");
  let gl = null, heroIdx = 0, heroTimer;
  const picks = (S.pickup || []).map(id => byId[id]).filter(Boolean);
  function heroGo(i) {
    if (!picks.length || !heroV) return;
    heroIdx = (i + picks.length) % picks.length;
    const w = picks[heroIdx];
    heroV.onerror = () => { heroV.onerror = null; heroV.src = media(w) + ".mp4"; heroV.play().catch(() => {}); };
    heroV.src = `media/hero/${w.id}.mp4`; heroV.poster = `media/hero/${w.id}.jpg`;
    heroV.play().catch(() => {});
    gl && gl.pulse();
    $$(".reel-item", heroReel).forEach((r, k) => {
      r.classList.toggle("is-on", k === heroIdx);
      const bar = $("i", r); bar.style.transition = "none"; bar.style.width = k < heroIdx ? "100%" : "0";
    });
  }
  if (heroV && picks.length) {
    heroReel.innerHTML = picks.map((w, k) => `<button class="reel-item" data-k="${k}"><i></i><span class="mono">${String(k + 1).padStart(2, "0")}</span><span>${w.title}</span></button>`).join("");
    heroReel.addEventListener("click", e => { const b = e.target.closest(".reel-item"); if (b) heroGo(+b.dataset.k); });
    heroV.addEventListener("timeupdate", () => {
      const bar = $(`.reel-item.is-on i`, heroReel);
      if (bar && heroV.duration) { bar.style.transition = "width .25s linear"; bar.style.width = (heroV.currentTime / heroV.duration * 100) + "%"; }
    });
    heroV.addEventListener("ended", () => heroGo(heroIdx + 1));
    const canvas = $("#heroGL");
    const okGL = location.protocol !== "file:";
    gl = okGL ? window.HeroGL(canvas, heroV) : null;
    if (!gl) $(".hero").classList.add("no-gl");
    canvas.addEventListener("glfail", () => $(".hero").classList.add("no-gl"));
    let sx = null;
    $(".hero").addEventListener("pointerdown", e => { if (!e.target.closest("button,a")) sx = e.clientX; });
    addEventListener("pointerup", e => { if (sx !== null && Math.abs(e.clientX - sx) > 60) heroGo(heroIdx + (e.clientX < sx ? 1 : -1)); sx = null; });
  }

    const awards = $("#awards");
  if (awards) {
    const hs = (S.highlights || []).filter(h => byId[h.work]);
    awards.dataset.n = hs.length;
    const laurel = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M7 20c-3-3-4-8-2-13M17 20c3-3 4-8 2-13M5 11c1 .5 2 .5 3 0M4 15c1.2.2 2.2 0 3-.6M19 11c-1 .5-2 .5-3 0M20 15c-1.2.2-2.2 0-3-.6M9 21h6"/></svg>`;
    hs.forEach(h => {
      const w = byId[h.work];
      const box = document.createElement("article"); box.className = "award reveal";
      const c = card(w, { noLearn: true, thumb: true });
      $(".card__sub", c)?.remove(); $(".card__genre", c)?.remove();
      box.append(c);
      const info = document.createElement("div"); info.className = "award__info";
      info.innerHTML = `<p class="award__event laurel">${laurel}${h.event}</p>
        <p class="award__result">${h.result}</p><p class="award__note">${h.note || ""}</p>`;
      box.append(info); awards.append(box);
    });
  }
  const pk = $("#picks");
  if (pk) picks.forEach((w, k) => pk.append(card(w, { no: String(k + 1).padStart(2, "0"), note: (S.pickupNotes || {})[w.id], thumb: true })));

    const lib = $("#library"), libTabs = $("#libTabs");
  const TABS = [
    { k: "all",    label: "すべて",           f: () => true },
    { k: "mv",     label: "ミュージックビデオ", f: w => w.genre === "mv" },
    { k: "anime",  label: "オリジナルアニメ",   f: w => w.genre === "anime" },
    { k: "short",  label: "ショート動画",       f: w => w.genre === "short" },
    { k: "making", label: "メイキング映像",     f: w => w.genre === "making" },
    { k: "music",  label: "楽曲提供",          f: w => w.genre === "music", always: true, empty: "楽曲提供" }
  ];
  const LIB = W.filter(w => !w.hidden && w.lib !== false);
  const extra = [...new Set(LIB.map(w => w.libShelf).filter(Boolean))];
  const SHELVES = [
    { t: "新着", f: () => true, max: 12 },
    ...TABS.slice(1).map(t => ({ t: t.label, f: w => !w.libShelf && t.f(w), empty: t.empty })),
    ...extra.map(x => ({ t: x, f: w => w.libShelf === x }))
  ];
  function tile(w) {
    const c = card(w, { noLearn: true }); c.classList.remove("reveal"); c.classList.add("tile");
    const m = MAN[w.id];
    $(".card__meta", c).insertAdjacentHTML("afterend", `<div class="tile__more"><span>${G[w.genre]?.ja || ""}</span><span>${fmtDate(pd(w))}</span>${m ? `<span>${fmtDur(m.duration_sec)}</span>` : ""}</div>`);
    return c;
  }
  function renderLib(tabKey) {
    if (!lib) return;
    const tab = TABS.find(t => t.k === tabKey) || TABS[0];
    $$(".card", lib).forEach(c => { autoObs.unobserve(c); clearTimeout(c._t); stop(c, true); unload(c); });
    lib.innerHTML = "";
    const newest = (a, b) => pd(b).localeCompare(pd(a));
    if (tabKey !== "all") {
      const items = LIB.filter(w => tab.f(w)).sort(newest);
      if (!items.length) { lib.innerHTML = `<p class="lib-empty">${tab.empty || "準備中です。"}<span class="mono">COMING SOON</span></p>`; return; }
      const g = document.createElement("div"); g.className = "lib-grid";
      items.forEach(w => g.append(tile(w))); lib.append(g); return;
    }
    SHELVES.forEach(s => {
      let items = LIB.filter(s.f).sort(newest);
      if (s.max) items = items.slice(0, s.max);
      if (!items.length && !s.empty) return;
      const row = document.createElement("section"); row.className = "shelf";
      row.innerHTML = `<div class="shelf__head"><h3>${s.t}</h3><span class="mono">${items.length}</span><div class="shelf__nav"><button aria-label="前へ">‹</button><button aria-label="次へ">›</button></div></div><div class="shelf__row"></div>`;
      const r = $(".shelf__row", row); items.forEach(w => r.append(tile(w)));
      if (!items.length) {
        $(".shelf__head .mono", row).textContent = "";
        r.innerHTML = `<div class="tile tile--soon"><div class="card__media"><span class="mono">COMING SOON</span></div></div>`;
      }
      const [prev, next] = $$(".shelf__nav button", row);
      prev.onclick = () => r.scrollBy({ left: -r.clientWidth * .85, behavior: "smooth" });
      next.onclick = () => r.scrollBy({ left: r.clientWidth * .85, behavior: "smooth" });
      lib.append(row);
    });
  }
  if (libTabs) {
    libTabs.innerHTML = TABS.filter(t => t.k === "all" || t.always || LIB.some(w => t.f(w)))
      .map(t => `<button class="ltab" role="tab" aria-selected="${t.k === "all"}" data-k="${t.k}">${t.label}</button>`).join("");
    libTabs.addEventListener("click", e => {
      const b = e.target.closest(".ltab"); if (!b) return;
      $$(".ltab", libTabs).forEach(x => x.setAttribute("aria-selected", x === b));
      renderLib(b.dataset.k);
      $("#works").scrollIntoView({ behavior: "smooth" });
    });
    renderLib("all");
  }

    const grid = $("#grid"), filters = $("#filters");
  if (grid) {
    const list = W.filter(w => !w.hidden && (isBiz ? !!w.client : true));
    const sorted = () => [...list].sort((a, b) => pd(b).localeCompare(pd(a)));
    const render = () => { grid.innerHTML = ""; sorted().forEach(w => grid.append(card(w, { long: true }))); observeReveal(); };
    if (filters && !isBiz) {
      const gs = ["all", ...Object.keys(G).filter(g => list.some(w => w.genre === g))];
      filters.innerHTML = gs.map(g => `<button class="chip" role="tab" aria-selected="${g === "all"}" data-g="${g}">${g === "all" ? "All" : G[g].label}<sup>${g === "all" ? list.length : list.filter(w => w.genre === g).length}</sup></button>`).join("");
      filters.addEventListener("click", e => {
        const b = e.target.closest(".chip"); if (!b) return;
        $$(".chip", filters).forEach(c => c.setAttribute("aria-selected", c === b));
        const g = b.dataset.g;
        $$(".card", grid).forEach(c => c.classList.toggle("is-hidden", g !== "all" && c.dataset.genre !== g));
      });
    }
    grid._render = render; render();
  }

    $$(".cases[data-biz]").forEach(box => {
    W.filter(w => !w.hidden && w.biz === box.dataset.biz).sort((a, b) => (a.bizOrder || 0) - (b.bizOrder || 0) || pd(b).localeCompare(pd(a))).forEach(w => {
      const row = document.createElement("article");
      row.className = "case";
      row.append(card(w, { noLearn: true }));
      const t = document.createElement("div");
      t.className = "case__text reveal";
      t.innerHTML = (w.bizText || []).map(([k, v]) => `<p class="case__label">${k}</p><p class="case__body">${v}</p>`).join("");
      row.append(t); box.append(row);
    });
  });

    const tl = $("#timeline"), jsec = $("#journey");
  const jx = Object.fromEntries(J.filter(j => j.work).map(j => [j.work, j]));
  const JL = W.filter(w => !w.hidden && w.journey !== false && w.x)
    .map(w => ({ ...(jx[w.id] || {}), work: w.id, date: w.postedAt || w.date, learn: jx[w.id]?.learn || w.learned || "" }))
    .sort((a, b) => a.date.localeCompare(b.date));
  const skillsAll = [...new Set(JL.flatMap(j => j.skills || []))];
  if (tl && JL.length) {
    $$(".js-skill-total").forEach(e => e.textContent = skillsAll.length);
    $$(".tl-sum__list").forEach(e => e.innerHTML = skillsAll.map(s => `<li>${s}</li>`).join(""));
    let mon0 = "";
    JL.forEach(j => {
      const w = byId[j.work];
      const mon = j.date.slice(0, 7);
      if (mon !== mon0) {
        const n = JL.filter(x => x.date.startsWith(mon)).length;
        tl.insertAdjacentHTML("beforeend", `<div class="tl__month"><span class="tl__dot"></span><b>${+mon.slice(5)}月</b><span>${n}本を投稿</span></div>`);
        mon0 = mon;
      }
      const el = document.createElement("article");
      const d = `${+j.date.slice(5, 7)}/${+j.date.slice(8, 10)}`;
      el.className = `tl__item g-${w.genre}` + (j.learn ? " is-learn" : " is-mini");
      const head = `<p class="tl__date"><span class="mono">${d}</span><b class="tl__title">『${w.title}』</b></p>`;
      if (j.learn) {
        el.innerHTML = `<span class="tl__dot"></span>
          <div class="tl__text">${head}
            <p class="tl__q">何を学んだか</p>
            <h3 class="tl__learn">${j.learn}</h3>
          </div>`;
        const c = card(w, { noLearn: true }); c.classList.remove("reveal"); $(".card__meta", c)?.remove(); c.classList.add("tl__card");
        el.append(c);
      } else {
        el.innerHTML = `<span class="tl__dot"></span>`;
        const c = card(w, { noLearn: true }); c.classList.remove("reveal"); $(".card__meta", c)?.remove(); c.classList.add("tl__mini");
        c.insertAdjacentHTML("beforeend", head);
        el.append(c);
      }
      tl.append(el);
    });

    const fill = $(".tl__fill", tl);
    jsec._update = () => {
      const r = tl.getBoundingClientRect(), line = innerHeight * .6;
      const h = Math.min(r.height, Math.max(0, line - r.top));
      fill.style.height = h + "px";
      $$(".tl__item, .tl__month", tl).forEach(it => {
        const on = it.getBoundingClientRect().top + 14 < line;
        if (on && !it.classList.contains("is-on")) it.classList.add("is-on");
        else if (!on) it.classList.remove("is-on");
      });
    };
    $$(".js-tl-count").forEach(e => e.textContent = JL.length);
    $$(".js-all-count").forEach(e => e.textContent = W.filter(w => !w.hidden).length);
    const fmtM = d => d.slice(0, 7).replace("-", ".");
    $$(".js-tl-from").forEach(e => e.textContent = fmtM(JL[0].date));
    $$(".js-tl-to").forEach(e => e.textContent = fmtM(JL[JL.length - 1].date));
    const strip = $(".tl-btn__strip");
    if (strip) {
      const n = Math.min(12, JL.length);
      strip.innerHTML = Array.from({ length: n }, (_, i) => JL[Math.round(i * (JL.length - 1) / (n - 1))])
        .map(j => `<img src="${media(byId[j.work])}.jpg" alt="" loading="lazy">`).join("");
    }
  }

    const tlWrap = $("#tlWrap"), tlToggle = $("#tlToggle");
  function setJourney(open) {
    if (!tlWrap) return;
    document.body.classList.toggle("tl-open", open);
    tlToggle.setAttribute("aria-expanded", open);
    if (!open) $("#tlSum").scrollIntoView({ behavior: "smooth", block: "center" });
    jsec && jsec._update && jsec._update();
  }
  tlToggle && tlToggle.addEventListener("click", () => setJourney(!document.body.classList.contains("tl-open")));
  $$("[data-close]").forEach(b => b.addEventListener("click", () => setJourney(false)));

    const dock = $("#dock");
  function updateDock() {
    if (!dock) return;
    const heroH = innerHeight * .6;
    dock.classList.toggle("is-show", scrollY > heroH);
    const lib = $("#works")?.getBoundingClientRect();
    dock.classList.toggle("in-lib", !!lib && lib.top < innerHeight * .5);
    const jr = tlWrap?.getBoundingClientRect();
    const inTl = !!jr && document.body.classList.contains("tl-open") && jr.top < innerHeight * .5 && jr.bottom > innerHeight * .5;
    dock.classList.toggle("in-tl", inTl);
    document.body.classList.toggle("in-tl", inTl);
  }
  $$("[data-go]").forEach(b => b.addEventListener("click", () => {
    const to = b.dataset.go === "top" ? $("#journey") : $(".tl-end");
    to && to.scrollIntoView({ behavior: "smooth", block: b.dataset.go === "top" ? "start" : "end" });
  }));
  addEventListener("scroll", () => requestAnimationFrame(updateDock), { passive: true });

    const stats = $("#stats");
  if (stats) {
    const months = (() => { const a = new Date(S.since + "-01"), b = new Date(); return (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth() + 1; })();
    const num = (n, unit) => `<b data-to="${n}">0</b><small>${unit}</small>`;
    const items = [
      ["投稿作品", num(W.filter(w => !w.hidden).length, "本")],
      ["動画生成AIの制作歴", num(Math.floor(months / 12), "年") + num(months % 12, "か月")],
      ["勉強したテーマ", num(JL.length, "")],
      ["コンテスト実績", num((S.highlights || []).length, "")]
    ];
    stats.innerHTML = items.map(([l, v]) => `<div class="stat"><span>${l}</span><p class="stat__v">${v}</p></div>`).join("");
  }

  
  function observeReveal() {
    revObs = revObs || new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add("is-in"); revObs.unobserve(e.target);
      $$("b[data-to]", e.target).forEach(countUp);
    }), { rootMargin: "0px 0px -8% 0px" });
    $$(".reveal:not(.is-in), .stat").forEach(el => revObs.observe(el));
  }
  function countUp(b) {
    const to = +b.dataset.to, t0 = performance.now();
    (function f(t) { const k = Math.min(1, (t - t0) / 1400); b.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(f); })(t0);
  }
  observeReveal();

  const tcEl = $(".js-tc"), secEl = $(".js-sec"), secs = $$("[data-sec]");
  const tc = px => { const f = Math.floor(px / 6); const ff = f % 24, s = Math.floor(f / 24); return [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60, ff].map(n => String(n).padStart(2, "0")).join(":"); };
  function onScroll() {
    if (tcEl) tcEl.textContent = tc(scrollY);
    if (secEl) { let cur = secs[0]; secs.forEach(s => { if (s.getBoundingClientRect().top < innerHeight * .5) cur = s; }); secEl.textContent = cur?.dataset.sec || ""; }
    jsec && jsec._update && jsec._update();
  }
  addEventListener("scroll", () => requestAnimationFrame(onScroll), { passive: true });
  const endTc = $(".foot__row span:last-child"); if (endTc) endTc.textContent = "END OF REEL — " + tc(document.documentElement.scrollHeight - innerHeight);

    fetch("data/media_manifest.json", { cache: "no-cache" }).then(r => r.json()).then(list => {
    (Array.isArray(list) ? list : list.items || []).forEach(m => MAN[m.id] = m);
    $$(".card").forEach(c => { const v = $("video", c), b = MAN[c.dataset.id]?.preview_bytes; if (v && b && !v.src) v.dataset.src = v.dataset.src.replace(/\?b=\d+/, `?b=${b}`);
      const d = MAN[c.dataset.id]?.duration_sec; const t = $(".card__tc", c); if (t && d) t.textContent = fmtDur(d); });
    grid && grid._render && grid._render();
    libTabs && renderLib($('.ltab[aria-selected="true"]')?.dataset.k || "all");
  }).catch(() => {});

    $$(".split").forEach(s => { s.innerHTML = [...s.textContent].map(c => `<span class="ch">${c}</span>`).join(""); $$(".ch", s).forEach((c, i) => c.style.transitionDelay = (0.25 + i * 0.06) + "s"); });

    const slate = $("#slate");
  function enter(sound) {
    setSound(sound);
    slate && slate.classList.add("is-clap");
    setTimeout(() => {
      slate && slate.classList.add("is-out");
      document.body.classList.remove("is-loading"); document.body.classList.add("is-in");
      heroGo(0); onScroll();
    }, slate ? 260 : 0);
  }
  if (slate) {
    const shown = W.filter(w => !w.hidden);
    $(".js-count", slate).textContent = shown.length;
    $$(".js-name-ja").forEach(e => e.textContent = S.nameJa || "");
    $$(".js-handle").forEach(e => e.textContent = S.handle || "");
    $(".js-since-slate", slate).textContent = S.since.replace("-", ".");
    const latest = [...shown].sort((a, b) => pd(b).localeCompare(pd(a)))[0];
    if (latest) $(".js-latest", slate).textContent = pd(latest).replace(/-/g, ".");
    const stc = $(".js-slate-tc", slate), t0 = performance.now();
    let raf; (function f(t) { const fr = Math.floor((t - t0) / 1000 * 24); stc.textContent = tc(fr * 6); raf = requestAnimationFrame(f); })(t0);
    setTimeout(() => slate.classList.add("is-ready"), 500);
    $$(".btn-enter", slate).forEach(b => b.addEventListener("click", () => { cancelAnimationFrame(raf); enter(b.dataset.sound === "on"); }));
  } else { enter(false); }
})();
