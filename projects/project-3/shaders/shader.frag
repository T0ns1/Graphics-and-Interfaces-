precision highp float;

const int MAX_LIGHTS = 3;

struct LightInfo {
    // Light colour intensities
    vec3 ambient;
    vec3 diffuse;
    vec3 specular;

    // Light geometry
    vec4 position;   // Position/direction of light (in camera coordinates)
    vec4 axis;      //  Spotlight direction (in camera coordinates)
    float aperture;
    float cutoff;
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

const float colorScale = 255.0;

varying vec3 fNormal;
varying vec3 fViewer;

vec3 ambient;
vec3 diffuse;
vec3 specular;

void main()
{

    for(int i=0; i<MAX_LIGHTS; i++) {
        if(i == uNLights) break;

        vec3 ambientColor = (uLights[i].ambient/colorScale) * (uMaterial.Ka/colorScale);
        vec3 diffuseColor = (uLights[i].diffuse/colorScale) * (uMaterial.Kd/colorScale);
        vec3 specularColor = (uLights[i].specular/colorScale) * (uMaterial.Ks/colorScale);

        vec3 light;
        if (abs(uLights[i].position.w - 1.0) > 0.01)
            light = normalize(uLights[i].position.xyz);
        else
            light = normalize(uLights[i].position.xyz + fViewer);

        vec3 L = normalize(light);
        vec3 V = normalize(fViewer);
        vec3 N = normalize(fNormal);
        vec3 H = normalize(L+V);

        ambient += ambientColor;

        float theta = dot(L, normalize(-uLights[i].axis.xyz));

        if((theta > uLights[i].aperture) || (abs(uLights[i].position.w - 1.0) > 0.01)) {
            float diffuseFactor = max( dot(L,N), 0.0 );
            diffuse += diffuseFactor * diffuseColor;

            float specularFactor = pow(max(dot(N,H), 0.0), uMaterial.shininess);
            specular += specularFactor * specularColor;

            if ( dot(L,N) < 0.0 ) {
                specular += vec3(0.0, 0.0, 0.0);
            }

            float attenuation = pow(theta,uLights[i].cutoff);
            diffuse  *= attenuation;
            specular *= attenuation;
        }
    }

    gl_FragColor = vec4(ambient + diffuse + specular, 1.0);
}