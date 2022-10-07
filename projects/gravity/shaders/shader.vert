attribute vec4 vPosition;

varying float fAngle;

void main()
{
    fAngle = atan(vPosition.y, vPosition.x);
    gl_Position = vPosition;
}