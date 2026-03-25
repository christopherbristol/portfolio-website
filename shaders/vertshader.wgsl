struct VertexOutput {
    @builtin(position) position : vec4f,
    @location(0) uv : vec2f,
};

@vertex
fn vertex_main(@builtin(vertex_index) i: u32) -> VertexOutput {
    var positions = array<vec2f, 4>(
        vec2f(-1.0, -1.0),
        vec2f( 1.0, -1.0),
        vec2f(-1.0,  1.0),
        vec2f( 1.0,  1.0)
    );

    var uvs = array<vec2f, 4>(
        vec2f(0.0, 0.0),
        vec2f(1.0, 0.0),
        vec2f(0.0, 1.0),
        vec2f(1.0, 1.0)
    );

    var out: VertexOutput;
    out.position = vec4f(positions[i], 0.0, 1.0);
    out.uv = uvs[i];
    return out;
}