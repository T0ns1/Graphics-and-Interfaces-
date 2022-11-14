import { loadShadersFromURLS, setupWebGL, buildProgramFromSources } from '../../libs/utils.js';
import { mat4, vec3, flatten, lookAt, ortho, mult, cross, subtract, add } from '../../libs/MV.js';
import {modelView, loadMatrix, multRotationY, multScale, pushMatrix, popMatrix, multTranslation } from "../../libs/stack.js";
import * as CUBE from '../../libs/objects/cube.js';
import * as SPHERE from '../../libs/objects/sphere.js';
import * as CYLINDER from '../../libs/objects/cylinder.js';

/** @type {WebGLRenderingContext} */
let gl;

let program;

/** View and Projection matrices */
let mView;
let mProjection;

const edge = 2.0;

/** Theta and gamma (degrees) for our projections */
let theta = 45;
let gamma = 45;

function render(time)
{
    window.requestAnimationFrame(render);

    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);

    gl.uniformMatrix4fv(gl.getUniformLocation(program, "mProjection"), false, flatten(mProjection));

    loadMatrix(mView);

    gl.uniformMatrix4fv(gl.getUniformLocation(program, "mModelView"), false, flatten(modelView()));

    CUBE.draw(gl, program, gl.LINES);
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

    const eye = vec3(3*Math.cos(theta*Math.PI/180)*Math.sin(gamma*Math.PI/180),3*Math.sin(gamma*Math.PI/180),3*Math.sin(theta*Math.PI/180)*Math.sin(gamma*Math.PI/180));
    const at = vec3(0,0,0);
    const up = vec3(0,1,0);
    mView = lookAt(eye, at, up);
    setupProjection();

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
    window.addEventListener("keydown", function(event) {
        console.log(event.key);
        switch(event.key) {
            case "d":
                theta++;
                if (theta >= 360) theta = theta - 360;
                console.log(theta);
                break;
            case "a":
                theta--;
                if (theta <= 0) theta = theta + 360;
                console.log(theta);
                break;
            case "w":
                gamma++;
                if (gamma >= 360) gamma = gamma - 360;
                console.log(gamma);
                break;
            case "s":
                gamma--;
                if (gamma <= 0) gamma = gamma + 360;
                console.log(gamma);
                break;
        }
        
        mView = lookAt(vec3(3*Math.cos(theta*Math.PI/180)*Math.sin(gamma*Math.PI/180),3*Math.cos(gamma*Math.PI/180),3*Math.sin(theta*Math.PI/180)*Math.sin(gamma*Math.PI/180)), vec3(0,0,0), vec3(0,1,0));

    });

    window.requestAnimationFrame(render);
}

const shaderUrls = ['shader.vert', 'shader.frag'];

loadShadersFromURLS(shaderUrls).then(shaders=>setup(shaders));