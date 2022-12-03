import { loadShadersFromURLS, setupWebGL, buildProgramFromSources } from '../../libs/utils.js';
import { vec3, flatten, lookAt, ortho, perspective, subtract, cross, normalize, add, mult, length, radians, rotateX, rotateY, rotateZ } from '../../libs/MV.js';
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
    var gamma = {value: 60};

    let eye = vec3(3*Math.cos(theta.value*Math.PI/180)*Math.sin(gamma.value*Math.PI/180),3*Math.cos(gamma.value*Math.PI/180),3*Math.sin(theta.value*Math.PI/180)*Math.sin(gamma.value*Math.PI/180));
    const at = vec3(0,0,0);
    let up = vec3(0,1,0);

    let mView = lookAt(eye, at, up);
    let mProjection = ortho(-edge*aspect,edge*aspect, -edge, edge,-3*edge,3*edge);

    let regularView = true;
    let helicopterView = false;
    let zoom = 1.0;

    /** Helicopter animation parameters */
    let alpha = 0;
    let dAlpha = 0;
    let beta = 0;
    let delta = 0;
    let dDelta = 0;
    let height = 0;
    const MAX_HEIGHT = 30;
    const RADIUS = 40;
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
    const MASS_BOX = 50;

    /** atom animation parameters */
    let dPhi = 0;

    //** car animation parameters */
    let x_pos = 60;
    let car_color = vec3(Math.random(),Math.random(),Math.random());

    //** duck animation parameters */
    let lambda = 0;

    //** CGI letters' color */
    let color = 0.0;
    let time2 = 0;
    let reverse = false;

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
                helicopterView = false;
                break;
            case '2':
                // Front view
                regularView = false;
                helicopterView = false;
                mView = lookAt([0,0,1], [0,0.0,0], [0,1,0]);
                break;
            case '3':
                // Top view
                regularView = false;
                helicopterView = false;
                mView = lookAt([0,1,0],  [0,0,0], [0,0,-1]);
                break;
            case '4':
                // Right view
                regularView = false;
                helicopterView = false;
                mView = lookAt([1,0,0], [0,0,0], [0,1,0]);
                break;
            case '5':
                // Helicopter view
                regularView = false;
                helicopterView = true;
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
                    height = Math.min(MAX_HEIGHT, height + 0.3);
                }
                break;
            case "ArrowDown":
                height = Math.max(0, height - 0.3);
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
    BUNNY.init(gl);

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

    function easeInOutQuad (t, b, c, d) {
        if ((t /= d / 2) < 1) return c / 2 * t * t + b;
        return -c / 2 * ((--t) * (t - 2) - 1) + b;
    }

    function floor()
    {
        const uColor = gl.getUniformLocation(program, "uColor");
        gl.uniform3fv(uColor, vec3(0.05,0.7,0.1)); // green

        multScale([130,1,130]);
        multTranslation([0.0,0.5,0.0]);
        uploadModelView();
            
        CUBE.draw(gl, program, mode);
    }

    function Helicopter()
    {
        
        // Scale helicopter
        multScale([10.2,10.2,10.2]);
        // level with ground
        multTranslation([0.0,0.365,0.0]);

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
        multRotationY(alpha);
        pushMatrix();
            multTranslation([0.4, 0.18, 0.0]);
            multScale([0.8, 0.03, 0.1]);
            uploadModelView();
            SPHERE.draw(gl, program, mode);
        popMatrix();
        pushMatrix();
            multRotationY(-60);
            multTranslation([-0.4, 0.18, -0.0]);
            multScale([0.8, 0.03, 0.1]);
            uploadModelView();
            SPHERE.draw(gl, program, mode);
        popMatrix();
        pushMatrix();
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
        boxes_tangential_velocity.push(dDelta*60*Math.PI/180*RADIUS);
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
            const drag_force_tangential = AIR_DENSITY * Math.pow(boxes_tangential_velocity[i],2) * DRAG_COEFFICIENT * CROSS_SECTIONAL_AREA / 2;
            const drag_acceleration_tangential = drag_force_tangential / MASS_BOX;
            boxes_tangential_velocity[i] = Math.max(0,boxes_tangential_velocity[i] - (drag_acceleration_tangential * boxes_lifetime[i]));
            boxes_tangential_displacement[i] = add(boxes_tangential_displacement[i],mult(vec3(boxes_tangential_velocity[i]*boxes_lifetime[i],boxes_tangential_velocity[i]*boxes_lifetime[i],boxes_tangential_velocity[i]*boxes_lifetime[i]),unit_vector));
        }

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

        boxes_lifetime[i] += speed;
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

    function helipad() {
        
        const uColor = gl.getUniformLocation(program, "uColor");

        pushMatrix();
            base();
        popMatrix();
        signal();

        function base() {

            gl.uniform3fv(uColor, vec3(0.0,0.0,0.0)); // black

            multTranslation([0,1,40.0]);
            multScale([15.0,0.1,15.0]);
            uploadModelView();   
        
            CYLINDER.draw(gl, program, mode);
        }

        function signal() {

            gl.uniform3fv(uColor, vec3(1.0, 1.0, 1.0)); // white
            
            pushMatrix();
                multTranslation([0,1.1,RADIUS]);
                multRotationY(90);
                multScale([5.0,0.1,1.0]);
                uploadModelView();
                CUBE.draw(gl, program, mode);
            popMatrix();
            multTranslation([0,1.1,RADIUS-2.5]);
            multScale([10.0,0.1,1.0]);
            pushMatrix();
                uploadModelView()
                CUBE.draw(gl, program, mode);
            popMatrix();
            pushMatrix();
                multTranslation([0,0,5]);
                uploadModelView();
                CUBE.draw(gl, program, mode);
            popMatrix();

        }
        
    }

    function bench(a) {

        const uColor = gl.getUniformLocation(program, "uColor");

        pushMatrix();
            support();
        popMatrix();
        pushMatrix();
            light_pole();
        popMatrix();
        strips();

        function support() {
            
            gl.uniform3fv(uColor, vec3(0.5, 0.5, 0.5)); // grey

            multRotationY(a);
            multTranslation([20,2,-5]);
            multScale([3.0,3.0,1.0]);
            uploadModelView();
            CUBE.draw(gl, program, mode);
            multTranslation([0,0,10]);
            uploadModelView();
            CUBE.draw(gl, program, mode);
        }

        function light_pole() {

            pushMatrix();
                base();
            popMatrix();
            light();

            function base() {
                gl.uniform3fv(uColor, vec3(0,0,0)); // black

                multRotationY(a);
                multTranslation([20,5,-20]);
                multScale([2,8,2]);
                uploadModelView();
                CYLINDER.draw(gl, program, mode);
            }

            function light() {
                gl.uniform3fv(uColor, vec3(0.8,0.6,0)); // black

                multRotationY(a);
                multTranslation([20,10,-20]);
                multScale([4,4,4]);
                uploadModelView();
                SPHERE.draw(gl, program, mode);
            }
            
        }

        function strips() {
            
            gl.uniform3fv(uColor, vec3(0.7, 0.5, 0.05)); // wood color

            multRotationY(a);
            multTranslation([19.3,3.6,0]);
            multScale([0.5,0.3,11.0]);
            uploadModelView();
            CUBE.draw(gl, program, mode);
            multTranslation([1.5,0,0]);
            uploadModelView();
            CUBE.draw(gl, program, mode);
            multTranslation([1.5,0,0]);
            uploadModelView();
            CUBE.draw(gl, program, mode);
        }
    }

    function road() {

        const uColor = gl.getUniformLocation(program, "uColor");

        pushMatrix();
            concrete();
        popMatrix();
        pushMatrix();
            multTranslation([45,0,0]);
            strip();
        popMatrix();
        pushMatrix();
            multTranslation([30,0,0]);
            strip();
        popMatrix();
        pushMatrix();
            multTranslation([15,0,0]);
            strip();
        popMatrix();
        pushMatrix();
            multTranslation([0,0,0]);
            strip();
        popMatrix();
        pushMatrix();
            multTranslation([-15,0,0]);
            strip();
        popMatrix();
        pushMatrix();
            multTranslation([-30,0,0]);
            strip();
        popMatrix();
        pushMatrix();
            multTranslation([-45,0,0]);
            strip();
        popMatrix();

        function concrete() {

            gl.uniform3fv(uColor, vec3(0, 0, 0)); // black

            multScale([130,0.1,10]);
            uploadModelView();

            CUBE.draw(gl, program, mode);
        }

        function strip() {

            gl.uniform3fv(uColor, vec3(1, 1, 1)); // white

            multScale([8,0.11,1]);
            uploadModelView();

            CUBE.draw(gl, program, mode);
        }
    }

    function tunnel() {

        const uColor = gl.getUniformLocation(program, "uColor");
        gl.uniform3fv(uColor, vec3(0, 0, 0)); // black

        multTranslation([0,5,0]);
        pushMatrix();
            multTranslation([0,5,-5]);
            support(0,0);
        popMatrix();
        pushMatrix();
            support(90,0);
        popMatrix();
        pushMatrix();
            multTranslation([0,0,-10]);
            support(90,0);
        popMatrix();
        pushMatrix();
            multTranslation([5,0,-5]);
            support(0,90);
        popMatrix();
        
        function support(a,b) {
            multRotationX(a);
            multRotationZ(b);
            multScale([10,1,10]);
            uploadModelView();
            CUBE.draw(gl, program, mode);
        }

    }

    function car() {

        const uColor = gl.getUniformLocation(program, "uColor");       

        exterior();
        headlights();
        pushMatrix();
            multTranslation([0,0,-2]);
            headlights();
        popMatrix();
        wheel();
        multTranslation([0,0,-3]);
        wheel();
        multTranslation([-3,0,0]);
        wheel();
        multTranslation([0,0,3]);
        wheel();

        function exterior() {
            
            gl.uniform3fv(uColor, car_color); // random car color 
            
            pushMatrix();
                multScale([6.0,1.5,3.0]);
                uploadModelView();
                CUBE.draw(gl, program, mode);
            popMatrix();
            pushMatrix();
                multTranslation([0,1.1,0]);
                multScale([4.0,1.0,1.75]);
                uploadModelView();
                CUBE.draw(gl, program, mode);           
            popMatrix();

        }

        function wheel() {

            gl.uniform3fv(uColor, vec3(0, 0, 0)); // black

            pushMatrix();
                multTranslation([1.5,-0.9,1.5]);
                multRotationX(90);
                multScale([1,0.1,1]);
                uploadModelView();
                CYLINDER.draw(gl, program, mode);
            popMatrix();
        }

        function headlights() {

            gl.uniform3fv(uColor, vec3(1.0, 1.0, 0.0)); // yellow

            pushMatrix();
                multTranslation([-3,0,1]);
                multRotationZ(90);
                multScale([0.6,0.1,0.6]);
                uploadModelView();
                CYLINDER.draw(gl, program, mode);
            popMatrix();
        }

    }

    function bunny_family() {
        
        const uColor = gl.getUniformLocation(program, "uColor");

        pushMatrix();
            bunny();
        popMatrix();
        pushMatrix();
            multTranslation([-3,0,5])
            multRotationY(65);
            bunny();
        popMatrix();
        pushMatrix();
            multTranslation([-3,0,-3])
            multRotationY(30);
            bunny();
        popMatrix();
        pushMatrix();
            multTranslation([3,-1,0]);
            pushMatrix();
                grass();
            popMatrix();
            pushMatrix();
                multRotationX(45);
                grass();
            popMatrix();
            pushMatrix();
                multRotationX(-45);
                grass();
            popMatrix();
            pushMatrix();
                multRotationZ(-45);
                grass();
            popMatrix();
            pushMatrix();
                multRotationZ(45);
                grass();
            popMatrix();
        popMatrix();
        pushMatrix();
            multTranslation([-4,-1,-5]);
            pushMatrix();
                grass();
            popMatrix();
            pushMatrix();
                multRotationX(45);
                grass();
            popMatrix();
            pushMatrix();
                multRotationX(-45);
                grass();
            popMatrix();
            pushMatrix();
                multRotationZ(-45);
                grass();
            popMatrix();
            pushMatrix();
                multRotationZ(45);
                grass();
            popMatrix();
        popMatrix();
        pushMatrix();
            multTranslation([-6,-1,3]);
            pushMatrix();
                grass();
            popMatrix();
            pushMatrix();
                multRotationX(45);
                grass();
            popMatrix();
            pushMatrix();
                multRotationX(-45);
                grass();
            popMatrix();
            pushMatrix();
                multRotationZ(-45);
                grass();
            popMatrix();
            pushMatrix();
                multRotationZ(45);
                grass();
            popMatrix();
        popMatrix();
        pushMatrix();
            multTranslation([2,-1,7]);
            pushMatrix();
                grass();
            popMatrix();
            pushMatrix();
                multRotationX(45);
                grass();
            popMatrix();
            pushMatrix();
                multRotationX(-45);
                grass();
            popMatrix();
            pushMatrix();
                multRotationZ(-45);
                grass();
            popMatrix();
            pushMatrix();
                multRotationZ(45);
                grass();
            popMatrix();
        popMatrix();
        pushMatrix();
            multTranslation([-7,-1,9]);
            pushMatrix();
                grass();
            popMatrix();
            pushMatrix();
                multRotationX(45);
                grass();
            popMatrix();
            pushMatrix();
                multRotationX(-45);
                grass();
            popMatrix();
            pushMatrix();
                multRotationZ(-45);
                grass();
            popMatrix();
            pushMatrix();
                multRotationZ(45);
                grass();
            popMatrix();
        popMatrix();

        function bunny() {
            
            gl.uniform3fv(uColor, vec3(0.7,0.7,0)); // brown
            
            multTranslation([0,0.35,0]);
            multRotationY(90);
            multScale([20,20,20]);
            uploadModelView();

            BUNNY.draw(gl, program, mode);
        }

        function grass() {

            gl.uniform3fv(uColor, vec3(0.02,0.5,0.01)); // green

            multScale([0.5,3,0.5]);
            uploadModelView();

            CYLINDER.draw(gl, program, mode);
        }

    }

    function building() {
        
        const uColor = gl.getUniformLocation(program, "uColor");

        pushMatrix();
            structure();
        popMatrix();

        let y = 10;
        for (let i = 0; i < 4; i++) {
        let z = 3.5;
            for(let j = 0; j < 2; j++) {
            pushMatrix();
                multTranslation([8,y,z]);
                window();
            popMatrix();
            z -= 7;
            }
        y -= 7
        }

        function structure() {
            gl.uniform3fv(uColor, vec3(0,0,0)); // Dark

            multScale([15,40,20]);
            uploadModelView();

            CUBE.draw(gl, program, mode);
        }

        function window() {
            gl.uniform3fv(uColor, vec3(0.05,0.8,0.9)); // Cyan

            multScale([0.1,5,5]);
            uploadModelView();

            CUBE.draw(gl, program, mode);
        }

    }

    function forest() {

        const uColor = gl.getUniformLocation(program, "uColor");

        pushMatrix();
            lake();
        popMatrix();
        pushMatrix();
            multRotationY(lambda);
            multTranslation([10,0,0]);
            duck();
        popMatrix();
        pushMatrix();
            multTranslation([10,0,-13]);
            multRotationY(30);
            tree();
        popMatrix();
        pushMatrix();
            multTranslation([-17,0,3]);
            multRotationY(-20);
            tree();
        popMatrix();
        pushMatrix();
            multTranslation([-12,0,-10]);
            multRotationY(50);
            tree();
        popMatrix();
        pushMatrix();
            multTranslation([0,0,-17]);
            multRotationY(60);
            tree();
        popMatrix();

        function lake() {

            pushMatrix();
                water();
            popMatrix();
            pushMatrix();
                multTranslation([2,0,1]);
                leafpad();
            popMatrix();
            pushMatrix();
                multTranslation([-5,0,-3]);
                leafpad();
            popMatrix();
            pushMatrix();
                multTranslation([10,0,10]);
                leafpad();
            popMatrix();
            pushMatrix();
                multTranslation([6,0,-3]);
                leafpad();
            popMatrix();
            pushMatrix();
                multTranslation([-7,0,4]);
                leafpad();
            popMatrix();

            function water() {
                gl.uniform3fv(uColor, vec3(0.05,0.8,0.9)); // Cyan

                multScale([30,0.1,30]);
                uploadModelView();

                CYLINDER.draw(gl, program, mode);
            }

            function leafpad() {
                gl.uniform3fv(uColor, vec3(0.02,0.5,0.01)); // green

                multTranslation([0,0.1,0])
                multScale([2,0.1,2])
                uploadModelView();

                CYLINDER.draw(gl, program, mode);
            }

        }

        function duck() {

            gl.uniform3fv(uColor, vec3(1,1,1)); // white
            pushMatrix();
                body();
            popMatrix();
            pushMatrix();
                neck();
            popMatrix();
            pushMatrix();
                wings();
            popMatrix();
            pushMatrix();
                multScale([-1,1,1]);
                wings();
            popMatrix();
            pushMatrix();
                head();
            popMatrix();
            
            function body() {

            multScale([2,2,4]);
            uploadModelView();

            CUBE.draw(gl, program, mode);
            }

            function neck() {

                multTranslation([0,2,2]);
                multScale([1,5,1]);
                uploadModelView();

                CUBE.draw(gl, program, mode);
            }

            function wings() {

                multTranslation([1.2,0.5,0]);
                multScale([0.2,3,3]);
                uploadModelView();

                CUBE.draw(gl, program, mode);
            }

            function head() {
                gl.uniform3fv(uColor, vec3(0.9,0.6,0.02)); // orange

                multTranslation([0,4,3]);
                multScale([0.3,0.3,0.3]);
                body();
                uploadModelView();

                CUBE.draw(gl, program, mode);
            }
        }

        function tree() {
            
            multTranslation([0,5,0]);
            pushMatrix();
                base();
            popMatrix();
            pushMatrix();
                leaves();
            popMatrix();
            multTranslation([-2,1,0]);
            multRotationZ(45);
            multScale([0.6,0.6,0.6]);
            pushMatrix();
                base();
            popMatrix();
            pushMatrix();
                leaves();
            popMatrix();

            function base() {
                gl.uniform3fv(uColor, vec3(0.7, 0.5, 0.05)); // wood color

                multScale([1,10,1]);
                uploadModelView();

                CYLINDER.draw(gl, program, mode);
            }

            function leaves() {
                gl.uniform3fv(uColor, vec3(0.02,0.5,0.01)); // green

                multScale([4,4,4]);
                multTranslation([0,1,0]);
                uploadModelView();

                SPHERE.draw(gl, program, mode);
            }
        }
    }

    function cgi() {

        const uColor = gl.getUniformLocation(program, "uColor");
        gl.uniform3fv(uColor, vec3(1,color,color));

        pushMatrix();
            c()
        popMatrix();
        pushMatrix();
            multTranslation([0,0,-30]);
            g();
        popMatrix();
        pushMatrix();
            multTranslation([0,-1.5,-60]);
            i();
        popMatrix();

        function c() {

            pushMatrix();
                multScale([3,20,3]);
                uploadModelView();
                CUBE.draw(gl, program, mode);
            popMatrix();
            pushMatrix();
                multTranslation([0,-10,-10]);
                multRotationX(90);
                multScale([3,20,3]);
                uploadModelView();
                CUBE.draw(gl, program, mode);
            popMatrix();
            pushMatrix();
                multTranslation([0,10,-10]);
                multRotationX(90);
                multScale([3,20,3]);
                uploadModelView();
                CUBE.draw(gl, program, mode);
            popMatrix();
        }

        function g() {
            
            c();
            pushMatrix();
                multTranslation([0,-5,-20])
                multScale([3,10,3]);
                uploadModelView();
                CUBE.draw(gl, program, mode);
            popMatrix();
            pushMatrix();
                multTranslation([0,0,-15]);
                multRotationX(90);
                multScale([3,10,3]);
                uploadModelView();
                CUBE.draw(gl, program, mode);
            popMatrix();           

        }

        function i() {

            pushMatrix();
                multScale([3,20,3]);
                uploadModelView();
                CUBE.draw(gl, program, mode);
            popMatrix();
            pushMatrix();
                multTranslation([0,13,0]);
                multScale([3,3,3]);
                uploadModelView();
                CUBE.draw(gl, program, mode);
            popMatrix();         
        }
    }

    function render()
    {
        window.requestAnimationFrame(render);


        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        gl.useProgram(program);
        
        // Send the mProjection matrix to the GLSL program
        mProjection = ortho(-aspect*edge*zoom,aspect*edge*zoom, -zoom*edge, zoom*edge,-3*edge,3*edge);
        uploadProjection();

        // Load the ModelView matrix with the World to Camera (View) matrix
        if (regularView) {
            eye = vec3(3*Math.cos(theta.value*Math.PI/180)*Math.sin(gamma.value*Math.PI/180),3*Math.cos(gamma.value*Math.PI/180),3*Math.sin(theta.value*Math.PI/180)*Math.sin(gamma.value*Math.PI/180));
            if (gamma.value == 0) up = vec3(-1*Math.cos(theta.value*Math.PI/180),0,-1*Math.sin(theta.value*Math.PI/180));
            else up = vec3(0,1,0); 
            mView = lookAt(eye, at, up);
        }
        if (helicopterView) {
            const r_vector = subtract(vec3(RADIUS*Math.sin(-delta*Math.PI/180),0,RADIUS*Math.cos(-delta*Math.PI/180)),vec3(0,0,0));
            const unit_vector = normalize(cross(r_vector,vec3(0,1,0)));
            const eye = vec3(RADIUS*Math.sin(-delta*Math.PI/180),height+4.0,RADIUS*Math.cos(-delta*Math.PI/180));
            mView = lookAt(eye,add(eye,unit_vector),[0,1,0]);
            mProjection = perspective(20,aspect,11,edge*2);
            uploadProjection();
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
                    dDelta = easeInExpo(time, 0, 0.8, 0.85);
                }
                else {
                    time -= speed;
                    time = Math.max(time, 0);

                    beta = easeInExpo(time, 0, 30, 0.85);
                    dDelta = easeInExpo(time, 0, 0.8, 0.85);
                }  
            }   

            if (x_pos == -60) x_pos = 60, car_color = vec3(Math.random(),Math.random(),Math.random());

            alpha += dAlpha;
            delta += dDelta;
            dPhi += 5;
            x_pos--;
            lambda-=0.1;
            color = easeInOutQuad(time2, 0.3, 1, 2)
            if (reverse) time2 -= speed;
            if (!reverse) time2 += speed;
            if (time2 >= 2) reverse = true;
            if (time2 <= 0) reverse = false;
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
            helipad();
        popMatrix();
        pushMatrix();
            bench(0);
        popMatrix();
        pushMatrix();
            bench(90);
        popMatrix();
        pushMatrix();
            bench(180);
        popMatrix();
        pushMatrix();
            bench(270);
        popMatrix();
        pushMatrix();
            multTranslation([0,1,-55]);
            road();
        popMatrix();
        pushMatrix();
            multTranslation([-60,0,-50]);
            multScale([-1,1,1]);
            tunnel();
        popMatrix();
        pushMatrix();
            multTranslation([60,0,-50]);
            tunnel();
        popMatrix();
        pushMatrix();
            multTranslation([x_pos,2.4,-55]);
            car();
        popMatrix();
        pushMatrix();
            multTranslation([-50,2,50]);
            bunny_family();
        popMatrix();
        pushMatrix();
            multTranslation([-57,21,25]);
            building();
        popMatrix();
        pushMatrix();
            multTranslation([-57,17,0]);
            multScale([1,0.8,1]);
            building();
        popMatrix();
        pushMatrix();
            multTranslation([-57,13,-25]);
            multScale([1,0.6,1]);
            building();
        popMatrix();
        pushMatrix();
            multTranslation([50,1,50]);
            forest();
        popMatrix();
        pushMatrix();
            multTranslation([60,12.6,20]);
            cgi();
        popMatrix();
    }

}

const shaderUrls = ['shader.vert', 'shader.frag'];
loadShadersFromURLS(shaderUrls).then(shaders=>setup(shaders));