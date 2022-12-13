import { buildProgramFromSources, loadShadersFromURLS, setupWebGL } from '../../libs/utils.js';
import { length, flatten, inverse, mult, normalMatrix, perspective, lookAt, vec4, vec3, vec2, subtract, rotate } from '../../libs/MV.js';

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
        aspect: 1,
        near: 0.1,
        far: 50
    }

    let options = {
        backface_culling: true,
        depth_test: true,
    }

    // Material class and construction
    class Material {
        constructor(ka, kd, ks, shininess) {
            this.ka = ka;
            this.kd = kd;
            this.ks = ks;
            this.shininess = shininess;
        }
    }

    const tableMaterial = new Material(vec3(202, 123, 44), vec3(202, 123, 44), vec3(255, 255, 255), 10);
    const cubeMaterial = new Material(vec3(205, 48, 38), vec3(205, 48, 38), vec3(255, 255, 255), 4);
    const cylinderMaterial = new Material(vec3(44, 233, 189), vec3(44, 233, 189), vec3(255, 255, 255), 8);
    let bunnyMaterial = new Material(vec3(150, 150, 150), vec3(150, 150, 150), vec3(200, 200, 200), 100);
    const torusMaterial = new Material(vec3(47, 230, 102), vec3(47, 230, 102), vec3(255, 255, 255), 6);

    // light class and constructor
    class Light {
        constructor() {
            this.on = true;
            this.position = vec4(0.0, 0.0, 10.0, 1.0);
            this.ambient = vec3(50, 50, 50);
            this.diffuse = vec3(60, 60, 60);
            this.specular = vec3(200, 200, 200);
            this.axis = vec4(0,0,-1,0);
            this.aperture = 25;
            this.cutoff = 10;
        }
    }

    // Lights' Parameters
    const lights = [];
    const MAX_LIGHTS = 3; 

    var addLight = { addLight:function() {
        if (lights.length == MAX_LIGHTS) return;
        
        lights.push(new Light());
        
        const subFolder = lightsGUI.addFolder("Light" + lights.length);

        subFolder.add(lights[lights.length-1], "on");

        const positionFolder = subFolder.addFolder("position");
        positionFolder.add(lights[lights.length-1].position, 0).step(0.05).name("x");
        positionFolder.add(lights[lights.length-1].position, 1).step(0.05).name("y");
        positionFolder.add(lights[lights.length-1].position, 2).step(0.05).name("z");
        positionFolder.add(lights[lights.length-1].position, 3).min(0).max(1).step(1).name("w");

        const intensitiesFolder = subFolder.addFolder("intensities");
        intensitiesFolder.addColor(lights[lights.length-1], "ambient");
        intensitiesFolder.addColor(lights[lights.length-1], "diffuse");
        intensitiesFolder.addColor(lights[lights.length-1], "specular");

        const axisFolder = subFolder.addFolder("axis");
        axisFolder.add(lights[lights.length-1].axis, 0).step(1).name("x");
        axisFolder.add(lights[lights.length-1].axis, 1).step(1).name("y");
        axisFolder.add(lights[lights.length-1].axis, 2).step(1).name("z");

        subFolder.add(lights[lights.length-1], "aperture").min(0).max(360);
        subFolder.add(lights[lights.length-1], "cutoff").min(0).max(180);
    }};

    const gui = new dat.GUI();

    const optionsGui = gui.addFolder("options");
    optionsGui.add(options, "backface_culling").name("backface culling");
    optionsGui.add(options, "depth_test").name("depth test");

    const cameraGui = gui.addFolder("camera");

    cameraGui.add(camera, "fovy").min(1).max(100).step(1).listen();
    
    cameraGui.add(camera, "near").min(0.1).max(20).onChange( function(v) {
        camera.near = Math.min(camera.far-0.5, v);
    });

    cameraGui.add(camera, "far").min(0.1).max(50).listen().onChange( function(v) {
        camera.far = Math.max(camera.near+0.5, v);
    });

    const eye = cameraGui.addFolder("eye");
    eye.add(camera.eye, 0).step(0.1).listen();
    eye.add(camera.eye, 1).step(0.1).listen();
    eye.add(camera.eye, 2).step(0.1).listen();

    const at = cameraGui.addFolder("at");
    at.add(camera.at, 0).step(0.1).listen();
    at.add(camera.at, 1).step(0.1).listen();
    at.add(camera.at, 2).step(0.1).listen();

    const up = cameraGui.addFolder("up");
    up.add(camera.up, 0).step(0.1).listen();
    up.add(camera.up, 1).step(0.1).listen();
    up.add(camera.up, 2).step(0.1).listen();

    const lightsGUI = gui.addFolder("lights");
    lightsGUI.add(addLight, "addLight").name("Add light source");

    const materialGUI = gui.addFolder("material");
    materialGUI.addColor(bunnyMaterial, "ka").name("Ka");
    materialGUI.addColor(bunnyMaterial, "kd").name("Kd");
    materialGUI.addColor(bunnyMaterial, "ks").name("Ks");
    materialGUI.add(bunnyMaterial, "shininess");

    // matrices
    let mView, mProjection;

    let down = false;
    let lastX, lastY;

    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    resizeCanvasToFullWindow();

    addLight.addLight();

    window.addEventListener('resize', resizeCanvasToFullWindow);

    function inCameraSpace(m) {
        const mInvView = inverse(mView);

        return mult(mInvView, mult(m, mView));
    }

    canvas.addEventListener('mousemove', function(event) {
        if(down) {
            const dx = event.offsetX - lastX;
            const dy = event.offsetY - lastY;

            if(dx != 0 || dy != 0) {

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
    });

    canvas.addEventListener('mouseup', function(event) {
        down = false;
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

    function useMaterial(ka, kd, ks, shininess) {
        const uKa = gl.getUniformLocation(program, "uMaterial.Ka");
        gl.uniform3fv(uKa, flatten(ka));
        const uKd = gl.getUniformLocation(program, "uMaterial.Kd");
        gl.uniform3fv(uKd, flatten(kd));
        const uKs = gl.getUniformLocation(program, "uMaterial.Ks");
        gl.uniform3fv(uKs, flatten(ks));
        const uShininess = gl.getUniformLocation(program, "uMaterial.shininess");
        gl.uniform1f(uShininess, shininess);
    }

    function updateLights() {
        gl.uniform1i(gl.getUniformLocation(program, "uNLights"), parseInt(lights.length));
        
        for(var i = 0; i < lights.length; i++) {
            const uOn = gl.getUniformLocation(program, "uLights[" + i +"].on");
            gl.uniform1i(uOn, lights[i].on);

            const uKaLight = gl.getUniformLocation(program, "uLights[" + i +"].ambient");
            gl.uniform3fv(uKaLight, flatten(lights[i].ambient));
            const uKdLight = gl.getUniformLocation(program, "uLights[" + i + "].diffuse");
            gl.uniform3fv(uKdLight, flatten(lights[i].diffuse));
            const uKsLight = gl.getUniformLocation(program, "uLights[" + i + "].specular");
            gl.uniform3fv(uKsLight, flatten(lights[i].specular));

            const uPosLight = gl.getUniformLocation(program, "uLights[" + i + "].position");
            if (lights[i].position[3] == 0) gl.uniform4fv(uPosLight, flatten(mult(normalMatrix(mView),lights[i].position))), console.log(mult(normalMatrix(mView),lights[i].position));
            else gl.uniform4fv(uPosLight, flatten(mult(mView,lights[i].position)));
            const uAxis = gl.getUniformLocation(program, "uLights[" + i + "].axis");
            gl.uniform4fv(uAxis, flatten(mult(normalMatrix(mView),lights[i].axis)));
            const uAperture = gl.getUniformLocation(program, "uLights[" + i + "].aperture");
            console.log(Math.cos(lights[i].aperture*Math.PI/360));
            gl.uniform1f(uAperture, Math.cos(lights[i].aperture*Math.PI/360));
            const uCutoff = gl.getUniformLocation(program, "uLights[" + i + "].cutoff");
            gl.uniform1f(uCutoff, lights[i].cutoff);
        }
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

        updateLights();

        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mModelView"), false, flatten(STACK.modelView()));
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mProjection"), false, flatten(mProjection));
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mNormals"), false, flatten(normalMatrix(STACK.modelView())));

        STACK.pushMatrix();
            STACK.multTranslation([0, -1.25, 0]);
            STACK.multScale([10, 0.5, 10]);
            uploadModelView();
            useMaterial(tableMaterial.ka, tableMaterial.kd, tableMaterial.ks, tableMaterial.shininess);
            CUBE.draw(gl, program, gl.TRIANGLES);
        STACK.popMatrix();
        STACK.pushMatrix();
            STACK.multTranslation([-2, 0, -2]);
            STACK.multScale([2, 2, 2]);
            uploadModelView();
            useMaterial(cubeMaterial.ka, cubeMaterial.kd, cubeMaterial.ks, cubeMaterial.shininess);
            CUBE.draw(gl, program, gl.TRIANGLES);
        STACK.popMatrix();
        STACK.pushMatrix();
            STACK.multTranslation([2, 0, -2]);
            STACK.multScale([2, 2, 2]);
            uploadModelView();
            useMaterial(cylinderMaterial.ka, cylinderMaterial.kd, cylinderMaterial.ks, cylinderMaterial.shininess);
            CYLINDER.draw(gl, program, gl.TRIANGLES);
        STACK.popMatrix();
        STACK.pushMatrix();
            STACK.multTranslation([2, -1, 2]);
            STACK.multScale([15, 15, 15]);
            uploadModelView();
            useMaterial(bunnyMaterial.ka, bunnyMaterial.kd, bunnyMaterial.ks, bunnyMaterial.shininess);
            BUNNY.draw(gl, program, gl.TRIANGLES);
        STACK.popMatrix();
        STACK.pushMatrix();
            STACK.multTranslation([-2, -0.6, 2]);
            STACK.multScale([2, 2, 2]);
            uploadModelView();
            useMaterial(torusMaterial.ka, torusMaterial.kd, torusMaterial.ks, torusMaterial.shininess);
            TORUS.draw(gl, program, gl.TRIANGLES);
        STACK.popMatrix();
    }
}

const urls = ['shader.vert', 'shader.frag'];

loadShadersFromURLS(urls).then( shaders => setup(shaders));