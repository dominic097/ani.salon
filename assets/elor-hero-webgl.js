const vertexSource = `#version 300 es
void main() {
  vec2 corner = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(corner * 2.0 - 1.0, 0.0, 1.0);
}`;

const fragmentSource = `#version 300 es
precision highp float;
uniform vec2 uSize;
uniform float uTime;
uniform float uTone;
out vec4 fragColor;

void main() {
  vec2 uv = gl_FragCoord.xy / uSize;
  float t = uTime * .30;
  float stage = smoothstep(.30, .68, uv.x);
  float sweep = .68 + .095 * sin(t * .71);
  float fold = uv.x - sweep + .19 * (uv.y - .5);
  fold += .058 * sin(5.8 * uv.y - t * 1.24);
  float spread = .23 + .045 * sin(t * .64 + 1.0);
  float falloff = fold / spread;
  float veil = exp(-falloff * falloff);
  float silk = .5 + .5 * cos(fold * 22.0 + .55 * sin(uv.y * 9.0 + t));
  float thread = .5 + .5 * cos(fold * 45.0 - uv.y * 4.0 + t * .58);
  float edge = pow(silk, 6.0) * veil * .20;
  float accent = pow(thread, 12.0) * veil * .06;
  float glow = exp(-dot((uv - vec2(sweep + .10, .82)) * vec2(2.9, 2.2),
                        (uv - vec2(sweep + .10, .82)) * vec2(2.9, 2.2)));
  float shoulder = smoothstep(.12, .56, uv.y) * (.55 + .45 * glow);
  float alpha = stage * (.13 * glow + shoulder * (.11 * veil + edge + accent));

  vec3 pearl = vec3(.98, .79, .60);
  vec3 gold = vec3(1.0, .68, .32);
  vec3 jade = mix(vec3(.78, .63, .92), vec3(.49, .82, .77), silk);
  vec3 spectrum = mix(mix(pearl, gold, min(uTone, 1.0)), jade, max(uTone - 1.0, 0.0));
  fragColor = vec4(spectrum, min(alpha, .28));
}`;

export function createHeroLight(canvas) {
  const gl = canvas.getContext('webgl2', {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: false,
    powerPreference: 'low-power'
  });
  if (!gl) return null;

  function compile(kind, source) {
    const shader = gl.createShader(kind);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
    gl.deleteShader(shader);
    return null;
  }

  const vertex = compile(gl.VERTEX_SHADER, vertexSource);
  const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  if (program && vertex && fragment) {
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
  }
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!program || !gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }

  gl.useProgram(program);
  const size = gl.getUniformLocation(program, 'uSize');
  const time = gl.getUniformLocation(program, 'uTime');
  const tone = gl.getUniformLocation(program, 'uTone');

  return {
    resize(width, height) {
      if (width < 1 || height < 1) return;
      const scale = Math.min(.85, 980 / width, 650 / height);
      const bufferWidth = Math.max(1, Math.round(width * scale));
      const bufferHeight = Math.max(1, Math.round(height * scale));
      if (canvas.width !== bufferWidth || canvas.height !== bufferHeight) {
        canvas.width = bufferWidth;
        canvas.height = bufferHeight;
      }
      gl.viewport(0, 0, bufferWidth, bufferHeight);
      gl.uniform2f(size, bufferWidth, bufferHeight);
    },
    draw(elapsed, scene) {
      gl.uniform1f(time, elapsed);
      gl.uniform1f(tone, scene);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
  };
}
