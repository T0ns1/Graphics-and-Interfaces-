const vec4 lightPosition = vec4(0.0, 1.8, 1.3, 1.0);

attribute vec4 vPosition;
attribute vec3 vNormal;

uniform mat4 mProjection;
uniform mat4 mModelView;
uniform mat4 mNormals;
uniform mat4 mView;
uniform mat4 mViewNormals;

varying vec3 fNormal;
varying vec3 fLight;
varying vec3 fViewer;

void main()
{
    // position in camera frame
    vec3 posC = (mModelView * vPosition).xyz;

    // normals in camera frame
    fNormal = (mNormals * vec4(vNormal, 0.0)).xyz;

    // lights in camera frame
    if(lightPosition.w == 0.0)
        fLight = normalize((mViewNormals * lightPosition).xyz);
    else
        fLight = normalize((mView * lightPosition).xyz - posC);

    // view vector
    fViewer = -posC; // Perspective projection


    gl_Position = mProjection * mModelView * vPosition;
}