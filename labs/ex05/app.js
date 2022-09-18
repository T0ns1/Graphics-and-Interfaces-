// A simple red triangle with a white line stripe around it 

import { buildProgramFromSources, loadShadersFromURLS, setupWebGL } from "../../libs/utils.js";
import { flatten, vec2 } from "../../libs/MV.js";

/** @type {WebGLRenderingContext} */
var gl;
var program;
var program2;

function setup(shaders)
{
    // Setup
    const canvas = document.getElementById("gl-canvas");
    gl = setupWebGL(canvas);
    program = buildProgramFromSources(gl, shaders["shader.vert"], shaders["shader.frag"]);
    program2 = buildProgramFromSources(gl, shaders["shader.vert"], shaders["shader2.frag"]);

    const vertices = [ vec2(-0.5, -0.5), vec2(0.5, -0.5), vec2(0, 0.5), vec2(-0.5, -0.5)  ];
    
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
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.useProgram(program2);
    gl.drawArrays(gl.LINE_STRIP, 0, 4);
}

loadShadersFromURLS(["shader.vert", "shader.frag", "shader2.frag"]).then(shaders => setup(shaders))