// Color Changes

import { buildProgramFromSources, loadShadersFromURLS, setupWebGL } from "../../libs/utils.js";
import { flatten, vec2 } from "../../libs/MV.js";

/** @type {WebGLRenderingContext} */
var gl;
var program;

function setup(shaders)
{

    //setup
    const canvas = document.getElementById("gl-canvas");
    gl = setupWebGL(canvas);
    program = buildProgramFromSources(gl, shaders["shader.vert"], shaders["shader.frag"]);

    const vertices = [ vec2(-0.5, -0.5), vec2(0.5, -0.5), vec2(0, 0.5) ];
    
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);
    
    const vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    gl.viewport(0, 0, canvas.width, canvas.height);

    gl.clearColor(1.0, 1.0, 0.0, 1.0);

    animate();
}

function animate()
{
    window.requestAnimationFrame(animate);

    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
}

loadShadersFromURLS(["shader.vert", "shader.frag"]).then(shaders=>setup(shaders));