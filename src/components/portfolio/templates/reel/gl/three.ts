import {
  Cache,
  type Group,
  type Light,
  type Material,
  type Mesh,
  type Object3D,
  type Texture,
  type WebGLRenderer,
} from "three";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { type GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { REEL_ASSETS } from "./paths";

// Ported from HamishMW/portfolio utils/three.js (MIT, see ../LICENSE.txt).

Cache.enabled = true;

const decoded = new Map<string, Promise<GLTF>>();
let draco: DRACOLoader | null = null;
let decoding = 0;

function decode(url: string): Promise<GLTF> {
  draco ??= new DRACOLoader().setDecoderPath(`${REEL_ASSETS}/draco/`);
  decoding += 1;
  return new GLTFLoader()
    .setDRACOLoader(draco)
    .loadAsync(url)
    .finally(() => {
      decoding -= 1;
      // Each file decodes once, so idle decoder workers only hold memory; a later file starts new ones.
      if (decoding > 0) return;
      draco?.dispose();
      draco = null;
    });
}

// Devices share the decoded geometry, but each gets its own materials, for its own screen texture.
function ownCopy(source: Group): Group {
  const copy = source.clone();
  const materials = new Map<Material, Material>();
  const own = (material: Material) => {
    let clone = materials.get(material);
    if (!clone) {
      clone = material.clone();
      materials.set(material, clone);
    }
    return clone;
  };
  copy.traverse((object) => {
    const mesh = object as Mesh;
    if (!mesh.isMesh) return;
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(own) : own(mesh.material);
  });
  return copy;
}

export function loadModel(url: string): Promise<Group> {
  let gltf = decoded.get(url);
  if (!gltf) {
    const pending = decode(url);
    decoded.set(url, pending);
    pending.catch(() => {
      if (decoded.get(url) === pending) decoded.delete(url);
    });
    gltf = pending;
  }
  return gltf.then(({ scene }) => ownCopy(scene));
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
      texture.source?.data?.close?.();
    }
  }
}

export function cleanRenderer(renderer: WebGLRenderer | undefined) {
  if (!renderer) return;
  renderer.dispose();
  // Strict Mode re-runs effects on the same attached canvas, so only a removed one gives its context back.
  if (!renderer.domElement.isConnected && !renderer.getContext().isContextLost())
    renderer.forceContextLoss();
}

// The still frame takes over when the browser drops a context, as it does past its limit of live ones.
export function onContextLost(canvas: HTMLCanvasElement, fail: () => void): () => void {
  canvas.addEventListener("webglcontextlost", fail);
  return () => canvas.removeEventListener("webglcontextlost", fail);
}

export function removeLights(lights: Light[] | undefined) {
  for (const light of lights ?? []) light.parent?.remove(light);
}

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
