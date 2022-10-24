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
        
    let mModel = mult(t, mult(rZ, mult(rY, mult(rX, s))));
    
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
    document.getElementById("remove").addEventListener("click", function() {
        const box = document.getElementById("object_instances");
        const sIndex = box.selectedIndex;
        const length = instances.length;
        console.log(sIndex);
        
        for (let i = sIndex; i < length; i++) {
            document.getElementById(i).remove();
            if (i+1 != length) { 
                instances.splice(i, 1, instances[i+1]);

                let option = document.createElement("option");
                switch(instances[i+1]) {
                    case "cube":
                        option.text= "Cube " + i;
                        option.id = i;
                        box.add(option);
                        break;
                    case "sphere":
                        option.text = "Sphere " + i;
                        option.id = i;
                        box.add(option);
                        break;
                }
            }
            else instances.pop();
        }
        console.log(instances);

    });
    document.getElementById("px").addEventListener("change", function() {
        px = document.getElementById("px").value;
    });
    document.getElementById("py").addEventListener("change", function() {
        py = document.getElementById("py").value;
    });
    document.getElementById("pz").addEventListener("change", function() {
        pz = document.getElementById("pz").value;
    });
    document.getElementById("rx").addEventListener("change", function() {
        rx = document.getElementById("rx").value;
    });
    document.getElementById("ry").addEventListener("change", function() {
        ry = document.getElementById("ry").value;
    });
    document.getElementById("rz").addEventListener("change", function() {
        rz = document.getElementById("rz").value;
    });
    document.getElementById("sx").addEventListener("change", function() {
        sx = document.getElementById("sx").value;
    });
    document.getElementById("sy").addEventListener("change", function() {
        sy = document.getElementById("sy").value;
    });
    document.getElementById("sz").addEventListener("change", function() {
        sz = document.getElementById("sz").value;
    });


    window.requestAnimationFrame(render);
}

const shaderUrls = ['shader.vert', 'shader.frag'];

loadShadersFromURLS(shaderUrls).then(shaders=>setup(shaders));
