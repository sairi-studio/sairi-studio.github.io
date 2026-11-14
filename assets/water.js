window.HeroGL = function (canvas, video) {
  const gl = canvas.getContext("webgl2", { premultipliedAlpha: false, antialias: false });
  if (!gl) return window.HeroGLBasic(canvas, video);
  if (!gl.getExtension("EXT_color_buffer_float")) return window.HeroGLBasic(canvas, video, gl);

  const VS = `#version 300 es
  in vec2 p; out vec2 v;
  void main(){ v=p*.5+.5; v.y=1.-v.y; gl_Position=vec4(p,0.,1.); }`;
  const SIM = `#version 300 es
  precision highp float;
  in vec2 v; out vec4 o;
  uniform sampler2D s; uniform vec2 px; uniform float aspect;
  uniform vec4 drops[8]; uniform int nd;
  void main(){
    vec4 c=texture(s,v);
    float avg=(texture(s,v+vec2(px.x,0.)).r+texture(s,v-vec2(px.x,0.)).r+texture(s,v+vec2(0.,px.y)).r+texture(s,v-vec2(0.,px.y)).r)*.25;
    c.g+=(avg-c.r)*2.;
    c.g*=.993;
    c.r+=c.g;
    c.r*=.9985;
    for(int i=0;i<8;i++){
      if(i>=nd) break;
      vec2 d=(v-drops[i].xy)*vec2(aspect,1.);
      float k=max(0.,1.-length(d)/drops[i].z);
      k=.5-cos(k*3.14159265)*.5;
      c.r+=k*drops[i].w;
    }
    o=c;
  }`;
  const DRAW = `#version 300 es
  precision highp float;
  in vec2 v; out vec4 o;
  uniform sampler2D t; uniform sampler2D s; uniform vec2 px, res, vres; uniform float time, aspect;
  float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  vec2 cover(vec2 uv){
    float ra=res.x/res.y, va=vres.x/max(vres.y,1.);
    vec2 sc = ra>va ? vec2(1., va/ra) : vec2(ra/va, 1.);
    return clamp((uv-.5)*sc+.5, .001, .999);
  }
  void main(){
    float H=texture(s,v).r;
    float hx=texture(s,v+vec2(px.x,0.)).r-texture(s,v-vec2(px.x,0.)).r;
    float hy=texture(s,v+vec2(0.,px.y)).r-texture(s,v-vec2(0.,px.y)).r;
    vec3 n=normalize(vec3(-hx*9., -hy*9., 1.));
    vec2 off=n.xy*vec2(1./aspect,1.)*.085;
    vec3 col;
    col.r=texture(t,cover(v+off*1.06)).r;
    col.g=texture(t,cover(v+off)).g;
    col.b=texture(t,cover(v+off*.94)).b;
    vec3 L=normalize(vec3(-.45,-.55,1.)); vec3 Hh=normalize(L+vec3(0.,0.,1.));
    float spec=pow(max(dot(n,Hh),0.),180.)*1.4;
    float fres=pow(1.-max(n.z,0.),2.)*1.6;
    col+=spec*vec3(1.,.97,.98);
    col=mix(col, vec3(1.,.86,.92), clamp(fres,0.,.35));
    col*=1.+clamp(H,-.4,.4)*.35;
    col+=(h(v*res+time*60.)-.5)*.025;
    float vig=smoothstep(1.2,.35,length((v-.5)*vec2(aspect,1.)));
    col*=mix(.6,1.,vig);
    o=vec4(col,1.);
  }`;

  function sh(type, src) {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; }
    return s;
  }
  function prog(fs) {
    const a = sh(gl.VERTEX_SHADER, VS), b = sh(gl.FRAGMENT_SHADER, fs);
    if (!a || !b) return null;
    const p = gl.createProgram(); gl.attachShader(p, a); gl.attachShader(p, b);
    gl.bindAttribLocation(p, 0, "p"); gl.linkProgram(p);
    return gl.getProgramParameter(p, gl.LINK_STATUS) ? p : null;
  }
  const pSim = prog(SIM), pDraw = prog(DRAW);
  if (!pSim || !pDraw) return window.HeroGLBasic(canvas, video, gl);

  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  function texture(w, h, isFloat) {
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    if (isFloat) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([20, 18, 22, 255]));
    return t;
  }
  const vtex = texture(1, 1, false);

  let SW = 320, SH = 180, A, B;
  function makeSim() {
    const asp = canvas.clientWidth / Math.max(1, canvas.clientHeight);
    SW = 320; SH = Math.max(90, Math.round(SW / asp));
    let ok = true;
    [A, B] = [0, 1].map(() => {
      const t = texture(SW, SH, true), f = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, f);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) ok = false;
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      return { t, f };
    });
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return ok;
  }

  const U = (p, n) => gl.getUniformLocation(p, n);
  const us = { s: U(pSim, "s"), px: U(pSim, "px"), aspect: U(pSim, "aspect"), drops: U(pSim, "drops"), nd: U(pSim, "nd") };
  const ud = { t: U(pDraw, "t"), s: U(pDraw, "s"), px: U(pDraw, "px"), res: U(pDraw, "res"), vres: U(pDraw, "vres"), time: U(pDraw, "time"), aspect: U(pDraw, "aspect") };

  const queue = [];
  const drop = (x, y, r, s) => { if (queue.length < 8) queue.push([x, y, r, s]); };
  const host = canvas.parentElement;
  const rel = (cx, cy) => { const r = canvas.getBoundingClientRect(); return [(cx - r.left) / r.width, (cy - r.top) / r.height]; };
  let lastMove = 0, lx = 0, ly = 0;
  host.addEventListener("pointermove", e => {
    const now = performance.now(); if (now - lastMove < 28) return;
    const [x, y] = rel(e.clientX, e.clientY);
    const sp = Math.min(1, Math.hypot(e.clientX - lx, e.clientY - ly) / 60); lx = e.clientX; ly = e.clientY; lastMove = now;
    if (sp > .05) drop(x, y, .024, .02 + sp * .05);
  });
  host.addEventListener("pointerdown", e => { const [x, y] = rel(e.clientX, e.clientY); drop(x, y, .045, .22); });
  addEventListener("chibi-step", e => {
    const [x, y] = rel(e.detail.x, e.detail.y);
    if (x > 0 && x < 1 && y > 0 && y < 1) drop(x, y, .016 + e.detail.power * .01, .05 + e.detail.power * .06);
  });
  let nextRain = performance.now() + 1500;

  let visible = true, failed = false, running = true;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(canvas);
  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = canvas.clientWidth * dpr; canvas.height = canvas.clientHeight * dpr;
    return makeSim();
  }
  if (!resize()) return window.HeroGLBasic(canvas, video, gl);
  let rt; addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(resize, 200); });

  const flat = new Float32Array(32);
  function step() {
    flat.fill(0);
    const n = queue.length; queue.splice(0).forEach((d, i) => flat.set(d, i * 4));
    gl.useProgram(pSim);
    gl.bindFramebuffer(gl.FRAMEBUFFER, B.f); gl.viewport(0, 0, SW, SH);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, A.t); gl.uniform1i(us.s, 0);
    gl.uniform2f(us.px, 1 / SW, 1 / SH); gl.uniform1f(us.aspect, SW / SH);
    gl.uniform4fv(us.drops, flat); gl.uniform1i(us.nd, n);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    [A, B] = [B, A];
  }
  const t0 = performance.now();
  function loop() {
    if (!running) return;
    requestAnimationFrame(loop);
    if (!visible) return;
    frame(performance.now());
  }
  function frame(now) {
    if (now > nextRain) { drop(Math.random(), .15 + Math.random() * .7, .008 + Math.random() * .01, .05 + Math.random() * .07); nextRain = now + 900 + Math.random() * 2600; }
    step(); step();
    if (video.readyState >= 2 && !failed) {
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, vtex);
      try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, video); }
      catch (e) { failed = true; running = false; canvas.dispatchEvent(new Event("glfail")); return; }
    }
    gl.useProgram(pDraw);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, canvas.width, canvas.height);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, A.t); gl.uniform1i(ud.s, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, vtex); gl.uniform1i(ud.t, 1);
    gl.uniform2f(ud.px, 1 / SW, 1 / SH);
    gl.uniform2f(ud.res, canvas.width, canvas.height);
    gl.uniform2f(ud.vres, video.videoWidth || 16, video.videoHeight || 9);
    gl.uniform1f(ud.time, (now - t0) / 1000);
    gl.uniform1f(ud.aspect, canvas.width / Math.max(1, canvas.height));
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  loop();

  return { pulse() { drop(.5, .45, .07, .35); } };
};
