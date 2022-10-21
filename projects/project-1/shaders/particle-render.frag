precision mediump float;

// Input of fraction of life left in our particle
varying float fLeft;

// Glow effect applied to particles(Younger particles are brighter than older ones) - credits to https://www.shadertoy.com/view/3s3GDn
float getGlow(float left, float radius, float intensity){
  left = 1.0 - left;
  float dist = 1.0 / left;
  dist *= radius;
  dist = pow(dist,intensity);
  return dist;
}

void main() {
  float glow = getGlow(fLeft, 0.5, 2.0);
  vec3 color = glow * vec3(0.6, 0.2, 0.2);
  color = 1.0 - exp( -color );  //Avoids color values beyond our normalized webGL scale

  gl_FragColor = vec4(color, 1.0*fLeft);
  //gl_FragColor = vec4(0.6, 0.2, 0.0, 1.0);
}