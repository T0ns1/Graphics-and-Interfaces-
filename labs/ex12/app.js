import { loadShadersFromURLS, setupWebGL, buildProgramFromSources } from '../../libs/utils.js';
import { mat4, vec3, flatten, lookAt, ortho, mult, translate, rotateX, rotateY, rotateZ, scalem } from '../../libs/MV.js';

import * as SPHERE from './js/sphere.js';
import * as CUBE from './js/cube.js';
import * as PYRAMID from './js/pyramid.js';

/** @type {WebGLRenderingContext} */
let gl;

let program;

/** View and Projection matrices */
let mView;
let mProjection;

const edge = 2.0;

let instances = [];

// Global Variables for our transformations
let px = [];
let py = [];
let pz = [];
let sx = [];
let sy = [];
let sz = [];
let rx = [];
let ry = [];
let rz = [];


function render(time)
{
    window.requestAnimationFrame(render);

    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);
    
    for (let i = 0; i < instances.length; i++) {
        let t = translate(px[i], py[i], pz[i]);
        let rZ = rotateZ(rz[i]);
        let rY = rotateY(ry[i]);
        let rX = rotateX(rx[i]);
        let s = scalem(sx[i], sy[i], sz[i]);
        
        let mModel = mult(t, mult(rZ, mult(rY, mult(rX, s))));

        const uCtm = gl.getUniformLocation(program, "uCtm");
        const uColor = gl.getUniformLocation(program, "uColor");

        gl.uniformMatrix4fv(uCtm, false, flatten(mult(mProjection, mult(mView, mModel))));
        if (i == document.getElementById("object_instances").selectedIndex) gl.uniform3f(uColor, 1.0, 0.0, 0.0);
        else gl.uniform3f(uColor, 1.0, 1.0, 1.0);

        switch(instances[i]) {
            case "cube":
                CUBE.draw(gl, program, gl.LINES);
                break;
            case "sphere":
                SPHERE.draw(gl, program, gl.LINES);
                break;
            case 'pyramid':
                PYRAMID.draw(gl, program, gl.LINES);
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
    PYRAMID.init(gl);

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
    document.getElementById("add_cube").addEventListener("click", function() {
        instances.push("cube");
        
        px.push(1.0);
        py.push(1.0);
        pz.push(1.0);
        rx.push(1.0);
        ry.push(0.0);
        rz.push(0.0);
        sx.push(1.0);
        sy.push(1.0);
        sz.push(1.0);

        const box = document.getElementById("object_instances");
        
        let option = document.createElement("option");
        option.text = "Cube " + (instances.length-1);
        option.id = instances.length-1;
        
        box.add(option);
    });
    document.getElementById("add_sphere").addEventListener("click", function() {
        instances.push("sphere");

        px.push(1.0);
        py.push(1.0);
        pz.push(1.0);
        rx.push(1.0);
        ry.push(0.0);
        rz.push(0.0);
        sx.push(1.0);
        sy.push(1.0);
        sz.push(1.0);

        const box = document.getElementById("object_instances");

        let option = document.createElement("option");
        option.text = "Sphere " + (instances.length-1);
        option.id = instances.length-1;

        box.add(option);
    });
    document.getElementById("add_pyramid").addEventListener("click", function() {
        instances.push("pyramid");

        px.push(1.0);
        py.push(1.0);
        pz.push(1.0);
        rx.push(1.0);
        ry.push(0.0);
        rz.push(0.0);
        sx.push(1.0);
        sy.push(1.0);
        sz.push(1.0);

        const box = document.getElementById("object_instances");

        let option = document.createElement("option");
        option.text = "Pyramid " + (instances.length-1);
        option.id = instances.length-1;

        box.add(option);
    });
    document.getElementById("object_instances").addEventListener("change", function() {
        const index = document.getElementById("object_instances").selectedIndex;
        document.getElementById("px").value = px[index];
        document.getElementById("py").value = py[index];
        document.getElementById("pz").value = pz[index];
        document.getElementById("rx").value = rx[index];
        document.getElementById("ry").value = ry[index];
        document.getElementById("rz").value = rz[index];
        document.getElementById("sx").value = sx[index];
        document.getElementById("sy").value = sy[index];
        document.getElementById("sz").value = sz[index];
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
                px.splice(i, 1, px[i+1]);
                py.splice(i, 1, py[i+1]);
                pz.splice(i, 1, pz[i+1]);
                rx.splice(i, 1, rx[i+1]);
                ry.splice(i, 1, ry[i+1]);
                rz.splice(i, 1, rz[i+1]);
                sx.splice(i, 1, sx[i+1]);
                sy.splice(i, 1, sy[i+1]);
                sz.splice(i, 1, sz[i+1]);

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
                    case "pyramid":
                        option.text = "Pyramid " + i;
                        option.id = i;
                        box.add(option);
                        break;                       
                }
            }
            else {
                instances.pop();
                px.pop();
                py.pop();
                pz.pop();
                rx.pop();
                ry.pop();
                rz.pop();
                sx.pop();
                sy.pop();
                sz.pop();
            }
        }
        console.log(instances);
    });
    document.getElementById("px").addEventListener("change", function() {
        const box = document.getElementById("object_instances");
        const sIndex = box.selectedIndex;
        px[sIndex] = document.getElementById("px").value;
    });
    document.getElementById("py").addEventListener("change", function() {
        const box = document.getElementById("object_instances");
        const sIndex = box.selectedIndex;
        py[sIndex] = document.getElementById("py").value;
    });
    document.getElementById("pz").addEventListener("change", function() {
        const box = document.getElementById("object_instances");
        const sIndex = box.selectedIndex;
        pz[sIndex] = document.getElementById("pz").value;
    });
    document.getElementById("rx").addEventListener("change", function() {
        const box = document.getElementById("object_instances");
        const sIndex = box.selectedIndex;
        rx[sIndex] = document.getElementById("rx").value;
    });
    document.getElementById("ry").addEventListener("change", function() {
        const box = document.getElementById("object_instances");
        const sIndex = box.selectedIndex;
        ry[sIndex] = document.getElementById("ry").value;
    });
    document.getElementById("rz").addEventListener("change", function() {
        const box = document.getElementById("object_instances");
        const sIndex = box.selectedIndex;
        rz[sIndex] = document.getElementById("rz").value;
    });
    document.getElementById("sx").addEventListener("change", function() {
        const box = document.getElementById("object_instances");
        const sIndex = box.selectedIndex;
        sx[sIndex] = document.getElementById("sx").value;
    });
    document.getElementById("sy").addEventListener("change", function() {
        const box = document.getElementById("object_instances");
        const sIndex = box.selectedIndex;
        sy[sIndex] = document.getElementById("sy").value;
    });
    document.getElementById("sz").addEventListener("change", function() {
        const box = document.getElementById("object_instances");
        const sIndex = box.selectedIndex;
        sz[sIndex] = document.getElementById("sz").value;
    });


    window.requestAnimationFrame(render);
}

const shaderUrls = ['shader.vert', 'shader.frag'];

loadShadersFromURLS(shaderUrls).then(shaders=>setup(shaders));
