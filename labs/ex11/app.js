// A morphing polygon example

import { buildProgramFromSources, loadShadersFromURLS, setupWebGL } from "../../libs/utils.js";
import { flatten, vec2 } from "../../libs/MV.js";

/** @type {WebGLRenderingContext} */
var gl;
var program;

function setup(shaders)
{
    // Setup
    const canvas = document.getElementById("gl-canvas");
    gl = setupWebGL(canvas);
    program = buildProgramFromSources(gl, shaders["shader.vert"], shaders["shader.frag"]);

    const vertices = [  // triangle 1       //triangle 2
                        vec2(-0.5, 0.5),   vec2(-0.6, 0.3), 
                        vec2(-0.5, -0.5),    vec2(-0.7, -0.7), 
                        vec2(0.5, 0.5),     vec2(0.7, 0.8),
                        vec2(0.5, -0.5),    vec2(0.6, -0.2)
                     ];
    
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);

    const vPosition1 = gl.getAttribLocation(program, "vPosition1");
    gl.vertexAttribPointer(vPosition1, 2, gl.FLOAT, false, 4*2*2, 0);
    gl.enableVertexAttribArray(vPosition1);

    const vPosition2 = gl.getAttribLocation(program, "vPosition2");
    gl.vertexAttribPointer(vPosition2, 2, gl.FLOAT, false, 4*2*2, 4*2);
    gl.enableVertexAttribArray(vPosition2);

    // Setup the viewport
    gl.viewport(0, 0, canvas.width, canvas.height); 

    // Setup background color
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    // Call animate for the first time
    animate();
}

function animate(time)
{
    window.requestAnimationFrame(animate);

    //Drawing Code
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);

    const uTime = gl.getUniformLocation(program, "uTime");
    gl.uniform1f(uTime, time/1000);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

loadShadersFromURLS(["shader.vert", "shader.frag"]).then(shaders => setup(shaders))