precision highp float;  //Defines floating point numbers precision on the frag shader

uniform vec4 uColor;  


void main()
{
    gl_FragColor = uColor;
}