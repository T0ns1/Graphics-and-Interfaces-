precision highp float;

const int MAX_LIGHTS = 3;

struct LightInfo {
    // Light colour intensities
    vec3 ambient;
    vec3 diffuse;
    vec3 specular;

    // Light geometry
    vec4 position;   // Position/direction of light (in camera coordinates)
    vec3 axis;      //  Spotlight direction (in camera coordinates)
    int aperture;
    int cutoff;
};

struct MaterialInfo {
    vec3 Ka;
    vec3 Kd;
    vec3 Ks;
    float shininess;
};

uniform int uNLights; // Effective number of lights used

uniform LightInfo uLights[MAX_LIGHTS]; // The array of lights present in the scene
uniform MaterialInfo uMaterial;        // The material of the object being drawn

uniform vec3 uColor;

const vec3 materialAmb = vec3(1.0, 0.0, 0.0);
const vec3 materialDif = vec3(1.0, 0.0, 0.0);
const vec3 materialSpe = vec3(1.0, 1.0, 1.0);
const float shininess = 6.0;

const float colorScale = 255.0;

varying vec3 fNormal;
varying vec3 fViewer;

vec3 light;
vec3 ambientColor;
vec3 diffuseColor;
vec3 specularColor;

void main()
{

    for(int i=0; i<MAX_LIGHTS; i++) {
        if(i == uNLights) break;

        ambientColor += (uLights[i].ambient/colorScale) * (uMaterial.Ka/colorScale);
        diffuseColor += (uLights[i].diffuse/colorScale) * (uMaterial.Kd/colorScale);
        specularColor += (uLights[i].specular/colorScale) * (uMaterial.Ks/colorScale);

        if (abs(uLights[0].position.w - 1.0) > 0.01)
            light += normalize(uLights[i].position.xyz);
        else 
            light += normalize(uLights[i].position.xyz + fViewer);
    }

    vec3 L = normalize(light);
    vec3 V = normalize(fViewer);
    vec3 N = normalize(fNormal);
    vec3 H = normalize(L+V);

    float diffuseFactor = max( dot(L,N), 0.0 );
    vec3 diffuse = diffuseFactor * diffuseColor;

    float specularFactor = pow(max(dot(N,H), 0.0), uMaterial.shininess);
    vec3 specular = specularFactor * specularColor;

    if ( dot(L,N) < 0.0 ) {
        specular = vec3(0.0, 0.0, 0.0);
    }

    gl_FragColor = vec4(ambientColor + diffuse + specular, 1.0);
}