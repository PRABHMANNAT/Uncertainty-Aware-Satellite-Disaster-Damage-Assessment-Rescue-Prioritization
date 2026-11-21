"use client";
import type { AnalysisResult } from "@/lib/api";
import Icon from "./Icon";

function saveData(filename: string, contents: string, mime: string) {
  const url = URL.createObjectURL(new Blob([contents], { type: mime }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function AnalysisInsights({
  analysis,
  notes,
  onNotesChange,
}: {
  analysis: AnalysisResult | null;
  notes: string;
  onNotesChange: (value: string) => void;
}) {
  if (!analysis) return null;
  const high = analysis.zones.filter(
    (zone) => zone.priority_score >= 50,
  ).length;
  const confidence = analysis.zones.some((zone) => zone.confidence != null);
  const heuristic = analysis.inference_mode.startsWith("stub");
  const severe = Math.min(
    100,
    analysis.summary.major_pct + analysis.summary.destroyed_pct,
  );
  const exportCsv = () => {
    const header =
      "rank,priority_score,no_damage,minor,major,destroyed,confidence,coordinate_system,latitude_or_y,longitude_or_x";
    const rows = analysis.zones.map((zone) =>
      [
        zone.rank,
        zone.priority_score,
        zone.building_counts.none,
        zone.building_counts.minor,
        zone.building_counts.major,
        zone.building_counts.destroyed,
        zone.confidence ?? "",
        analysis.geo_mode,
        zone.centroid_lat ?? "",
        zone.centroid_lng ?? "",
      ].join(","),
    );
    saveData(
      "disasteriq-priority-zones.csv",
      [header, ...rows].join("\n"),
      "text/csv;charset=utf-8",
    );
  };
  const exportGeo = () => {
    const geo = {
      type: "FeatureCollection",
      features: analysis.zones
        .filter(
          (zone) => zone.centroid_lat != null && zone.centroid_lng != null,
        )
        .map((zone) => ({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [zone.centroid_lng, zone.centroid_lat],
          },
          properties: {
            rank: zone.rank,
            priority_score: zone.priority_score,
            ...zone.building_counts,
            confidence: zone.confidence ?? null,
          },
        })),
    };
    saveData(
      "disasteriq-priority-zones.geojson",
      JSON.stringify(geo, null, 2),
      "application/geo+json",
    );
  };
  return (
    <section className="panel analysis-insights">
      <div className="panel-heading">
        <div className="panel-title">
          <Icon name="grid" size={18} />
          <h2>Analysis & handoff</h2>
        </div>
        <div className="insight-export-actions">
          <button className="button" onClick={exportCsv}>
            <Icon name="download" size={14} />
            Zones CSV
          </button>
          <button
            className="button"
            onClick={exportGeo}
            disabled={!analysis.geo_available || analysis.geo_mode === "image"}
            title={
              analysis.geo_available && analysis.geo_mode !== "image"
                ? "Export geographic zone centroids"
                : "GeoJSON requires verified geographic coordinates"
            }
          >
            GeoJSON
          </button>
        </div>
      </div>
      <div className="insight-content">
        <div className="insight-metrics">
          <div>
            <span>High-priority zones</span>
            <strong>
              {high}
              <small> / {analysis.zones.length}</small>
            </strong>
            <p>Severity score of at least 50 / 100</p>
          </div>
          <div>
            <span>Major + destroyed</span>
            <strong>
              {severe.toFixed(1)}
              <small>%</small>
            </strong>
            <p>Share of estimated scene components</p>
          </div>
          <div>
            <span>Prediction confidence</span>
            <strong className="insight-text-value">
              {confidence ? "Available per zone" : "Not available"}
            </strong>
            <p>
              {confidence
                ? "Model probability, not calibrated certainty"
                : "No confidence values are invented"}
            </p>
          </div>
        </div>
        <div className="insight-evidence">
          <div>
            <h3>Assessment reliability</h3>
            <p>
              {heuristic
                ? "Image-change heuristic. Changes may reflect damage, shadows, alignment or seasonal effects. Intact buildings are not detected in this mode."
                : "Model-derived visual estimates. Verify class definitions, validation coverage and field observations before using the result."}
            </p>
            <p>
              Scene-wide counts are measured before the zone split to avoid
              counting components twice at zone boundaries. Percentages use
              those same scene-wide counts.
            </p>
            <span className="neutral-badge">
              {analysis.geo_available && analysis.geo_mode !== "image"
                ? "WGS84 coordinates available"
                : "Image coordinates only"}
            </span>
          </div>
          <label className="analyst-notes">
            Analyst notes
            <textarea
              value={notes}
              onChange={(event) => onNotesChange(event.target.value)}
              maxLength={3000}
              placeholder="Record field observations, unresolved questions, and handoff instructions…"
            />
            <span>
              {notes.length} / 3000 · Included in the PDF field report
            </span>
          </label>
        </div>
      </div>
    </section>
  );
}
