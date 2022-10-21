attribute vec4 vPosition;
attribute vec3 vNormal;

uniform mat4 uCtm;

void main()
{
    gl_Position = uCtm * vPosition;
}