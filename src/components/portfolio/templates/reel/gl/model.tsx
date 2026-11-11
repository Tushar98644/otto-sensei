"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";
import {
  AmbientLight,
  CanvasTexture,
  Color,
  DirectionalLight,
  Group,
  type Light,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshDepthMaterial,
  type MeshStandardMaterial,
  type Object3D,
  OrthographicCamera,
  PerspectiveCamera,
  PlaneGeometry,
  SRGBColorSpace,
  Scene,
  ShaderMaterial,
  type Texture,
  Vector3,
  WebGLRenderTarget,
  WebGLRenderer,
} from "three";
import { HorizontalBlurShader } from "three/examples/jsm/shaders/HorizontalBlurShader.js";
import { VerticalBlurShader } from "three/examples/jsm/shaders/VerticalBlurShader.js";
import { coverRect } from "../data";
import { useInViewport } from "../motion";
import { useReel } from "../root";
import { animate, type Controls, SpringValue } from "../spring";
import { cleanRenderer, cleanScene, modelLoader, removeLights, throttle } from "./three";

// Ported from HamishMW/portfolio components/model/model.jsx (MIT, see ../LICENSE.txt).

export type ScreenSource = { kind: "svg"; markup: string };

export type DeviceModel = {
  url: string;
  width: number;
  height: number;
  position: { x: number; y: number; z: number };
  animation: "spring-up" | "laptop-open";
  texture: ScreenSource;
};

const MeshType = { Frame: "Frame", Logo: "Logo", Screen: "Screen" };

const rotationSpringConfig = { stiffness: 40, damping: 20, mass: 1.4, restSpeed: 0.001 };

type ScreenMaterial = MeshStandardMaterial;

export default function Model({
  models,
  show = true,
  showDelay = 0,
  cameraPosition = { x: 0, y: 0, z: 8 },
  className,
  onLoad,
  onFail,
  alt,
}: {
  models: DeviceModel[];
  show?: boolean;
  showDelay?: number;
  cameraPosition?: { x: number; y: number; z: number };
  className?: string;
  onLoad?: () => void;
  onFail: () => void;
  alt: string;
}) {
  const { reduceMotion } = useReel();
  const [loaded, setLoaded] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const camera = useRef<PerspectiveCamera | null>(null);
  const modelGroup = useRef<Group | null>(null);
  const scene = useRef<Scene | null>(null);
  const renderer = useRef<WebGLRenderer | null>(null);
  const shadowGroup = useRef<Group | null>(null);
  const renderTarget = useRef<WebGLRenderTarget | null>(null);
  const renderTargetBlur = useRef<WebGLRenderTarget | null>(null);
  const shadowCamera = useRef<OrthographicCamera | null>(null);
  const depthMaterial = useRef<MeshDepthMaterial | null>(null);
  const horizontalBlurMaterial = useRef<ShaderMaterial | null>(null);
  const verticalBlurMaterial = useRef<ShaderMaterial | null>(null);
  const plane = useRef<Mesh | null>(null);
  const lights = useRef<Light[]>([]);
  const blurPlane = useRef<Mesh | null>(null);
  const fillPlane = useRef<Mesh | null>(null);
  const inViewportOptions = useMemo(() => ({ threshold: 0.2 }), []);
  const isInViewport = useInViewport(container, false, inViewportOptions);
  const [rotationX] = useState(() => new SpringValue(0, rotationSpringConfig));
  const [rotationY] = useState(() => new SpringValue(0, rotationSpringConfig));
  const failRef = useRef(onFail);
  useEffect(() => {
    failRef.current = onFail;
  });

  const blurShadow = useCallback((amount: number) => {
    const blur = blurPlane.current;
    const r = renderer.current;
    if (!blur || !r || !shadowCamera.current) return;
    blur.visible = true;

    blur.material = horizontalBlurMaterial.current!;
    horizontalBlurMaterial.current!.uniforms.tDiffuse!.value = renderTarget.current!.texture;
    horizontalBlurMaterial.current!.uniforms.h!.value = amount * (1 / 256);
    r.setRenderTarget(renderTargetBlur.current);
    r.render(blur, shadowCamera.current);

    blur.material = verticalBlurMaterial.current!;
    verticalBlurMaterial.current!.uniforms.tDiffuse!.value = renderTargetBlur.current!.texture;
    verticalBlurMaterial.current!.uniforms.v!.value = amount * (1 / 256);
    r.setRenderTarget(renderTarget.current);
    r.render(blur, shadowCamera.current);

    blur.visible = false;
  }, []);

  const renderFrame = useCallback(() => {
    const r = renderer.current;
    const s = scene.current;
    if (!r || !s || !camera.current || !modelGroup.current || !shadowCamera.current) return;
    const blurAmount = 5;

    const initialBackground = s.background;
    s.background = null;

    s.overrideMaterial = depthMaterial.current;

    r.setRenderTarget(renderTarget.current);
    r.render(s, shadowCamera.current);

    s.overrideMaterial = null;

    blurShadow(blurAmount);

    blurShadow(blurAmount * 0.4);

    r.setRenderTarget(null);
    s.background = initialBackground;

    modelGroup.current.rotation.x = rotationX.get();
    modelGroup.current.rotation.y = rotationY.get();

    r.render(s, camera.current);
  }, [blurShadow, rotationX, rotationY]);

  useEffect(() => {
    const box = container.current;
    if (!box || !canvas.current) return;
    const { clientWidth, clientHeight } = box;

    try {
      renderer.current = new WebGLRenderer({
        canvas: canvas.current,
        alpha: true,
        antialias: false,
        powerPreference: "high-performance",
        failIfMajorPerformanceCaveat: true,
      });
    } catch {
      failRef.current();
      return;
    }

    renderer.current.setPixelRatio(2);
    renderer.current.setSize(clientWidth, clientHeight);
    renderer.current.outputColorSpace = SRGBColorSpace;

    camera.current = new PerspectiveCamera(36, clientWidth / clientHeight, 0.1, 100);
    camera.current.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z);
    scene.current = new Scene();

    modelGroup.current = new Group();
    scene.current.add(modelGroup.current);

    const ambientLight = new AmbientLight(0xffffff, 1.2);
    const keyLight = new DirectionalLight(0xffffff, 1.1);
    const fillLight = new DirectionalLight(0xffffff, 0.8);

    fillLight.position.set(-6, 2, 2);
    keyLight.position.set(0.5, 0, 0.866);
    lights.current = [ambientLight, keyLight, fillLight];
    for (const light of lights.current) scene.current.add(light);

    shadowGroup.current = new Group();
    scene.current.add(shadowGroup.current);
    shadowGroup.current.position.set(0, 0, -0.8);
    shadowGroup.current.rotateX(Math.PI / 2);

    const renderTargetSize = 512;
    const planeWidth = 8;
    const planeHeight = 8;
    const cameraHeight = 1.5;
    const shadowOpacity = 0.8;
    const shadowDarkness = 3;

    renderTarget.current = new WebGLRenderTarget(renderTargetSize, renderTargetSize);
    renderTarget.current.texture.generateMipmaps = false;

    renderTargetBlur.current = new WebGLRenderTarget(renderTargetSize, renderTargetSize);
    renderTargetBlur.current.texture.generateMipmaps = false;

    const planeGeometry = new PlaneGeometry(planeWidth, planeHeight).rotateX(Math.PI / 2);

    const planeMaterial = new MeshBasicMaterial({
      map: renderTarget.current.texture,
      opacity: shadowOpacity,
      transparent: true,
    });

    plane.current = new Mesh(planeGeometry, planeMaterial);
    // The texture's y is flipped.
    plane.current.scale.y = -1;
    shadowGroup.current.add(plane.current);

    blurPlane.current = new Mesh(planeGeometry);
    blurPlane.current.visible = false;
    shadowGroup.current.add(blurPlane.current);

    const fillMaterial = new MeshBasicMaterial({
      color: 0xffffff,
      opacity: 0,
      transparent: true,
    });

    fillPlane.current = new Mesh(planeGeometry, fillMaterial);
    fillPlane.current.rotateX(Math.PI);
    fillPlane.current.position.y -= 0.00001;
    shadowGroup.current.add(fillPlane.current);

    shadowCamera.current = new OrthographicCamera(
      -planeWidth / 2,
      planeWidth / 2,
      planeHeight / 2,
      -planeHeight / 2,
      0,
      cameraHeight,
    );
    shadowCamera.current.rotation.x = Math.PI / 2;
    shadowGroup.current.add(shadowCamera.current);

    const depth = new MeshDepthMaterial();
    depth.userData.darkness = { value: shadowDarkness };
    depth.onBeforeCompile = (shader) => {
      shader.uniforms.darkness = depth.userData.darkness;
      shader.fragmentShader = `
        uniform float darkness;
        ${shader.fragmentShader.replace(
          "gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );",
          "gl_FragColor = vec4( vec3( 0.0 ), ( 1.0 - fragCoordZ ) * darkness );",
        )}
      `;
    };
    depth.depthTest = false;
    depth.depthWrite = false;
    depthMaterial.current = depth;

    horizontalBlurMaterial.current = new ShaderMaterial(HorizontalBlurShader);
    horizontalBlurMaterial.current.depthTest = false;

    verticalBlurMaterial.current = new ShaderMaterial(VerticalBlurShader);
    verticalBlurMaterial.current.depthTest = false;

    const unsubscribeX = rotationX.on(renderFrame);
    const unsubscribeY = rotationY.on(renderFrame);

    const ownScene = scene.current;
    const ownRenderer = renderer.current;
    const ownTargets = [renderTarget.current, renderTargetBlur.current];
    const ownLights = lights.current;
    return () => {
      for (const target of ownTargets) target.dispose();
      removeLights(ownLights);
      cleanScene(ownScene);
      cleanRenderer(ownRenderer);
      unsubscribeX();
      unsubscribeY();
      renderer.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onMouseMove = throttle((event: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      const position = {
        x: (event.clientX - innerWidth / 2) / innerWidth,
        y: (event.clientY - innerHeight / 2) / innerHeight,
      };
      rotationY.set(position.x / 2);
      rotationX.set(position.y / 2);
    }, 100);
    if (isInViewport && !reduceMotion) window.addEventListener("mousemove", onMouseMove);
    return () => window.removeEventListener("mousemove", onMouseMove);
  }, [isInViewport, reduceMotion, rotationX, rotationY]);

  useEffect(() => {
    const box = container.current;
    if (!box) return;
    const handleResize = () => {
      if (!renderer.current || !camera.current) return;
      const { clientWidth, clientHeight } = box;
      renderer.current.setSize(clientWidth, clientHeight);
      camera.current.aspect = clientWidth / clientHeight;
      camera.current.updateProjectionMatrix();
      renderFrame();
    };
    const observer = new ResizeObserver(handleResize);
    observer.observe(box);
    handleResize();
    return () => observer.disconnect();
  }, [renderFrame]);

  useEffect(
    () => () => {
      rotationX.destroy();
      rotationY.destroy();
    },
    [rotationX, rotationY],
  );

  return (
    <div
      className={["model", className].filter(Boolean).join(" ")}
      data-loaded={loaded}
      style={{ "--delay": `${showDelay}ms` } as CSSProperties}
      ref={container}
      role="img"
      aria-label={alt}
    >
      <canvas className="model-canvas" ref={canvas} />
      {models.map((model, index) => (
        <Device
          key={JSON.stringify(model.position)}
          renderer={renderer}
          modelGroup={modelGroup}
          show={show}
          showDelay={showDelay}
          renderFrame={renderFrame}
          index={index}
          setLoaded={setLoaded}
          onLoad={onLoad}
          onFail={() => failRef.current()}
          model={model}
        />
      ))}
    </div>
  );
}

type Loaded = {
  loadFullResTexture: () => Promise<void>;
  playAnimation: () => Controls | undefined;
};

function Device({
  renderer,
  model,
  modelGroup,
  renderFrame,
  index,
  showDelay,
  setLoaded,
  onLoad,
  onFail,
  show,
}: {
  renderer: RefObject<WebGLRenderer | null>;
  model: DeviceModel;
  modelGroup: RefObject<Group | null>;
  renderFrame: () => void;
  index: number;
  showDelay: number;
  setLoaded: (loaded: boolean) => void;
  onLoad?: () => void;
  onFail: () => void;
  show: boolean;
}) {
  const { reduceMotion } = useReel();

  useEffect(() => {
    if (!show) return;
    let animation: Controls | undefined;
    let cancelled = false;

    const applyScreenTexture = async (texture: Texture, node: Mesh) => {
      const r = renderer.current;
      if (!r) return;
      texture.colorSpace = SRGBColorSpace;
      texture.flipY = false;
      texture.anisotropy = r.capabilities.getMaxAnisotropy();
      texture.generateMipmaps = false;

      r.initTexture(texture);

      const material = node.material as ScreenMaterial;
      material.color = new Color(0xffffff);
      material.transparent = true;
      material.map = texture;
      // three keeps its first compiled program; without this an early screen stays blank.
      material.needsUpdate = true;
    };

    const load = async (): Promise<Loaded> => {
      const { texture, position, url } = model;
      let loadFullResTexture: Loaded["loadFullResTexture"] = async () => {};
      let playAnimation: Loaded["playAnimation"] = () => undefined;

      const [screen, gltf] = await Promise.all([
        screenTextures(texture, model.width, model.height),
        modelLoader().loadAsync(url),
      ]);
      if (cancelled || !modelGroup.current) return { loadFullResTexture, playAnimation };

      modelGroup.current.add(gltf.scene);

      gltf.scene.traverse((object: Object3D) => {
        const node = object as Mesh;
        if (node.material) (node.material as ScreenMaterial).color = new Color(0x1f2025);

        if (node.name === MeshType.Screen) {
          const placeholderScreen = node.clone();
          placeholderScreen.material = (node.material as ScreenMaterial).clone();
          node.parent?.add(placeholderScreen);
          (placeholderScreen.material as ScreenMaterial).opacity = 1;
          placeholderScreen.position.z += 0.001;

          void applyScreenTexture(screen.placeholder, placeholderScreen);

          loadFullResTexture = async () => {
            await applyScreenTexture(screen.full, node);
            animate(1, 0, {
              onUpdate: (value) => {
                (placeholderScreen.material as ScreenMaterial).opacity = value;
                renderFrame();
              },
            });
          };
        }
      });

      const targetPosition = new Vector3(position.x, position.y, position.z);

      if (reduceMotion) gltf.scene.position.set(...targetPosition.toArray());

      if (model.animation === "spring-up") {
        playAnimation = () => {
          const startPosition = new Vector3(
            targetPosition.x,
            targetPosition.y - 1,
            targetPosition.z,
          );
          gltf.scene.position.set(...startPosition.toArray());
          return animate(startPosition.y, targetPosition.y, {
            type: "spring",
            delay: 300 * index + showDelay,
            stiffness: 60,
            damping: 20,
            mass: 1,
            restSpeed: 0.0001,
            restDelta: 0.0001,
            onUpdate: (value) => {
              gltf.scene.position.y = value;
              renderFrame();
            },
          });
        };
      }

      if (model.animation === "laptop-open") {
        playAnimation = () => {
          const frameNode = gltf.scene.children.find((node) => node.name === MeshType.Frame);
          const startRotation = new Vector3(MathUtils.degToRad(90), 0, 0);
          const endRotation = new Vector3(0, 0, 0);
          gltf.scene.position.set(...targetPosition.toArray());
          frameNode?.rotation.set(...startRotation.toArray());
          return animate(startRotation.x, endRotation.x, {
            type: "spring",
            delay: 300 * index + showDelay + 300,
            stiffness: 80,
            damping: 20,
            restSpeed: 0.0001,
            restDelta: 0.0001,
            onUpdate: (value) => {
              if (frameNode) frameNode.rotation.x = value;
              renderFrame();
            },
          });
        };
      }

      return { loadFullResTexture, playAnimation };
    };

    const onModelLoad = async () => {
      try {
        const { loadFullResTexture, playAnimation } = await load();
        if (cancelled) return;
        setLoaded(true);
        onLoad?.();
        if (!reduceMotion) animation = playAnimation();
        await loadFullResTexture();
        if (reduceMotion) renderFrame();
      } catch {
        if (!cancelled) onFail();
      }
    };

    startTransition(() => {
      void onModelLoad();
    });

    return () => {
      cancelled = true;
      animation?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  return null;
}

type ScreenTextures = { full: Texture; placeholder: Texture };

const PLACEHOLDER_SCALE = 1 / 24;

async function screenTextures(
  source: ScreenSource,
  width: number,
  height: number,
): Promise<ScreenTextures> {
  const image = new Image();
  image.decoding = "async";
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source.markup)}`;
  await image.decode();
  const full = drawCover(
    image,
    image.naturalWidth || width,
    image.naturalHeight || height,
    width,
    height,
    1,
  );
  const small = drawCover(
    image,
    image.naturalWidth || width,
    image.naturalHeight || height,
    width,
    height,
    PLACEHOLDER_SCALE,
  );
  // Throws if the browser treats the drawing as tainted, before anything reaches the GPU.
  full.getContext("2d")?.getImageData(0, 0, 1, 1);
  return { full: new CanvasTexture(full), placeholder: new CanvasTexture(small) };
}

function drawCover(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  width: number,
  height: number,
  scale: number,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext("2d");
  if (context) {
    const crop = coverRect(sourceWidth, sourceHeight, width, height);
    context.imageSmoothingQuality = "high";
    context.drawImage(
      source,
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      0,
      0,
      canvas.width,
      canvas.height,
    );
  }
  return canvas;
}
