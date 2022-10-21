import { buildProgramFromSources, loadShadersFromURLS, setupWebGL } from '../../libs/utils.js';
import { vec2, flatten, subtract, dot, mult, length } from '../../libs/MV.js';

// Buffers: particles before update, particles after update, quad vertices
let inParticlesBuffer, outParticlesBuffer, quadBuffer;

// Particle system constants
let minLife = 2.0;
let maxLife = 10.0;
let minVelocity = 0.1;
let maxVelocity = 0.2;
let alpha = 0.0;
let beta = Math.PI;

// Planet's radius and center position
const radius = [];
const position = [];
let canAddPlanet = true;

// Total number of particles
const N_PARTICLES = 100000;

// Total number of Planets
const MAX_BODIES = 10;

let drawPoints = true;
let drawField = true;

let time = undefined;

// Mouse cursor position in World Coordinates
let mPosition;

function main(shaders)
{
    // Generate the canvas element to fill the entire page
    const canvas = document.createElement("canvas");
    document.body.appendChild(canvas);

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    let scale = vec2(3/2, 3*canvas.height/canvas.width/2);

    /** type {WebGL2RenderingContext} */
    const gl = setupWebGL(canvas, {alpha: true});

    // Initialize GLSL programs    
    const fieldProgram = buildProgramFromSources(gl, shaders["field-render.vert"], shaders["field-render.frag"]);
    const renderProgram = buildProgramFromSources(gl, shaders["particle-render.vert"], shaders["particle-render.frag"]);
    const updateProgram = buildProgramFromSources(gl, shaders["particle-update.vert"], shaders["particle-update.frag"], ["vPositionOut", "vAgeOut", "vLifeOut", "vVelocityOut"]);

    gl.viewport(0,0,canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    // Enable Alpha blending
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); 

    buildQuad();
    buildParticleSystem(N_PARTICLES);

    window.addEventListener("resize", function(event) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        scale = vec2(3/2, 3*canvas.height/canvas.width/2);
        gl.viewport(0,0,canvas.width, canvas.height);
    });

    window.addEventListener("keydown", function(event) {
        console.log(event.key);
        switch(event.key) {
            case "PageUp":
                if (event.shiftKey && minVelocity < maxVelocity) minVelocity+=0.1;
                else maxVelocity+=0.1;
                console.log(maxVelocity);
                console.log(minVelocity);
                break;
            case "PageDown":
                if (event.shiftKey && minVelocity > 0) minVelocity-=0.1;
                else if (maxVelocity > 0 && maxVelocity > minVelocity) maxVelocity-=0.1;
                console.log(maxVelocity);
                console.log(minVelocity);
                break;
            case "ArrowUp":
                beta += Math.PI/200;
                if (beta > Math.PI) beta = Math.PI;
                console.log(beta);
                break;
            case "ArrowDown":
                beta -= Math.PI/200;
                if (beta < 0) beta = 0.0;
                console.log(beta);
                break;
            case "ArrowLeft":
                alpha += Math.PI/200;
                console.log(alpha);
                break;
            case "ArrowRight":
                alpha -= Math.PI/200;
                console.log(alpha);
                break;
            case 'q':
                if (minLife < 19 && minLife < maxLife) minLife++;
                console.log(minLife);
                break;
            case 'a':
                if (minLife > 1) minLife--;
                console.log(minLife);
                break;
            case 'w':
                if (maxLife < 20) maxLife++;
                console.log(maxLife);
                break;
            case 's':
                if (maxLife > 2 && maxLife > minLife) maxLife--;
                console.log(maxLife);
                break;
            case '0':
                drawField = !drawField;
                break;
            case '9':
                drawPoints  = !drawPoints;
                break; 
            case 'Shift':
        }
    })
    
    canvas.addEventListener("mousedown", function(event) {
        const p = mult(getCursorPosition(canvas, event),scale);
        if (event.button == 0 && position.length < MAX_BODIES) position.push(p);
    });

    canvas.addEventListener("mousemove", function(event) {
        const p = mult(getCursorPosition(canvas, event),scale);

        if (event.shiftKey) mPosition = p;
        if (event.buttons == 1 && radius.length <= position.length && canAddPlanet) radius[position.length-1] = length(subtract(p,position[position.length-1]));

        console.log(p);
    });

    canvas.addEventListener("mouseup", function(event) {
        const p = mult(getCursorPosition(canvas, event),scale);
        if (event.button == 0 && radius.length < position.length) radius.push(length(subtract(p,position[position.length-1])));
        if (event.button == 0 && position.length == MAX_BODIES) canAddPlanet = false; 
        // console.log(radius[radius.length-1]);
    })

    
    function getCursorPosition(canvas, event) {
  
       
        const mx = event.offsetX;
        const my = event.offsetY;

        const x = ((mx / canvas.width * 2) - 1);
        const y = (((canvas.height - my)/canvas.height * 2) -1);

        return vec2(x,y);
    }

    window.requestAnimationFrame(animate);

    function buildQuad() {
        const vertices = [-1.0, 1.0, -1.0, -1.0, 1.0, -1.0,
                          -1.0, 1.0,  1.0, -1.0, 1.0,  1.0];
        
        quadBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);

    }

    function buildParticleSystem(nParticles) {
        const data = [];

        for(let i=0; i<nParticles; ++i) {
            // position
            const x = Math.random()*2-1;
            const y = Math.random()*2-1;

            data.push(x); data.push(y);
            
            // age
            data.push(0.0);

            // life
            const life = 2.0 + 8.0*Math.random();
            data.push(life);

            // velocity
            const v = Math.random()*0.1 + 0.1;
            const theta = Math.random() * (2*Math.PI) - Math.PI;
            const vx = v*Math.cos(theta);
            const vy = v*Math.sin(theta);
            
            data.push(vx); data.push(vy);
            //data.push(0.1*(Math.random()-0.5));
            //data.push(0.1*(Math.random()-0.5));
        }

        inParticlesBuffer = gl.createBuffer();
        outParticlesBuffer = gl.createBuffer();

        // Input buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, inParticlesBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(data), gl.STREAM_DRAW);

        // Output buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, outParticlesBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(data), gl.STREAM_DRAW);
    }



    function animate(timestamp)
    {
        let deltaTime = 0;

        if(time === undefined) {        // First time
            time = timestamp/1000;
            deltaTime = 0;
        } 
        else {                          // All other times
            deltaTime = timestamp/1000 - time;
            time = timestamp/1000;
        }

        window.requestAnimationFrame(animate);

        // Clear framebuffer
        gl.clear(gl.COLOR_BUFFER_BIT);

        if(drawField) drawQuad();
        updateParticles(deltaTime);
        if(drawPoints) drawParticles(outParticlesBuffer, N_PARTICLES);

        swapParticlesBuffers();
    }

    function updateParticles(deltaTime)
    {
        // Setup uniforms
        const uDeltaTime = gl.getUniformLocation(updateProgram, "uDeltaTime");
        const uMousePosition = gl.getUniformLocation(updateProgram, "uMousePosition");
        const uScale = gl.getUniformLocation(updateProgram, "uScale");
        const uMinLife = gl.getUniformLocation(updateProgram, "uMinLife");
        const uMaxLife = gl.getUniformLocation(updateProgram, "uMaxLife");
        const uMinVelocity = gl.getUniformLocation(updateProgram, "uMinVelocity");
        const uMaxVelocity = gl.getUniformLocation(updateProgram, "uMaxVelocity");
        const uAlpha = gl.getUniformLocation(updateProgram, "uAlpha");
        const uBeta = gl.getUniformLocation(updateProgram, "uBeta");
        
        gl.useProgram(updateProgram);

        gl.uniform1f(uDeltaTime, deltaTime);
        if (mPosition) gl.uniform2fv(uMousePosition, mPosition);
        gl.uniform2fv(uScale, scale);
        gl.uniform1f(uMinLife, minLife);
        gl.uniform1f(uMaxLife, maxLife);
        gl.uniform1f(uMinVelocity, minVelocity);
        gl.uniform1f(uMaxVelocity, maxVelocity);
        gl.uniform1f(uAlpha, alpha);
        gl.uniform1f(uBeta, beta);

        // Send the bodies' positions
        for(let i=0; i<radius.length; i++) {
            // Get the location of the uniforms...
            const uPosition = gl.getUniformLocation(updateProgram, "uPosition[" + i + "]");
            const uRadius = gl.getUniformLocation(updateProgram, "uRadius[" + i + "]");
            // Send the corresponding values to the GLSL program
            gl.uniform2fv(uPosition, position[i]);
            gl.uniform1f(uRadius, radius[i]);
        }
        
        // Setup attributes
        const vPosition = gl.getAttribLocation(updateProgram, "vPosition");
        const vAge = gl.getAttribLocation(updateProgram, "vAge");
        const vLife = gl.getAttribLocation(updateProgram, "vLife");
        const vVelocity = gl.getAttribLocation(updateProgram, "vVelocity");

        gl.bindBuffer(gl.ARRAY_BUFFER, inParticlesBuffer);
        
        gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 24, 0);
        gl.vertexAttribPointer(vAge, 1, gl.FLOAT, false, 24, 8);
        gl.vertexAttribPointer(vLife, 1, gl.FLOAT, false, 24, 12);
        gl.vertexAttribPointer(vVelocity, 2, gl.FLOAT, false, 24, 16);
        
        gl.enableVertexAttribArray(vPosition);
        gl.enableVertexAttribArray(vAge);
        gl.enableVertexAttribArray(vLife);
        gl.enableVertexAttribArray(vVelocity);

        gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, outParticlesBuffer);
        gl.enable(gl.RASTERIZER_DISCARD);
        gl.beginTransformFeedback(gl.POINTS);
        gl.drawArrays(gl.POINTS, 0, N_PARTICLES);
        gl.endTransformFeedback();
        gl.disable(gl.RASTERIZER_DISCARD);
        gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null);
    }

    function swapParticlesBuffers()
    {
        let auxBuffer = inParticlesBuffer;
        inParticlesBuffer = outParticlesBuffer;
        outParticlesBuffer = auxBuffer;
    }

    function drawQuad() {

        gl.useProgram(fieldProgram);

        // Setup Uniforms
        const uScale = gl.getUniformLocation(fieldProgram, "uScale");

        gl.uniform2fv(uScale, scale);

        // Send the bodies' positions
        for(let i=0; i<radius.length; i++) {
            // Get the location of the uniforms...
            const uPosition = gl.getUniformLocation(fieldProgram, "uPosition[" + i + "]");
            const uRadius = gl.getUniformLocation(fieldProgram, "uRadius[" + i + "]");
            // Send the corresponding values to the GLSL program
            gl.uniform2fv(uPosition, position[i]);
            gl.uniform1f(uRadius, radius[i]);
        }

        // Setup attributes
        const vPosition = gl.getAttribLocation(fieldProgram, "vPosition"); 

        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
        gl.enableVertexAttribArray(vPosition);
        gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
        
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    function drawParticles(buffer, nParticles)
    {

        gl.useProgram(renderProgram);

        // Setup attributes
        const vPosition = gl.getAttribLocation(renderProgram, "vPosition");

        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

        gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 24, 0);
        gl.enableVertexAttribArray(vPosition);

        gl.drawArrays(gl.POINTS, 0, nParticles);
    }
}


loadShadersFromURLS([
    "field-render.vert", "field-render.frag",
    "particle-update.vert", "particle-update.frag", 
    "particle-render.vert", "particle-render.frag"
    ]
).then(shaders=>main(shaders));