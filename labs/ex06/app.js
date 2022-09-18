// 10'000 red triangles drawn pseudo-randomly

import { buildProgramFromSources, loadShadersFromURLS, setupWebGL } from "../../libs/utils.js";
import { flatten, vec2 } from "../../libs/MV.js";

/** @type {WebGLRenderingContext} */
var gl;
var program;
const numberTriangles = 1000; 

function coinFlip()
{
    const random = Math.random();
    if (random > 0.5) {
        return true;
    }
    else {
        return false;
    }
}

function generateRandomCoordinate()
{
    if (coinFlip()) {
        return Math.random();
    }
    else {
        return -Math.random();
    }
}

function generateRandomVertice(x, y)
{
    const w = x + (generateRandomCoordinate()*0.07);
    const z = y + (generateRandomCoordinate()*0.07);

    return vec2(w, z);
}

function generateSmallTrianglesVertices(totalTriangles)
{   
    const vertices = [];

    for (let i = 0 ; i < totalTriangles ; i++)
    {
    var x = generateRandomCoordinate();
    var y = generateRandomCoordinate();
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