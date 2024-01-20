import { mat4, vec3 } from "gl-matrix";
import { createPerspectiveMatrix, createViewMatrix } from "./utils";

// 全局变量
const cameraPosition = vec3.fromValues(0, 0, 3);
const cameraTarget = vec3.fromValues(0, 0, 0);
let yaw = 0.0;   // 偏航角
let pitch = 0.0; // 俯仰角
let distance = 3.0; // 相机距离
let lastMouseX = 0.0;
let lastMouseY = 0.0;

const sensitivity = 0.005;

let pm = createPerspectiveMatrix(70, 1, 0.1, 100);
let vm = createViewMatrix(cameraPosition, cameraTarget, [0, 1, 0]);
let am = mat4.create();
mat4.multiply(am, pm, vm);

// 仿射矩阵
let affineMatrix = new Float32Array(am);

// 顶点和索引
const vertices = new Float32Array([
    0.5, 0.5, 0, 
    0.5, -0.5, -0.5, 
    0.5, -0.5, 0.5,
    -0.5, -0.5, 0,
]);
const indices = new Uint16Array([0, 1, 2, 0, 2, 3, 0, 3, 1, 1, 3, 2]);


// mouse event
const canvas = document.getElementById('app') as HTMLCanvasElement;

let isMouseDown = false;
canvas.addEventListener('mousedown', (e) => {
    isMouseDown = true;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
})
canvas.addEventListener('mousemove', (e) => {
    if (isMouseDown) {
        let deltaX = e.clientX - lastMouseX;
        let deltaY = e.clientY - lastMouseY;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;

        // 更新偏航角和俯仰角
        yaw += deltaX * sensitivity;
        pitch -= deltaY * sensitivity;

        // 限制俯仰角，避免翻转
        pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));

        // 根据新的偏航角和俯仰角更新相机位置
        updateCameraPosition();
    }
})
canvas.addEventListener('mouseup', () => {
    isMouseDown = false;
})
canvas.addEventListener('wheel', (e) => {
    const delta = e.deltaY;
    distance += delta * sensitivity;
    distance = Math.max(0.1, distance);
    updateCameraPosition();
})

function updateCameraPosition() {
    cameraPosition[0] = distance * Math.cos(pitch) * Math.sin(yaw);
    cameraPosition[1] = distance * Math.sin(pitch);
    cameraPosition[2] = distance * Math.cos(pitch) * Math.cos(yaw);

    // 重新计算视图矩阵和仿射矩阵
    vm = createViewMatrix(cameraPosition, cameraTarget, [0, 1, 0]);
    mat4.multiply(am, pm, vm);
    affineMatrix = new Float32Array(am);
}

// start
async function main() {

    if (!navigator.gpu) {
        throw new Error("WebGPU not supported on this browser.");
    }

    const adapter = await navigator.gpu.requestAdapter();

    if (!adapter) {
        throw new Error("No appropriate GPUAdapter found.");
    }
    const device = await adapter.requestDevice();

    const ctx = canvas.getContext("webgpu");
    if (!ctx) {
        throw new Error("WebGPU context could not be created.");
    }
    const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
    ctx.configure({
        device: device,
        format: canvasFormat,
    });

    // 创建着色器
    const shaderCode = `
    @group(0) @binding(0) var<uniform> matrix: mat4x4<f32>;

    @vertex
    fn vs_main(@location(0) position: vec3<f32>) -> @builtin(position) vec4<f32> {
        return matrix * vec4<f32>(position, 1.0);
    }

    @fragment
    fn fs_main() -> @location(0) vec4<f32> {
        return vec4<f32>(1.0, 1.0, 1.0, 1.0);
    }
    `
    const cellShaderModule = device.createShaderModule({
        label: 'Cell shader',
        code: shaderCode,
    });


    // 创建渲染管道
    const format: GPUTextureFormat = 'bgra8unorm';
    const pipeline = device.createRenderPipeline({
        label: 'render pipeline',
        layout: 'auto',
        vertex: {
            module: cellShaderModule,
            entryPoint: 'vs_main',
            buffers: [{
                arrayStride: 3 * 4,  // size of float32 is 4 bytes
                attributes: [{
                    // position
                    shaderLocation: 0,
                    offset: 0,
                    format: 'float32x3'
                }],
            }],
        },
        fragment: {
            module: cellShaderModule,
            entryPoint: 'fs_main',
            targets: [{
                format: format,
            }],
        },
        primitive: {
            topology: 'triangle-list',
        },
        depthStencil: {
            format: 'depth24plus-stencil8',
            depthWriteEnabled: true,
            depthCompare: 'less',
        },
    });

    // 创建顶点缓冲区和索引缓冲区
    const verticesBuffer = device.createBuffer({
        size: vertices.byteLength,
        usage: GPUBufferUsage.VERTEX,
        mappedAtCreation: true,
    });
    new Float32Array(verticesBuffer.getMappedRange()).set(vertices);
    verticesBuffer.unmap();

    const indicesBuffer = device.createBuffer({
        size: indices.byteLength,
        usage: GPUBufferUsage.INDEX,
        mappedAtCreation: true, 
    });
    new Uint16Array(indicesBuffer.getMappedRange()).set(indices);
    indicesBuffer.unmap();

    // 渲染循环
    function draw() {
		const uniformBufferSize = 64 
		const mat4Buffer = device.createBuffer({
			label: 'affine matrix',
			size: uniformBufferSize,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
		});
		const bindGroup = device.createBindGroup({
			layout: pipeline.getBindGroupLayout(0),
			entries: [{
				binding: 0,
				resource: { buffer: mat4Buffer },
			}],
		})
		device.queue.writeBuffer(mat4Buffer, 0, affineMatrix)

        const commandEncoder = device.createCommandEncoder();
        const textureView = ctx.getCurrentTexture().createView();
        const depthTexture = device.createTexture({
            size: {
                width: canvas.width,
                height: canvas.height,
                depthOrArrayLayers: 1,
            },
            format: 'depth24plus-stencil8',
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
        });
        const renderPass = commandEncoder.beginRenderPass({
            // 配置帧缓冲区和其他渲染参数
            label: 'our basic canvas renderPass',
            colorAttachments: [{
                view: textureView,
                clearValue: { r: 0, g: 0, b: 0, a: 1.0 },
                loadOp: "clear",
                storeOp: "store",
            }],
            depthStencilAttachment: {
                view: depthTexture.createView(),
                depthLoadOp: 'clear',
                depthStoreOp: 'store',
                depthReadOnly: false,
                stencilLoadOp: 'clear',
                stencilStoreOp: 'store',
                stencilReadOnly: false,
                depthClearValue: 1.0,
                stencilClearValue: 0,
            },
        });

        renderPass.setPipeline(pipeline);
        renderPass.setBindGroup(0, bindGroup);
        renderPass.setVertexBuffer(0, verticesBuffer);
        renderPass.setIndexBuffer(indicesBuffer, 'uint16');
        renderPass.drawIndexed(indices.length);
        renderPass.end();
        device.queue.submit([commandEncoder.finish()]);

        requestAnimationFrame(draw);
    }

    draw();
}

main()
