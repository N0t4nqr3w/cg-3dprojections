import * as CG from './transforms.js';
import { Matrix, Vector } from "./matrix.js";

const LEFT =   32; // binary 100000
const RIGHT =  16; // binary 010000
const BOTTOM = 8;  // binary 001000
const TOP =    4;  // binary 000100
const FAR =    2;  // binary 000010
const NEAR =   1;  // binary 000001
const FLOAT_EPSILON = 0.000001;

class Renderer {
    // canvas:              object ({id: __, width: __, height: __})
    // scene:               object (...see description on Canvas)
    constructor(canvas, scene) {
        this.canvas = document.getElementById(canvas.id);
        this.canvas.width = canvas.width;
        this.canvas.height = canvas.height;
        this.ctx = this.canvas.getContext('2d');
        this.scene = this.processScene(scene);
        this.enable_animation = true;  // <-- disabled for easier debugging; enable for animation
        this.start_time = null;
        this.prev_time = null;
    }

    //
    updateTransforms(time, delta_time) {
        // TODO: update any transformations needed for animation
        for (let i = 0; i < this.scene.models.length; i++){
            let model = this.scene.models[i];

            // Skip models without animations
            if (model.animation === undefined) {
                continue;
            }
            
            // For generic models
            if (model.center === undefined) {
                let sumX = 0;
                let sumY = 0;
                let sumZ = 0;
                for (let j = 0; j < model.vertices.length; j++){
                    sumX = sumX + model.vertices[j].x;
                    sumY = sumY + model.vertices[j].y;
                    sumZ = sumZ + model.vertices[j].z;
                }
                let count = model.vertices.length;
                model.center = CG.Vector4(sumX / count, sumY / count, sumZ / count, 1);
            }

            let seconds = time / 1000;
            let angle = 2 * Math.PI * model.animation.rps * seconds;
            let toOrigin = new Matrix(4,4);
            CG.mat4x4Translate(toOrigin, -model.center.x, -model.center.y, -model.center.z);

            let rotate = new Matrix(4,4);
            if (model.animation.axis === "x") {
                CG.mat4x4RotateX(rotate, angle);
            } else if (model.animation.axis === "y") {
                CG.mat4x4RotateY(rotate, angle);
            } else {
                CG.mat4x4RotateZ(rotate, angle);
            }

            let move = new Matrix(4,4);
            CG.mat4x4Translate(move, model.center.x, model.center.y, model.center.z);
            model.matrix = Matrix.multiply([move, rotate, toOrigin]);
        }
    }
    
    // Helper function for camera position
    getCameraPosition() {
        let view = this.scene.view;
        let n = view.prp.subtract(view.srp)
        n.normalize();
        let u = view.vup.cross(n)
        u.normalize();
        let v = n.cross(u);
        return {u, v, n};
    }

    //
    rotateLeft() {
        let view = this.scene.view;
        let {u, v, n} = this.getCameraPosition();
        let angle = 0.05;

        let d = view.srp.subtract(view.prp);
        let x = d.dot(u);
        let y = d.dot(v);
        let z = d.dot(n);

        let cos = Math.cos(angle);
        let sin = Math.sin(angle);
        let newX = cos * x + sin * z;
        let newZ = -sin * x + cos * z;

        view.srp = CG.Vector3 (
            view.prp.x + newX * u.x + y * v.x + newZ * n.x,
            view.prp.y + newX * u.y + y * v.y + newZ * n.y,
            view.prp.z + newX * u.z + y * v.z + newZ * n.z
        );

        if (!this.enable_animation) {
            this.draw();
        }
    }
    
    //
    rotateRight() {
        let view = this.scene.view;
        let {u, v, n} = this.getCameraPosition();
        let angle = -0.05;

        let d = view.srp.subtract(view.prp);
        let x = d.dot(u);
        let y = d.dot(v);
        let z = d.dot(n);

        let cos = Math.cos(angle);
        let sin = Math.sin(angle);
        let newX = cos * x + sin * z;
        let newZ = -sin * x + cos * z;

        view.srp = CG.Vector3 (
            view.prp.x + newX * u.x + y * v.x + newZ * n.x,
            view.prp.y + newX * u.y + y * v.y + newZ * n.y,
            view.prp.z + newX * u.z + y * v.z + newZ * n.z
        );

        if (!this.enable_animation) {
            this.draw();
        }

    }
    
    //
    moveLeft() {
        let view = this.scene.view;
        let {u} = this.getCameraPosition();
        let moveStep = 1.0;

        view.prp = CG.Vector3(
            view.prp.x - moveStep * u.x,
            view.prp.y - moveStep * u.y,
            view.prp.z - moveStep * u.z
        )
        view.srp = CG.Vector3(
            view.srp.x - moveStep * u.x,
            view.srp.y - moveStep * u.y,
            view.srp.z - moveStep * u.z
        )

        if (!this.enable_animation) {
            this.draw();
        }
    }
    
    //
    moveRight() {
        let view = this.scene.view;
        let {u} = this.getCameraPosition();
        let moveStep = 1.0;

        view.prp = CG.Vector3(
            view.prp.x + moveStep * u.x,
            view.prp.y + moveStep * u.y,
            view.prp.z + moveStep * u.z
        )
        view.srp = CG.Vector3(
            view.srp.x + moveStep * u.x,
            view.srp.y + moveStep * u.y,
            view.srp.z + moveStep * u.z
        )

        if (!this.enable_animation) {
            this.draw();
        }
    }
    
    //
    moveBackward() {
        let view = this.scene.view;
        let {n} = this.getCameraPosition();
        let moveStep = 1.0;

        view.prp = CG.Vector3(
            view.prp.x + moveStep * n.x,
            view.prp.y + moveStep * n.y,
            view.prp.z + moveStep * n.z
        )
        view.srp = CG.Vector3(
            view.srp.x + moveStep * n.x,
            view.srp.y + moveStep * n.y,
            view.srp.z + moveStep * n.z
        )

        if (!this.enable_animation) {
            this.draw();
        }

    }
    
    //
    moveForward() {
        let view = this.scene.view;
        let {n} = this.getCameraPosition();
        let moveStep = 1.0;

        view.prp = CG.Vector3(
            view.prp.x - moveStep * n.x,
            view.prp.y - moveStep * n.y,
            view.prp.z - moveStep * n.z
        )
        view.srp = CG.Vector3(
            view.srp.x - moveStep * n.x,
            view.srp.y - moveStep * n.y,
            view.srp.z - moveStep * n.z
        )

        if (!this.enable_animation) {
            this.draw();
        }

    }

    //
    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // TODO: implement drawing here!
        let view = this.scene.view;
        let nPer = CG.mat4x4Perspective(view.prp, view.srp, view.vup, view.clip);
        let mPer = CG.mat4x4MPer();
        let viewport = CG.mat4x4Viewport(this.canvas.width, this.canvas.height);
        let near = view.clip[4];
        let far = view.clip[5];
        let z_min = -near / far;
        // For each model
        for (let i = 0; i < this.scene.models.length; i++){
            let model = this.scene.models[i];
        // For each vertex, transform endpoints to canonical view volume    
            let newVertices = [];
            for (let j = 0; j < model.vertices.length; j++){
                let v = Matrix.multiply([nPer, model.matrix, model.vertices[j]]);
                newVertices.push(v);
            }
            //  For each line segment in each edge, clip in 3D
            for (let k = 0; k < model.edges.length; k++){
                let edge = model.edges[k];

                for (let l = 0; l < edge.length - 1; l++){
                let line = {pt0: newVertices[edge[l]], pt1: newVertices[edge[l+1]]};
                let clipped = this.clipLinePerspective(line, z_min);
                if(clipped == null){
                    continue;
                }
                // Project to 2D
                let p0 = Matrix.multiply([mPer, clipped.pt0]);
                let p1 = Matrix.multiply([mPer, clipped.pt1]);
                p0 = CG.Vector4(p0.x / p0.w, p0.y / p0.w, p0.z / p0.w, 1);
                p1 = CG.Vector4(p1.x / p1.w, p1.y / p1.w, p1.z / p1.w, 1);
                // Translate/scale to viewport (i.e. window)
                p0 = Matrix.multiply([viewport, p0]);
                p1 = Matrix.multiply([viewport, p1]);
                // Draw line
                this.drawLine(p0.x, p0.y, p1.x, p1.y);
                    
                }
            }
        }
    }

    // Get outcode for a vertex
    // vertex:       Vector4 (transformed vertex in homogeneous coordinates)
    // z_min:        float (near clipping plane in canonical view volume)
    outcodePerspective(vertex, z_min) {
        let outcode = 0;
        if (vertex.x < (vertex.z - FLOAT_EPSILON)) {
            outcode += LEFT;
        }
        else if (vertex.x > (-vertex.z + FLOAT_EPSILON)) {
            outcode += RIGHT;
        }
        if (vertex.y < (vertex.z - FLOAT_EPSILON)) {
            outcode += BOTTOM;
        }
        else if (vertex.y > (-vertex.z + FLOAT_EPSILON)) {
            outcode += TOP;
        }
        if (vertex.z < (-1.0 - FLOAT_EPSILON)) {
            outcode += FAR;
        }
        else if (vertex.z > (z_min + FLOAT_EPSILON)) {
            outcode += NEAR;
        }
        return outcode;
    }

    // Clip line - should either return a new line (with two endpoints inside view volume)
    //             or null (if line is completely outside view volume)
    // line:         object {pt0: Vector4, pt1: Vector4}
    // z_min:        float (near clipping plane in canonical view volume)
    clipLinePerspective(line, z_min) {
        let result = null;
        let p0 = CG.Vector4(line.pt0.x, line.pt0.y, line.pt0.z, line.pt0.w); 
        let p1 = CG.Vector4(line.pt1.x, line.pt1.y, line.pt1.z, line.pt1.w);
        let out0 = this.outcodePerspective(p0, z_min);
        let out1 = this.outcodePerspective(p1, z_min);
        
        // TODO: implement clipping here!
        while (true){
        // Trival Accept:
            if((out0 | out1) === 0) {
                result = {pt0: p0, pt1: p1};
                return result;
            }

        // Trival Reject:
            if((out0 & out1) !== 0) {
                result = null;
                return result;
            }
        // Otherwise, investigate further    
            let outsidePt;
            if(out0 != 0) {
                outsidePt = out0;
            } else {
                outsidePt = out1;
            }

            let t = this.findT(p0, p1, outsidePt, z_min);
            let newPt = CG.Vector4(p0.x + t * (p1.x - p0.x), p0.y + t * (p1.y - p0.y), p0.z + t * (p1.z - p0.z), 1);
            if(outsidePt == out0){
                p0 = newPt;
                out0 = this.outcodePerspective(p0, z_min);
            } else {
                p1 = newPt;
                out1 = this.outcodePerspective(p1, z_min);
            }
        }
    }

    // Find T shows where the line from p0 to p1 crosses one side of the view. 
    findT(p0, p1, outcode, z_min) {
        let dx = p1.x - p0.x;
        let dy = p1.y - p0.y;
        let dz = p1.z - p0.z;

        if(outcode & LEFT) {
            return (p0.z - p0.x) / (dx - dz);
        } else if(outcode & RIGHT) {
            return (p0.x + p0.z) / (-dx - dz);
        } else if(outcode & BOTTOM) {
            return (p0.z - p0.y) / (dy - dz);
        } else if(outcode & TOP) {
            return (p0.y + p0.z) / (-dy - dz);
        } else if(outcode & FAR) {
            return (-1 - p0.z) / dz;
        } else {
            return (z_min - p0.z) / dz; //This is NEAR.
        }
    }

    //
    animate(timestamp) {
        // Get time and delta time for animation
        if (this.start_time === null) {
            this.start_time = timestamp;
            this.prev_time = timestamp;
        }
        let time = timestamp - this.start_time;
        let delta_time = timestamp - this.prev_time;

        // Update transforms for animation
        this.updateTransforms(time, delta_time);

        // Draw slide
        this.draw();

        // Invoke call for next frame in animation
        if (this.enable_animation) {
            window.requestAnimationFrame((ts) => {
                this.animate(ts);
            });
        }

        // Update previous time to current one for next calculation of delta time
        this.prev_time = timestamp;
    }

    //
    updateScene(scene) {
        this.scene = this.processScene(scene);
        if (!this.enable_animation) {
            this.draw();
        }
    }

    //
    processScene(scene) {
        let processed = {
            view: {
                prp: CG.Vector3(scene.view.prp[0], scene.view.prp[1], scene.view.prp[2]),
                srp: CG.Vector3(scene.view.srp[0], scene.view.srp[1], scene.view.srp[2]),
                vup: CG.Vector3(scene.view.vup[0], scene.view.vup[1], scene.view.vup[2]),
                clip: [...scene.view.clip]
            },
            models: []
        };

        for (let i = 0; i < scene.models.length; i++) {
            let model = { type: scene.models[i].type };
            if (model.type === 'generic') {
                model.vertices = [];
                model.edges = JSON.parse(JSON.stringify(scene.models[i].edges));
                for (let j = 0; j < scene.models[i].vertices.length; j++) {
                    model.vertices.push(CG.Vector4(scene.models[i].vertices[j][0],
                                                   scene.models[i].vertices[j][1],
                                                   scene.models[i].vertices[j][2],
                                                   1));
                    if (scene.models[i].hasOwnProperty('animation')) {
                        model.animation = JSON.parse(JSON.stringify(scene.models[i].animation));
                    }
                }
            }
            else {
                model.center = CG.Vector4(scene.models[i].center[0],
                                         scene.models[i].center[1],
                                         scene.models[i].center[2],
                                         1);
                for (let key in scene.models[i]) {
                    if (scene.models[i].hasOwnProperty(key) && key !== 'type' && key != 'center') {
                        model[key] = JSON.parse(JSON.stringify(scene.models[i][key]));
                    }
                }
            }

            model.matrix = new Matrix(4, 4);
            processed.models.push(model);
        }

        return processed;
    }
    
    // x0:           float (x coordinate of p0)
    // y0:           float (y coordinate of p0)
    // x1:           float (x coordinate of p1)
    // y1:           float (y coordinate of p1)
    drawLine(x0, y0, x1, y1) {
        this.ctx.strokeStyle = '#000000';
        this.ctx.beginPath();
        this.ctx.moveTo(x0, y0);
        this.ctx.lineTo(x1, y1);
        this.ctx.stroke();

        this.ctx.fillStyle = '#FF0000';
        this.ctx.fillRect(x0 - 2, y0 - 2, 4, 4);
        this.ctx.fillRect(x1 - 2, y1 - 2, 4, 4);
    }
};

export { Renderer };
