precision highp float;

uniform float uTime;

attribute vec3 vPosition1;
attribute vec3 vPosition2;

//output
varying float fTime;

void main()
{
    vec3 position = vec3(0.0);
    float interpolationConst = abs(sin(uTime));
    fTime = uTime;

    position = mix(vPosition1, vPosition2, interpolationConst);

    gl_Position = vec4(position, 1.0);
}