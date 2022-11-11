import { buildProgramFromSources, loadShadersFromURLS, setupWebGL } from "../../libs/utils.js";
import { ortho, lookAt, flatten } from "../../libs/MV.js";
import {modelView, loadMatrix, multRotationY, multScale, pushMatrix, popMatrix, multTranslation } from "../../libs/stack.js";

import * as SPHERE from '../../libs/objects/sphere.js';

/** @type WebGLRenderingContext */
let gl;

let time = 0;           // Global simulation time in days
let speed = 1/60.0;     // Speed (how many days added to time on each render pass
let mode;               // Drawing mode (gl.LINES or gl.TRIANGLES)
let animation = true;   // Animation is running

const PLANET_SCALE = 10;    // scale that will apply to each planet and satellite
const ORBIT_SCALE = 1/60;   // scale that will apply to each orbit around the sun

const SUN_DIAMETER = 1391900;
const SUN_DAY = 24.47; // At the equator. The poles are slower as the sun is gaseous

const MERCURY_DIAMETER = 4866*PLANET_SCALE;
const MERCURY_ORBIT = 57950000*ORBIT_SCALE;
const MERCURY_YEAR = 87.97;
const MERCURY_DAY = 58.646;

const VENUS_DIAMETER = 12106*PLANET_SCALE;
const VENUS_ORBIT = 108110000*ORBIT_SCALE;
const VENUS_YEAR = 224.70;
const VENUS_DAY = 116.018;

const EARTH_DIAMETER = 12742*PLANET_SCALE;
const EARTH_ORBIT = 149570000*ORBIT_SCALE;
const EARTH_YEAR = 365.26;
const EARTH_DAY = 0.99726968;

const MOON_DIAMETER = 3474*PLANET_SCALE;
const MOON_ORBIT = 363396*ORBIT_SCALE*60;
const MOON_YEAR = 28;
const MOON_DAY = 28;

const MARS_DIAMETER = 6760*PLANET_SCALE;
const MARS_ORBIT = 227840000*ORBIT_SCALE;
const MARS_YEAR = 687;
const MARS_DAY = 1.06;

const JUPITER_DIAMETER = 142984*PLANET_SCALE;
const JUPITER_ORBIT = 778140000*ORBIT_SCALE;
const JUPITER_YEAR = 12*365;
const JUPITER_DAY = 0.375;

const SATURN_DIAMETER = 116438*PLANET_SCALE;
const SATURN_ORBIT = 1427000000*ORBIT_SCALE;
const SATURN_YEAR = 29*365;
const SATURN_DAY = 0.458;

const URANUS_DIAMETER = 46940*PLANET_SCALE;
const URANUS_ORBIT = 2870300000*ORBIT_SCALE;
const URANUS_YEAR = 84*365;
const URANUS_DAY = 0.719;

const NEPTUNE_DIAMETER = 45432*PLANET_SCALE;
const NEPTUNE_ORBIT = 4499900000*ORBIT_SCALE;
const NEPTUNE_YEAR = 165*365;
const NEPTUNE_DAY = 0.67;

const VP_DISTANCE = EARTH_ORBIT;



function setup(shaders)
{
    let canvas = document.getElementById("gl-canvas");
    let aspect = canvas.width / canvas.height;

    gl = setupWebGL(canvas);

    let program = buildProgramFromSources(gl, shaders["shader.vert"], shaders["shader.frag"]);

    let mProjection = ortho(-VP_DISTANCE*aspect,VP_DISTANCE*aspect, -VP_DISTANCE, VP_DISTANCE,-3*VP_DISTANCE,3*VP_DISTANCE);

    mode = gl.LINES; 

    resize_canvas();
    window.addEventListener("resize", resize_canvas);

    document.onkeydown = function(event) {
        switch(event.key) {
            case 'w':
                mode = gl.LINES; 
                break;
            case 's':
                mode = gl.TRIANGLES;
                break;
            case 'p':
                animation = !animation;
                break;
            case '+':
                if(animation) speed *= 1.1;
                break;
            case '-':
                if(animation) speed /= 1.1;
                break;
        }
    }

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    SPHERE.init(gl);
    gl.enable(gl.DEPTH_TEST);   // Enables Z-buffer depth test
    
    window.requestAnimationFrame(render);


    function resize_canvas(event)
    {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        aspect = canvas.width / canvas.height;

        gl.viewport(0,0,canvas.width, canvas.height);
        mProjection = ortho(-VP_DISTANCE*aspect,VP_DISTANCE*aspect, -VP_DISTANCE, VP_DISTANCE,-3*VP_DISTANCE,3*VP_DISTANCE);
    }

    function uploadModelView()
    {
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mModelView"), false, flatten(modelView()));
    }

    function Sun()
    {
        // Don't forget to scale the sun, rotate it around the y axis at the correct speed
        multScale([SUN_DIAMETER, SUN_DIAMETER, SUN_DIAMETER]);
        multRotationY(360*time/SUN_DAY);

        // Send the current modelview matrix to the vertex shader
        uploadModelView();

        // Draw a sphere representing the sun
        SPHERE.draw(gl, program, mode);
    }

    function Mercury()
    {
        // Scale and rotation around y axis
        multScale([MERCURY_DIAMETER, MERCURY_DIAMETER, MERCURY_DIAMETER]);
        multRotationY(360*time/MERCURY_DAY);

        // Send the current modelview to the vertex shader
        uploadModelView();

        // Draw a sphere representing mercury
        SPHERE.draw(gl, program, mode);
    }

    function Venus()
    {
        // Scale and rotation around y axis
        multScale([VENUS_DIAMETER, VENUS_DIAMETER, VENUS_DIAMETER]);
        multRotationY(360*time/VENUS_DAY);

        // Send the current modelview to the vertex shader
        uploadModelView();

        // Draw a sphere representing venus
        SPHERE.draw(gl, program, mode);
    }

    function Earth()
    {
        // Scale and rotation around y axis
        multScale([EARTH_DIAMETER, EARTH_DIAMETER, EARTH_DIAMETER]);
        multRotationY(360*time/EARTH_DAY);

        // Send the current modelview to the vertex shader
        uploadModelView();

        // Draw a sphere representing earth
        SPHERE.draw(gl, program, mode);
    }

    function Moon()
    {
        //Scale and rotation around the y axis
        multScale([MOON_DIAMETER, MOON_DIAMETER, MOON_DIAMETER]);
        multRotationY(360*time/MOON_DAY);

        // Send the current modelview to the vertex shader
        uploadModelView();

        // Draw a sphere representing moon
        SPHERE.draw(gl, program, mode);
    }

    function EarthAndMoon()
    {
        pushMatrix();
            Earth();
        popMatrix();
        pushMatrix();
            multRotationY(360*time/MOON_YEAR);
            multTranslation([MOON_ORBIT, 0, 0]);
            Moon();
        popMatrix();
    }

    function Mars()
    {
        //Scale and rotation around the y axis
        multScale([MARS_DIAMETER, MARS_DIAMETER, MARS_DIAMETER]);
        multRotationY(360*time/MARS_DAY);

        // Send the current modelview to the vertex shader
        uploadModelView();

        // Draw a sphere representing mars
        SPHERE.draw(gl, program, mode);
    }

    function Jupiter()
    {
        //Scale and rotation around the y axis
        multScale([JUPITER_DIAMETER, JUPITER_DIAMETER, JUPITER_DIAMETER]);
        multRotationY(360*time/JUPITER_DAY);

        // Send the current modelview to the vertex shader
        uploadModelView();

        // Draw a sphere representing jupiter
        SPHERE.draw(gl, program, mode);
    }

    function Jupiter()
    {
        //Scale and rotation around the y axis
        multScale([JUPITER_DIAMETER, JUPITER_DIAMETER, JUPITER_DIAMETER]);
        multRotationY(360*time/JUPITER_DAY);

        // Send the current modelview to the vertex shader
        uploadModelView();

        // Draw a sphere representing jupiter
        SPHERE.draw(gl, program, mode);
    }

    function Saturn()
    {
        //Scale and rotation around the y axis
        multScale([SATURN_DIAMETER, SATURN_DIAMETER, SATURN_DIAMETER]);
        multRotationY(360*time/SATURN_DAY);

        // Send the current modelview to the vertex shader
        uploadModelView();

        // Draw a sphere representing jupiter
        SPHERE.draw(gl, program, mode);
    }

    function Uranus()
    {
        //Scale and rotation around the y axis
        multScale([URANUS_DIAMETER, URANUS_DIAMETER, URANUS_DIAMETER]);
        multRotationY(360*time/URANUS_DAY);

        // Send the current modelview to the vertex shader
        uploadModelView();

        // Draw a sphere representing uranus
        SPHERE.draw(gl, program, mode);
    }

    function Neptune()
    {
        //Scale and rotation around the y axis
        multScale([NEPTUNE_DIAMETER, NEPTUNE_DIAMETER, NEPTUNE_DIAMETER]);
        multRotationY(360*time/NEPTUNE_DAY);

        // Send the current modelview to the vertex shader
        uploadModelView();

        // Draw a sphere representing neptune
        SPHERE.draw(gl, program, mode);
    }

    function render()
    {
        if(animation) time += speed;
        window.requestAnimationFrame(render);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        gl.useProgram(program);
        
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mProjection"), false, flatten(mProjection));
    
        loadMatrix(lookAt([0,VP_DISTANCE,VP_DISTANCE], [0,0,0], [0,1,0]));

        pushMatrix();
            Sun();
        popMatrix();
        pushMatrix();
            multRotationY(360*time/MERCURY_YEAR);
            multTranslation([MERCURY_ORBIT,0,0]);
            Mercury();
        popMatrix();
        pushMatrix();
            multRotationY(360*time/VENUS_YEAR);
            multTranslation([VENUS_ORBIT,0,0]);
            Venus();
        popMatrix(); 
        pushMatrix();
            multRotationY(360*time/EARTH_YEAR);
            multTranslation([EARTH_ORBIT,0,0]);
            EarthAndMoon();
        popMatrix();
        pushMatrix();
            multRotationY(360*time/MARS_YEAR);
            multTranslation([MARS_ORBIT,0,0]);
            Mars();
        popMatrix();
        pushMatrix();
            multRotationY(360*time/JUPITER_YEAR);
            multTranslation([JUPITER_ORBIT,0,0]);
            Jupiter();
        popMatrix();
        pushMatrix();
            multRotationY(360*time/SATURN_YEAR);
            multTranslation([SATURN_ORBIT,0,0]);
            Saturn();
        popMatrix();
        pushMatrix();
            multRotationY(360*time/URANUS_YEAR);
            multTranslation([URANUS_ORBIT,0,0]);
            Uranus();
        popMatrix();
        pushMatrix();
            multRotationY(360*time/NEPTUNE_YEAR);
            multTranslation([NEPTUNE_ORBIT,0,0]);
            Neptune();
        popMatrix();

    }
}

const urls = ["shader.vert", "shader.frag"];
loadShadersFromURLS(urls).then(shaders => setup(shaders))