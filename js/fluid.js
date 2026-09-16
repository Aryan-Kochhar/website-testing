/* ---------------------------------------------------------------------------
   Hero: cream poured into coffee.

   A lit marbled surface. No geometry and no 3D library — one fullscreen
   triangle, and a fragment shader that builds a height field, differentiates
   it for surface normals, and shades it as a glossy liquid.

   Three things do the work:

   1. Differential rotation. The field is stirred about the view axis at a rate
      that falls off with radius, so inner fluid laps the outer and straight
      ribbons shear into a spiral on their own. This is what makes it read as
      stirred rather than as noise that happens to be moving.
   2. Domain warping. The coordinate is displaced by noise before the height
      field is sampled, which is what folds the ribbons back through each
      other instead of leaving concentric rings.
   3. Normals from finite differences, then a key light and a tight specular.
      The relief and the wet highlight are the whole reason it reads as poured
      liquid and not as a gradient.

   An earlier pass did this as a volumetric raymarch. It was ~8x the cost and
   looked worse: integrating a noise field along a ray averages exactly the
   detail that makes marbling legible.

   The palette is deliberately light-dominant. Espresso only reaches the
   deepest troughs, so the hero type stays readable over the top.
--------------------------------------------------------------------------- */

const VERT = `
attribute vec2 aPos;
void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;

uniform vec2  uRes;
uniform float uTime;
uniform vec2  uMouse;    // -1..1, eased
uniform float uScroll;   // 0..1 progress out of the hero
uniform float uIntro;    // 0..1 reveal
uniform float uStir;     // decaying kick from pointer speed / coffee clicks
uniform int   uOctaves;  // fbm detail, lowered on weak hardware

#define CREAM    vec3(0.988, 0.965, 0.933)
#define FOAM     vec3(0.953, 0.890, 0.808)
#define CARAMEL  vec3(0.886, 0.686, 0.478)
#define COPPER   vec3(0.710, 0.322, 0.184)
#define ESPRESSO vec3(0.157, 0.082, 0.052)

mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

vec3 hash33(vec3 p){
  p = vec3(dot(p, vec3(127.1, 311.7,  74.7)),
           dot(p, vec3(269.5, 183.3, 246.1)),
           dot(p, vec3(113.5, 271.9, 124.6)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}

// Gradient noise. Value noise leaves grid creases that a specular highlight
// picks out immediately.
float gnoise(vec3 p){
  vec3 i = floor(p);
  vec3 f = fract(p);
  vec3 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(dot(hash33(i + vec3(0,0,0)), f - vec3(0,0,0)),
            dot(hash33(i + vec3(1,0,0)), f - vec3(1,0,0)), u.x),
        mix(dot(hash33(i + vec3(0,1,0)), f - vec3(0,1,0)),
            dot(hash33(i + vec3(1,1,0)), f - vec3(1,1,0)), u.x), u.y),
    mix(mix(dot(hash33(i + vec3(0,0,1)), f - vec3(0,0,1)),
            dot(hash33(i + vec3(1,0,1)), f - vec3(1,0,1)), u.x),
        mix(dot(hash33(i + vec3(0,1,1)), f - vec3(0,1,1)),
            dot(hash33(i + vec3(1,1,1)), f - vec3(1,1,1)), u.x), u.y),
    u.z);
}

float fbm(vec3 p){
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++){
    if (i >= uOctaves) break;
    s += a * gnoise(p);
    p *= 2.02;
    a *= 0.5;
  }
  return s;
}

// Two octaves, for the domain warp only. The warp is sampled twice per
// height() call and height() runs five times per pixel for the normal, so
// this is where the cost actually lives.
float fbm2(vec3 p){
  return 0.5 * gnoise(p) + 0.25 * gnoise(p * 2.02);
}

// The surface. z carries slow time so the pour keeps evolving instead of
// just rotating a fixed pattern.
float height(vec2 uv){
  float r = length(uv) + 0.09;

  // Differential rotation — the 1/r^2 term is what shears ribbons into a
  // spiral. uStir briefly speeds the whole pour up.
  float spin = uTime * 0.13 + (0.78 + uStir * 1.30) / (r * r + 0.62);
  vec2 q = rot(spin) * uv;

  float t = uTime * 0.045;

  // Domain warp. Two components is enough once it is lit; a third mostly
  // costs fetches.
  vec2 w = vec2(fbm2(vec3(q * 0.95, t)),
                fbm2(vec3(q * 0.95 + 4.7, t + 2.3)));
  q += w * 0.70;

  return fbm(vec3(q * 1.38, t * 1.4));
}

void main(){
  vec2 uv = (gl_FragCoord.xy * 2.0 - uRes) / uRes.y;

  // Parallax: the pour leans away from the cursor.
  uv += uMouse * 0.055;
  uv *= 1.0 + uScroll * 0.18;

  float h = height(uv);

  // Normals by central difference. A fixed epsilon rather than a pixel-sized
  // one keeps the relief identical across resolutions and DPRs.
  float e = 0.0035;
  float hx = height(uv + vec2(e, 0.0)) - height(uv - vec2(e, 0.0));
  float hy = height(uv + vec2(0.0, e)) - height(uv - vec2(0.0, e));

  float relief = 0.52;
  vec3 n = normalize(vec3(-hx * relief / (2.0 * e), -hy * relief / (2.0 * e), 1.0));

  vec3 L = normalize(vec3(-0.46, 0.74, 0.62));   // key light, upper-left
  vec3 V = vec3(0.0, 0.0, 1.0);

  float band = h * 0.5 + 0.5;

  // Light-dominant ramp: cream and foam own most of the area, copper and
  // espresso arrive as ribbons. Narrow smoothsteps give the ribbons an edge —
  // wide ones just produce a gradient.
  vec3 albedo = mix(COPPER, CARAMEL, smoothstep(0.44, 0.63, band));
  albedo = mix(albedo, FOAM,         smoothstep(0.62, 0.77, band));
  albedo = mix(albedo, CREAM,        smoothstep(0.78, 0.93, band));
  albedo = mix(ESPRESSO, albedo,     smoothstep(0.17, 0.44, band));

  float diff = max(dot(n, L), 0.0);
  float spec = pow(max(dot(reflect(-L, n), V), 0.0), 42.0);

  // Slightly wrapped diffuse: liquid scatters round its own ridges, so a
  // hard terminator looks like plastic.
  float wrap = diff * 0.78 + 0.22;

  vec3 col = albedo * (0.44 + 0.72 * wrap);
  col += FOAM * spec * 0.68;

  // Cream sits proud of the coffee, so catch a rim on the ribbon edges.
  float edgeLight = pow(1.0 - abs(n.z), 1.8);
  col += CARAMEL * edgeLight * 0.26 * smoothstep(0.55, 0.88, band);

  // Warm ambient bounce from below, keeps the troughs from going flat black.
  col += COPPER * 0.07 * (1.0 - band);

  // Grain in-shader, so it sits under the CSS paper texture, not on top.
  float g = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233)) + uTime * 13.0) * 43758.5453);
  col += (g - 0.5) * 0.026;

  // Dissolve into the page instead of ending on a hard rectangle, and sit
  // the mass right of centre so the hero copy has clean cream to live on.
  float bias   = min(0.62, (uRes.x / uRes.y) * 0.38);
  // On a portrait viewport there is no room to the side, so the mass drops
  // below the copy and fades harder instead of sitting behind it.
  float narrow = 1.0 - smoothstep(0.60, 1.05, uRes.x / uRes.y);
  vec2  c      = uv - vec2(bias, -0.04 - narrow * 0.46);
  float vig    = smoothstep(0.34, 1.22, length(c * vec2(0.92, 1.06)));
  col = mix(col, CREAM, clamp(vig * 0.94 + narrow * 0.24, 0.0, 1.0));

  // Guard the text column. The pour is rich enough now that the copper accent
  // in the headline would otherwise sit on copper.
  float guard = (1.0 - smoothstep(-0.60, 0.50, uv.x)) * (1.0 - narrow);
  col = mix(col, CREAM, guard * 0.58);

  col = mix(CREAM, col, uIntro);
  col = mix(col, CREAM, uScroll * 0.82);

  gl_FragColor = vec4(col, 1.0);
}
`;

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error('compile: ' + log);
  }
  return sh;
}

const NOOP = { ok: false, stir() {}, setScroll() {} };

export function initFluid(canvas) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    canvas.classList.add('is-fallback');
    return NOOP;
  }

  const opts = { antialias: false, alpha: false, depth: false, powerPreference: 'high-performance' };
  const gl = canvas.getContext('webgl', opts) || canvas.getContext('experimental-webgl', opts);
  if (!gl) {
    canvas.classList.add('is-fallback');
    return NOOP;
  }

  let prog;
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error('link: ' + gl.getProgramInfoLog(prog));
    }
  } catch (err) {
    console.warn('[fluid]', err.message);
    canvas.classList.add('is-fallback');
    return NOOP;
  }

  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  // One oversized triangle: half the vertices of a quad, and no diagonal seam.
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const U = {};
  for (const n of ['uRes', 'uTime', 'uMouse', 'uScroll', 'uIntro', 'uStir', 'uOctaves']) {
    U[n] = gl.getUniformLocation(prog, n);
  }

  const st = {
    mouse: [0, 0],
    target: [0, 0],
    scroll: 0,
    intro: 0,
    stir: 0,
    octaves: 4,
    quality: 1.0,   // a lit height field is cheap enough to run sharp
  };

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.max(1, Math.floor(canvas.clientWidth * dpr * st.quality));
    const h = Math.max(1, Math.floor(canvas.clientHeight * dpr * st.quality));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  }

  window.addEventListener('resize', resize, { passive: true });

  let lastX = 0, lastY = 0;
  window.addEventListener('pointermove', (e) => {
    st.target[0] = (e.clientX / window.innerWidth) * 2 - 1;
    st.target[1] = -((e.clientY / window.innerHeight) * 2 - 1);
    // Flicking the pointer across the hero stirs it.
    const v = Math.hypot(e.clientX - lastX, e.clientY - lastY);
    lastX = e.clientX; lastY = e.clientY;
    st.stir = Math.min(1, st.stir + v * 0.0016);
  }, { passive: true });

  // Don't keep shading this behind the about page, or in a background tab.
  // Held in `vis` deliberately: an unreferenced observer can be collected,
  // after which it stops reporting and the canvas never resumes.
  let visible = true;
  const vis = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0 });
  vis.observe(canvas);
  st.visObserver = vis;

  const t0 = performance.now();
  let last = t0;
  let slow = 0;
  let downgraded = 0;

  function frame(now) {
    requestAnimationFrame(frame);

    const dt = Math.min(now - last, 60);
    last = now;
    if (!visible || document.hidden) return;

    // Two-stage downgrade if we can't hold ~45fps: resolution first, then fbm
    // detail. A softer pour beats a stuttering one.
    if (dt > 22) slow++; else slow = Math.max(0, slow - 1);
    if (slow > 40 && downgraded < 2) {
      downgraded++;
      if (downgraded === 1) st.quality = 0.7;
      else st.octaves = 3;
      slow = 0;
      resize();
    }

    resize();

    const ease = (rate) => 1 - Math.pow(rate, dt / 1000);
    const k = ease(0.0015);
    st.mouse[0] += (st.target[0] - st.mouse[0]) * k;
    st.mouse[1] += (st.target[1] - st.mouse[1]) * k;
    st.intro += (1 - st.intro) * ease(0.05);
    st.stir *= Math.pow(0.28, dt / 1000);

    gl.uniform2f(U.uRes, canvas.width, canvas.height);
    gl.uniform1f(U.uTime, (now - t0) / 1000);
    gl.uniform2f(U.uMouse, st.mouse[0], st.mouse[1]);
    gl.uniform1f(U.uScroll, st.scroll);
    gl.uniform1f(U.uIntro, st.intro);
    gl.uniform1f(U.uStir, st.stir);
    gl.uniform1i(U.uOctaves, st.octaves);

    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  resize();
  requestAnimationFrame(frame);

  return {
    ok: true,
    stir(amount = 1) { st.stir = Math.min(1.6, st.stir + amount); },
    setScroll(v) { st.scroll = Math.max(0, Math.min(1, v)); },
  };
}
