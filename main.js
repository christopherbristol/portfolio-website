async function initWebGPU() {
    const canvas = document.getElementById("webgpu-canvas");

    if (!canvas) {
        throw new Error("Canvas not found");
    }

    if (!navigator.gpu) {
        throw new Error("WebGPU not supported");
    }

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
        throw new Error("No GPU adapter");
    }

    const device = await adapter.requestDevice();
    const context = canvas.getContext("webgpu");

    if (!context) {
        throw new Error("No WebGPU context");
    }

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = "100vw";
    canvas.style.height = "100vh";

    const format = navigator.gpu.getPreferredCanvasFormat();

    context.configure({
        device,
        format,
        alphaMode: "opaque",
    });

    const vertresponse = await fetch("/shaders/vertshader.wgsl");
    const vertcode = await vertresponse.text();

    const fragrespose = await fetch("/shaders/fragshader.wgsl");
    const fragcode = await fragrespose.text();

    const vertexShader = device.createShaderModule({
        code: vertcode});

    const fragmentShader = device.createShaderModule({
        code: fragcode});

    const pipeline = device.createRenderPipeline({
        layout: "auto",
        vertex: {
            module: vertexShader,
            entryPoint: "vertex_main",
        },
        fragment: {
            module: fragmentShader,
            entryPoint: "fragment_main",
            targets: [{ format }],
        },
        primitive: {
            topology: "triangle-strip",
        },
    });

    const uniformBuffer = device.createBuffer({
        size: 16,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const bindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
            {
                binding: 0,
                resource: {
                    buffer: uniformBuffer,
                    offset: 0,
                    size: 16,
                },
            },
        ],
    });

    const start = performance.now();

    function render() {
        const time = (performance.now() - start) / 1000;
        device.queue.writeBuffer(uniformBuffer, 0, new Float32Array([time, 0, 0, 0]));

        const encoder = device.createCommandEncoder();
        const view = context.getCurrentTexture().createView();

        const pass = encoder.beginRenderPass({
            colorAttachments: [
                {
                    view,
                    clearValue: { r: 0, g: 0, b: 0, a: 1 },
                    loadOp: "clear",
                    storeOp: "store",
                },
            ],
        });

        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.draw(4, 1, 0, 0);
        pass.end();

        device.queue.submit([encoder.finish()]);
        requestAnimationFrame(render);
    }

    render();
}

initWebGPU().catch((err) => {
    console.error(err);
    alert("ERROR: " + err.message);
});