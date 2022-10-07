precision mediump float;

// Vertex position in World Coordinates
attribute vec2 vPosition;

// Output position in World Coordinates to fragment shader
varying vec2 fPosition;

void main() 
{
    fPosition = vPosition;
    gl_Position = vec4(vPosition, 0.0, 1.0);
}