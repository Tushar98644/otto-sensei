"use client";

import { useEffect, useRef, useState } from "react";
import {
  AmbientLight,
  DirectionalLight,
  LinearSRGBColorSpace,
  Mesh,
  MeshPhongMaterial,
  PerspectiveCamera,
  Scene,
  SphereGeometry,
  UniformsUtils,
  type IUniform,
  type Light,
  WebGLRenderer,
} from "three";
import { Transition, useInViewport } from "../motion";
import { useReel } from "../root";
import { SpringValue } from "../spring";
import { fragmentShader, vertexShader } from "./sphere-shaders";
import { cleanRenderer, cleanScene, removeLights, throttle } from "./three";

// HamishMW/portfolio routes/home/displacement-sphere.jsx, line for line, except it sizes to the
// page's box (useReel().size) to fit the preview. Lazy, so three.js loads only where this draws.

const springConfig = { stiffness: 30, damping: 20, mass: 2 };

const MOBILE = 696;
const TABLET = 1040;

type CompiledShader = {
  uniforms: Record<string, IUniform>;
  vertexShader: string;
  fragmentShader: string;
};

export default function DisplacementSphere({ onFail }: { onFail: () => void }) {
  const { theme, size, reduceMotion } = useReel();
  const start = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderer = useRef<WebGLRenderer | null>(null);
  const camera = useRef<PerspectiveCamera | null>(null);
  const scene = useRef<Scene | null>(null);
  const lights = useRef<Light[]>([]);
  const uniforms = useRef<Record<string, IUniform> | null>(null);
  const sphere = useRef<Mesh | null>(null);
  const isInViewport = useInViewport(canvasRef);
  const [rotationX] = useState(() => new SpringValue(0, springConfig));
  const [rotationY] = useState(() => new SpringValue(0, springConfig));
  const failRef = useRef(onFail);
  useEffect(() => {
    failRef.current = onFail;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    start.current = Date.now();
    try {
      renderer.current = new WebGLRenderer({
        canvas,
        antialias: false,
        alpha: true,
        powerPreference: "high-performance",
        failIfMajorPerformanceCaveat: true,
      });
    } catch {
      // No hardware WebGL: the page keeps the still frame.
      failRef.current();
      return;
    }
    const { width, height } = size;
    renderer.current.setSize(width, height);
    renderer.current.setPixelRatio(1);
    renderer.current.outputColorSpace = LinearSRGBColorSpace;

    camera.current = new PerspectiveCamera(54, width / height, 0.1, 100);
    camera.current.position.z = 52;

    scene.current = new Scene();

    const material = new MeshPhongMaterial();
    material.onBeforeCompile = (shader: CompiledShader) => {
      uniforms.current = UniformsUtils.merge([shader.uniforms, { time: { value: 0 } }]);
      shader.uniforms = uniforms.current;
      shader.vertexShader = vertexShader;
      shader.fragmentShader = fragmentShader;
    };

    const geometry = new SphereGeometry(32, 128, 128);
    sphere.current = new Mesh(geometry, material);
    sphere.current.position.z = 0;
    scene.current.add(sphere.current);

    const ownScene = scene.current;
    const ownRenderer = renderer.current;
    return () => {
      cleanScene(ownScene);
      cleanRenderer(ownRenderer);
      renderer.current = null;
    };
    // Built once per mount, like the original; resizes are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!scene.current) return;
    const dirLight = new DirectionalLight(0xffffff, theme === "light" ? 1.8 : 2.0);
    const ambientLight = new AmbientLight(0xffffff, theme === "light" ? 2.7 : 0.4);
    dirLight.position.z = 200;
    dirLight.position.x = 100;
    dirLight.position.y = 100;
    lights.current = [dirLight, ambientLight];
    for (const light of lights.current) scene.current.add(light);
    return () => removeLights(lights.current);
  }, [theme]);

  useEffect(() => {
    if (!renderer.current || !camera.current || !scene.current || !sphere.current) return;
    const { width, height } = size;
    const adjustedHeight = height + height * 0.3;
    renderer.current.setSize(width, adjustedHeight);
    camera.current.aspect = width / adjustedHeight;
    camera.current.updateProjectionMatrix();

    // Render a single frame on resize when not animating
    if (reduceMotion) renderer.current.render(scene.current, camera.current);

    if (width <= MOBILE) {
      sphere.current.position.x = 14;
      sphere.current.position.y = 10;
    } else if (width <= TABLET) {
      sphere.current.position.x = 18;
      sphere.current.position.y = 14;
    } else {
      sphere.current.position.x = 22;
      sphere.current.position.y = 16;
    }
  }, [reduceMotion, size]);

  useEffect(() => {
    const onMouseMove = throttle((event: MouseEvent) => {
      const position = {
        x: event.clientX / window.innerWidth,
        y: event.clientY / window.innerHeight,
      };
      rotationX.set(position.y / 2);
      rotationY.set(position.x / 2);
    }, 100);
    if (!reduceMotion && isInViewport) window.addEventListener("mousemove", onMouseMove);
    return () => window.removeEventListener("mousemove", onMouseMove);
  }, [isInViewport, reduceMotion, rotationX, rotationY]);

  useEffect(() => {
    let animation = 0;
    const animate = () => {
      animation = requestAnimationFrame(animate);
      if (!renderer.current || !scene.current || !camera.current || !sphere.current) return;
      if (uniforms.current) uniforms.current.time!.value = 0.00005 * (Date.now() - start.current);
      sphere.current.rotation.z += 0.001;
      sphere.current.rotation.x = rotationX.get();
      sphere.current.rotation.y = rotationY.get();
      renderer.current.render(scene.current, camera.current);
    };
    if (!reduceMotion && isInViewport) {
      animate();
    } else if (renderer.current && scene.current && camera.current) {
      renderer.current.render(scene.current, camera.current);
    }
    return () => cancelAnimationFrame(animation);
  }, [isInViewport, reduceMotion, rotationX, rotationY]);

  useEffect(
    () => () => {
      rotationX.destroy();
      rotationY.destroy();
    },
    [rotationX, rotationY],
  );

  return (
    <Transition in timeout={3000}>
      {({ visible }) => (
        <canvas aria-hidden className="sphere-canvas" data-visible={visible} ref={canvasRef} />
      )}
    </Transition>
  );
}
