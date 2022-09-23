// 10'000 red triangles drawn pseudo-randomly

import { buildProgramFromSources, loadShadersFromURLS, setupWebGL } from "../../libs/utils.js";
import { flatten, vec2 } from "../../libs/MV.js";

/** @type {WebGLRenderingContext} */
var gl;
var program;
const numberTriangles = 10000;

function generateRandomCoordinate()
{
    return (Math.random() * 2) - 1;
}

function generateRandomVertice(x, y)
{
    let w = x + (generateRandomCoordinate()*0.03);
    let z = y + (generateRandomCoordinate()*0.03);

    if ( Math.abs(w - x) < 0.001 )
    {
        if (w < 0) 
        {
            w = x - 0.001;
        }
        else
        {
            w = x + 0.001;
        }
    }

    if ( Math.abs(z - y) < 0.001 )
    {
        if (z < 0) 
        {
            z = y - 0.001;
        }
        else
        {
            z = y + 0.001;
        }
    }

    return vec2(w, z);
}

function generateSmallTrianglesVertices(totalTriangles)
{   
    const vertices = [];

    for (let i = 0 ; i < totalTriangles ; i++)
    {
    let x = generateRandomCoordinate();
    let y = generateRandomCoordinate();
        for (let j = 0 ; j < 3 ; j++)
        {
            vertices.push( generateRandomVertice(x, y) );
        }
    }
    
    return vertices;
}

function setup(shaders)
{
    // Setup
    const canvas = document.getElementById("gl-canvas");
    gl = setupWebGL(canvas);
    program = buildProgramFromSources(gl, shaders["shader.vert"], shaders["shader.frag"]);

    const vertices = generateSmallTrianglesVertices(numberTriangles);
    
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);

    const vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    // Setup the viewport
    gl.viewport(0, 0, canvas.width, canvas.height); 

    // Setup background color
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    // Call animate for the first time
    animate();
}

function animate()
{
    window.requestAnimationFrame(animate);

    //Drawing Code
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);
    gl.drawArrays(gl.TRIANGLES, 0, 3*numberTriangles);
}

loadShadersFromURLS(["shader.vert", "shader.frag"]).then(shaders => setup(shaders))