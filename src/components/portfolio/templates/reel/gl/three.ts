import {
  Cache,
  type Light,
  type Material,
  type Object3D,
  type Texture,
  type WebGLRenderer,
} from "three";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { REEL_ASSETS } from "./paths";

// HamishMW/portfolio's utils/three.js. three-stdlib's loaders are three's own examples, so they
// come from three here. The device models and the Draco decoder (three's, copied) are served
// from public/portfolio-templates/reel/.

Cache.enabled = true;

let gltfLoader: GLTFLoader | null = null;

/** GLTF model loader configured with the Draco decoder, made on first use. */
export function modelLoader(): GLTFLoader {
  if (gltfLoader) return gltfLoader;
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath(`${REEL_ASSETS}/draco/`);
  gltfLoader = new GLTFLoader();
  gltfLoader.setDRACOLoader(dracoLoader);
  return gltfLoader;
}

export function cleanScene(scene: Object3D | undefined) {
  scene?.traverse((object) => {
    const mesh = object as Object3D & { isMesh?: boolean; geometry?: { dispose(): void } };
    if (!mesh.isMesh) return;
    mesh.geometry?.dispose();
    const material = (object as unknown as { material: Material | Material[] }).material;
    for (const item of Array.isArray(material) ? material : [material]) cleanMaterial(item);
  });
}

export function cleanMaterial(material: Material) {
  material.dispose();
  for (const value of Object.values(material)) {
    if (value && typeof value === "object" && "minFilter" in value) {
      const texture = value as Texture & { source?: { data?: { close?: () => void } } };
      texture.dispose();
      // Close GLTF bitmap textures
      texture.source?.data?.close?.();
    }
  }
}

export function cleanRenderer(renderer: WebGLRenderer | undefined) {
  renderer?.dispose();
}

export function removeLights(lights: Light[] | undefined) {
  for (const light of lights ?? []) light.parent?.remove(light);
}

/** utils/throttle: calls `fn` at most once per `ms` and drops the calls in between. */
export function throttle<A extends unknown[]>(fn: (...args: A) => void, ms: number) {
  let last = 0;
  return (...args: A) => {
    const now = Date.now();
    if (now - last >= ms) {
      fn(...args);
      last = now;
    }
  };
}
