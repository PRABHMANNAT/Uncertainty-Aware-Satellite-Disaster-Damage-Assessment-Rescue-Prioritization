// frontend/src/app/page.tsx

"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import BriefPanel from "@/components/BriefPanel";
import DamageCanvas from "@/components/DamageCanvas";
import ZoneTable from "@/components/ZoneTable";
import ZoneMap from "@/components/ZoneMap";
import {
  analyzeDemoPair,
  analyzeUpload,
  API_BASE,
  connectToBackend,
  ConnectionCancelledError,
  demoImageUrl,
  fetchBrief,
  fetchReportPdf,
  type AnalysisResult,
  type DemoPair,
  type HealthResponse,
} from "@/lib/api";
import { FALLBACK_DEMO_PAIRS } from "@/lib/demoPairs";

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const API_HOST = (() => {
  try {
    return new URL(API_BASE).host;
  } catch {
    return API_BASE;
  }
})();

function FilePicker({
  label,
  file,
  onSelect,
}: {
  label: string;
  file: File | null;
  onSelect: (file: File | null) => void;
}) {
  const id = useId();
  return (
    <div className="file-picker">
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <label htmlFor={id} className="file-button">
        <Icon name="image" size={17} />
        <span>{file?.name ?? "Choose image"}</span>
        <Icon name={file ? "check" : "upload"} size={15} />
      </label>
      <input
        id={id}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/tiff"
        className="sr-only"
        onChange={(event) => {
          const next = event.target.files?.[0] ?? null;
          if (next) {
            const error = validateUploadFile(next);
            if (error) {
              window.alert(error);
              return;
            }
          }
          onSelect(next);
        }}
      />
    </div>
  );
}
function UploadDropBox({
  preFile,
  postFile,
  onPreSelect,
  onPostSelect,
}: {
  preFile: File | null;
  postFile: File | null;
  onPreSelect: (file: File | null) => void;
  onPostSelect: (file: File | null) => void;
}) {
  return (
    <div
      className="upload-box"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        const files = Array.from(event.dataTransfer.files).slice(0, 2);
        const error = files.map(validateUploadFile).find(Boolean);
        if (error) {
          window.alert(error);
          return;
        }
        if (files[0]) onPreSelect(files[0]);
        if (files[1]) onPostSelect(files[1]);
      }}
    >
      <div className="drop-message">
        <Icon name="upload" size={24} />
        <p>Drop your image pair here</p>
        <span>or choose each image below</span>
      </div>
      <FilePicker label="Before event" file={preFile} onSelect={onPreSelect} />
      <FilePicker label="After event" file={postFile} onSelect={onPostSelect} />
      <p className="source-caption">
        PNG, JPG, WebP or TIFF. Up to 15 MB each.
      </p>
    </div>
  );
}
function EmptyImageState() {
  return (
    <div className="empty-image">
      <Icon name="image" size={32} />
      <p>No imagery loaded</p>
      <span>Select a sample scene or upload an image.</span>
    </div>
  );
}
function DamageStatCard({
  label,
  value,
  percent,
  tone,
}: {
  label: string;
  value: string | number;
  percent: string;
  tone: "green" | "yellow" | "orange" | "red";
}) {
  return (
    <div className={`metric metric-${tone}`}>
      <span className="metric-label">
        {label}
        <span className="severity-line" />
      </span>
      <strong>
        {typeof value === "number" ? value.toLocaleString() : value}
      </strong>
      <span className="metric-sub">
        <span className="metric-percent">{percent}</span> of assessed buildings
      </span>
    </div>
  );
}
function PipelineStatus({
  loading,
  analysis,
  briefLoading,
  brief,
  seconds,
}: {
  loading: boolean;
  analysis: AnalysisResult | null;
  briefLoading: boolean;
  brief: string | null;
  seconds: number | null;
}) {
  return (
    <div className="pipeline" role="status">
      <div>
        <span
          className={loading && !analysis ? "small-spinner" : "pipeline-check"}
        >
          {analysis ? <Icon name="check" size={14} /> : null}
        </span>
        <span>{analysis ? "Analysis complete" : "Analyzing imagery…"}</span>
        <span className="pipeline-time">
          {analysis && seconds != null ? `${seconds.toFixed(1)}s` : ""}
        </span>
      </div>
      <div>
        <span className={briefLoading ? "small-spinner" : "pipeline-check"}>
          {brief ? <Icon name="check" size={14} /> : null}
        </span>
        <span>
          {briefLoading
            ? "Preparing situation brief…"
            : brief
              ? "Situation brief ready"
              : "Situation brief pending"}
        </span>
      </div>
    </div>
  );
}
function BackendConnectingNotice() {
  return (
    <p className="sidebar-notice" role="status">
      Connecting to the analysis service…
    </p>
  );
}
function BackendOfflineNotice({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="sidebar-notice">
      Analysis service unavailable.{" "}
      <button onClick={onRetry}>Retry connection</button>
    </div>
  );
}
function ErrorNotice({ message }: { message: string }) {
  return (
    <div className="error-notice" role="alert">
      <Icon name="info" size={19} />
      <div>
        <strong>Unable to complete this action</strong>
        <p>{message}</p>
      </div>
    </div>
  );
}
function FloatingLegend() {
  return (
    <div className="damage-legend" aria-label="Damage legend">
      {["No damage", "Minor", "Major", "Destroyed"].map((label, index) => (
        <span key={label}>
          <i className={`legend-swatch severity-${index}`} />
          {label}
        </span>
      ))}
    </div>
  );
}
function MapControls({
  onZoomIn,
  onZoomOut,
  canZoomIn,
  canZoomOut,
}: {
  onZoomIn: () => void;
  onZoomOut: () => void;
  canZoomIn: boolean;
  canZoomOut: boolean;
}) {
  return (
    <div className="map-controls">
      <button aria-label="Zoom in" onClick={onZoomIn} disabled={!canZoomIn}>
        +
      </button>
      <button aria-label="Zoom out" onClick={onZoomOut} disabled={!canZoomOut}>
        −
      </button>
    </div>
  );
}
function FullscreenButton({
  targetRef,
}: {
  targetRef: React.RefObject<HTMLElement | null>;
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  useEffect(() => {
    const listener = () =>
      setIsFullscreen(document.fullscreenElement === targetRef.current);
    document.addEventListener("fullscreenchange", listener);
    return () => document.removeEventListener("fullscreenchange", listener);
  }, [targetRef]);
  return (
    <button
      className="fullscreen-button"
      aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
      onClick={() => {
        if (document.fullscreenElement) void document.exitFullscreen();
        else void targetRef.current?.requestFullscreen?.();
      }}
    >
      <Icon name="expand" size={17} />
    </button>
  );
}
function getFriendlyError(error: unknown) {
  // AbortSignal.timeout rejects with a TimeoutError DOMException, whose message
  // ("signal timed out") means nothing to a coordinator staring at the screen.
  if (error instanceof DOMException && error.name === "TimeoutError") {
    return "The analysis server took too long to respond. Large image pairs can take a couple of minutes — wait a moment, then try again.";
  }

  const message = error instanceof Error ? error.message : String(error);

  if (
    message.toLowerCase().includes("failed to fetch") ||
    message.toLowerCase().includes("networkerror")
  ) {
    return "Could not reach the analysis server. It may still be waking up — this can take up to a minute on first use.";
  }

  return message;
}

const MAX_CLIENT_UPLOAD_BYTES = 15 * 1024 * 1024;
const ALLOWED_CLIENT_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/tiff",
]);

function validateUploadFile(file: File): string | null {
  if (file.size > MAX_CLIENT_UPLOAD_BYTES) {
    return "Each image must be 15 MB or smaller.";
  }
  if (file.type && !ALLOWED_CLIENT_TYPES.has(file.type)) {
    return "Use PNG, JPEG, WebP, or TIFF images.";
  }
  return null;
}

export default function HomePage() {
  /*
    Seed with the bundled pair list so the demo is clickable from the first
    paint. Gating the dropdown on a successful health probe meant a cold or
    restarting backend left nothing to demo at all; the live /demo/pairs
    response replaces this as soon as it arrives.
  */
  const [pairs, setPairs] = useState<DemoPair[]>(FALLBACK_DEMO_PAIRS);
  const [selectedPair, setSelectedPair] = useState<string>(
    FALLBACK_DEMO_PAIRS[0]?.id ?? "",
  );
  const [preFile, setPreFile] = useState<File | null>(null);
  const [postFile, setPostFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [postUrl, setPostUrl] = useState<string>("");
  const [preUrl, setPreUrl] = useState<string>("");
  const [brief, setBrief] = useState<string | null>(null);
  const [briefSource, setBriefSource] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [briefLoading, setBriefLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backendOffline, setBackendOffline] = useState(false);
  const [connecting, setConnecting] = useState(true);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [analysisSeconds, setAnalysisSeconds] = useState<number | null>(null);
  /** After a successful API call, ignore failed quiet probes until this time. */
  const onlineUntilRef = useRef(0);

  const markOnline = useCallback(() => {
    onlineUntilRef.current = Date.now() + 120_000;
    setBackendOffline(false);
  }, []);

  const beforePanelRef = useRef<HTMLDivElement>(null);
  const afterPanelRef = useRef<HTMLDivElement>(null);
  const [afterZoom, setAfterZoom] = useState(1);

  const zoomIn = useCallback(
    () =>
      setAfterZoom((z) =>
        Math.min(Math.round((z + 0.25) * 100) / 100, MAX_ZOOM),
      ),
    [],
  );
  const zoomOut = useCallback(
    () =>
      setAfterZoom((z) =>
        Math.max(Math.round((z - 0.25) * 100) / 100, MIN_ZOOM),
      ),
    [],
  );

  useEffect(() => {
    setAfterZoom(MIN_ZOOM);
  }, [postUrl]);

  // Object URLs created from uploaded Files stay alive until explicitly revoked.
  // Track the pre/post blob independently so an uploaded image can be previewed
  // (and zoomed/expanded) the moment it is selected, then released when it is
  // replaced — whether by another upload or a demo pair's plain HTTP URLs.
  const preBlobRef = useRef<string | null>(null);
  const postBlobRef = useRef<string | null>(null);

  const setPreImage = useCallback((url: string, isBlob: boolean) => {
    if (preBlobRef.current) URL.revokeObjectURL(preBlobRef.current);
    preBlobRef.current = isBlob ? url : null;
    setPreUrl(url);
  }, []);

  const setPostImage = useCallback((url: string, isBlob: boolean) => {
    if (postBlobRef.current) URL.revokeObjectURL(postBlobRef.current);
    postBlobRef.current = isBlob ? url : null;
    setPostUrl(url);
  }, []);

  const setImageUrls = useCallback(
    (pre: string, post: string, isBlob: boolean) => {
      setPreImage(pre, isBlob);
      setPostImage(post, isBlob);
    },
    [setPreImage, setPostImage],
  );

  useEffect(() => {
    return () => {
      if (preBlobRef.current) URL.revokeObjectURL(preBlobRef.current);
      if (postBlobRef.current) URL.revokeObjectURL(postBlobRef.current);
    };
  }, []);

  /** True while a background poll is running; user-driven retries ignore it. */
  const quietProbeInFlightRef = useRef(false);

  const connect = useCallback(
    (options?: {
      signal?: AbortSignal;
      budgetMs?: number;
      quiet?: boolean;
    }) => {
      const { signal, budgetMs, quiet } = options ?? {};

      /*
        A probe can run for its whole budget, which outlasts the poll interval
        below. Without this guard the polls pile up: several probe loops end up
        retrying at once against a host that is still booting, which is exactly
        when it can least afford the extra load. Only the polls are suppressed —
        an explicit "Retry connection" must always fire.
      */
      if (quiet) {
        if (quietProbeInFlightRef.current) return Promise.resolve();
        quietProbeInFlightRef.current = true;
      }

      // A quiet probe is the background poll below: it must not flip the UI
      // back to "Waking backend" on every tick once we already said offline.
      if (!quiet) setConnecting(true);

      return connectToBackend({ signal, budgetMs })
        .then(({ health: h, pairs: p }) => {
          if (signal?.aborted) return;
          setHealth(h);
          // The live list wins when it has content; an empty/failed pairs
          // fetch must not clobber the bundled fallback the demo relies on.
          if (p.length > 0) {
            setPairs(p);
            setSelectedPair((cur) =>
              cur && !p.some((pair) => pair.id === cur) ? p[0].id : cur,
            );
          }
          markOnline();
        })
        .catch((err) => {
          if (signal?.aborted) return;
          if (err instanceof ConnectionCancelledError) return;
          if (err instanceof Error && err.message === "Connection cancelled")
            return;
          // Sticky online: a single quiet probe must not flip FRONTEND ONLY
          // right after analyze/brief succeeded.
          if (quiet && Date.now() < onlineUntilRef.current) return;
          setHealth(null);
          // Keep the bundled pairs and selection: a failed probe means the
          // backend is unreachable *right now*, not that the demo set is gone.
          setBackendOffline(true);
        })
        .finally(() => {
          if (quiet) quietProbeInFlightRef.current = false;
          else if (!signal?.aborted) setConnecting(false);
        });
    },
    [markOnline],
  );

  useEffect(() => {
    const controller = new AbortController();
    // Budget comes from api.ts: it must outlast a free-tier cold start.
    void connect({ signal: controller.signal });
    return () => controller.abort();
  }, [connect]);

  /*
    Once the budget is spent we show "offline", but a backend can still come up
    later (a slow boot, a restarted dev server). Keep probing quietly so the
    dashboard heals itself instead of demanding a refresh.
  */
  useEffect(() => {
    if (!backendOffline || connecting) return;

    const controller = new AbortController();
    const id = setInterval(() => {
      void connect({
        signal: controller.signal,
        // Must exceed the per-attempt timeout (25s) so cold starts can retry.
        budgetMs: 60_000,
        quiet: true,
      });
    }, 10_000);

    return () => {
      controller.abort();
      clearInterval(id);
    };
  }, [backendOffline, connecting, connect]);

  const loadDemoPair = useCallback(() => {
    setError(null);
    setAnalysis(null);
    setBrief(null);
    setBriefSource(null);
    setBriefLoading(false);
    setAnalysisSeconds(null);

    /*
      Deliberately NOT gated on backendOffline: the pair list is bundled and
      the image URLs are known, and a request to a waking Render host is held
      by its proxy until boot completes. Blocking the click here turned a
      30-second wake into "the demo doesn't work"; letting it through means
      the imagery appears the moment the backend answers.
    */
    if (!selectedPair) {
      setError("Select a demo pair first.");
      return;
    }

    const pair = pairs.find((p) => p.id === selectedPair);

    if (!pair) {
      setError(`Selected demo pair was not found: ${selectedPair}`);
      return;
    }

    setPreFile(null);
    setPostFile(null);
    setImageUrls(
      demoImageUrl(pair.pre_image),
      demoImageUrl(pair.post_image),
      false,
    );
  }, [selectedPair, pairs, setImageUrls]);

  const runAnalysis = useCallback(async () => {
    setLoading(true);
    setError(null);
    setAnalysis(null);
    setBrief(null);
    setBriefSource(null);
    setAnalysisSeconds(null);

    try {
      let result: AnalysisResult;

      const startedAt = performance.now();

      if (preFile && postFile) {
        // preUrl/postUrl were already set to preview blobs on file selection.
        result = await analyzeUpload(preFile, postFile);
      } else if (selectedPair) {
        result = await analyzeDemoPair(selectedPair);
        const pair = pairs.find((p) => p.id === selectedPair);

        if (pair) {
          setImageUrls(
            demoImageUrl(pair.pre_image),
            demoImageUrl(pair.post_image),
            false,
          );
        }
      } else if (backendOffline) {
        throw new Error(
          "The analysis server is not reachable yet. It may still be waking up — try again in a moment.",
        );
      } else {
        throw new Error("Select a demo pair or upload before/after images.");
      }

      setAnalysisSeconds((performance.now() - startedAt) / 1000);
      setAnalysis(result);
      markOnline();
      setBriefLoading(true);

      // Refresh health/pairs in the background after a successful analyze.
      void connect({ budgetMs: 45_000, quiet: true });

      /*
        No hardcoded regional context: this used to send "Pakistan disaster
        response context" with every analysis, so the AI brief narrated
        Pakistani response priorities over Mexican earthquake imagery. The
        analysis JSON already carries the pair id and disaster type — let the
        narrator work from what is actually on screen.
      */
      const briefResp = await fetchBrief(result);
      setBrief(briefResp.brief);
      setBriefSource(briefResp.source);
      markOnline();
    } catch (e) {
      setError(getFriendlyError(e));
    } finally {
      setLoading(false);
      setBriefLoading(false);
    }
  }, [
    preFile,
    postFile,
    selectedPair,
    pairs,
    backendOffline,
    setImageUrls,
    connect,
    markOnline,
  ]);

  const handleDownloadReport = useCallback(async () => {
    if (!analysis || !brief) return;

    setReportLoading(true);
    setError(null);

    try {
      const blob = await fetchReportPdf(analysis, brief);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `disasteriq-report-${analysis.pair_id ?? "upload"}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      markOnline();
    } catch (e) {
      setError(getFriendlyError(e));
    } finally {
      setReportLoading(false);
    }
  }, [analysis, brief, markOnline]);

  const totals = useMemo(() => {
    if (!analysis) {
      return {
        noDamage: 0,
        minor: 0,
        major: 0,
        destroyed: 0,
        total: 0,
        hasData: false,
      };
    }

    const zones = analysis.zones ?? [];

    const noDamage = zones.reduce((sum, z) => sum + z.building_counts.none, 0);

    const minor = zones.reduce((sum, z) => sum + z.building_counts.minor, 0);

    const major = zones.reduce((sum, z) => sum + z.building_counts.major, 0);

    const destroyed = zones.reduce(
      (sum, z) => sum + z.building_counts.destroyed,
      0,
    );

    return {
      noDamage,
      minor,
      major,
      destroyed,
      total: noDamage + minor + major + destroyed,
      hasData: true,
    };
  }, [analysis]);

  const percent = useCallback(
    (value: number) => {
      if (!totals.hasData || totals.total === 0) return "—";
      return `${((value / totals.total) * 100).toFixed(1)}%`;
    },
    [totals],
  );

  const canAnalyze = Boolean(
    (preFile && postFile) || (!preFile && !postFile && selectedPair),
  );

  /*
    A disabled button explains nothing: hovering it just shows a "blocked" cursor,
    which reads as the app refusing to work rather than as the backend still
    booting. Demo pairs come from the backend, so during a cold start there is
    nothing to select and Load Demo Pair is necessarily dead — say so, on the
    button and in its tooltip, instead of leaving the user to guess.
  */
  const loadPairBlockedReason: string | null = loading
    ? "An analysis is running. Wait for it to finish."
    : pairs.length === 0
      ? connecting
        ? "Waking the backend. Demo pairs load by themselves — no refresh needed."
        : "The backend is unreachable, so no demo pairs could be loaded."
      : !selectedPair
        ? "Choose a demo pair from the list first."
        : null;

  const [inputMode, setInputMode] = useState<"demo" | "upload">("demo");
  const [workspaceView, setWorkspaceView] = useState<"imagery" | "map">(
    "imagery",
  );
  const [detailView, setDetailView] = useState<"zones" | "brief">("zones");
  const [overlayVisible, setOverlayVisible] = useState(true);
  const activePair = pairs.find((pair) => pair.id === selectedPair);
  const sceneName = activePair
    ? activePair.id
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase())
    : "Custom image pair";

  const choosePair = (id: string) => {
    setSelectedPair(id);
    setPreFile(null);
    setPostFile(null);
    setAnalysis(null);
    setBrief(null);
    setBriefSource(null);
    setAnalysisSeconds(null);
    setError(null);
    const pair = pairs.find((item) => item.id === id);
    setImageUrls(
      pair ? demoImageUrl(pair.pre_image) : "",
      pair ? demoImageUrl(pair.post_image) : "",
      false,
    );
  };

  // Start with useful imagery rather than two empty panels. Selecting files
  // still uses independent, revocable object URLs for immediate previews.
  useEffect(() => {
    const initial = FALLBACK_DEMO_PAIRS[0];
    if (initial)
      setImageUrls(
        demoImageUrl(initial.pre_image),
        demoImageUrl(initial.post_image),
        false,
      );
  }, [setImageUrls]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/" aria-label="DisasterIQ home">
          <span className="brand-mark">
            <Icon name="layers" size={23} />
          </span>
          <span>
            Disaster<span className="brand-suffix">IQ</span>
          </span>
        </Link>
        <div className="workspace-label">RESPONSE WORKSPACE</div>
        <nav className="side-nav" aria-label="Workspace">
          <button
            className={
              workspaceView === "imagery" ? "nav-item active" : "nav-item"
            }
            onClick={() => setWorkspaceView("imagery")}
          >
            <Icon name="grid" />
            Assessment<span className="nav-shortcut">01</span>
          </button>
          <button
            className={workspaceView === "map" ? "nav-item active" : "nav-item"}
            onClick={() => setWorkspaceView("map")}
          >
            <Icon name="map" />
            Zone map
          </button>
          <button
            className="nav-item"
            onClick={() => {
              setDetailView("brief");
              document
                .getElementById("response-panel")
                ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
            }}
          >
            <Icon name="file" />
            Situation brief
          </button>
        </nav>

        <div className="source-section">
          <div className="sidebar-section-title">
            Imagery source
            <Icon name="image" size={16} />
          </div>
          <div className="segmented dark" aria-label="Imagery source">
            <button
              aria-pressed={inputMode === "demo"}
              disabled={loading}
              onClick={() => {
                if (inputMode !== "demo") {
                  choosePair(pairs[0]?.id ?? "");
                  setInputMode("demo");
                }
              }}
            >
              Sample scenes
            </button>
            <button
              aria-pressed={inputMode === "upload"}
              disabled={loading}
              onClick={() => {
                if (inputMode !== "upload") {
                  choosePair("");
                  setInputMode("upload");
                }
              }}
            >
              Upload pair
            </button>
          </div>
          {inputMode === "demo" ? (
            <div className="demo-source">
              <label className="field-label" htmlFor="demo-pair">
                Select a disaster scene
              </label>
              <select
                id="demo-pair"
                aria-label="Demo satellite image pair"
                value={selectedPair}
                onChange={(event) => choosePair(event.target.value)}
                disabled={loading || !pairs.length}
              >
                {!selectedPair && <option value="">Choose a scene</option>}
                {pairs.map((pair) => (
                  <option key={pair.id} value={pair.id}>
                    {pair.id.replace(/[-_]/g, " ")}
                  </option>
                ))}
              </select>
              <div className="source-meta">
                <span className="source-tag">xBD / xView2</span>
                <span>{pairs.length} scenes available</span>
              </div>
              <button
                className="button sidebar-secondary"
                onClick={loadDemoPair}
                disabled={loadPairBlockedReason !== null}
                title={loadPairBlockedReason ?? "Reload the selected imagery"}
              >
                <Icon name="layers" size={16} />
                Load demo pair
              </button>
              <p className="source-caption">
                Paired satellite imagery from real disaster events. Choose a
                scene to explore.
              </p>
            </div>
          ) : (
            <fieldset disabled={loading} className="upload-fieldset">
              <UploadDropBox
                preFile={preFile}
                postFile={postFile}
                onPreSelect={(file) => {
                  setPreFile(file);
                  setPreImage(
                    file ? URL.createObjectURL(file) : "",
                    Boolean(file),
                  );
                  setSelectedPair("");
                  setAnalysis(null);
                  setBrief(null);
                  setBriefSource(null);
                  setAnalysisSeconds(null);
                }}
                onPostSelect={(file) => {
                  setPostFile(file);
                  setPostImage(
                    file ? URL.createObjectURL(file) : "",
                    Boolean(file),
                  );
                  setSelectedPair("");
                  setAnalysis(null);
                  setBrief(null);
                  setBriefSource(null);
                  setAnalysisSeconds(null);
                }}
              />
            </fieldset>
          )}
          <button
            className="button primary analyze-button"
            onClick={runAnalysis}
            disabled={loading || !canAnalyze}
          >
            <Icon name={loading ? "clock" : "play"} size={17} />
            {loading ? "Analyzing damage…" : "Analyze damage"}
          </button>
          <p className="analysis-caption">
            Compare imagery. Identify response priorities.
          </p>
          {connecting && <BackendConnectingNotice />}
          {backendOffline && !connecting && (
            <BackendOfflineNotice onRetry={() => void connect()} />
          )}
          {(loading || analysis) && (
            <PipelineStatus
              loading={loading}
              analysis={analysis}
              briefLoading={briefLoading}
              brief={brief}
              seconds={analysisSeconds}
            />
          )}
        </div>
        <div className="sidebar-bottom">
          <div className="team-avatar">DR</div>
          <div>
            <strong>Disaster response</strong>
            <span>Operations workspace</span>
          </div>
          <span className="version">v1.0</span>
        </div>
      </aside>

      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace
            <Icon name="chevron" size={13} />
            <span>Damage assessment</span>
          </div>
          <span
            className={`connection ${backendOffline ? "offline" : ""}`}
            title={`${API_HOST} · ${health?.inference_mode ?? "connecting"}`}
          >
            <span className="status-dot" />
            {connecting
              ? "Connecting"
              : backendOffline
                ? "Server unavailable"
                : "System operational"}
          </span>
        </header>
        <main className="workspace-main">
          <div className="page-heading">
            <div>
              <div className="eyebrow">DISASTER INTELLIGENCE</div>
              <h1>
                Damage assessment<span className="heading-dot">.</span>
              </h1>
              <p>A clearer picture. A more informed response.</p>
            </div>
            <button
              className="button export-button"
              onClick={handleDownloadReport}
              aria-label="Export field report"
              disabled={!analysis || !brief || reportLoading}
            >
              <Icon name="download" size={17} />
              {reportLoading ? "Preparing report…" : "Export field report"}
            </button>
          </div>
          {error && <ErrorNotice message={error} />}

          <section className="metrics" aria-label="Damage summary">
            <div className="metric total-metric">
              <span className="metric-label">
                Total buildings
                <Icon name="grid" size={16} />
              </span>
              <strong>
                {totals.hasData ? totals.total.toLocaleString() : "—"}
              </strong>
              <span className="metric-sub">
                {totals.hasData
                  ? "Estimated across assessed zones"
                  : "Run an analysis to see results"}
              </span>
            </div>
            <DamageStatCard
              label="No damage"
              value={totals.hasData ? totals.noDamage : "—"}
              percent={percent(totals.noDamage)}
              tone="green"
            />
            <DamageStatCard
              label="Minor damage"
              value={totals.hasData ? totals.minor : "—"}
              percent={percent(totals.minor)}
              tone="yellow"
            />
            <DamageStatCard
              label="Major damage"
              value={totals.hasData ? totals.major : "—"}
              percent={percent(totals.major)}
              tone="orange"
            />
            <DamageStatCard
              label="Destroyed"
              value={totals.hasData ? totals.destroyed : "—"}
              percent={percent(totals.destroyed)}
              tone="red"
            />
          </section>

          <div className="assessment-grid">
            <section
              className="panel imagery-panel"
              aria-label="Imagery workspace"
            >
              <div className="panel-heading">
                <div className="panel-title">
                  <Icon name="layers" size={18} />
                  <h2>Imagery workspace</h2>
                </div>
                <div className="segmented">
                  <button
                    aria-pressed={workspaceView === "imagery"}
                    onClick={() => setWorkspaceView("imagery")}
                  >
                    Compare
                  </button>
                  <button
                    aria-pressed={workspaceView === "map"}
                    onClick={() => setWorkspaceView("map")}
                  >
                    Zone map
                  </button>
                </div>
              </div>
              <div className="scene-toolbar">
                <div>
                  <span className="scene-type">
                    {activePair?.disaster_type ?? "Upload"}
                  </span>
                  <span className="scene-name" title={sceneName}>
                    {sceneName}
                  </span>
                </div>
                <span className="metadata">
                  {loading
                    ? "Assessing scene…"
                    : analysis
                      ? "Assessment complete"
                      : "Ready to assess"}
                </span>
              </div>
              {workspaceView === "imagery" ? (
                <>
                  <div className="image-comparison">
                    <div ref={beforePanelRef} className="image-viewport">
                      <span className="image-label">
                        <span className="image-label-dot" />
                        Before event
                      </span>
                      {preUrl ? (
                        <img
                          src={preUrl}
                          alt="Before disaster satellite imagery"
                          className="satellite-image"
                        />
                      ) : (
                        <EmptyImageState />
                      )}
                      <FullscreenButton targetRef={beforePanelRef} />
                      {!preFile && preUrl && (
                        <span className="image-credit">
                          © Maxar Open Data · xBD
                        </span>
                      )}
                    </div>
                    <div ref={afterPanelRef} className="image-viewport">
                      <span className="image-label">
                        <span className="image-label-dot after" />
                        After event
                      </span>
                      {postUrl ? (
                        <div
                          className="zoom-layer"
                          style={{ transform: `scale(${afterZoom})` }}
                        >
                          <DamageCanvas
                            postImageUrl={postUrl}
                            analysis={overlayVisible ? analysis : null}
                          />
                        </div>
                      ) : (
                        <EmptyImageState />
                      )}
                      <MapControls
                        onZoomIn={zoomIn}
                        onZoomOut={zoomOut}
                        canZoomIn={afterZoom < MAX_ZOOM}
                        canZoomOut={afterZoom > MIN_ZOOM}
                      />
                      <FullscreenButton targetRef={afterPanelRef} />
                      <span className="image-credit">
                        {Math.round(afterZoom * 100)}% zoom
                      </span>
                    </div>
                  </div>
                  <div className="imagery-footer">
                    <label className="overlay-toggle">
                      <input
                        type="checkbox"
                        checked={overlayVisible}
                        onChange={(event) =>
                          setOverlayVisible(event.target.checked)
                        }
                      />
                      <span className="toggle-track" />
                      Damage overlay
                    </label>
                    <FloatingLegend />
                  </div>
                </>
              ) : analysis ? (
                <ZoneMap
                  analysis={analysis}
                  postImageUrl={postUrl || undefined}
                />
              ) : (
                <div className="map-empty">
                  <Icon name="map" size={40} />
                  <h3>Your response area, mapped.</h3>
                  <p>
                    Run an assessment to explore ranked zones on an interactive
                    map.
                  </p>
                  <button
                    className="button primary"
                    onClick={runAnalysis}
                    disabled={loading || !canAnalyze}
                  >
                    {loading ? "Analyzing…" : "Analyze damage"}
                  </button>
                </div>
              )}
              <div className="imagery-note">
                <Icon name="info" size={15} />
                <span>
                  Before and after views share the same image scale. Zoom or
                  expand to inspect details.
                </span>
              </div>
            </section>

            <aside id="response-panel" className="panel response-panel">
              <div className="panel-heading">
                <div className="panel-title">
                  <Icon name="crosshair" size={18} />
                  <h2>Response priorities</h2>
                </div>
                {analysis && (
                  <span className="count-badge">{analysis.zones.length}</span>
                )}
              </div>
              <div className="detail-tabs">
                <button
                  className={detailView === "zones" ? "selected" : ""}
                  aria-pressed={detailView === "zones"}
                  onClick={() => setDetailView("zones")}
                >
                  Priority zones
                </button>
                <button
                  className={detailView === "brief" ? "selected" : ""}
                  aria-pressed={detailView === "brief"}
                  onClick={() => setDetailView("brief")}
                >
                  Situation brief
                  {briefLoading && <span className="small-spinner" />}
                </button>
              </div>
              {detailView === "zones" ? (
                <ZoneTable analysis={analysis} />
              ) : (
                <BriefPanel
                  brief={brief}
                  source={briefSource}
                  loading={briefLoading}
                  onDownloadReport={handleDownloadReport}
                  reportLoading={reportLoading}
                />
              )}
            </aside>
          </div>
          <footer className="workspace-footer">
            <span>
              <Icon name="info" size={14} />
              Decision support · Validate findings with field assessments.
            </span>
            <span>
              {analysisSeconds != null
                ? `Processed in ${analysisSeconds.toFixed(1)}s`
                : "Satellite imagery / Building-level assessment"}
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}
