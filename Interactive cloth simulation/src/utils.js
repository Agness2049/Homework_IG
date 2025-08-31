export function createShader(gl, type, source) {
  const s = gl.createShader(type);
  gl.shaderSource(s, source);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(s));
    gl.deleteShader(s);
    return null;
  }
  return s;
}

export function createProgram(gl, vsSource, fsSource) {
  const vs = createShader(gl, gl.VERTEX_SHADER, vsSource);
  const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
    return null;
  }
  return program;
}

export function perspectiveMatrix(fov, aspect, near, far) {
  const f = 1.0 / Math.tan(fov / 2);
  const rangeInv = 1 / (near - far);

  return [
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (near + far) * rangeInv, -1,
    0, 0, near * far * rangeInv * 2, 0
  ];
}

export function lookAtMatrix(eye, target, up) {
  const zAxis = normalize(subtractVectors(eye, target));
  const xAxis = normalize(cross(up, zAxis));
  const yAxis = cross(zAxis, xAxis);

  return [
    xAxis[0], yAxis[0], zAxis[0], 0,
    xAxis[1], yAxis[1], zAxis[1], 0,
    xAxis[2], yAxis[2], zAxis[2], 0,
    -dot(xAxis, eye), -dot(yAxis, eye), -dot(zAxis, eye), 1
  ];
}

// Vector helpers
function subtractVectors(a, b) { return [a[0]-b[0], a[1]-b[1], a[2]-b[2]]; }
function normalize(v) { const l = Math.hypot(...v); return l > 0.0001 ? [v[0]/l, v[1]/l, v[2]/l] : [0,0,0]; }
function cross(a, b) { return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]; }
function dot(a, b) { return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]; }
