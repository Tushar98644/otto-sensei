import { BufferGeometry, Group, Mesh, MeshStandardMaterial, type WebGLRenderer } from "three";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanRenderer, loadModel, onContextLost } from "./three";

const loaders = vi.hoisted(() => ({ loadAsync: vi.fn(), dispose: vi.fn(), decoders: 0 }));

vi.mock("three/examples/jsm/loaders/DRACOLoader.js", () => ({
  DRACOLoader: class {
    constructor() {
      loaders.decoders += 1;
    }
    setDecoderPath() {
      return this;
    }
    dispose() {
      loaders.dispose();
      return this;
    }
  },
}));

vi.mock("three/examples/jsm/loaders/GLTFLoader.js", () => ({
  GLTFLoader: class {
    setDRACOLoader() {
      return this;
    }
    loadAsync(url: string) {
      return loaders.loadAsync(url);
    }
  },
}));

function mesh(name: string, material: MeshStandardMaterial) {
  const node = new Mesh(new BufferGeometry(), material);
  node.name = name;
  return node;
}

// A device as its GLB has it: one material shared by two parts, the screen with its own.
function phone() {
  const frame = new MeshStandardMaterial({ name: "Frame" });
  const scene = new Group();
  scene.add(
    mesh("Frame", frame),
    mesh("Logo", frame),
    mesh("Screen", new MeshStandardMaterial({ name: "Screen" })),
  );
  return { scene };
}

const part = (scene: Group, name: string) => scene.getObjectByName(name) as Mesh;

describe("loadModel", () => {
  beforeEach(() => {
    loaders.loadAsync.mockReset();
    loaders.dispose.mockReset();
  });

  it("decodes a file once and gives each device its own copy, with its own materials", async () => {
    const source = phone();
    loaders.loadAsync.mockResolvedValueOnce(source);
    const [back, front] = await Promise.all([loadModel("/one.glb"), loadModel("/one.glb")]);
    const later = await loadModel("/one.glb");
    expect(loaders.loadAsync).toHaveBeenCalledTimes(1);
    expect(back).not.toBe(front);
    expect(later).not.toBe(source.scene);
    expect(part(back, "Screen").material).not.toBe(part(front, "Screen").material);
    expect(part(back, "Screen").material).not.toBe(part(source.scene, "Screen").material);
    expect(part(back, "Screen").geometry).toBe(part(front, "Screen").geometry);
    expect(part(back, "Frame").material).toBe(part(back, "Logo").material);
    expect(part(back, "Frame").material).not.toBe(part(front, "Frame").material);
  });

  it("lets the decoder's workers go once no file is decoding, and starts new ones for the next", async () => {
    let finish: (value: ReturnType<typeof phone>) => void = () => {};
    loaders.loadAsync.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    loaders.loadAsync.mockResolvedValueOnce(phone());
    const decoders = loaders.decoders;
    const laptop = loadModel("/laptop.glb");
    await loadModel("/phone.glb");
    expect(loaders.dispose).not.toHaveBeenCalled();
    finish(phone());
    await laptop;
    expect(loaders.dispose).toHaveBeenCalledTimes(1);
    expect(loaders.decoders - decoders).toBe(1);

    loaders.loadAsync.mockResolvedValueOnce(phone());
    await loadModel("/watch.glb");
    expect(loaders.decoders - decoders).toBe(2);
    expect(loaders.dispose).toHaveBeenCalledTimes(2);
  });

  it("tries the download again after a failure", async () => {
    loaders.loadAsync.mockRejectedValueOnce(new Error("offline"));
    await expect(loadModel("/flaky.glb")).rejects.toThrow("offline");
    loaders.loadAsync.mockResolvedValueOnce(phone());
    await expect(loadModel("/flaky.glb")).resolves.toBeInstanceOf(Group);
    expect(loaders.loadAsync).toHaveBeenCalledTimes(2);
  });
});

function fakeRenderer({ connected, lost }: { connected: boolean; lost: boolean }) {
  const renderer = {
    domElement: { isConnected: connected },
    getContext: () => ({ isContextLost: () => lost }),
    dispose: vi.fn(),
    forceContextLoss: vi.fn(),
  };
  return { renderer, three: renderer as unknown as WebGLRenderer };
}

describe("cleanRenderer", () => {
  it("gives a removed canvas's context back at once, not at garbage collection", () => {
    const { renderer, three } = fakeRenderer({ connected: false, lost: false });
    cleanRenderer(three);
    expect(renderer.dispose).toHaveBeenCalledTimes(1);
    expect(renderer.forceContextLoss).toHaveBeenCalledTimes(1);
  });

  it("keeps the context of a canvas still on the page, which a Strict Mode re-run reuses", () => {
    const { renderer, three } = fakeRenderer({ connected: true, lost: false });
    cleanRenderer(three);
    expect(renderer.dispose).toHaveBeenCalledTimes(1);
    expect(renderer.forceContextLoss).not.toHaveBeenCalled();
  });

  it("leaves a context the browser already dropped alone", () => {
    const { renderer, three } = fakeRenderer({ connected: false, lost: true });
    cleanRenderer(three);
    expect(renderer.forceContextLoss).not.toHaveBeenCalled();
    expect(() => cleanRenderer(undefined)).not.toThrow();
  });
});

describe("onContextLost", () => {
  it("hands over to the still frame when the context is lost, until it stops watching", () => {
    const canvas = new EventTarget() as unknown as HTMLCanvasElement;
    const fail = vi.fn();
    const stop = onContextLost(canvas, fail);
    canvas.dispatchEvent(new Event("webglcontextlost"));
    expect(fail).toHaveBeenCalledTimes(1);
    stop();
    canvas.dispatchEvent(new Event("webglcontextlost"));
    expect(fail).toHaveBeenCalledTimes(1);
  });
});
