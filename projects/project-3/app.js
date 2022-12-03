import { buildProgramFromSources, loadShadersFromURLS, setupWebGL } from '../../libs/utils.js';
import { length, flatten, inverse, mult, normalMatrix, perspective, lookAt, vec4, vec3, vec2, subtract, add, scale, rotate, normalize } from '../../libs/MV.js';

import * as dat from '../../libs/dat.gui.module.js';

import * as CUBE from '../../libs/objects/cube.js';
import * as CYLINDER from '../../libs/objects/cylinder.js';
import * as BUNNY from '../../libs/objects/bunny.js';
import * as TORUS from '../../libs/objects/torus.js'

import * as STACK from '../../libs/stack.js';

function setup(shaders) {
    const canvas = document.getElementById('gl-canvas');
    const gl = setupWebGL(canvas);

    CUBE.init(gl);
    CYLINDER.init(gl);
    BUNNY.init(gl);
    TORUS.init(gl);

    const program = buildProgramFromSources(gl, shaders['shader.vert'], shaders['shader.frag']);

    // Camera  
    let camera = {
        eye: vec3(0,0,20),
        at: vec3(0,0,0),
        up: vec3(0,1,0),
        fovy: 45,
        aspect: 1, // Updated further down
        near: 0.1,
        far: 50
    }

    let options = {
        backface_culling: true,
        depth_test: true,
    }

    let lights = {
        MAX_LIGHTS: 3,
        light1: true,
        light2: false,
        light3: false,

    }

    const gui = new dat.GUI();

    const optionsGui = gui.addFolder("options");
    optionsGui.add(options, "backface_culling");
    optionsGui.add(options, "depth_test");

    const cameraGui = gui.addFolder("camera");

    cameraGui.add(camera, "fovy").min(1).max(100).step(1).listen();
    cameraGui.add(camera, "aspect").min(0).max(10).domElement.style.pointerEvents = "none";
    
    cameraGui.add(camera, "near").min(0.1).max(20).onChange( function(v) {
        camera.near = Math.min(camera.far-0.5, v);
    });

    cameraGui.add(camera, "far").min(0.1).max(20).listen().onChange( function(v) {
        camera.far = Math.max(camera.near+0.5, v);
    });

    const eye = cameraGui.addFolder("eye");
    eye.add(camera.eye, 0).step(0.05).listen();//.domElement.style.pointerEvents = "none";;
    eye.add(camera.eye, 1).step(0.05).listen();//.domElement.style.pointerEvents = "none";;
    eye.add(camera.eye, 2).step(0.05).listen();//.domElement.style.pointerEvents = "none";;

    const at = cameraGui.addFolder("at");
    at.add(camera.at, 0).step(0.05).listen();//.domElement.style.pointerEvents = "none";;
    at.add(camera.at, 1).step(0.05).listen();//.domElement.style.pointerEvents = "none";;
    at.add(camera.at, 2).step(0.05).listen();//.domElement.style.pointerEvents = "none";;

    const up = cameraGui.addFolder("up");
    up.add(camera.up, 0).step(0.05).listen();//.domElement.style.pointerEvents = "none";;
    up.add(camera.up, 1).step(0.05).listen();//.domElement.style.pointerEvents = "none";;
    up.add(camera.up, 2).step(0.05).listen();//.domElement.style.pointerEvents = "none";;

    const lightsGUI = gui.addFolder("lights");
    lightsGUI.add(lights, "light1");
    lightsGUI.add(lights, "light2");
    lightsGUI.add(lights, "light3");

    const light1 = lightsGUI.addFolder("Light1");

    // matrices
    let mView, mProjection;

    let down = false;
    let lastX, lastY;

    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    resizeCanvasToFullWindow();

    window.addEventListener('resize', resizeCanvasToFullWindow);

    window.addEventListener('wheel', function(event) {

        
        if(!event.altKey && !event.metaKey && !event.ctrlKey) { // Change fovy
            const factor = 1 - event.deltaY/1000;
            camera.fovy = Math.max(1, Math.min(100, camera.fovy * factor)); 
        }
        else if(event.metaKey || event.ctrlKey) {
            // move camera forward and backwards (shift)

            const offset = event.deltaY / 1000;

            const dir = normalize(subtract(camera.at, camera.eye));

            const ce = add(camera.eye, scale(offset, dir));
            const ca = add(camera.at, scale(offset, dir));
            
            // Can't replace the objects that are being listened by dat.gui, only their properties.
            camera.eye[0] = ce[0];
            camera.eye[1] = ce[1];
            camera.eye[2] = ce[2];

            if(event.ctrlKey) {
                camera.at[0] = ca[0];
                camera.at[1] = ca[1];
                camera.at[2] = ca[2];
            }
        }
    });

    function inCameraSpace(m) {
        const mInvView = inverse(mView);

        return mult(mInvView, mult(m, mView));
    }

    canvas.addEventListener('mousemove', function(event) {
        if(down) {
            const dx = event.offsetX - lastX;
            const dy = event.offsetY - lastY;

            if(dx != 0 || dy != 0) {
                // Do something here...

                const d = vec2(dx, dy);
                const axis = vec3(-dy, -dx, 0);

                const rotation = rotate(0.5*length(d), axis);

                let eyeAt = subtract(camera.eye, camera.at);                
                eyeAt = vec4(eyeAt[0], eyeAt[1], eyeAt[2], 0);
                let newUp = vec4(camera.up[0], camera.up[1], camera.up[2], 0);

                eyeAt = mult(inCameraSpace(rotation), eyeAt);
                newUp = mult(inCameraSpace(rotation), newUp);
                
                console.log(eyeAt, newUp);

                camera.eye[0] = camera.at[0] + eyeAt[0];
                camera.eye[1] = camera.at[1] + eyeAt[1];
                camera.eye[2] = camera.at[2] + eyeAt[2];

                camera.up[0] = newUp[0];
                camera.up[1] = newUp[1];
                camera.up[2] = newUp[2];

                lastX = event.offsetX;
                lastY = event.offsetY;
            }

        }
    });

    canvas.addEventListener('mousedown', function(event) {
        down=true;
        lastX = event.offsetX;
        lastY = event.offsetY;
        gl.clearColor(0.2, 0.0, 0.0, 1.0);
    });

    canvas.addEventListener('mouseup', function(event) {
        down = false;
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
    });

    window.requestAnimationFrame(render);

    function resizeCanvasToFullWindow()
    {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        camera.aspect = canvas.width / canvas.height;

        gl.viewport(0,0,canvas.width, canvas.height);
    }

    function uploadModelView() {
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mModelView"), false, flatten(STACK.modelView()));
    }

    function useColor(r, g, b) {
        const scale = 255;

        r /= scale;
        g /= scale;
        b /= scale;

        gl.uniform3fv(gl.getUniformLocation(program, "uColor"), vec3(r,g,b));
    }

    function render()
    {
        window.requestAnimationFrame(render);

        if (options.depth_test) gl.enable(gl.DEPTH_TEST);
        else gl.disable(gl.DEPTH_TEST);

        if (options.backface_culling) gl.enable(gl.CULL_FACE), gl.cullFace(gl.BACK);
        else gl.disable(gl.CULL_FACE);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.useProgram(program);

        mView = lookAt(camera.eye, camera.at, camera.up);
        STACK.loadMatrix(mView);

        mProjection = perspective(camera.fovy, camera.aspect, camera.near, camera.far);

        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mView"), false, flatten(mView))
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mModelView"), false, flatten(STACK.modelView()));
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mProjection"), false, flatten(mProjection));
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mNormals"), false, flatten(normalMatrix(STACK.modelView())));
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mViewNormals"), false, flatten(normalMatrix(mView)));

        STACK.pushMatrix();
            STACK.multTranslation([0, -1.25, 0]);
            STACK.multScale([10, 0.5, 10]);
            uploadModelView();
            useColor(202, 123, 44);
            CUBE.draw(gl, program, gl.TRIANGLES);
        STACK.popMatrix();
        STACK.pushMatrix();
            STACK.multTranslation([-2, 0, -2]);
            STACK.multScale([2, 2, 2]);
            uploadModelView();
            useColor(205, 48, 38);
            CUBE.draw(gl, program, gl.TRIANGLES);
        STACK.popMatrix();
        STACK.pushMatrix();
            STACK.multTranslation([2, 0, -2]);
            STACK.multScale([2, 2, 2]);
            uploadModelView();
            useColor(44, 233, 189);
            CYLINDER.draw(gl, program, gl.TRIANGLES);
        STACK.popMatrix();
        STACK.pushMatrix();
            STACK.multTranslation([2, -1, 2]);
            STACK.multScale([15, 15, 15]);
            uploadModelView();
            useColor(238, 18, 99);
            BUNNY.draw(gl, program, gl.TRIANGLES);
        STACK.popMatrix();
        STACK.pushMatrix();
            STACK.multTranslation([-2, -0.6, 2]);
            STACK.multScale([2, 2, 2]);
            uploadModelView();
            useColor(47, 230, 102);
            TORUS.draw(gl, program, gl.TRIANGLES);
        STACK.popMatrix();
    }
}

const urls = ['shader.vert', 'shader.frag'];

loadShadersFromURLS(urls).then( shaders => setup(shaders));