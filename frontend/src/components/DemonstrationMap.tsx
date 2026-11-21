"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { demoImageUrl } from "@/lib/api";
import type { Demonstration, MapView } from "@/lib/demonstrations";

type SwipeControl = L.Control & { _range?: HTMLInputElement };
type SwipeLeaflet = typeof L & {
  control: typeof L.control & {
    sideBySide: (left: L.Layer, right: L.Layer) => SwipeControl;
  };
};
let pluginPromise: Promise<void> | undefined;
function loadMicrosoftControl() {
  if (!pluginPromise)
    pluginPromise = new Promise<void>((resolve, reject) => {
      (window as Window & { L?: typeof L }).L = L;
      const script = document.createElement("script");
      script.src =
        "/vendor/microsoft-damage-visualizer/leaflet-side-by-side.js";
      script.onload = () => resolve();
      script.onerror = () => {
        pluginPromise = undefined;
        script.remove();
        reject(new Error("Comparison control could not load."));
      };
      document.head.appendChild(script);
    });
  return pluginPromise;
}

export default function DemonstrationMap({
  scenario,
  view,
  opacity,
  resetKey,
  onReadyChange,
}: {
  scenario: Demonstration;
  view: MapView;
  opacity: number;
  resetKey: number;
  onReadyChange: (ready: boolean) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const state = useRef<{
    map: L.Map;
    before: L.Layer;
    after: L.Layer;
    damage?: L.TileLayer;
    street?: L.TileLayer;
    swipe?: SwipeControl;
  } | null>(null);
  const [status, setStatus] = useState("Loading source imagery…");
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(0);
  const refreshStatus = useRef<() => void>(() => {});

  useEffect(() => {
    if (!container.current) return;
    let cancelled = false;
    let map: L.Map | undefined;
    setFailed(false);
    setStatus("Loading source imagery…");
    void loadMicrosoftControl()
      .then(() => {
        if (cancelled || !container.current) return;
        const local = scenario.kind === "local";
        map = L.map(container.current, {
          crs: local ? L.CRS.Simple : L.CRS.EPSG3857,
          minZoom: local ? -3 : 10,
          maxZoom: local ? 4 : 19,
          scrollWheelZoom: false,
          zoomAnimation: false,
          fadeAnimation: false,
          markerZoomAnimation: false,
          zoomSnap: scenario.kind === "microsoft" ? 1 : 0.1,
          zoomControl: true,
        });
        const activeMap = map;
        const bounds: L.LatLngBoundsExpression = local
          ? [
              [0, 0],
              [1024, 1024],
            ]
          : scenario.bounds;
        if (local || scenario.kind === "historical")
          activeMap.fitBounds(bounds, { padding: [10, 10], animate: false });
        else
          activeMap.setView(scenario.center, scenario.zoom, { animate: false });
        activeMap.setMaxBounds(L.latLngBounds(bounds).pad(0.7));
        activeMap.createPane("comparison-before");
        activeMap.createPane("comparison-after");
        activeMap.getPane("comparison-before")!.style.zIndex = "220";
        activeMap.getPane("comparison-after")!.style.zIndex = "230";
        const failedLayers = new Set<L.Layer>();
        refreshStatus.current = () => {
          if (cancelled) return;
          const current = state.current;
          if (!current) return;
          const active = [
            current.before,
            current.after,
            current.damage,
            current.street,
          ].filter((layer): layer is L.Layer =>
            Boolean(layer && activeMap.hasLayer(layer)),
          );
          const pending =
            !active.length ||
            active.some((layer) =>
              layer instanceof L.TileLayer
                ? layer.isLoading()
                : layer instanceof L.ImageOverlay
                  ? !layer.getElement()?.complete
                  : false,
            );
          const unavailable = active.some((layer) => failedLayers.has(layer));
          setFailed(unavailable);
          setStatus(
            pending
              ? "Loading visible source imagery…"
              : unavailable
                ? "Some source imagery is unavailable. Reset the extent or open the original source."
                : "Visible source imagery loaded",
          );
          onReadyChange(!pending);
        };
        const attachStatus = (layer: L.Layer, tiles: boolean) => {
          layer.on("loading", () => {
            failedLayers.delete(layer);
            refreshStatus.current();
          });
          layer.on("load add remove", () => refreshStatus.current());
          layer.on(tiles ? "tileerror" : "error", () => {
            failedLayers.add(layer);
            refreshStatus.current();
          });
        };
        const makeLayer = (url: string, pane: string) => {
          if (scenario.kind === "microsoft") {
            const layer = L.tileLayer(url, {
              pane,
              bounds: scenario.bounds,
              maxNativeZoom: scenario.id === "maui-wildfire" ? 20 : 19,
              attribution: scenario.source,
              minZoom: 10,
              maxZoom: 19,
            });
            attachStatus(layer, true);
            return layer;
          }
          const href = local ? demoImageUrl(url) : url;
          const layer = L.imageOverlay(href, bounds, {
            pane,
            attribution: scenario.source,
          });
          // Microsoft's control clips layer containers. For a single image, the
          // dedicated pane is the equivalent container in map coordinate space.
          Object.assign(layer, {
            getContainer: () => activeMap.getPane(pane)!,
          });
          attachStatus(layer, false);
          return layer;
        };
        const before = makeLayer(scenario.before, "comparison-before");
        const after = makeLayer(scenario.after, "comparison-after");
        const damage = scenario.damage
          ? L.tileLayer(scenario.damage, {
              bounds: scenario.bounds,
              attribution: "Published damage layer: Microsoft AI for Good",
              maxNativeZoom: 19,
              maxZoom: 19,
              opacity: 0.65,
            })
          : undefined;
        if (damage) attachStatus(damage, true);
        const street = local
          ? undefined
          : L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
              attribution:
                '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            });
        if (street) attachStatus(street, true);
        state.current = { map: activeMap, before, after, damage, street };
        const observer = new ResizeObserver(() => {
          if (!cancelled)
            activeMap.invalidateSize({ animate: false, pan: false });
        });
        observer.observe(container.current);
        activeMap.on("unload", () => observer.disconnect());
        setReady((value) => value + 1);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setFailed(true);
          setStatus(
            error instanceof Error ? error.message : "Map could not load.",
          );
        }
      });
    return () => {
      cancelled = true;
      state.current?.swipe?.remove();
      map?.remove();
      state.current = null;
    };
  }, [scenario, onReadyChange]);

  useEffect(() => {
    const current = state.current;
    if (!current) return;
    onReadyChange(false);
    current.swipe?.remove();
    current.swipe = undefined;
    for (const layer of [
      current.before,
      current.after,
      current.damage,
      current.street,
    ])
      if (layer && current.map.hasLayer(layer)) current.map.removeLayer(layer);
    if (view === "street" && current.street) current.street.addTo(current.map);
    else if (view === "before") current.before.addTo(current.map);
    else if (view === "swipe") {
      current.before.addTo(current.map);
      current.after.addTo(current.map);
      const control = (L as SwipeLeaflet).control
        .sideBySide(current.before, current.after)
        .addTo(current.map) as SwipeControl;
      control._range?.setAttribute(
        "aria-label",
        "Before and after comparison divider",
      );
      current.swipe = control;
    } else {
      current.after.addTo(current.map);
      if (view === "damage") current.damage?.addTo(current.map);
    }
    refreshStatus.current();
  }, [view, ready, onReadyChange]);

  useEffect(() => {
    state.current?.damage?.setOpacity(opacity);
  }, [opacity, ready]);
  useEffect(() => {
    const current = state.current;
    if (!current) return;
    if (scenario.kind === "local")
      current.map.fitBounds(
        [
          [0, 0],
          [1024, 1024],
        ],
        { animate: false },
      );
    else if (scenario.kind === "historical")
      current.map.fitBounds(scenario.bounds, { animate: false });
    else
      current.map.setView(scenario.center, scenario.zoom, { animate: false });
  }, [resetKey, scenario, ready]);

  return (
    <div className="demonstration-map-wrap">
      <div
        className="demonstration-map"
        ref={container}
        role="region"
        aria-label={`${scenario.title} interactive comparison map`}
      />
      <div
        className={`source-map-status ${failed ? "source-warning" : ""}`}
        role="status"
      >
        {status}
      </div>
    </div>
  );
}
