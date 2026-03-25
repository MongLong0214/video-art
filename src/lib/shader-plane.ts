import * as THREE from "three";

/**
 * Creates a fullscreen quad with a ShaderMaterial.
 * Standard setup for fragment shader art.
 */
export const createShaderPlane = (
  vertexShader: string,
  fragmentShader: string,
  uniforms: Record<string, THREE.IUniform> = {},
) => {
  const geometry = new THREE.PlaneGeometry(2, 2);

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(1920, 1080) },
      uMouse: { value: new THREE.Vector2(0, 0) },
      ...uniforms,
    },
    depthWrite: false,
    depthTest: false,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;

  return { mesh, material, geometry };
};
