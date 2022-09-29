attribute vec4 vPosition;
uniform float u_dx;

void main()
{
    gl_Position = vPosition + vec4(u_dx, 0.0, 0.0, 0.0);
}