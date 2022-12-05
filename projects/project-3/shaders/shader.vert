attribute vec4 vPosition;
attribute vec3 vNormal;

uniform mat4 mProjection;
uniform mat4 mModelView;
uniform mat4 mNormals;

varying vec3 fNormal;
//varying vec3 fLight;
varying vec3 fViewer;

void main()
{
    // position in camera frame
    vec3 posC = (mModelView * vPosition).xyz;

    // normals in camera frame
    fNormal = (mNormals * vec4(vNormal, 0.0)).xyz;

    // lights in camera frame
    //if(lightPosition.w == 0.0)
    //    fLight = normalize((mViewNormals * lightPosition).xyz);
    //else
    //    fLight = normalize((mView * lightPosition).xyz - posC);

    // view vector
    fViewer = -posC; // Perspective projection


    gl_Position = mProjection * mModelView * vPosition;
}