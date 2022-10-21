precision mediump float;

attribute vec2 vPosition;
attribute float vAge;
attribute float vLife;
attribute vec2 vVelocity;

// Output of the fraction of life left in the particle
varying float fLeft;

void main() {
  fLeft = (vLife - vAge)/vLife;
  gl_PointSize = 2.0;
  gl_Position = vec4(vPosition, 0.0, 1.0);
}