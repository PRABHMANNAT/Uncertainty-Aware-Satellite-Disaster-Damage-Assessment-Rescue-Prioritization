"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Icon from "./Icon";
import ResearchIdentity from "./ResearchIdentity";
import { API_BASE } from "@/lib/api";
import { DEMONSTRATIONS, type MapView } from "@/lib/demonstrations";

const DemonstrationMap = dynamic(() => import("./DemonstrationMap"), {
  ssr: false,
  loading: () => <div className="map-empty">Preparing comparison map…</div>,
});
const VIEWS: { id: MapView; label: string }[] = [
  { id: "before", label: "Before / reference" },
  { id: "after", label: "After" },
  { id: "swipe", label: "Swipe comparison" },
  { id: "damage", label: "Published damage" },
  { id: "street", label: "Street map" },
];
const STEPS: MapView[] = ["before", "after", "swipe", "damage"];

export default function DemonstrationCenter() {
  const [selected, setSelected] = useState(DEMONSTRATIONS[0].id);
  const [area, setArea] = useState("gaza-city");
  const [view, setView] = useState<MapView>("swipe");
  const [playing, setPlaying] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [step, setStep] = useState(0);
  const [opacity, setOpacity] = useState(0.65);
  const [resetKey, setResetKey] = useState(0);
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [error, setError] = useState("");
  const base = DEMONSTRATIONS.find((item) => item.id === selected)!;
  const scenario = useMemo(() => {
    const variant = base.areas?.find((item) => item.id === area);
    return variant
      ? {
          ...base,
          before: variant.before,
          after: variant.after,
          bounds: variant.bounds,
        }
      : base;
  }, [base, area]);
  const tourSteps = base.damage ? STEPS : STEPS.slice(0, 3);

  useEffect(() => {
    try {
      const stored: unknown = JSON.parse(
        localStorage.getItem("disasteriq.bookmarks.v1") ?? "[]",
      );
      if (Array.isArray(stored))
        setBookmarks(
          stored.filter(
            (id): id is string =>
              typeof id === "string" &&
              DEMONSTRATIONS.some((item) => item.id === id),
          ),
        );
    } catch {
      /* Storage is optional. */
    }
    const id = new URLSearchParams(window.location.search).get("case");
    if (id && DEMONSTRATIONS.some((item) => item.id === id)) setSelected(id);
  }, []);

  useEffect(() => {
    if (!playing || !mapReady) return;
    const steps = scenario.damage ? STEPS : STEPS.slice(0, 3);
    const timer = setTimeout(() => {
      if (step >= steps.length - 1) setPlaying(false);
      else {
        setStep(step + 1);
        setView(steps[step + 1]);
      }
    }, 6500);
    return () => clearTimeout(timer);
  }, [playing, step, scenario.damage, mapReady]);

  const select = (id: string) => {
    setSelected(id);
    setPlaying(false);
    setStep(0);
    setView("swipe");
    setError("");
    window.history.replaceState(null, "", `/demonstrations?case=${id}`);
  };
  const bookmark = () => {
    const next = bookmarks.includes(selected)
      ? bookmarks.filter((id) => id !== selected)
      : [...bookmarks, selected];
    setBookmarks(next);
    try {
      localStorage.setItem("disasteriq.bookmarks.v1", JSON.stringify(next));
    } catch {
      /* Keep a session-only bookmark. */
    }
  };
  const download = async () => {
    setReportLoading(true);
    setError("");
    try {
      const response = await fetch(
        `${API_BASE}/demonstrations/${selected}/report/pdf${base.areas ? `?area=${area}` : ""}`,
        { signal: AbortSignal.timeout(30000) },
      );
      if (!response.ok)
        throw new Error(
          "Could not generate the case-study report. Check the analysis service connection.",
        );
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `disasteriq-case-${selected}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Report generation failed.",
      );
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <div className="demo-page">
      <header className="demo-header">
        <ResearchIdentity />
        <nav>
          <Link href="/">Assessment workspace</Link>
          <span>Demonstrations</span>
          <Link href="/research">Paper Explorer</Link>
        </nav>
      </header>
      <main className="demo-main">
        <div className="page-heading">
          <div>
            <div className="eyebrow">EXPLORE THE EVIDENCE</div>
            <h1>
              Real events. A clearer perspective
              <span className="heading-dot">.</span>
            </h1>
            <p>
              Four natural-disaster demonstrations and a dated Israel–Gaza
              comparison.
            </p>
          </div>
          <Link href="/" className="button">
            Open assessment workspace
          </Link>
        </div>
        <section className="demo-gallery" aria-label="Demonstration cases">
          {DEMONSTRATIONS.map((item) => (
            <button
              key={item.id}
              className={`demo-card ${selected === item.id ? "chosen" : ""}`}
              aria-pressed={selected === item.id}
              onClick={() => select(item.id)}
            >
              <div className={`case-art case-${item.id}`} aria-hidden="true">
                <Icon
                  name={item.kind === "historical" ? "clock" : "map"}
                  size={30}
                />
                <span>{item.hazard}</span>
              </div>
              <div className="case-card-body">
                <div className="case-date">
                  {item.eventDate}
                  {bookmarks.includes(item.id) && (
                    <Icon name="check" size={14} />
                  )}
                </div>
                <h2>{item.title}</h2>
                <p>{item.location}</p>
                <span className="case-kind">
                  {item.kind === "microsoft"
                    ? "Microsoft visualizer layers"
                    : item.kind === "historical"
                      ? "Dated Copernicus imagery"
                      : "Full analysis demonstration"}
                </span>
              </div>
            </button>
          ))}
        </section>
        <div className="demo-detail-heading">
          <div>
            <span className="source-tag light">{base.hazard}</span>
            <h2>{base.title}</h2>
            <p>{base.purpose}</p>
          </div>
          <div className="demo-actions">
            <button
              className="button"
              onClick={bookmark}
              aria-pressed={bookmarks.includes(selected)}
            >
              {bookmarks.includes(selected) ? "Saved case" : "Save case"}
            </button>
            <button
              className="button"
              onClick={download}
              disabled={reportLoading}
            >
              <Icon name="download" size={16} />
              {reportLoading ? "Preparing…" : "Case-study PDF"}
            </button>
          </div>
        </div>
        {error && (
          <div className="error-notice" role="alert">
            {error}
          </div>
        )}
        <div className="demo-workspace">
          <section className="panel demo-map-panel">
            <div className="demo-map-toolbar">
              <div className="map-view-tabs" aria-label="Map views">
                {VIEWS.filter(
                  (item) =>
                    (item.id !== "damage" || base.damage) &&
                    (item.id !== "street" || base.kind !== "local"),
                ).map((item) => (
                  <button
                    key={item.id}
                    aria-pressed={view === item.id}
                    onClick={() => {
                      setView(item.id);
                      setPlaying(false);
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <button
                className="map-reset"
                onClick={() => setResetKey((value) => value + 1)}
                title="Reset map extent"
                aria-label="Reset map extent"
              >
                <Icon name="crosshair" size={18} />
              </button>
            </div>
            {base.areas && (
              <div
                className="historical-area-tabs"
                aria-label="Historical comparison area"
              >
                {base.areas.map((item) => (
                  <button
                    key={item.id}
                    aria-pressed={area === item.id}
                    onClick={() => {
                      setArea(item.id);
                      setPlaying(false);
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
            <div className="map-date-strip">
              <span>
                <strong>
                  {base.id === "beryl-hurricane" ? "Reference" : "Before"}
                </strong>
                {base.beforeLabel}
              </span>
              <span>
                <strong>After</strong>
                {base.afterLabel}
              </span>
            </div>
            <DemonstrationMap
              scenario={scenario}
              view={view}
              opacity={opacity}
              resetKey={resetKey}
              onReadyChange={setMapReady}
            />
            <div className="demo-map-footer">
              <span>
                <Icon name="layers" size={15} />
                Comparison control from Microsoft Damage Assessment Visualizer
              </span>
              {view === "damage" && (
                <label>
                  Layer opacity
                  <input
                    aria-label="Published damage layer opacity"
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={opacity}
                    onChange={(event) => setOpacity(Number(event.target.value))}
                  />
                  <span>{Math.round(opacity * 100)}%</span>
                </label>
              )}
            </div>
          </section>
          <aside className="demo-context">
            <section className="panel tour-panel">
              <div className="panel-heading">
                <div className="panel-title">
                  <Icon name="play" size={18} />
                  <h2>Guided demonstration</h2>
                </div>
                <span className="neutral-badge">{tourSteps.length} views</span>
              </div>
              <div className="tour-body">
                <p>
                  Follow the evidence from the reference image to the available
                  assessment.
                </p>
                <ol>
                  {tourSteps.map((item, index) => (
                    <li key={item} className={view === item ? "current" : ""}>
                      <button
                        onClick={() => {
                          setStep(index);
                          setView(item);
                          setPlaying(false);
                        }}
                      >
                        <span>{index + 1}</span>
                        {VIEWS.find((entry) => entry.id === item)?.label}
                      </button>
                    </li>
                  ))}
                </ol>
                <button
                  className="button primary"
                  onClick={() => {
                    if (playing) setPlaying(false);
                    else {
                      if (step >= tourSteps.length - 1) {
                        setStep(0);
                        setView(tourSteps[0]);
                      } else setView(tourSteps[step]);
                      setPlaying(true);
                    }
                  }}
                >
                  <Icon name={playing ? "clock" : "play"} size={16} />
                  {playing
                    ? "Pause demonstration"
                    : step === tourSteps.length - 1
                      ? "Replay demonstration"
                      : "Play demonstration"}
                </button>
                <span className="tour-timing">
                  Advances 6.5 seconds after each view loads. Pause at any time.
                </span>
                {base.kind === "local" && (
                  <Link
                    className="button full-analysis-link"
                    href={`/?scene=${base.pairId}&autostart=1`}
                  >
                    <Icon name="grid" size={16} />
                    Run automated assessment
                  </Link>
                )}
              </div>
            </section>
            <section className="panel evidence-panel">
              <h3>Evidence & coverage</h3>
              <dl>
                <div>
                  <dt>Imagery provider</dt>
                  <dd>{base.source}</dd>
                </div>
                <div>
                  <dt>Assessment type</dt>
                  <dd>
                    {base.kind === "local"
                      ? "Computed locally from the image pair"
                      : base.kind === "microsoft"
                        ? "Published source overlay"
                        : "Regional comparison only · 10 m pixels"}
                  </dd>
                </div>
                <div>
                  <dt>Building-level confidence</dt>
                  <dd>
                    {base.kind === "historical"
                      ? "Not available at this resolution"
                      : "Not supplied by the published map"}
                  </dd>
                </div>
              </dl>
              <a
                href={base.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open original source
              </a>
              {base.kind === "historical" && (
                <>
                  <a
                    href="/historical/provenance.json"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View capture metadata & provenance
                  </a>
                  <a
                    href="https://unosat.org/products/3698"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    UNOSAT Gaza assessment · 15 October 2023
                  </a>
                </>
              )}
            </section>
          </aside>
        </div>
        <section className="evidence-note">
          <Icon name="info" size={20} />
          <div>
            <h3>How to read this demonstration</h3>
            <p>{base.notes}</p>
            {base.kind === "historical" && (
              <p>
                7 October 2023 is a historical reference date, not an
                attribution of all visible changes. No casualty estimate,
                targeting recommendation, or live operational position is
                inferred.
              </p>
            )}
          </div>
        </section>
        <footer className="workspace-footer">
          <span>Historical evidence, explicit sources, and human review.</span>
          <a
            href="https://github.com/microsoft/Damage_Assessment_Visualizer"
            target="_blank"
            rel="noopener noreferrer"
          >
            Microsoft control · MIT license
          </a>
        </footer>
      </main>
    </div>
  );
}
