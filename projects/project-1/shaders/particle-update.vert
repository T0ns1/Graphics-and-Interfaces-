precision mediump float;

#define PI 3.1415926

// Constants for the calculus of the gravity force
const int MAX_PLANETS=10;
const float GRAVITATIONAL_CONSTANT = 6.67e-11;
const float DENSITY = 5.51e3;
const float EARTH_RADIUS = 6.371e6;

/* Number of seconds (possibly fractional) that has passed since the last
   update step. */
uniform float uDeltaTime;
uniform vec2 uMousePosition;
uniform vec2 uScale;
uniform float uMinLife;
uniform float uMaxLife;
uniform float uMinVelocity;
uniform float uMaxVelocity;
/* Angle (with the horizontal axis) which indicates the central direction
   for our particle velocity */
uniform float uAlpha;
uniform float uBeta;                   // variation for alpha. Angle = alpha +- beta
/* Our Planets' radius and center position in World Coordinates for
   the calculation of the force and acceleration */
uniform float uRadius[MAX_PLANETS];
uniform vec2 uPosition[MAX_PLANETS];

/* Inputs. These reflect the state of a single particle before the update. */


attribute vec2 vPosition;              // actual position
attribute float vAge;                  // actual age (in seconds)
attribute float vLife;                 // when it is supposed to dye 
attribute vec2 vVelocity;              // actual speed

/* Outputs. These mirror the inputs. These values will be captured into our transform feedback buffer! */
varying vec2 vPositionOut;
varying float vAgeOut;
varying float vLifeOut;
varying vec2 vVelocityOut;

// generates a pseudo random number that is a function of the argument. The argument needs to be constantly changing from call to call to generate different results
highp float rand(vec2 co)
{
    highp float a = 12.9898;
    highp float b = 78.233;
    highp float c = 43758.5453;
    highp float dt= dot(co.xy ,vec2(a,b));
    highp float sn= mod(dt,3.14);
    return fract(sin(sn) * c);
}

/* Calculates the gravity field vector of a planet with a certain center and radius on a given position 
   Since our particles have a unitary mass, the force and therefore acceleration applied on them will be
   equal to the gravity field.*/
vec2 gravitationalField(float radius, vec2 center, vec2 position)
{
    float mass = 4.0 * PI * pow(radius*EARTH_RADIUS,3.0) * DENSITY / 3.0;   // EARTH_RADIUS used as scale factor
    float dist = distance(position,center) * EARTH_RADIUS;                  // EARTH_RADIUS used as scale factor
    vec2 unitVector = normalize(center-position);
    return GRAVITATIONAL_CONSTANT * mass * unitVector / pow(dist,2.0);
}

void main() {

   /* Update parameters according to our simple rules.*/
   vPositionOut = vPosition + vVelocity / uScale * uDeltaTime;
   vAgeOut = vAge + uDeltaTime;
   vLifeOut = vLife;

   vec2 accel = vec2(0.0,0.0);
   for (int i = 0; i < MAX_PLANETS; i++) {
      accel += gravitationalField(uRadius[i], uPosition[i], vPositionOut*uScale);
   }
   vVelocityOut = vVelocity + accel * uDeltaTime;

   /* Update the particles' attributes after death */   
   if (vAgeOut >= vLife) {
      vPositionOut = uMousePosition / uScale;
      vAgeOut = 0.0;
      vLifeOut = rand(vPosition) * (uMaxLife - uMinLife) + uMinLife;
      float velocityAngle = rand(vVelocity) * (2.0*uBeta) + (uAlpha-uBeta);
      float velocity = rand(vec2(vAge, vLife)) * (uMaxVelocity - uMinVelocity) + uMinVelocity;
      vVelocityOut = vec2(velocity*cos(velocityAngle),velocity*sin(velocityAngle));
   }

}