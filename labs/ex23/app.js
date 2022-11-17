import { buildProgramFromSources, loadShadersFromURLS, setupWebGL } from "../../libs/utils.js";
import { ortho, lookAt, flatten } from "../../libs/MV.js";
import {modelView, loadMatrix, multRotationX, multRotationY, multRotationZ, multScale, multTranslation, popMatrix, pushMatrix} from "../../libs/stack.js";

import * as CUBE from '../../libs/objects/cube.js';
import * as CYLINDER from '../../libs/objects/cylinder.js'




function setup(shaders)
{
    let canvas = document.getElementById("gl-canvas");
    let aspect = canvas.width / canvas.height;

    /** @type WebGL2RenderingContext */
    let gl = setupWebGL(canvas);

    // Drawing mode (gl.LINES or gl.TRIANGLES)
    let mode = gl.LINES;

    let program = buildProgramFromSources(gl, shaders["shader.vert"], shaders["shader.frag"]);

    let mProjection = ortho(-1*aspect,aspect, -1, 1,0.01,3);
    let mView = lookAt([2, 1.2, 1], [0, 0.6, 0], [0, 1, 0]);

    let zoom = 1.0;

    /** Model parameters */
    let ag = 0;
    let rg = 0;
    let rb = 0;
    let rc = 0;

    resize_canvas();
    window.addEventListener("resize", resize_canvas);

    document.onkeydown = function(event) {
        switch(event.key) {
            case '1':
                // Front view
                mView = lookAt([0,0.6,1], [0,0.6,0], [0,1,0]);
                break;
            case '2':
                // Top view
                mView = lookAt([0,1.6,0],  [0,0.6,0], [0,0,-1]);
                break;
            case '3':
                // Right view
                mView = lookAt([1, 0.6, 0.], [0, 0.6, 0], [0, 1, 0]);
                break;
            case '4':
                mView = lookAt([2, 1.2, 1], [0, 0.6, 0], [0, 1, 0]);
                break;
            case '9':
                mode = gl.LINES; 
                break;
            case '0':
                mode = gl.TRIANGLES;
                break;
            case 'p':
                ag = Math.min(0.050, ag + 0.005);
                break;
            case 'o':
                ag = Math.max(0, ag - 0.005);
                break;
            case 'q':
                rg += 1;
                break;
            case 'e':
                rg -= 1;
                break;
            case 'w':
                rc = Math.min(120, rc+1);
                break;
            case 's':
                rc = Math.max(-120, rc-1);
                break;
            case 'a':
                rb -= 1;
                break;
            case 'd':
                rb += 1;
                break;
            case '+':
                zoom /= 1.1;
                break;
            case '-':
                zoom *= 1.1;
                break;
        }
    }

    gl.clearColor(0.3, 0.3, 0.3, 1.0);
    gl.enable(gl.DEPTH_TEST);   // Enables Z-buffer depth test

    CUBE.init(gl);
    CYLINDER.init(gl);

    window.requestAnimationFrame(render);


    function resize_canvas(event)
    {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        aspect = canvas.width / canvas.height;

        gl.viewport(0,0,canvas.width, canvas.height);
        mProjection = ortho(-aspect*zoom,aspect*zoom, -zoom, zoom,0.01,3);
    }

    function uploadProjection()
    {
        uploadMatrix("mProjection", mProjection);
    }

    function uploadModelView()
    {
        uploadMatrix("mModelView", modelView());
    }

    function uploadMatrix(name, m) {
        gl.uniformMatrix4fv(gl.getUniformLocation(program, name), false, flatten(m));
    }

    function UpperArm()
    {
        pushMatrix()
            multScale([0.4, 0.1, 0.4]);
            multTranslation([0, 0.5, 0]);

            uploadModelView();
            CYLINDER.draw(gl, program, mode);
        popMatrix()
        multTranslation([0, 0.1, 0]);
        multScale([0.05, 0.6, 0.05]);
        multTranslation([0, 0.5, 0]);

        uploadModelView();
        CUBE.draw(gl, program, mode);
    }

    function LowerArmAndClaw()
    {
        multRotationZ(rc);
        pushMatrix();
            LowerArm();
        popMatrix();
        multTranslation([0, 0.45, 0]);
        Claw();
    }

    function LowerArm()
    {
        pushMatrix();
            multScale([0.1, 0.1, 0.05]);
            multRotationX(90);

            uploadModelView();
            CYLINDER.draw(gl, program, mode);
        popMatrix();
        multTranslation([0, 0.05, 0]);
        multScale([0.05, 0.4, 0.05]);
        multTranslation([0, 0.5, 0]);

        uploadModelView();
        CUBE.draw(gl, program, mode);
    }


    function Claw()
    {
        multRotationY(rg)
        // Fist
        pushMatrix();
            multScale([0.2, 0.05, 0.2]);
            multTranslation([0, -0.5, 0]);

            uploadModelView();
            CYLINDER.draw(gl, program, mode);
        popMatrix();
        // Maxilla 1
        pushMatrix();
            multTranslation([ag, 0, 0]);
            multScale([0.02, 0.15, 0.1]);
            multTranslation([0.5, 0.5, 0]);

            uploadModelView();
            CUBE.draw(gl, program, mode);
        popMatrix();
        // Maxilla 2
        multTranslation([-ag, 0, 0]);
        multScale([0.02, 0.15, 0.1]);
        multTranslation([-0.5, 0.5, 0]);

        uploadModelView();
        CUBE.draw(gl, program, mode);
    }

    function RobotArm() 
    {
        multRotationY(rb);
        pushMatrix();
            UpperArm();
        popMatrix();
        multTranslation([0,0.7,0]);

        multTranslation([0,0.05,0]);
        LowerArmAndClaw();
    }

    function render()
    {
        window.requestAnimationFrame(render);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        gl.useProgram(program);
        
        // Send the mProjection matrix to the GLSL program
        mProjection = ortho(-aspect*zoom,aspect*zoom, -zoom, zoom,0.01,3);
        uploadProjection(mProjection);

        // Load the ModelView matrix with the Worl to Camera (View) matrix
        loadMatrix(mView);

        //Claw();
        //LowerArm();
        //LowerArmAndClaw();
        //UpperArm();
        RobotArm();
    }
}

const urls = ["shader.vert", "shader.frag"];
loadShadersFromURLS(urls).then(shaders => setup(shaders))