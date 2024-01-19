import GameObject from "../core/GameObject";
import { Scene } from "../scenes";

class Renderer {
    swapChain: null;
    context: GPUCanvasContext;
    device: GPUDevice;

    viewPort: [number, number, number, number];
    clearColor: GPUColor;
    pipeline: GPURenderPipeline;
    commandEncoder: GPUCommandEncoder;
    
    constructor() {
        this.device = null;      // 表示 GPU 设备
        this.swapChain = null;   // 交换链，用于管理渲染到屏幕的缓冲区
        this.context = null;     // 画布的上下文
        // 更多初始化的成员变量...
    }

    // 初始化 WebGPU 上下文
    async init(canvas: HTMLCanvasElement) {
        if (!('gpu' in navigator)) {
            console.error('WebGPU is not supported.');
            return;
        }

        const adapter = await navigator.gpu.requestAdapter();
        this.device = await adapter.requestDevice();

        this.context = canvas.getContext('webgpu') as GPUCanvasContext;
        const swapChainFormat = 'bgra8unorm';
        this.context.configure({
            device: this.device,
            format: swapChainFormat,
            // 更多配置参数...
        });
        this.viewPort = [0, 0, canvas.width, canvas.height];

        // 初始化渲染管道等...
    }

    // 创建渲染管道
    createPipeline() {
        // 管道创建逻辑...
        const format = 'bgra8unorm';
        const cellShaderModule = this.createShaderModule('./shaders/cell.wgsl');
		const pipeline = this.device.createRenderPipeline({
			label: 'render pipeline',
			layout: 'auto',
			vertex: {
				module: cellShaderModule,
				entryPoint: 'vs_main',
				buffers: [{
					arrayStride: 2 * 4,  // size of float32 is 4 bytes
					attributes: [{
						// position
						shaderLocation: 0,
						offset: 0,
						format: 'float32x2'
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
		});
		this.pipeline = pipeline;
    }

    createShaderModule(url: string) {
        // const code = await this.loadShader(url);
        const code = `
            @group(0) @binding(0) var<uniform> matrix: mat4x4<f32>;

            @vertex
            fn vs_main(@location(0) position: vec2<f32>) -> @builtin(position) vec4<f32> {
                var mat = mat3x3<f32>(
                    matrix[0].x, matrix[1].x, matrix[2].x,
                    matrix[0].y, matrix[1].y, matrix[2].y,
                    matrix[0].z, matrix[1].z, matrix[2].z);
                var transformedPosition3 = mat * vec3<f32>(position, 1.0);
                var transformedPosition: vec2<f32> = transformedPosition3.xy;
                return vec4<f32>(transformedPosition, 0.0, 1.0);
            }

            @fragment
            fn fs_main() -> @location(0) vec4<f32> {
                return vec4<f32>(1.0, 1.0, 1.0, 1.0);
            }
        `
        if (code) {
            return this.device.createShaderModule({ code: code });
        }
        return null;
    }


    async loadShader(url: string) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch shader: ${response.statusText}`);
            }
            const code = await response.text();
            return code;
        } catch (error) {
            console.error("Error loading shader:", error);
            return null;
        }
    }


    createTexture(descriptor: GPUTextureDescriptor) {
        // 创建纹理
    }

    createBuffer(descriptor: GPUBufferDescriptor, data: BufferSource) {
        // 创建缓冲区
    }

    resize(width: number, height: number) {
        this.viewPort[2] = width;
        this.viewPort[3] = height;
    }

    clear() {
        // 清除画布
        const commandEncoder = this.device.createCommandEncoder();
        const textureView = this.context.getCurrentTexture().createView();

        const renderPassDescriptor: GPURenderPassDescriptor = {
            label: 'clear pass',
            colorAttachments: [{
                view: textureView,
                clearValue: this.clearColor,
                loadOp: "clear",
                storeOp: 'store',
            }],
        };

        const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
        passEncoder.end();

        this.device.queue.submit([commandEncoder.finish()]);
    }

    // 渲染场景
    render(scene: Scene) {
        // 创建命令编码器
        const commandEncoder = this.device.createCommandEncoder();

        // 设置渲染通道描述符
        const texture = this.device.createTexture({
            size: {
                width: this.viewPort[2],
                height: this.viewPort[3],
                depthOrArrayLayers: 1
            },
            sampleCount: 1,
            format: 'bgra8unorm', // 或其他适合你需求的格式
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
        });
        const textureView = texture.createView()
        const renderPassDescriptor: GPURenderPassDescriptor = {
			label: 'our basic canvas renderPass',
			colorAttachments: [{
				view: textureView,
				clearValue: { r: 0, g: 0, b: 0, a: 1.0 },
				loadOp: "clear",
				storeOp: "store",
			}]
        };

        // 开始渲染通道
        const renderPass = commandEncoder.beginRenderPass(renderPassDescriptor);

        // 渲染场景中的每个对象
        scene.gameObjects.forEach(obj => this.drawObject(renderPass, obj));

        // 结束渲染通道
        renderPass.end();

        // 提交命令缓冲区
        const commandBuffer = commandEncoder.finish();
        this.device.queue.submit([commandBuffer]);
    }

    drawObject(renderPass: GPURenderPassEncoder, obj: GameObject) {
        // 绘制对象
        renderPass.setPipeline(this.pipeline);
		renderPass.setBindGroup(0, bindGroup);
		renderPass.setVertexBuffer(0, verticesBuffer);
		renderPass.setIndexBuffer(indicesBuffer, 'uint16');
		renderPass.drawIndexed(indicesLength);
    }

}

export default Renderer;
