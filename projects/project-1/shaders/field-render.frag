precision highp float;

#define PI 3.1415926

// Constants for gravitational field calculus
const int MAX_PLANETS = 10;
const float GRAVITATIONAL_CONSTANT = 6.67e-11;
const float DENSITY = 5.51e3;
const float EARTH_RADIUS = 6.371e6; 

// Uniforms containing our planets
uniform float uRadius[MAX_PLANETS];
uniform vec2 uPosition[MAX_PLANETS];

// Input of frag. coordinates in world coordinates
varying vec2 fPosition;

// Calculates the gravity field vector of a planet with a certain center and radius on a given position 
vec2 gravitationalField(float radius, vec2 center, vec2 position)
{
    float mass = 4.0 * PI * pow(radius*EARTH_RADIUS,3.0) * DENSITY / 3.0;   // EARTH_RADIUS used as scale factor
    float dist = distance(position,center) * EARTH_RADIUS;                  // EARTH_RADIUS used as scale factor
    vec2 unitVector = normalize(center-position);
    return GRAVITATIONAL_CONSTANT * mass * unitVector / pow(dist,2.0);
}

// Color functions
vec3 hsv2rgb(vec3 c)
{
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main() {
    vec2 gField;
    vec3 color;

    // Calculates the Gravitational field for all 10 planets
    for (int i = 0; i < MAX_PLANETS; i++) {
        gField += gravitationalField(uRadius[i], uPosition[i], fPosition);
    }
    
    // Polar coordinates for hsv
    float angle = atan(gField.y,gField.x);
    float radius = length(gField);

    // Map the angle to Hue and the Saturation to the radius
    color = hsv2rgb(vec3(degrees(angle)/360.,1.0,1.0));

    gl_FragColor = vec4(color, radius);

    /* Visual Guide for equipotential lines drawn in black */
    if ( radius < 1. && mod(radius,0.05) <= 0.008) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    }
}