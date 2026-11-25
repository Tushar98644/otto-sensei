"use client";

import { skipToken, useQuery } from "@tanstack/react-query";
import { LocateFixed } from "lucide-react";
import maplibregl, { type GeoJSONSource, type MapLayerMouseEvent } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { errorMessage } from "@/components/account/errors";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useFormat, useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import { api } from "@/lib/api/client";
import type { JobMatchesRequestBody } from "@/lib/api/types";
import type { MapPin } from "@/lib/job-feed/types";
import { useAppQueryClient } from "@/lib/queries/client";
import { locate } from "./geolocate";
import { useRegionName } from "./near-filter";
import { cityLabel } from "./view";

// OpenFreeMap: free vector tiles with no key (docs/third-party-notices.md, "Map").
const STYLE_URL = "https://tiles.openfreemap.org/styles/positron";
const PRIMARY = "#0e3b2e";
const PASS = "#1e7b46";
const SURFACE = "#ffffff";
const LISTED = 12;
const MAP_STALE_MS = 5 * 60_000;

type JobsMapProps = {
  userId: string;
  body: Omit<JobMatchesRequestBody, "view" | "page"> | null;
  onCompany: (name: string) => void;
};

type PinProps = { name: string; roles: number; hiring: boolean; place: string };

function featuresOf(pins: readonly MapPin[], place: (pin: MapPin) => string) {
  return {
    type: "FeatureCollection" as const,
    features: pins.map((pin) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [pin.lng, pin.lat] },
      properties: { name: pin.name, roles: pin.roles, hiring: pin.hiring, place: place(pin) },
    })),
  };
}

export default function JobsMap({ userId, body, onCompany }: JobsMapProps) {
  const t = useMessages("jobs");
  const format = useFormat();
  const regionName = useRegionName();
  const client = useAppQueryClient();
  const holder = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [ready, setReady] = useState(false);
  const [locating, setLocating] = useState(false);
  const [denied, setDenied] = useState(false);
  const pick = useRef(onCompany);
  useEffect(() => {
    pick.current = onCompany;
  });

  const query = useQuery(
    {
      queryKey: ["job-map", userId, body],
      queryFn: body ? ({ signal }) => api.jobMap(body, signal) : skipToken,
      staleTime: MAP_STALE_MS,
    },
    client,
  );
  const data = query.data ?? null;
  const geojson = useMemo(
    () => featuresOf(data?.pins ?? [], (pin) => cityLabel(pin.city, regionName)),
    [data, regionName],
  );
  const words = t.map.controls;

  useEffect(() => {
    const element = holder.current;
    if (!element) return;
    const map = new maplibregl.Map({
      container: element,
      style: STYLE_URL,
      center: [10, 30],
      zoom: 1.4,
      attributionControl: { compact: true },
      cooperativeGestures: true,
      locale: {
        "NavigationControl.ZoomIn": words.zoomIn,
        "NavigationControl.ZoomOut": words.zoomOut,
        "AttributionControl.ToggleAttribution": words.attribution,
        "CooperativeGesturesHandler.WindowsHelpText": words.ctrlScroll,
        "CooperativeGesturesHandler.MacHelpText": words.cmdScroll,
        "CooperativeGesturesHandler.MobileHelpText": words.twoFingers,
      },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;
    const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 12 });
    map.on("load", () => {
      map.addSource("companies", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: true,
        clusterRadius: 44,
        clusterMaxZoom: 11,
        clusterProperties: { roles: ["+", ["get", "roles"]] },
      });
      map.addLayer({
        id: "clusters",
        type: "circle",
        source: "companies",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": PRIMARY,
          "circle-opacity": 0.88,
          "circle-stroke-color": SURFACE,
          "circle-stroke-width": 2,
          "circle-radius": ["step", ["get", "point_count"], 14, 10, 18, 50, 23, 200, 28],
        },
      });
      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "companies",
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-font": ["Noto Sans Bold"],
          "text-size": 12,
        },
        paint: { "text-color": SURFACE },
      });
      map.addLayer({
        id: "company",
        type: "circle",
        source: "companies",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": ["case", ["get", "hiring"], PASS, PRIMARY],
          "circle-stroke-color": SURFACE,
          "circle-stroke-width": 2,
          "circle-radius": ["interpolate", ["linear"], ["get", "roles"], 1, 6, 10, 9, 50, 13],
        },
      });
      setReady(true);
    });
    map.on("click", "clusters", (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      const id = feature?.properties?.cluster_id as number | undefined;
      if (!feature || id === undefined || feature.geometry.type !== "Point") return;
      const center = feature.geometry.coordinates as [number, number];
      void (map.getSource("companies") as GeoJSONSource)
        .getClusterExpansionZoom(id)
        .then((zoom) => map.easeTo({ center, zoom }));
    });
    map.on("click", "company", (event: MapLayerMouseEvent) => {
      const name = event.features?.[0]?.properties?.name;
      if (typeof name === "string") pick.current(name);
    });
    map.on("mouseenter", "company", (event: MapLayerMouseEvent) => {
      map.getCanvas().style.cursor = "pointer";
      const feature = event.features?.[0];
      if (!feature || feature.geometry.type !== "Point") return;
      const props = feature.properties as PinProps;
      const box = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = props.name;
      const line = document.createElement("div");
      line.textContent = `${format.plural(t.map.here, Number(props.roles))} · ${props.place}`;
      box.append(title, line);
      popup
        .setLngLat(feature.geometry.coordinates as [number, number])
        .setDOMContent(box)
        .addTo(map);
    });
    map.on("mouseleave", "company", () => {
      map.getCanvas().style.cursor = "";
      popup.remove();
    });
    for (const layer of ["clusters"]) {
      map.on("mouseenter", layer, () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", layer, () => (map.getCanvas().style.cursor = ""));
    }
    return () => {
      popup.remove();
      map.remove();
      mapRef.current = null;
      setReady(false);
    };
    // The map is made once; its words and handlers are read through refs and state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    (map.getSource("companies") as GeoJSONSource | undefined)?.setData(geojson);
    if (geojson.features.length === 0) return;
    const bounds = new maplibregl.LngLatBounds();
    for (const feature of geojson.features)
      bounds.extend(feature.geometry.coordinates as [number, number]);
    map.fitBounds(bounds, { padding: 48, maxZoom: 9, duration: 600 });
  }, [ready, geojson]);

  function goToMe() {
    setLocating(true);
    setDenied(false);
    locate()
      .then((point) => mapRef.current?.flyTo({ center: [point.lng, point.lat], zoom: 9 }))
      .catch(() => setDenied(true))
      .finally(() => setLocating(false));
  }

  const top = [...(data?.pins ?? [])].sort((a, b) => b.roles - a.roles).slice(0, LISTED);

  return (
    <section aria-label={t.map.label} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm/6 text-muted" aria-live="polite">
          {query.isPending && body ? (
            <span className="inline-flex items-center gap-2">
              <Spinner className="size-4" />
              {t.map.loading}
            </span>
          ) : data && data.placed > 0 ? (
            fmt(t.map.placed, {
              placed: format.number(data.placed),
              openings: format.number(data.openings),
            })
          ) : data ? (
            t.map.none
          ) : null}
        </p>
        <Button variant="secondary" size="sm" loading={locating} onClick={goToMe}>
          <LocateFixed aria-hidden />
          {t.map.myLocation}
        </Button>
      </div>
      {denied ? (
        <p role="alert" className="text-xs/5 text-fail-ink">
          {t.filters.locationOff}
        </p>
      ) : null}
      {query.isError ? (
        <Alert
          variant="error"
          title={t.map.failed}
          action={
            <Button variant="secondary" size="sm" onClick={() => void query.refetch()}>
              {t.map.tryAgain}
            </Button>
          }
        >
          {errorMessage(query.error)}
        </Alert>
      ) : null}
      <div
        ref={holder}
        className="h-112 w-full overflow-hidden rounded-2xl bg-surface-muted ring-1 ring-ink/5 sm:h-128"
      />
      <p className="text-xs/5 text-subtle">{t.map.credit}</p>
      {top.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-ink">{t.map.most}</h3>
          <ul className="grid gap-1 sm:grid-cols-2">
            {top.map((pin) => (
              <li key={`${pin.name}-${pin.lat}-${pin.lng}`}>
                <button
                  type="button"
                  onClick={() => onCompany(pin.name)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-ink/5 focus-visible:bg-ink/5 focus-visible:outline-hidden"
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium text-ink">
                      <span className="sr-only">{fmt(t.map.see, { company: pin.name })}</span>
                      <span aria-hidden>{pin.name}</span>
                    </span>
                    <span className="truncate text-xs/5 text-muted">
                      {cityLabel(pin.city, regionName)}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-muted tabular-nums">
                    {format.plural(t.map.here, pin.roles)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </section>
  );
}
