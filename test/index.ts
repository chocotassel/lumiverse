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

// 物体顶点和索引
const vertices = new Float32Array([
    0.5, 0.5, 0, 
    0.5, -0.5, -0.5, 
    0.5, -0.5, 0.5,
    -0.5, -0.5, 0,
]);
const indices = new Uint16Array([0, 1, 2, 0, 2, 3, 0, 3, 1, 1, 3, 2]);

// 灯光
const pointLight = {
    position: vec3.fromValues(0, 1, 0),
    color: vec3.fromValues(1, 1, 1),
    intensity: 1.0,
};


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
    struct PointLight {
        position: vec3<f32>,
        color: vec3<f32>,
        intensity: f32,
        viewPos: vec3<f32>,
        _padding3: vec2<f32>,
    };
    struct VertexOutput {
        @builtin(position) position: vec4<f32>,
        @location(0) fragPos: vec3<f32>,
        @location(1) normal: vec3<f32>,
    };
    
    @group(0) @binding(0) var<uniform> matrix: mat4x4<f32>;
    @group(0) @binding(1) var<uniform> pointLight: PointLight;
    // @group(0) @binding(2) var<uniform> viewPos: vec3<f32>;

    @vertex
    fn vs_main(@location(0) position: vec3<f32>, @location(1) normal: vec3<f32>) -> VertexOutput {
        var output: VertexOutput;
        var transPosition = matrix * vec4<f32>(position, 1.0);
        output.position = transPosition;
        output.fragPos = transPosition.xyz;
        output.normal = normal;
        return output;
    }

    @fragment
    fn fs_main(input: VertexOutput) -> @location(0) vec4<f32> {
        var norm = normalize(input.normal);
        var lightDir = normalize(pointLight.position - input.fragPos);
        var diff = max(dot(norm, lightDir), 0.0);
        var reflectDir = reflect(-lightDir, norm);
        var viewDir = normalize(pointLight.viewPos - input.fragPos);
        var spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);

        var ambient = pointLight.color * 0.1;
        var diffuse = pointLight.color * diff;
        var specular = pointLight.color * spec;
        var color = ambient + diffuse + specular;
        color *= pointLight.intensity;
    
        return vec4<f32>(1, 1,1, 1.0);
    }
    `
    const cellShaderModule = device.createShaderModule({
        label: 'Cell shader',
        code: shaderCode,
    });


    // 创建渲染管道
    const format: GPUTextureFormat = 'bgra8unorm';
    const bindGroupLayout = device.createBindGroupLayout({
        entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.VERTEX,
                buffer: {
                    type: 'uniform',
                },
            }, {
                binding: 1,
                visibility: GPUShaderStage.FRAGMENT,
                buffer: {
                    type: 'uniform',
                },
            // }, {
            //     binding: 2,
            //     visibility: GPUShaderStage.FRAGMENT,
            //     buffer: {
            //         type: 'uniform',
            //     },
            }
        ],
    });
    
    const pipeline = device.createRenderPipeline({
        label: 'render pipeline',
        layout: device.createPipelineLayout({
            bindGroupLayouts: [bindGroupLayout],
        }),
        vertex: {
            module: cellShaderModule,
            entryPoint: 'vs_main',
            buffers: [{
                arrayStride: 6 * 4,  // 假设位置和法线各占3个float32
                attributes: [{
                    // position
                    shaderLocation: 0,
                    offset: 0,
                    format: 'float32x3'
                }, {
                    // normal
                    shaderLocation: 1,
                    offset: 3 * 4,  // 紧接着位置数据后的偏移
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
        // 绑定组
		const uniformBufferSize = 64 
		const mat4Buffer = device.createBuffer({
			label: 'affine matrix',
			size: uniformBufferSize,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
		});
		device.queue.writeBuffer(mat4Buffer, 0, affineMatrix)

        // 点光源数据
        const pointLightData = new Float32Array([
            pointLight.position[0], pointLight.position[1], pointLight.position[2], 
            pointLight.color[0], pointLight.color[1], pointLight.color[2],
            pointLight.intensity,
            ...cameraPosition
        ]);
        const pointLightBuffer = device.createBuffer({
            size: 64,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true
        });
        new Float32Array(pointLightBuffer.getMappedRange()).set(pointLightData);
        pointLightBuffer.unmap();

        // camera
        // const viewPosBuffer = device.createBuffer({
        //     size: 12, // vec3 的大小（3个4字节的浮点数）
        //     usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        // });
        
        // device.queue.writeBuffer(viewPosBuffer, 0, new Float32Array(cameraPosition))

        //
		const bindGroup = device.createBindGroup({
			layout: pipeline.getBindGroupLayout(0),
			entries: [
                {
                    binding: 0,
                    resource: { 
                        buffer: mat4Buffer 
                    },
                }, {
                    binding: 1,
                    resource: {
                        buffer: pointLightBuffer,
                    },
                // }, {
                //     binding: 2,
                //     resource: {
                //         buffer: viewPosBuffer,
                //     },
                },
            ],
		})

        // 创建渲染命令 
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
