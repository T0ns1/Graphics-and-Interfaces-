import { loadShadersFromURLS, setupWebGL, buildProgramFromSources } from '../../libs/utils.js';
import { mat4, vec3, flatten, lookAt, ortho, mult } from '../../libs/MV.js';

import * as SPHERE from './js/sphere.js';
import * as CUBE from './js/cube.js';

/** @type {WebGLRenderingContext} */
let gl;

let program;

/** View and Projection matrices */
let mView;
let mProjection;

const edge = 2.0;

let instances = [];



function render(time)
{
    window.requestAnimationFrame(render);

    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);

    const uCtm = gl.getUniformLocation(program, "uCtm");
    gl.uniformMatrix4fv(uCtm, false, flatten(mult(mProjection, mult(mView, mat4()))));

    for (let i = 0; i < instances.length; i++) {
        switch(instances[i]) {
            case "cube":
                CUBE.draw(gl, program, gl.LINES);
                break;
            case "sphere":
                SPHERE.draw(gl, program, gl.LINES);
                break;
        }
    }
}



function setup(shaders)
{
    const canvas = document.getElementById('gl-canvas');

    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = window.innerHeight;

    gl = setupWebGL(canvas);
    program = buildProgramFromSources(gl, shaders['shader.vert'], shaders['shader.frag']);

    gl.clearColor(0.1, 0.1, 0.1, 1.0);
    gl.viewport(0,0,canvas.width, canvas.height);

    mView = lookAt(vec3(0,0,0), vec3(-1,-1,-2), vec3(0,1,0));
    setupProjection();

    SPHERE.init(gl);
    CUBE.init(gl);

    function setupProjection()
    {
        if(canvas.width < canvas.height) {
            const yLim = edge*canvas.height/canvas.width;
            mProjection = ortho(-edge, edge, -yLim, yLim, -10, 10);
        }
        else {
            const xLim = edge*canvas.width/canvas.height;
            mProjection = ortho(-xLim, xLim, -edge, edge, -10, 10);
        }

    }
    window.addEventListener("resize", function() {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = window.innerHeight;

        setupProjection();
    
        gl.viewport(0,0,canvas.width, canvas.height);
    });
    document.getElementById("add_cube").addEventListener("click", function(index) {
        instances.push("cube");
        const box = document.getElementById("object_instances");
        var option = document.createElement("option");
        option.text = "Cube " + instances.length-1;
        option.id = instances.length-1;
        box.add(option);
    });
    document.getElementById("add_sphere").addEventListener("click", function(index) {
        instances.push("sphere");
        const box = document.getElementById("object_instances");
        var option = document.createElement("option");
        option.text = "Sphere " + instances.length-1;
        option.id = instances.length-1;
        box.add(option);
    });


    window.requestAnimationFrame(render);
}

const shaderUrls = ['shader.vert', 'shader.frag'];

loadShadersFromURLS(shaderUrls).then(shaders=>setup(shaders));
