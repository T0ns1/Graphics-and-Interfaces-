import { loadShadersFromURLS, setupWebGL, buildProgramFromSources } from '../../libs/utils.js';
import { vec3, flatten, lookAt, ortho, subtract, cross, normalize, add, mult, length, radians, rotateX, rotateY } from '../../libs/MV.js';
import { modelView, loadMatrix, multMatrix, pushMatrix, popMatrix, multTranslation, multRotationX, multRotationY, multRotationZ,  multScale, loadIdentity } from "../../libs/stack.js";
import { GUI } from '../../libs/dat.gui.module.js';

import * as CUBE from '../../libs/objects/cube.js';
import * as SPHERE from '../../libs/objects/sphere.js';
import * as CYLINDER from '../../libs/objects/cylinder.js';
import * as TORUS from '../../libs/objects/torus.js';
import * as BUNNY from '../../libs/objects/bunny.js';

const edge = 50;

function setup(shaders)
{
    let canvas = document.getElementById('gl-canvas');
    let aspect = canvas.width / canvas.height;

    /** @type WebGL2RenderingContext */
    let gl = setupWebGL(canvas);

    let mode = gl.TRIANGLES;

    let program = buildProgramFromSources(gl, shaders['shader.vert'], shaders['shader.frag']);

    /** Theta and gamma (degrees) for our camera coordinates */
    var theta = {value: 45};
    var gamma = {value: 45};

    let eye = vec3(3*Math.cos(theta.value*Math.PI/180)*Math.sin(gamma.value*Math.PI/180),3*Math.cos(gamma.value*Math.PI/180),3*Math.sin(theta.value*Math.PI/180)*Math.sin(gamma.value*Math.PI/180));
    const at = vec3(0,0,0);
    let up = vec3(0,1,0);

    let mView = lookAt(eye, at, up);
    let mProjection = ortho(-edge*aspect,edge*aspect, -edge, edge,-3*edge,3*edge);

    let regularView = true;
    let zoom = 1.0;

    /** Helicopter animation parameters */
    let alpha = 0;
    let dAlpha = 0;
    let beta = 0;
    let delta = 0;
    let dDelta = 0;
    let height = 0;
    const MAX_HEIGHT = 40;
    const RADIUS = 50;
    let time = 0;
    const speed = 1/60;
    let engineAnimation = false;
    let movementAnimation = false;
    let engineStarted = false;

    let animation = true;
    
    //** Boxes physics and animation parameters */
    const boxes = [];
    const boxes_height = [];
    const boxes_initial_height = [];
    const boxes_lifetime = [];
    const boxes_velocity = [];
    const boxes_radius = [];
    const boxes_tangential_velocity = [];
    const boxes_tangential_displacement = [];

    //** Constants for physics calculations */
    const DRAG_COEFFICIENT = 1.05;
    const AIR_DENSITY = 1.29;
    const CROSS_SECTIONAL_AREA = 4;
    const MASS_BOX = 100;

    /** atom animation parameters */
    let dPhi = 0;

    /** GUI */
    const gui = new GUI();
    const projectionFolder = gui.addFolder('Projection')
    projectionFolder.add(theta, 'value', 0, 360).name('Change theta projection angle');
    projectionFolder.add(gamma, 'value', 0, 180).name('Change gamma projection angle');
    projectionFolder.open();

    resize_canvas();
    window.addEventListener("resize", resize_canvas);

    document.onkeydown = function(event) {
        switch(event.key) {
            case '1':
                // Regular view
                regularView = true;
                break;
            case '2':
                // Front view
                regularView = false;
                mView = lookAt([0,0,1], [0,0.0,0], [0,1,0]);
                break;
            case '3':
                // Top view
                regularView = false;
                mView = lookAt([0,1,0],  [0,0,0], [0,0,-1]);
                break;
            case '4':
                // Right view
                regularView = false;
                mView = lookAt([1,0,0], [0,0,0], [0,1,0]);
                break;
            case "w":
                mode = gl.LINES;
                break;
            case "s":
                mode = gl.TRIANGLES;
                break;
            case "p":
                animation = !animation;
                break;
            case " ":
                createBox();
                break;
            case "ArrowUp":
                if (!engineStarted) engineAnimation = true;
                else {
                    height = Math.min(MAX_HEIGHT, height + 0.2);
                }
                break;
            case "ArrowDown":
                height = Math.max(0, height - 0.2);
                break;
            case "ArrowLeft":
                movementAnimation = true;
                break;
            case '+':
                zoom /= 1.1;
                break;
            case '-':
                zoom *= 1.1;
                break;
        }

    }

    document.onkeyup = function(event) {
        switch(event.key) {
        case "ArrowLeft":
            movementAnimation = false;
            break;
        }
    }

    gl.clearColor(0.1, 0.7, 0.7, 1.0);
    gl.enable(gl.DEPTH_TEST);   // Enables Z-buffer depth test

    CUBE.init(gl);
    SPHERE.init(gl);
    CYLINDER.init(gl);
    TORUS.init(gl, 30, 30, 0.4, 0.02);
    // BUNNY.init(gl);

    window.requestAnimationFrame(render);

    function resize_canvas(event)
    {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        aspect = canvas.width / canvas.height;

        gl.viewport(0,0,canvas.width, canvas.height);
        mProjection = ortho(-aspect*edge*zoom,aspect*edge*zoom, -zoom*edge, zoom*edge,-3*edge,3*edge);
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

    function easeInExpo (t, b, c, d) {
        if (t >= d) t = d;
        return (t == 0) ? b : c * Math.pow(2, 10 * (t / d - 1)) + b;
    }

    function easeInOutCubic (t, b, c, d) {
        if ((t /= d / 2) < 1) return c / 2 * t * t * t + b;
        return c / 2 * ((t -= 2) * t * t + 2) + b;
    }

    function floor()
    {
        const uColor = gl.getUniformLocation(program, "uColor");
        gl.uniform3fv(uColor, vec3(0.1,0.1,0.1)); //grey

        multScale([110,1,110]);
        multTranslation([0.0,0.5,0.0]);
        uploadModelView();
            
        CUBE.draw(gl, program, mode);
    }

    function Helicopter()
    {
        const uColor = gl.getUniformLocation(program, "uColor");
        gl.uniform3fv(uColor, vec3(1.0, 0.0, 0.0)); // red
        
        // Scale helicopter
        multScale([10.2,10.2,10.2]);
        // level with ground
        multTranslation([0.0,0.365,0.0]);

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
            multRotationZ(alpha); // Rotors angle
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
    
    function createBox() {

        boxes_lifetime.push(0);
        boxes_height.push(height);
        boxes_initial_height.push(height);
        boxes_velocity.push(0);
        boxes_tangential_velocity.push(dDelta*RADIUS*Math.PI/180);
        boxes_radius.push(-delta);
        boxes_tangential_displacement.push(vec3(0,0,0));

        pushMatrix();
            loadIdentity();
            multRotationY(-delta);   
            multTranslation([0.0,height,RADIUS]);
            boxes.push(modelView());
        popMatrix();

    }

    function updateBox(i) {

        if (boxes_height[i] > 0) {
            // Vertical motion
            const drag_force = AIR_DENSITY * Math.pow(boxes_velocity[i],2) * DRAG_COEFFICIENT * CROSS_SECTIONAL_AREA / 2;
            const drag_acceleration = drag_force / MASS_BOX;
            const terminal_velocity = Math.sqrt(2*MASS_BOX*9.8/(AIR_DENSITY*CROSS_SECTIONAL_AREA*DRAG_COEFFICIENT));
            boxes_velocity[i] = Math.min(-terminal_velocity,boxes_velocity[i] + (-9.8 + drag_acceleration) * boxes_lifetime[i]);
            boxes_height[i] = Math.max(0, boxes_height[i] + boxes_velocity[i] * boxes_lifetime[i]);
                
            // Tangential motion
            const r_vector = subtract(vec3(RADIUS*Math.sin(boxes_radius[i]*Math.PI/180),0,RADIUS*Math.cos(boxes_radius[i]*Math.PI/180)),vec3(0,0,0));
            const unit_vector = normalize(cross(r_vector,vec3(0,1,0)));
            const drag_force_tangential = AIR_DENSITY * Math.pow(length(boxes_tangential_velocity[i]),2) * DRAG_COEFFICIENT * CROSS_SECTIONAL_AREA / 2;
            const drag_acceleration_tangential = drag_force_tangential / MASS_BOX;
            boxes_tangential_velocity[i] = Math.max(0,boxes_tangential_velocity[i] - drag_acceleration_tangential * boxes_lifetime[i]);
            boxes_tangential_displacement[i] = add(boxes_tangential_displacement[i],mult(vec3(boxes_tangential_velocity[i]*boxes_lifetime[i],boxes_tangential_velocity[i]*boxes_lifetime[i],boxes_tangential_velocity[i]*boxes_lifetime[i]),unit_vector));
        }

        boxes_lifetime[i] += speed;

        if (boxes_lifetime[i] >= 5) {
            boxes_lifetime.shift(); 
            boxes.shift(); 
            boxes_height.shift(); 
            boxes_initial_height.shift(); 
            boxes_velocity.shift();
            boxes_tangential_velocity.shift(); 
            boxes_radius.shift();
            boxes_tangential_displacement.shift();
        }
    }

    function box() {

        const uColor = gl.getUniformLocation(program, "uColor");
        gl.uniform3fv(uColor,vec3(0.92,0.76,0.1));

        multTranslation([0.0,2.0,0.0]);
        multScale([2.0,2.0,2.0]);
        uploadModelView();

        CUBE.draw(gl, program, mode);
    }

    function atom() {
        const uColor = gl.getUniformLocation(program, "uColor");

        support();
        multTranslation([0.0,12.0,0]);
        pushMatrix();
            nucleus();
        popMatrix();
        pushMatrix();
            orbital();
        popMatrix();
        pushMatrix();
            multRotationY(134+dPhi*0.8);
            multTranslation([5.9,0,0]);
            electron();
        popMatrix();
        pushMatrix();
            multRotationX(35);
            pushMatrix();
                multScale([1.3,1,1.3]);
                orbital();
            popMatrix();
            pushMatrix();
                multRotationY(110+dPhi*1.0);
                multTranslation([7.8,0,0]);
                electron();
            popMatrix();
        popMatrix();
        pushMatrix();
            multRotationX(-35);
            multRotationZ(35);
            pushMatrix();
                multScale([1.6,1,1.6]);
                orbital();
            popMatrix();
            pushMatrix();
                multRotationY(320+dPhi*1.2);
                multTranslation([9.6,0,0]);
                electron();
            popMatrix();
        popMatrix();
        

        function support() {

            gl.uniform3fv(uColor, vec3(1.0, 1.0, 1.0)); // white

            pushMatrix();
                multTranslation([0,1.5,0]);
                multScale([20,1,20]);
                uploadModelView();
                CUBE.draw(gl, program, mode);
            popMatrix();
            pushMatrix();
                multTranslation([0,2.5,0]);
                multScale([15,1,15]);
                uploadModelView();
                CUBE.draw(gl, program, mode);
            popMatrix();
            pushMatrix();
                multTranslation([0,3.5,0]);
                multScale([10,1,10]);
                uploadModelView();
                CUBE.draw(gl, program, mode);
            popMatrix();
            pushMatrix();
                multTranslation([0.0,6.7,0.0]);
                multScale([3.0,5.5,3.0]);
                uploadModelView();
                CYLINDER.draw(gl, program, mode);
            popMatrix();
        }

        function nucleus() {
            
            gl.uniform3fv(uColor, vec3(0.0, 0.3, 0.7)); // blue-ish

            multScale([5.0,5.0,5.0]);
            uploadModelView();

            SPHERE.draw(gl, program, mode);

        }

        function orbital() {
            
            gl.uniform3fv(uColor, vec3(0.3, 0.3, 0.3)); // grey-ish

            multScale([15.0,15.0,15.0]);
            uploadModelView();
                
            TORUS.draw(gl, program, mode);

        }

        function electron() {
            
            gl.uniform3fv(uColor, vec3(0.8, 0.0, 0.1)); // red-ish

            multScale([2.0,2.0,2.0]);
            uploadModelView();
            
            SPHERE.draw(gl, program, mode);

        }

    }

    function hat() {
        
        const uColor = gl.getUniformLocation(program, "uColor");
        gl.uniform3fv(uColor, vec3(0.0,0.0,0.0));

        pushMatrix();
            multTranslation([20.0,3.5,20.0]);
            multScale([3.0,5.0,3.0]);
            uploadModelView();   
            CYLINDER.draw(gl, program, mode);
        popMatrix();
    }

    function render()
    {
        window.requestAnimationFrame(render);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        gl.useProgram(program);
        
        // Send the mProjection matrix to the GLSL program
        mProjection = ortho(-aspect*edge*zoom,aspect*edge*zoom, -zoom*edge, zoom*edge,-3*edge,3*edge);
        uploadProjection(mProjection);

        // Load the ModelView matrix with the World to Camera (View) matrix
        if (regularView) {
            eye = vec3(3*Math.cos(theta.value*Math.PI/180)*Math.sin(gamma.value*Math.PI/180),3*Math.cos(gamma.value*Math.PI/180),3*Math.sin(theta.value*Math.PI/180)*Math.sin(gamma.value*Math.PI/180));
            if (gamma.value == 0) up = vec3(-1*Math.cos(theta.value*Math.PI/180),0,-1*Math.sin(theta.value*Math.PI/180));
            else up = vec3(0,1,0); 
            mView = lookAt(eye, at, up);
        }
        loadMatrix(mView);

        if (animation) {
            if (engineAnimation && !engineStarted) {
                time += speed;
                dAlpha = easeInExpo(time, 0, 15, 1);
                if (dAlpha >= 15) {
                    engineStarted = true;
                    time = 0;
                }
            }

            if (engineStarted) {
                if (movementAnimation) {
                    time += speed;
                    time = Math.min(time,0.85);

                    beta = easeInOutCubic(time, 0, 30, 0.85);
                    dDelta = easeInExpo(time, 0, 2, 0.85);
                }
                else {
                    time -= speed;
                    time = Math.max(time, 0);

                    beta = easeInExpo(time, 0, 30, 0.85);
                    dDelta = easeInExpo(time, 0, 2, 0.85);
                }  
            }

            alpha += dAlpha;
            delta += dDelta;
            dPhi += 5;
        }

        pushMatrix();
            floor();
        popMatrix();
        pushMatrix();
            multRotationY(-delta);   
            multTranslation([0.0,height,RADIUS]);
            multTranslation([-3.4,0.0,0.0]);
            multRotationZ(beta);
            multTranslation([3.4,0.0,0.0]);
            Helicopter();
        popMatrix();
        for (let i = 0; i < boxes.length; i++) {
            updateBox(i);
            pushMatrix();
                multTranslation(boxes_tangential_displacement[i]);
                multMatrix(boxes[i]);
                multTranslation([0,boxes_height[i],0]);
                multTranslation([0,-boxes_initial_height[i],0]);
                box();
            popMatrix();
        }
        pushMatrix();
            atom();
        popMatrix();
        pushMatrix();
            hat();
        popMatrix();
    }

}

const shaderUrls = ['shader.vert', 'shader.frag'];
loadShadersFromURLS(shaderUrls).then(shaders=>setup(shaders));