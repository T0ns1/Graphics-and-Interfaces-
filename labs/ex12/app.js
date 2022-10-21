import { loadShadersFromURLS, setupWebGL, buildProgramFromSources } from '../../libs/utils.js';
import { mat4, vec3, flatten, lookAt, ortho, mult, translate, rotateX, rotateY, rotateZ, scalem } from '../../libs/MV.js';

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

// Global Variables for our transformations
let px = 0.0;
let py = 0.0;
let pz = 0.0;
let sx = 1.0;
let sy = 1.0;
let sz = 1.0;
let rx = 1.0;
let ry = 0.0;
let rz = 0.0;


function render(time)
{
    window.requestAnimationFrame(render);

    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);
    
    let t = translate(px, py, pz);
    let rZ = rotateZ(rz);
    let rY = rotateY(ry);
    let rX = rotateX(rx);
    let s = scalem(sx, sy, sz);
        
    let mModel = mult(t, mult(rz, mult(ry, mult(rx, s))));
    
    const uCtm = gl.getUniformLocation(program, "uCtm");
    //gl.uniformMatrix4fv(uCtm, false, flatten(mult(mProjection, mult(mView, mat4()))));
    gl.uniformMatrix4fv(uCtm, false, flatten(mult(mProjection, mult(mView, mModel))));
    
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
        let option = document.createElement("option");
        option.text = "Cube " + (instances.length-1);
        option.id = instances.length-1;
        box.add(option);
    });
    document.getElementById("add_sphere").addEventListener("click", function(index) {
        instances.push("sphere");
        const box = document.getElementById("object_instances");
        let option = document.createElement("option");
        option.text = "Sphere " + (instances.length-1);
        option.id = instances.length-1;
        box.add(option);
    });
    document.getElementById("px").addEventListener("change", function() {
        px = document.getElementById("px").value;
    });
    document.getElementById("py").addEventListener("change", function() {
        px = document.getElementById("py").value;
    });
    document.getElementById("pz").addEventListener("change", function() {
        px = document.getElementById("pz").value;
    });


    window.requestAnimationFrame(render);
}

const shaderUrls = ['shader.vert', 'shader.frag'];

loadShadersFromURLS(shaderUrls).then(shaders=>setup(shaders));
