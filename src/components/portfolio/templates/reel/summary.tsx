"use client";

import {
  Fragment,
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from "react";
import { indexText, type Device } from "./data";
import type { DeviceModel, ScreenSource } from "./gl/model";
import { REEL_ASSETS } from "./gl/paths";
import { Transition, useSectionVisible } from "./motion";
import { useReel } from "./root";
import { DrawnScreen, type DrawnContent } from "./screen";
import { KATAKANA_PROJECT } from "./sprites";
import { Button, Divider, Loader } from "./ui";

// Ported from HamishMW/portfolio routes/home/project-summary.jsx (MIT, see ./LICENSE.txt).

const Model = lazy(() => import("./gl/model"));

const TEXTURE = { laptop: { width: 1920, height: 1200 }, phone: { width: 750, height: 1624 } };

export function ProjectSummary({
  id,
  index,
  title,
  description,
  button,
  alternate,
  device,
  drawn,
  alt,
  loading,
}: {
  id: string;
  index: number;
  title: string;
  description: string;
  button: { href: string; label: string } | null;
  alternate: boolean;
  device: Device;
  drawn: DrawnContent;
  alt: string;
  loading: string;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const sectionVisible = useSectionVisible(sectionRef);
  const [focused, setFocused] = useState(false);
  const titleId = `${id}-title`;

  const renderDetails = (visible: boolean) => (
    <div className="summary-details">
      <div aria-hidden className="summary-index">
        <Divider notchWidth="64px" notchHeight="8px" collapsed={!visible} collapseDelay={1000} />
        <span className="summary-index-number" data-visible={visible}>
          {indexText(index)}
        </span>
      </div>
      <h2 className="heading summary-title" data-level="3" data-visible={visible} id={titleId}>
        {title}
      </h2>
      {description ? (
        <p className="text summary-description" data-size="m" data-visible={visible}>
          {description}
        </p>
      ) : null}
      {button ? (
        <div className="summary-button" data-visible={visible}>
          <Button iconHoverShift href={button.href} iconEnd="arrow-right">
            {button.label}
          </Button>
        </div>
      ) : null}
    </div>
  );

  const renderPreview = (visible: boolean) => (
    <Preview
      device={device}
      visible={visible}
      drawn={drawn}
      alt={alt}
      idBase={id}
      loading={loading}
    />
  );

  return (
    <section
      className="summary section"
      data-alternate={alternate}
      data-first={index === 1}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      aria-labelledby={titleId}
      ref={sectionRef}
      id={id}
      tabIndex={-1}
    >
      <div className="summary-content">
        <Transition in={sectionVisible || focused}>
          {({ visible }) =>
            alternate ? (
              <>
                {renderPreview(visible)}
                {renderDetails(visible)}
              </>
            ) : (
              <>
                {renderDetails(visible)}
                {renderPreview(visible)}
              </>
            )
          }
        </Transition>
      </div>
    </section>
  );
}

function Preview({
  device,
  visible,
  drawn,
  alt,
  idBase,
  loading,
}: {
  device: Device;
  visible: boolean;
  drawn: DrawnContent;
  alt: string;
  idBase: string;
  loading: string;
}) {
  const { theme, mode, reduceMotion } = useReel();
  const [modelLoaded, setModelLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [models, setModels] = useState<DeviceModel[] | null>(null);
  const stillRef = useRef<HTMLDivElement>(null);
  const live = mode === "live" && !failed;
  const still = mode === "lite" || mode === "still" || failed;
  const ready = modelLoaded || still;
  const svgOpacity = theme === "light" ? "70%" : "100%";
  const showDelay = device === "laptop" ? 700 : 300;

  useEffect(() => {
    if (!live || !visible || models) return;
    const sources = [...(stillRef.current?.querySelectorAll("svg.drawn-screen") ?? [])].map(
      (node): ScreenSource => ({
        kind: "svg",
        markup: new XMLSerializer().serializeToString(node),
      }),
    );
    const blank: ScreenSource = { kind: "svg", markup: "" };
    setModels(
      device === "laptop"
        ? [
            {
              url: `${REEL_ASSETS}/macbook-pro.glb`,
              ...TEXTURE.laptop,
              position: { x: 0, y: 0, z: 0 },
              animation: "laptop-open",
              texture: sources[0] ?? blank,
            },
          ]
        : [
            {
              url: `${REEL_ASSETS}/iphone-11.glb`,
              ...TEXTURE.phone,
              position: { x: -0.6, y: 1.1, z: 0 },
              animation: "spring-up",
              texture: sources[0] ?? blank,
            },
            {
              url: `${REEL_ASSETS}/iphone-11.glb`,
              ...TEXTURE.phone,
              position: { x: 0.6, y: -0.5, z: 0.3 },
              animation: "spring-up",
              texture: sources[1] ?? blank,
            },
          ],
    );
  }, [live, visible, models, device]);

  return (
    <div className="summary-preview">
      <svg
        data-visible={visible && ready}
        data-light={theme === "light"}
        style={{ "--opacity": svgOpacity } as CSSProperties}
        className="summary-svg"
        data-device={device}
        viewBox="0 0 751 136"
        aria-hidden
      >
        <use href={`#${KATAKANA_PROJECT}`} />
      </svg>
      <div className="summary-model" data-device={device} data-failed={failed}>
        {!modelLoaded && !still ? (
          <Loader
            center
            className="summary-loader"
            data-visible={visible}
            reduceMotion={reduceMotion}
            label={loading}
          />
        ) : null}
        {live && visible && models ? (
          <Suspense>
            <Model
              alt={alt}
              cameraPosition={{ x: 0, y: 0, z: device === "laptop" ? 8 : 11.5 }}
              showDelay={showDelay}
              onLoad={() => setModelLoaded(true)}
              onFail={() => setFailed(true)}
              show={visible}
              models={models}
            />
          </Suspense>
        ) : null}
        <DeviceStill
          ref={stillRef}
          device={device}
          visible={visible && still}
          delay={showDelay}
          alt={alt}
        >
          {(device === "laptop" ? [0] : [0, 1]).map((index) => (
            <DrawnScreen
              key={index}
              device={device}
              content={drawn}
              id={`${idBase}-screen-${index}`}
              variant={device === "phone" && index === 0 ? 1 : 0}
            />
          ))}
        </DeviceStill>
      </div>
    </div>
  );
}

function DeviceStill({
  ref,
  device,
  visible,
  delay,
  alt,
  children,
}: {
  ref: Ref<HTMLDivElement>;
  device: Device;
  visible: boolean;
  delay: number;
  alt: string;
  children: ReactNode[];
}) {
  const layers = device === "laptop" ? ["laptop"] : ["phone-back", "phone-front"];
  return (
    <div
      ref={ref}
      className="still"
      data-visible={visible}
      style={{ "--delay": `${delay}ms` } as CSSProperties}
      role="img"
      aria-label={alt}
    >
      {layers.map((layer, index) => (
        <Fragment key={layer}>
          <div className="still-screen" data-device={layer}>
            {children[index]}
          </div>
          <div className="still-frame" data-device={layer} />
        </Fragment>
      ))}
    </div>
  );
}
