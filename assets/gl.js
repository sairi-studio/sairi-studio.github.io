window.HeroGLBasic = function (canvas, video, glIn) {
  const gl = glIn || canvas.getContext("webgl", { premultipliedAlpha: false, antialias: false });
  if (!gl) return null;

  const vs = `attribute vec2 p;varying vec2 v;void main(){v=p*.5+.5;v.y=1.-v.y;gl_Position=vec4(p,0.,1.);}`;
  const fs = `
  precision mediump float;
  varying vec2 v;
  uniform sampler2D t;
  uniform vec2 res, vres, mouse;
  uniform float time, pulse, hover;
  float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  vec2 cover(vec2 uv){
    float ra=res.x/res.y, va=vres.x/max(vres.y,1.);
    vec2 s = ra>va ? vec2(1., va/ra) : vec2(ra/va, 1.);
    return (uv-.5)*s+.5;
  }
  void main(){
    vec2 uv=v;
    float band=floor(uv.y*28.+time*3.);
    float g=step(.72,h(vec2(band,floor(time*24.))))*pulse;
    uv.x+=(h(vec2(band,1.))-.5)*.08*g;
    vec2 d=uv-mouse; float r=length(d*vec2(res.x/res.y,1.));
    float lens=smoothstep(.35,0.,r)*hover;
    uv-=d*lens*.06;
    vec2 cuv=cover(uv);
    float amt=.0008+lens*.008+pulse*.02;
    vec2 dir=normalize(d+1e-4)*amt;
    float R=texture2D(t,cover(uv+dir)).r;
    float G=texture2D(t,cuv).g;
    float B=texture2D(t,cover(uv-dir)).b;
    vec3 c=vec3(R,G,B);
    c+=(h(v*res+time*60.)-.5)*.03;
    float vig=smoothstep(1.15,.35,length((v-.5)*vec2(res.x/res.y,1.)));
    c*=mix(.55,1.,vig);
    gl_FragColor=vec4(c,1.);
  }`;
  function sh(type, src) {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; }
    return s;
  }
  const a = sh(gl.VERTEX_SHADER, vs), b = sh(gl.FRAGMENT_SHADER, fs);
  if (!a || !b) return null;
  const pr = gl.createProgram(); gl.attachShader(pr, a); gl.attachShader(pr, b); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return null;
  gl.useProgram(pr);

  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([10,10,11,255]));

  const U = n => gl.getUniformLocation(pr, n);
  const u = { res: U("res"), vres: U("vres"), mouse: U("mouse"), time: U("time"), pulse: U("pulse"), hover: U("hover") };
  const m = { x: .5, y: .5, tx: .5, ty: .5, hov: 0, thov: 0 };
  let pulse = 0, running = true, visible = true, failed = false;

  canvas.parentElement.addEventListener("pointermove", e => {
    const r = canvas.getBoundingClientRect();
    m.tx = (e.clientX - r.left) / r.width; m.ty = (e.clientY - r.top) / r.height; m.thov = 1;
  });
  canvas.parentElement.addEventListener("pointerleave", () => { m.thov = 0; });
  new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(canvas);

  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = canvas.clientWidth * dpr; canvas.height = canvas.clientHeight * dpr;
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  addEventListener("resize", resize); resize();

  const t0 = performance.now();
  (function loop() {
    if (!running) return;
    requestAnimationFrame(loop);
    if (!visible) return;
    m.x += (m.tx - m.x) * .08; m.y += (m.ty - m.y) * .08; m.hov += (m.thov - m.hov) * .05;
    pulse *= .92;
    if (video.readyState >= 2 && !failed) {
      try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, video); }
      catch (e) { failed = true; running = false; canvas.dispatchEvent(new Event("glfail")); return; }
    }
    gl.uniform2f(u.res, canvas.width, canvas.height);
    gl.uniform2f(u.vres, video.videoWidth || 16, video.videoHeight || 9);
    gl.uniform2f(u.mouse, m.x, m.y);
    gl.uniform1f(u.time, (performance.now() - t0) / 1000);
    gl.uniform1f(u.pulse, pulse);
    gl.uniform1f(u.hover, m.hov);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  })();

  return { pulse() { pulse = 1; } };
};
