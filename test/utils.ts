import { mat4, vec3 } from "gl-matrix";

export function createPerspectiveMatrix (
    fov: number,
    aspect: number,
    near: number,
    far: number,
) {
    let perspectiveMatrix = mat4.create();
    mat4.perspective(perspectiveMatrix, fov, aspect, near, far);
    return perspectiveMatrix;
}

export function createViewMatrix(position: vec3, target: vec3, up: vec3 ): mat4 {
    let viewMatrix = mat4.create();
    mat4.lookAt(viewMatrix, position, target, up);
    return viewMatrix;
}

export function createModelMatrix(translation: vec3, rotation: vec3, scale: vec3) {
    let modelMatrix = mat4.create(); // 创建一个单位矩阵

    // 应用缩放
    mat4.scale(modelMatrix, modelMatrix, scale);

    // 应用旋转
    mat4.rotateX(modelMatrix, modelMatrix, rotation[0]); // 绕X轴旋转
    mat4.rotateY(modelMatrix, modelMatrix, rotation[1]); // 绕Y轴旋转
    mat4.rotateZ(modelMatrix, modelMatrix, rotation[2]); // 绕Z轴旋转

    // 应用平移
    mat4.translate(modelMatrix, modelMatrix, translation);

    return modelMatrix;
}

