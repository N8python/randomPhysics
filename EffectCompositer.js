import * as THREE from 'https://cdn.skypack.dev/three@0.142.0';
const EffectCompositer = {
    uniforms: {

        'sceneDiffuse': { value: null },
        'sceneDepth': { value: null },
        'tDiffuse': { value: null },
        'projMat': { value: new THREE.Matrix4() },
        'viewMat': { value: new THREE.Matrix4() },
        'projectionMatrixInv': { value: new THREE.Matrix4() },
        'viewMatrixInv': { value: new THREE.Matrix4() },
        'cameraPos': { value: new THREE.Vector3() },
        'resolution': { value: new THREE.Vector2() },
        'time': { value: 0.0 },
    },
    vertexShader: /* glsl */ `
		varying vec2 vUv;
		void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
		}`,
    fragmentShader: /* glsl */ `
		uniform sampler2D sceneDiffuse;
    uniform sampler2D sceneDepth;
    uniform sampler2D tDiffuse;
    uniform vec2 resolution;
    varying vec2 vUv;
    highp float linearize_depth(highp float d, highp float zNear,highp float zFar)
    {
        highp float z_n = 2.0 * d - 1.0;
        return 2.0 * zNear * zFar / (zFar + zNear - z_n * (zFar - zNear));
    }
    void main() {
        const float directions = 16.0;
        const float quality = 3.0;
        const float pi = 3.14159;
        float size = 0.0;//1000.0 * (1.0 - texture2D(sceneDepth, vUv).x);
        vec2 radius = vec2(size) / resolution;
        vec3 texel = texture2D(tDiffuse, vUv).rgb;//vec3(0.0);
      /* float depth = linearize_depth(texture2D(sceneDepth, vUv).x, 0.1, 1000.0);
        float count = 0.0;
        for(float d =0.0; d < pi * 2.0; d+=(pi * 2.0) / directions) {
            for(float i = 1.0/quality; i<=1.0; i+=1.0/quality) {
                vec2 sampleUv = vUv+vec2(cos(d), sin(d)) * radius * i;
                vec3 occlusion = texture2D(tDiffuse, sampleUv).rgb;
                float depthSample = linearize_depth(texture2D(sceneDepth, sampleUv).x, 0.1, 1000.0);
                float weight = min(5.0 / abs(depth - depthSample), 10.0);
                texel += weight * occlusion;
                count += weight;
            }
        }
        texel /= count;*/
       /*if (vUv.x < 0.5) {
            gl_FragColor = vec4( texture2D(sceneDiffuse, vUv).rgb, 1.0);
        } else if (abs(vUv.x - 0.5) < 1.0 / resolution.x) {
            gl_FragColor = vec4(1.0);
        } else {*/
            gl_FragColor = vec4(texture2D(sceneDiffuse, vUv).rgb * vec3(pow(texel.x, 10.0)), 1.0);
       // }
        //gl_FragColor = vec4((vUv.x < 0.5 ? texture2D(sceneDiffuse, vUv).rgb : vec3(1.0)) * vec3(pow(texel.x, 2.0)), 1.0);
    }
    `

}
export { EffectCompositer };