import { buildProgramFromSources, loadShadersFromURLS, setupWebGL } from '../../libs/utils.js';
import { vec2, flatten, subtract, dot } from '../../libs/MV.js';

// Buffers: particles before update, particles after update, quad vertices
let quadBuffer;

// Particle system constants

// Planet constants
const N_PLANETS = 10;

let drawField = true;

function main(shaders)
{
    // Generate the canvas element to fill the entire page
    const canvas = document.createElement("canvas");
    document.body.appendChild(canvas);

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    let ratio = canvas.width / canvas.height;

    /** type {WebGL2RenderingContext} */
    const gl = setupWebGL(canvas, {alpha: true});

    // Initialize GLSL programs    
    const fieldProgram = buildProgramFromSources(gl, shaders["shader.vert"], shaders["shader.frag"]);

    gl.viewport(0,0,canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    // Enable Alpha blending
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); 

    buildQuad();

    window.addEventListener("resize", function(event) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        ratio = canvas.width / canvas.height;

        gl.viewport(0,0,canvas.width, canvas.height);
    });

    // Planets' Variables
    const position = [];
    const radius = [];

    canvas.addEventListener("mousedown", function(event) {
        const p = getCursorPosition(canvas, event);
        if (event.buttons == 1) {
            if (position.length <= N_PLANETS) position.push(p);
        }

        console.log(p);
    });

    canvas.addEventListener("mousemove", function(event) {
        const p = getCursorPosition(canvas, event);

        // console.log(p);
    });

    canvas.addEventListener("mouseup", function(event) {
        const p = getCursorPosition(canvas, event);
        const r = Math.sqrt(Math.pow((p[0]-position[position.length - 1][0]), 2) + Math.pow((p[1]-position[position.length - 1][1]), 2));

        radius.push(r);

        buildFieldsSystem(radius.length);
    })

    
    function getCursorPosition(canvas, event) {
  
       
        const mx = event.offsetX;
        const my = event.offsetY;

        //Convert to World Coordinates
        const x = ( (mx / canvas.width) * 2 - 1 ) * ratio;
        const y = (canvas.height- my) / canvas.height * 2 - 1;

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

    function buildFieldsSystem(MAX_BODIES){
        gl.useProgram(fieldProgram);
        for(let i = 0; i<MAX_BODIES; i++) {
            // Get the location of the uniforms...
            const uPosition = gl.getUniformLocation(fieldProgram, "uPosition[" + i + "]");
            const uRadius = gl.getUniformLocation(fieldProgram, "uRadius[" + i + "]");
            // Send the corresponding values to the GLSL program
            gl.uniform2fv(uPosition, position[i]);
            gl.uniform1f(uRadius, radius[i]);
        }
    }



    function animate(timestamp)
    {
        window.requestAnimationFrame(animate);

        // Clear framebuffer
        gl.clear(gl.COLOR_BUFFER_BIT);

        if(drawField) drawQuad();
    }

    function drawQuad() {

        gl.useProgram(fieldProgram);

        //Send ratio to GLSL
        const uRatio = gl.getUniformLocation(fieldProgram, "uRatio");
        gl.uniform1f(uRatio, ratio);

        // Setup attributes
        const vPosition = gl.getAttribLocation(fieldProgram, "vPosition"); 

        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
        gl.enableVertexAttribArray(vPosition);
        gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
        
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
}


loadShadersFromURLS([
    "shader.vert", "shader.frag",
    ]
).then(shaders=>main(shaders));