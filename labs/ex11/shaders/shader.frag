precision highp float;

//input
varying float fTime;

//consts
const vec3 colorA = vec3(1.0, 0.0, 0.0);
const vec3 colorB = vec3(1.0, 0.555, 0.0);

void main()
{
    vec3 color =vec3(0.0);
    float interpolationConst = abs(sin(fTime));

    color = mix(colorA, colorB, interpolationConst);

    gl_FragColor = vec4(color, 1.0);
}