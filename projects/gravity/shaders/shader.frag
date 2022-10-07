precision highp float;

varying float fAngle;


void main()
{
    gl_FragColor = vec4(1.0*abs(cos(fAngle)), 0.0, 0.0, 1.0);
}