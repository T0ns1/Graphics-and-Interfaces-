import { loadShadersFromURLS, setupWebGL, buildProgramFromSources } from '../../libs/utils.js';
import { mat4, vec3, flatten, lookAt, ortho, mult, cross, subtract, add, rotateZ } from '../../libs/MV.js';
import {modelView, loadMatrix, multRotationY, multScale, pushMatrix, popMatrix, multTranslation, multRotationX, multRotationZ } from "../../libs/stack.js";
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

let alpha = 0;

let mode;

function render(time)
{

    window.requestAnimationFrame(render);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(program);

    gl.uniformMatrix4fv(gl.getUniformLocation(program, "mProjection"), false, flatten(mProjection));

    loadMatrix(mView);

    Helicopter();

    function uploadModelView()
    {
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mModelView"), false, flatten(modelView()));
    }

    function Helicopter()
    {
        const uColor = gl.getUniformLocation(program, "uColor");
        gl.uniform3fv(uColor, vec3(1.0, 0.0, 0.0)); // red
        
        pushMatrix();
            multScale([0.8, 0.3, 0.3]);
            uploadModelView();
            SPHERE.draw(gl, program, mode);
        popMatrix();
        pushMatrix();
            multTranslation([0.6, 0.05, 0.0]);
            multScale([1.0, 0.1, 0.1]);
            uploadModelView();
            SPHERE.draw(gl, program, mode);
        popMatrix();
        pushMatrix();
            multTranslation([1.07, 0.12, 0.0]);
            multRotationZ(-10);
            multScale([0.1, 0.18, 0.05]);
            uploadModelView();
            SPHERE.draw(gl, program, mode);
        popMatrix();

        gl.uniform3fv(uColor, vec3(1.0, 1.0, 0.0)); // yellow

        pushMatrix();
            multTranslation([0.0,0.18,0.0]);
            multScale([0.02,0.07,0.02]);
            uploadModelView();
            CYLINDER.draw(gl, program, mode);
        popMatrix();
        pushMatrix();
            multTranslation([1.07,0.12,0.0]);
            multRotationX(90);
            multScale([0.02, 0.1, 0.02]);
            uploadModelView();
            CYLINDER.draw(gl, program, mode);
        popMatrix();
        pushMatrix();
            multTranslation([0.0, -0.25, 0.1]);
            multRotationZ(90);
            multScale([0.03, 0.6, 0.03]);
            uploadModelView();
            CYLINDER.draw(gl, program, mode);
        popMatrix();
        pushMatrix();
            multTranslation([0.0, -0.25, -0.1]);
            multRotationZ(90);
            multScale([0.03, 0.6, 0.03]);
            uploadModelView();
            CYLINDER.draw(gl, program, mode);
        popMatrix();

        gl.uniform3fv(uColor, vec3(0.86, 0.86, 0.86)); // grey

        pushMatrix();
            multTranslation([-0.08,-0.18,-0.06]);
            multRotationX(30);
            multScale([0.02,0.14,0.02]);
            uploadModelView();
            CUBE.draw(gl, program, mode);
        popMatrix();
        pushMatrix();
            multTranslation([0.08,-0.18,-0.06]);
            multRotationX(30);
            multScale([0.02,0.14,0.02]);
            uploadModelView();
            CUBE.draw(gl, program, mode);
        popMatrix();
        pushMatrix();
            multTranslation([0.08,-0.18,0.06]);
            multRotationX(-30);
            multScale([0.02,0.14,0.02]);
            uploadModelView();
            CUBE.draw(gl, program, mode);
        popMatrix();
        pushMatrix();
            multTranslation([-0.08,-0.18,0.06]);
            multRotationX(-30);
            multScale([0.02,0.14,0.02]);
            uploadModelView();
            CUBE.draw(gl, program, mode);
        popMatrix();

        gl.uniform3fv(uColor, vec3(0.0, 0.4, 0.4)); // cyan

        pushMatrix();
            multTranslation([1.07, 0.12, 0.04]);
            multRotationZ(alpha); // Rotorrs angle
            multTranslation([-0.05,0.0,0.0]);
            multScale([0.1, 0.05, 0.02]);
            uploadModelView();
            SPHERE.draw(gl, program, mode);
        popMatrix();
        pushMatrix();
            multTranslation([1.07, 0.12, 0.04]);
            multRotationZ(alpha); // Rotors angle
            multTranslation([0.05,0.0,0.0]);
            multScale([0.1, 0.05, 0.02]);
            uploadModelView();
            SPHERE.draw(gl, program, mode);
        popMatrix();
        pushMatrix();
            multRotationY(alpha);
            multTranslation([0.4, 0.18, 0.0]);
            multScale([0.8, 0.03, 0.1]);
            uploadModelView();
            SPHERE.draw(gl, program, mode);
        popMatrix();
        pushMatrix();
            multRotationY(alpha);
            multRotationY(-60);
            multTranslation([-0.4, 0.18, -0.0]);
            multScale([0.8, 0.03, 0.1]);
            uploadModelView();
            SPHERE.draw(gl, program, mode);
        popMatrix();
        pushMatrix();
            multRotationY(alpha);
            multRotationY(60);
            multTranslation([-0.4, 0.18, 0.0]);
            multScale([0.8, 0.03, 0.1]);
            uploadModelView();
            SPHERE.draw(gl, program, mode);
        popMatrix();
        
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

    mode = gl.LINES;
    const eye = vec3(3*Math.cos(theta*Math.PI/180)*Math.sin(gamma*Math.PI/180),3*Math.sin(gamma*Math.PI/180),3*Math.sin(theta*Math.PI/180)*Math.sin(gamma*Math.PI/180));
    const at = vec3(0,0,0);
    const up = vec3(0,1,0);
    mView = lookAt(eye, at, up);
    setupProjection();

    CUBE.init(gl);
    SPHERE.init(gl);
    CYLINDER.init(gl);

    gl.enable(gl.DEPTH_TEST);   // Enables Z-buffer depth test

    window.requestAnimationFrame(render);

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
            case "m":
                if (mode == gl.TRIANGLES) mode = gl.LINES;
                else mode = gl.TRIANGLES;
                break;
            case "ArrowUp":
                alpha++;
                break;
            case "ArrowDown":
                alpha--;
                break;
        }
        
        mView = lookAt(vec3(3*Math.cos(theta*Math.PI/180)*Math.sin(gamma*Math.PI/180),3*Math.cos(gamma*Math.PI/180),3*Math.sin(theta*Math.PI/180)*Math.sin(gamma*Math.PI/180)), vec3(0,0,0), vec3(0,1,0));

    });

}

const shaderUrls = ['shader.vert', 'shader.frag'];

loadShadersFromURLS(shaderUrls).then(shaders=>setup(shaders));