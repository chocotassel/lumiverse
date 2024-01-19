import { quat, vec3 } from "gl-matrix";


export interface EngineConfigOptions {
    canvas: HTMLCanvasElement;
}

export interface Transform {
    position: vec3;
    rotation: quat;
    scale: vec3;
}