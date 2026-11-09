// The displacement sphere behind Reel's intro, ported from HamishMW/portfolio (MIT, see
// ./LICENSE.txt): app/routes/home/displacement-sphere{.jsx,-vertex.glsl,-fragment.glsl}. The
// original renders it with three.js; this draws the same mesh, noise and Phong lighting with raw
// WebGL 1 so the page loads a few kilobytes instead of three.js. Loaded with import() by the
// Sphere island, only on this template. The noise is Stefan Gustavson's webgl-noise (MIT), as in
// the original.

const VERTEX = `
precision highp float;
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat3 normalMatrix;
uniform float time;
varying vec2 vUv;
varying float noise;
varying vec3 vNormal;
varying vec3 vViewPosition;

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
vec3 fade(vec3 t) { return t * t * t * (t * (t * 6.0 - 15.0) + 10.0); }

// Classic Perlin noise, periodic variant (Stefan Gustavson, webgl-noise, MIT).
float pnoise(vec3 P, vec3 rep) {
  vec3 Pi0 = mod(floor(P), rep);
  vec3 Pi1 = mod(Pi0 + vec3(1.0), rep);
  Pi0 = mod289(Pi0);
  Pi1 = mod289(Pi1);
  vec3 Pf0 = fract(P);
  vec3 Pf1 = Pf0 - vec3(1.0);
  vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
  vec4 iy = vec4(Pi0.yy, Pi1.yy);
  vec4 iz0 = Pi0.zzzz;
  vec4 iz1 = Pi1.zzzz;
  vec4 ixy = permute(permute(ix) + iy);
  vec4 ixy0 = permute(ixy + iz0);
  vec4 ixy1 = permute(ixy + iz1);
  vec4 gx0 = ixy0 * (1.0 / 7.0);
  vec4 gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;
  gx0 = fract(gx0);
  vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
  vec4 sz0 = step(gz0, vec4(0.0));
  gx0 -= sz0 * (step(0.0, gx0) - 0.5);
  gy0 -= sz0 * (step(0.0, gy0) - 0.5);
  vec4 gx1 = ixy1 * (1.0 / 7.0);
  vec4 gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;
  gx1 = fract(gx1);
  vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
  vec4 sz1 = step(gz1, vec4(0.0));
  gx1 -= sz1 * (step(0.0, gx1) - 0.5);
  gy1 -= sz1 * (step(0.0, gy1) - 0.5);
  vec3 g000 = vec3(gx0.x, gy0.x, gz0.x);
  vec3 g100 = vec3(gx0.y, gy0.y, gz0.y);
  vec3 g010 = vec3(gx0.z, gy0.z, gz0.z);
  vec3 g110 = vec3(gx0.w, gy0.w, gz0.w);
  vec3 g001 = vec3(gx1.x, gy1.x, gz1.x);
  vec3 g101 = vec3(gx1.y, gy1.y, gz1.y);
  vec3 g011 = vec3(gx1.z, gy1.z, gz1.z);
  vec3 g111 = vec3(gx1.w, gy1.w, gz1.w);
  vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
  g000 *= norm0.x;
  g010 *= norm0.y;
  g100 *= norm0.z;
  g110 *= norm0.w;
  vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
  g001 *= norm1.x;
  g011 *= norm1.y;
  g101 *= norm1.z;
  g111 *= norm1.w;
  float n000 = dot(g000, Pf0);
  float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
  float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
  float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
  float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
  float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
  float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
  float n111 = dot(g111, Pf1);
  vec3 fade_xyz = fade(Pf0);
  vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
  vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
  float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);
  return 2.2 * n_xyz;
}

float turbulence(vec3 p) {
  float t = -0.5;
  for (float f = 1.0; f <= 10.0; f++) {
    float power = pow(2.0, f);
    t += abs(pnoise(vec3(power * p), vec3(10.0, 10.0, 10.0)) / power);
  }
  return t;
}

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = -mvPosition.xyz;
  noise = turbulence(0.01 * position + normal + time * 0.8);
  vec3 displacement = position * noise;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position + normal + displacement, 1.0);
}
`;

// three.js MeshPhongMaterial lighting as the original renders it: linear output, no tone mapping,
// a white directional light at (100, 100, 200) and a white ambient light; specular 0x111111,
// shininess 30.
const FRAGMENT = `
precision highp float;
uniform vec3 lightDirection;
uniform float lightIntensity;
uniform float ambientIntensity;
varying vec2 vUv;
varying float noise;
varying vec3 vNormal;
varying vec3 vViewPosition;
const float PI = 3.141592653589793;
const vec3 specularColor = vec3(0.0056);
const float shininess = 30.0;

void main() {
  vec3 color = vec3(vUv * (0.2 - 2.0 * noise), 1.0);
  vec3 finalColors = vec3(color.b * 1.5, color.r, color.r);
  vec3 diffuseColor = cos(finalColors * noise * 3.0);
  vec3 normal = normalize(vNormal);
  vec3 viewDir = normalize(vViewPosition);
  float dotNL = clamp(dot(normal, lightDirection), 0.0, 1.0);
  vec3 irradiance = vec3(dotNL * lightIntensity);
  vec3 directDiffuse = irradiance * diffuseColor / PI;
  vec3 halfDir = normalize(lightDirection + viewDir);
  float dotNH = clamp(dot(normal, halfDir), 0.0, 1.0);
  float dotVH = clamp(dot(viewDir, halfDir), 0.0, 1.0);
  float fresnel = exp2((-5.55473 * dotVH - 6.98316) * dotVH);
  vec3 F = specularColor * (1.0 - fresnel) + fresnel;
  float D = (1.0 / PI) * (shininess * 0.5 + 1.0) * pow(dotNH, shininess);
  vec3 directSpecular = irradiance * F * 0.25 * D;
  vec3 indirectDiffuse = vec3(ambientIntensity) * diffuseColor / PI;
  gl_FragColor = vec4(directDiffuse + directSpecular + indirectDiffuse, 1.0);
}
`;

type Mat4 = Float32Array;

function perspective(fovDeg: number, aspect: number, near: number, far: number): Mat4 {
  const f = 1 / Math.tan((fovDeg * Math.PI) / 360);
  const nf = 1 / (near - far);
  // prettier-ignore
  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) * nf, -1,
    0, 0, 2 * far * near * nf, 0,
  ]);
}

/** three.js Euler order XYZ: R = Rx · Ry · Rz, then the translation; column-major. */
function modelView(rx: number, ry: number, rz: number, tx: number, ty: number, tz: number): Mat4 {
  const [a, b] = [Math.cos(rx), Math.sin(rx)];
  const [c, d] = [Math.cos(ry), Math.sin(ry)];
  const [e, f] = [Math.cos(rz), Math.sin(rz)];
  const ae = a * e;
  const af = a * f;
  const be = b * e;
  const bf = b * f;
  // prettier-ignore
  return new Float32Array([
    c * e, af + be * d, bf - ae * d, 0,
    -c * f, ae - bf * d, be + af * d, 0,
    d, -b * c, a * c, 0,
    tx, ty, tz, 1,
  ]);
}

function sphere(radius: number, segments: number) {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  for (let iy = 0; iy <= segments; iy += 1) {
    const v = iy / segments;
    for (let ix = 0; ix <= segments; ix += 1) {
      const u = ix / segments;
      const x = -Math.cos(u * Math.PI * 2) * Math.sin(v * Math.PI);
      const y = Math.cos(v * Math.PI);
      const z = Math.sin(u * Math.PI * 2) * Math.sin(v * Math.PI);
      positions.push(x * radius, y * radius, z * radius);
      normals.push(x, y, z);
      uvs.push(u, 1 - v);
    }
  }
  const indices: number[] = [];
  const row = segments + 1;
  for (let iy = 0; iy < segments; iy += 1) {
    for (let ix = 0; ix < segments; ix += 1) {
      const a = iy * row + ix + 1;
      const b = iy * row + ix;
      const c = (iy + 1) * row + ix;
      const d = (iy + 1) * row + ix + 1;
      if (iy !== 0) indices.push(a, b, d);
      if (iy !== segments - 1) indices.push(b, c, d);
    }
  }
  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
    indices: new Uint16Array(indices),
  };
}

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
}

export type SphereOptions = {
  // Light theme lights it brighter, like the original's per-theme lights.
  light: () => boolean;
  still: boolean;
};

/** Starts the sphere on `canvas`; returns a stop function, or null when WebGL isn't there. */
export function startSphere(
  canvas: HTMLCanvasElement,
  options: SphereOptions,
): (() => void) | null {
  const gl = canvas.getContext("webgl", {
    alpha: true,
    antialias: false,
    premultipliedAlpha: true,
    powerPreference: "high-performance",
    failIfMajorPerformanceCaveat: true,
  });
  if (!gl) return null;
  const vs = compile(gl, gl.VERTEX_SHADER, VERTEX);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
  const program = gl.createProgram();
  if (!vs || !fs || !program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);

  const mesh = sphere(32, 128);
  const attribute = (name: string, data: Float32Array, size: number) => {
    const location = gl.getAttribLocation(program, name);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
  };
  attribute("position", mesh.positions, 3);
  attribute("normal", mesh.normals, 3);
  attribute("uv", mesh.uvs, 2);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);

  const u = (name: string) => gl.getUniformLocation(program, name);
  const uniforms = {
    modelView: u("modelViewMatrix"),
    projection: u("projectionMatrix"),
    normalMatrix: u("normalMatrix"),
    time: u("time"),
    lightDirection: u("lightDirection"),
    lightIntensity: u("lightIntensity"),
    ambientIntensity: u("ambientIntensity"),
  };
  const len = Math.hypot(100, 100, 200);
  gl.uniform3f(uniforms.lightDirection, 100 / len, 100 / len, 200 / len);
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);

  const start = Date.now();
  const target = { x: 0, y: 0 };
  const rotation = { x: 0, y: 0, z: 0 };
  const offset = { x: 22, y: 16 };
  let frame = 0;
  let inView = true;

  const resize = () => {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width;
    canvas.height = height;
    gl.viewport(0, 0, width, height);
    gl.uniformMatrix4fv(
      uniforms.projection,
      false,
      perspective(54, width / Math.max(height, 1), 0.1, 100),
    );
    // The original's breakpoints (media.mobile 696, media.tablet 1040), by the window's width.
    const w = window.innerWidth;
    [offset.x, offset.y] = w <= 696 ? [14, 10] : w <= 1040 ? [18, 14] : [22, 16];
  };

  const draw = () => {
    const light = options.light();
    gl.uniform1f(uniforms.lightIntensity, light ? 1.8 : 2.0);
    gl.uniform1f(uniforms.ambientIntensity, light ? 2.7 : 0.4);
    gl.uniform1f(uniforms.time, 0.00005 * (Date.now() - start));
    const mv = modelView(rotation.x, rotation.y, rotation.z, offset.x, offset.y, -52);
    gl.uniformMatrix4fv(uniforms.modelView, false, mv);
    // Rotation plus translation only, so the normal matrix is the rotation block itself.
    gl.uniformMatrix3fv(
      uniforms.normalMatrix,
      false,
      new Float32Array([mv[0]!, mv[1]!, mv[2]!, mv[4]!, mv[5]!, mv[6]!, mv[8]!, mv[9]!, mv[10]!]),
    );
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.drawElements(gl.TRIANGLES, mesh.indices.length, gl.UNSIGNED_SHORT, 0);
  };

  const animate = () => {
    rotation.z += 0.001;
    // A soft follow, standing in for the original's spring (stiffness 30, damping 20, mass 2).
    rotation.x += (target.x - rotation.x) * 0.04;
    rotation.y += (target.y - rotation.y) * 0.04;
    draw();
    if (inView) frame = requestAnimationFrame(animate);
  };

  const onMove = (event: MouseEvent) => {
    target.x = event.clientY / window.innerHeight / 2;
    target.y = event.clientX / window.innerWidth / 2;
  };

  resize();
  const resizer = new ResizeObserver(() => {
    resize();
    if (options.still) draw();
  });
  resizer.observe(canvas);
  const seen = new IntersectionObserver(([entry]) => {
    inView = entry?.isIntersecting ?? false;
    cancelAnimationFrame(frame);
    if (inView && !options.still) frame = requestAnimationFrame(animate);
  });
  if (options.still) {
    draw();
  } else {
    seen.observe(canvas);
    window.addEventListener("mousemove", onMove, { passive: true });
  }

  return () => {
    cancelAnimationFrame(frame);
    resizer.disconnect();
    seen.disconnect();
    window.removeEventListener("mousemove", onMove);
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  };
}
