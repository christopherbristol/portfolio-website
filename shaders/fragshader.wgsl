struct FragmentInput {
    @location(0) uv: vec2f,
};

struct TimeUniform {
    time: f32,
    pad1: f32,
    pad2: f32,
    pad3: f32,
};

@group(0) @binding(0)
var<uniform> uTime: TimeUniform;

@fragment
fn fragment_main(input: FragmentInput) -> @location(0) vec4f {
    let uv = input.uv * 2.0 - 1.0;
    let len = pow(length(uv), 1.5);

    let t = uTime.time;

    let wave1 = sin(uv.x * 8.0 + t * 0.8) * 0.15;
    let wave2 = cos(uv.y * 6.0 + t * 1.1) * 0.15;
    let wave3 = sin((uv.x + uv.y) * 4.0 + t * 0.5) * 0.08;

    let combinedWave = wave1 + wave2 + wave3;

    let baseColor1 = vec3f(0.02, 0.05, 0.15);
    let baseColor2 = vec3f(0.0, 0.15, 0.35);
    let accentColor = vec3f(0.2, 0.6, 1.0);

    let blend = clamp(len * 0.6 + combinedWave, 0.0, 1.0);
    let gradient = mix(baseColor1, baseColor2, blend);

    let density = 40.0;
    let speed = 1.5;

    let px = fract(uv.x * density + t * speed);
    let py = fract(uv.y * density + t * speed * 0.7);

    let particle = step(0.97, px) * step(0.97, py);
    let glow = smoothstep(0.95, 1.0, px) * smoothstep(0.95, 1.0, py);

    let color = gradient + accentColor * glow * 0.6;

    let pulse = sin(t * 0.6) * 0.1 + 0.9;

    return vec4f(color * pulse, 1.0);
}