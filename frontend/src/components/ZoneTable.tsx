"use client";
import { useState } from "react";
import type { AnalysisResult } from "@/lib/api";
import { formatLatLngCompact, googleMapsUrl } from "@/lib/geo";
import Icon from "./Icon";
export default function ZoneTable({
  analysis,
}: {
  analysis: AnalysisResult | null;
}) {
  const [showAll, setShowAll] = useState(false);
  if (!analysis)
    return (
      <div className="detail-empty">
        <span className="empty-icon">
          <Icon name="crosshair" size={29} />
        </span>
        <h3>Focus where it matters.</h3>
        <p>Analyze a scene to identify the areas that need attention first.</p>
        <div className="empty-zone-preview" aria-hidden="true">
          {[1, 2, 3].map((rank) => (
            <div key={rank}>
              <span>{String(rank).padStart(2, "0")}</span>
              <i />
              <b />
            </div>
          ))}
        </div>
        <span className="empty-hint">Ranked by damage severity</span>
      </div>
    );
  const zones = [...analysis.zones].sort((a, b) => a.rank - b.rank);
  const displayed = showAll ? zones : zones.slice(0, 6);
  const geo = analysis.geo_available && analysis.geo_mode !== "image";
  return (
    <div className="zone-content">
      <div className="zone-table-heading">
        <span>Response zone</span>
        <span>Priority</span>
      </div>
      <div className="zone-list">
        {displayed.map((zone) => {
          const level =
            zone.priority_score >= 50
              ? "high"
              : zone.priority_score >= 20
                ? "medium"
                : "low";
          const damaged =
            zone.building_counts.destroyed +
            zone.building_counts.major +
            zone.building_counts.minor;
          return (
            <article className="zone-row" key={zone.rank}>
              <div className={`zone-rank ${level}`}>
                {String(zone.rank).padStart(2, "0")}
              </div>
              <div className="zone-description">
                <div className="zone-name">
                  <strong>Zone {zone.rank}</strong>
                  {zone.confidence != null && (
                    <span title="Mean predicted class probability">
                      {Math.round(zone.confidence * 100)}% confidence
                    </span>
                  )}
                </div>
                <p>{damaged} damaged buildings</p>
                <p className="zone-breakdown">
                  {zone.building_counts.destroyed} destroyed ·{" "}
                  {zone.building_counts.major} major
                </p>
                <div className="priority-track">
                  <span
                    className={level}
                    style={{
                      width: `${Math.min(100, Math.max(0, zone.priority_score))}%`,
                    }}
                  />
                </div>
                {geo &&
                  typeof zone.centroid_lat === "number" &&
                  typeof zone.centroid_lng === "number" && (
                    <a
                      className="zone-location"
                      href={googleMapsUrl(zone.centroid_lat, zone.centroid_lng)}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open zone ${zone.rank} in Google Maps`}
                    >
                      {formatLatLngCompact(
                        zone.centroid_lat,
                        zone.centroid_lng,
                      )}
                      <Icon name="map" size={13} />
                    </a>
                  )}
              </div>
              <div className="zone-priority">
                <span className={`priority-badge ${level}`}>{level}</span>
                <span className="priority-score">
                  {zone.priority_score.toFixed(1)} / 100
                </span>
              </div>
            </article>
          );
        })}
      </div>
      {!zones.length && (
        <p className="supporting-text">
          No damaged zones were detected in this image pair.
        </p>
      )}
      {zones.length > 6 && (
        <button
          className="button view-all"
          onClick={() => setShowAll((value) => !value)}
        >
          {showAll ? "Show top zones" : `View all ${zones.length} zones`}
        </button>
      )}
      <p className="zone-footnote">
        Priority uses a 0–100 severity score. Building counts are estimates from
        the damage mask.{" "}
        {analysis.inference_mode.startsWith("stub")
          ? "Image-change heuristic: intact buildings are not detected in this mode."
          : `Assessment method: ${analysis.inference_mode}.`}
      </p>
    </div>
  );
}
