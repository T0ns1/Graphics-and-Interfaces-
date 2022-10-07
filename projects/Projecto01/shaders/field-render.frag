precision highp float;

#define PI 3.1415926538

// Input of World Coordinates position
varying vec2 fPosition;

// Constants
const int MAX_PLANETS=10;
const float EARTH_RADIUS=6.371*10e6;
const float DENSITY = 5.51*10e3;
const float gConstant = 6.67*10e-11;

// Radius and Position of our planets
uniform float uRadius[MAX_PLANETS];
uniform vec2 uPosition[MAX_PLANETS];
uniform float uRatio;

// functions
vec3 hsv2rgb(vec3 c)
{
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

float gravityField(vec2 pos, vec2 cntr, float r)
{
    float mass = (4.0 * PI * pow(r,3.0) * DENSITY) / 3.0;
    float d = distance(pos, cntr);
    return gConstant * mass / pow(d,2.0);
}

float convertToWC(float a)
{
    return a * uRatio;
}

void main() {
    float gf = gravityField(fPosition, uPosition[0], uRadius[0]);

    if (distance(fPosition, uPosition[0]) < uRadius[0]) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    }
    else {
        gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
    }
}