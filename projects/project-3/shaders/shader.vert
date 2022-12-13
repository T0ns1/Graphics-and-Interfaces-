attribute vec4 vPosition;
attribute vec3 vNormal;

uniform mat4 mProjection;
uniform mat4 mModelView;
uniform mat4 mNormals;

varying vec3 fNormal;
varying vec3 fViewer;

void main()
{
    // position in camera frame
    vec3 posC = (mModelView * vPosition).xyz;

    // normals in camera frame
    fNormal = (mNormals * vec4(vNormal, 0.0)).xyz;

    // view vector
    fViewer = -posC; // Perspective projection

    
    gl_Position = mProjection * vec4(posC, 1.0);
}