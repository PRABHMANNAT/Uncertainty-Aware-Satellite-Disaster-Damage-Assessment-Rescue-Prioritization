"use client";
import dynamic from "next/dynamic";
import type { AnalysisResult } from "@/lib/api";
const ZoneMapInner = dynamic(() => import("./ZoneMapInner"), {
  ssr: false,
  loading: () => (
    <div className="map-empty" role="status">
      Loading map…
    </div>
  ),
});
export default function ZoneMap({
  analysis,
  postImageUrl,
}: {
  analysis: AnalysisResult | null;
  postImageUrl?: string;
}) {
  if (!analysis) return null;
  const wgs84 = analysis.geo_mode === "wgs84" || analysis.geo_available;
  return (
    <div className="zone-map">
      <div className="zone-map-caption">
        {wgs84
          ? "Georeferenced response zones · Satellite and street layers available"
          : "Image coordinates · Markers show pixel locations, without GPS metadata"}
      </div>
      {analysis.zones.length ? (
        <div className="leaflet-frame">
          <ZoneMapInner analysis={analysis} postImageUrl={postImageUrl} />
        </div>
      ) : (
        <div className="map-empty">No priority zones to plot.</div>
      )}
    </div>
  );
}
