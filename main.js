async function initWebGPU() {
    const canvas = document.getElementById('webgpu-canvas');

    if (!navigator.gpu) {
        console.warn('WebGPU not supported, falling back to canvas animation');
        fallbackAnimation();
        return;
    }

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
        console.warn('No GPU adapter found');
        fallbackAnimation();
        return;
    }

    const device = await adapter.requestDevice();
    const context = canvas.getContext('webgpu');
    const format = navigator.gpu.getPreferredCanvasFormat();

    context.configure({
        device,
        format,
        alphaMode: 'premultiplied'
    });

    function resizeCanvas() {
        canvas.width = canvas.clientWidth * window.devicePixelRatio;
        canvas.height = canvas.clientHeight * window.devicePixelRatio;
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const vertexShader = device.createShaderModule({
        label: 'Vertex Shader Code',
        code: `
            struct VertexOutput {
                @builtin(position) position : vec4f,
                @location(0) color : vec4f,
                @location(1) uv : vec2f
            };

            @vertex
            fn vertex_main(@builtin(vertex_index) vertexIndex : u32) -> VertexOutput {
                var positions = array<vec2<f32>, 4>(
                    vec2<f32>(-1.0, -1.0),
                    vec2<f32>(1.0, -1.0),
                    vec2<f32>(-1.0, 1.0),
                    vec2<f32>(1.0, 1.0)
                );

                var uvs = array<vec2<f32>, 4>(
                    vec2<f32>(0.0, 0.0),
                    vec2<f32>(1.0, 0.0),
                    vec2<f32>(0.0, 1.0),
                    vec2<f32>(1.0, 1.0)
                );

                var output : VertexOutput;
                output.position = vec4<f32>(positions[vertexIndex], 0.0, 1.0);
                output.uv = uvs[vertexIndex];
                output.color = vec4<f32>(0.1, 0.2, 0.4, 1.0);
                return output;
            }
        `
    });

    const fragmentShader = device.createShaderModule({
        code: `
            struct FragmentInput {
                @location(0) color : vec4<f32>,
                @location(1) uv : vec2<f32>
            };

            @group(0) @binding(0) var<uniform> time : f32;

            @fragment
            fn fragment_main(input : FragmentInput) -> @location(0) vec4<f32> {
                let uv = input.uv * 2.0 - 1.0;
                let len = length(uv);

                let timeFactor = time * 0.5;
                let wave1 = sin(uv.x * 10.0 + timeFactor) * 0.1;
                let wave2 = cos(uv.y * 8.0 + timeFactor * 1.3) * 0.1;
                let wave3 = sin((uv.x + uv.y) * 5.0 + timeFactor * 0.7) * 0.05;

                let combinedWave = wave1 + wave2 + wave3;

                let baseColor1 = vec3<f32>(0.1, 0.2, 0.4);
                let baseColor2 = vec3<f32>(0.0, 0.1, 0.3);
                let accentColor = vec3<f32>(0.3, 0.6, 1.0);

                let gradient = mix(baseColor1, baseColor2, len * 0.5 + combinedWave);

                let particleSpeed = 2.0;
                let particleDensity = 50.0;

                let particleX = fract(uv.x * particleDensity + time * particleSpeed);
                let particleY = fract(uv.y * particleDensity + time * particleSpeed * 0.7);

                let particle = step(0.95, particleX) * step(0.95, particleY);
                let particleColor = mix(gradient, accentColor, particle * 0.7);

                let pulse = sin(time * 0.5) * 0.1 + 0.9;

                return vec4<f32>(particleColor * pulse, 0.7);
            }
        `
    });

    const pipeline = device.createRenderPipeline({
        layout: 'auto',
        vertex: {
            module: vertexShader,
            entryPoint: 'vertex_main'
        },
        fragment: {
            module: fragmentShader,
            entryPoint: 'fragment_main',
            targets: [{
                format,
                blend: {
                    color: {
                        srcFactor: 'src-alpha',
                        dstFactor: 'one-minus-src-alpha',
                        operation: 'add'
                    },
                    alpha: {
                        srcFactor: 'one',
                        dstFactor: 'one-minus-src-alpha',
                        operation: 'add'
                    }
                }
            }]
        },
        primitive: {
            topology: 'triangle-strip'
        }
    });

    const uniformBufferSize = 4;
    const uniformBuffer = device.createBuffer({
        size: uniformBufferSize,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    const uniformBindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [{
            binding: 0,
            resource: {
                buffer: uniformBuffer,
                offset: 0,
                size: uniformBufferSize
            }
        }]
    });

    const startTime = Date.now();

    function render() {
        const currentTime = Date.now();
        const time = (currentTime - startTime) / 1000;

        device.queue.writeBuffer(uniformBuffer, 0, new Float32Array([time]));

        const commandEncoder = device.createCommandEncoder();
        const textureView = context.getCurrentTexture().createView();

        const renderPassDescriptor = {
            colorAttachments: [{
                view: textureView,
                clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
                loadOp: 'clear',
                storeOp: 'store'
            }]
        };

        const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
        passEncoder.setPipeline(pipeline);
        passEncoder.setBindGroup(0, uniformBindGroup);
        passEncoder.draw(4, 1, 0, 0);
        passEncoder.end();

        device.queue.submit([commandEncoder.finish()]);
        requestAnimationFrame(render);
    }

    render();
}

function fallbackAnimation() {
    const canvas = document.getElementById('webgpu-canvas');
    const ctx = canvas.getContext('2d');

    function resizeCanvas() {
        canvas.width = canvas.clientWidth * window.devicePixelRatio;
        canvas.height = canvas.clientHeight * window.devicePixelRatio;
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    let time = 0;
    const particles = [];

    for (let i = 0; i < 150; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 3 + 1,
            speedX: Math.random() * 2 - 1,
            speedY: Math.random() * 2 - 1,
            color: `rgba(${Math.floor(Math.random() * 100 + 100)}, ${Math.floor(Math.random() * 150 + 100)}, ${Math.floor(Math.random() * 255)}, ${Math.random() * 0.5 + 0.3})`
        });
    }

    function render() {
        time += 0.01;

        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, 'rgba(10, 20, 40, 0.8)');
        gradient.addColorStop(1, 'rgba(5, 10, 25, 0.9)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const waveAmplitude = 30;
        const waveFrequency = 0.01;

        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);

        for (let x = 0; x < canvas.width; x++) {
            const y = canvas.height / 2 +
                Math.sin(x * waveFrequency + time) * waveAmplitude *
                Math.sin(time * 0.5) +
                Math.sin(x * waveFrequency * 0.7 + time * 1.3) * waveAmplitude * 0.5;

            ctx.lineTo(x, y);
        }

        ctx.strokeStyle = `rgba(64, 156, 255, ${0.1 + Math.sin(time) * 0.05})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        particles.forEach((particle) => {
            particle.x += particle.speedX;
            particle.y += particle.speedY;

            if (particle.x > canvas.width) particle.x = 0;
            if (particle.x < 0) particle.x = canvas.width;
            if (particle.y > canvas.height) particle.y = 0;
            if (particle.y < 0) particle.y = canvas.height;

            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fillStyle = particle.color;
            ctx.fill();

            particles.forEach((otherParticle) => {
                const dx = particle.x - otherParticle.x;
                const dy = particle.y - otherParticle.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < 100) {
                    ctx.beginPath();
                    ctx.moveTo(particle.x, particle.y);
                    ctx.lineTo(otherParticle.x, otherParticle.y);
                    ctx.strokeStyle = `rgba(100, 150, 255, ${0.2 * (1 - distance / 100)})`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            });
        });

        requestAnimationFrame(render);
    }

    render();
}

initWebGPU();