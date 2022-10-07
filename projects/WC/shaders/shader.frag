precision highp float;

#define PI 3.1415926538

// Input of Coordinates position
varying vec2 fPosition;

// Constants
const int MAX_PLANETS=10;
const float EARTH_RADIUS=6.371*10e6;
const float DENSITY = 5.51*10e3;
const float gConstant = 6.67*10e-11;
const float Epsilon = 1e-10;

// Radius and Position of our planets
uniform float uRadius[MAX_PLANETS];
uniform vec2 uPosition[MAX_PLANETS];
// Aspect ratio (width / height)
uniform float uRatio;



// functions
vec3 hsv2rgb(vec3 c)
{
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

vec3 hsl2rgb( in vec3 c )
{
    vec3 rgb = clamp( abs(mod(c.x*6.0+vec3(0.0,4.0,2.0),6.0)-3.0)-1.0, 0.0, 1.0 );

    return c.z + c.y * (rgb-0.5)*(1.0-abs(2.0*c.z-1.0));
}

vec2 gravityField(vec2 pos, vec2 cntr, float r)
{
    float mass = (4.0 * PI * pow(r,3.0) * DENSITY) / 3.0;
    float d = distance(pos, cntr);
    vec2 unitVector = vec2(pos.x-cntr.x,pos.y-cntr.y)/d;
    vec2 vector = -gConstant * mass / pow(d,2.0) * unitVector;
    return vector;
}


void main() {
    vec2 fPositionWC = vec2(fPosition.x*uRatio, fPosition.y);
    
    vec2 gFieldVector = vec2(0.0, 0.0);
    for (int i = 0; i < MAX_PLANETS; ++i) {
        gFieldVector += gravityField(fPositionWC, uPosition[i], uRadius[i]);
    }

    float gField = sqrt(pow(gFieldVector.x,2.0)+pow(gFieldVector.y,2.0));
    float gFieldAngle = degrees(atan(gFieldVector.y,gFieldVector.x));

    bool isPlanet = false;

    if (!isPlanet) {
        // mix with field angle
        float hue = gFieldAngle/360.;
        vec3 hsl = vec3(hue, mix(0.0, 1.0, gField*10000.), mix(0.0, 0.5, gField));

        vec3 color = hsl2rgb(hsl);

        gl_FragColor = vec4(color, 1.0);
    }
}