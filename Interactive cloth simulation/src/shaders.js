export const vsSource = `
attribute vec3 aPosition;
attribute vec3 aNormal;
attribute vec2 aTexCoord;

uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProjection;
uniform bool uIsObject;

varying vec3 vNormal;
varying vec3 vPosition;
varying vec2 vTexCoord;
varying float vIsObject;

void main() {
    vec4 worldPos = uModel * vec4(aPosition, 1.0);
    vPosition = worldPos.xyz;
    vNormal = mat3(uModel) * aNormal;
    vTexCoord = aTexCoord;
    vIsObject = uIsObject ? 1.0 : 0.0;
    gl_Position = uProjection * uView * worldPos;
}
`;

export const fsSource = `
precision mediump float;

varying vec3 vNormal;
varying vec3 vPosition;
varying vec2 vTexCoord;
varying float vIsObject;

uniform vec3 uLightPos;
uniform vec3 uCameraPos;
uniform vec3 uLightColor;
uniform float uLightIntensity;

// Uniforms per le texture (solo per il tessuto)
uniform sampler2D uTexture;
uniform bool uUseTexture;
uniform float uTextureScale;
uniform float uTextureOpacity;

// Uniforms per gli oggetti
uniform vec3 uObjectColor;

void main() {
    vec3 N = normalize(vNormal);
    vec3 L = normalize(uLightPos - vPosition);
    vec3 V = normalize(uCameraPos - vPosition);
    vec3 Rl = reflect(-L, N);

    float diff = max(dot(N, L), 0.0);
    float spec = pow(max(dot(V, Rl), 0.0), 32.0);

    vec3 ambientColor = uLightColor * 0.15;
    vec3 diffuseColor = uLightColor * diff * uLightIntensity;
    vec3 specularColor = uLightColor * spec * 0.3 * uLightIntensity;
    
    if (vIsObject > 0.5) {
        // Rendering degli oggetti geometrici
        vec3 objectBaseColor = uObjectColor;
        vec3 finalColor = ambientColor * objectBaseColor + 
                         diffuseColor * objectBaseColor + 
                         specularColor;
        gl_FragColor = vec4(finalColor, 1.0);
    } else {
        // Rendering del tessuto
        vec3 clothBaseColor = vec3(0.8, 0.85, 0.9); // Colore base del tessuto più visibile
        vec3 baseColor = ambientColor * clothBaseColor + 
                        diffuseColor * clothBaseColor + 
                        specularColor;
        
        if (uUseTexture) {
            vec2 scaledTexCoord = vTexCoord * uTextureScale;
            vec4 textureColor = texture2D(uTexture, scaledTexCoord);
            vec3 finalColor = mix(baseColor, baseColor * textureColor.rgb, uTextureOpacity);
            gl_FragColor = vec4(finalColor, 1.0);
        } else {
            gl_FragColor = vec4(baseColor, 1.0);
        }
    }
}
`;