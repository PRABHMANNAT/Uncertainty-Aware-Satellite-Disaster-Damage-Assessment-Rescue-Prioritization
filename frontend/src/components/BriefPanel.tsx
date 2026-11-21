"use client";
import Icon from "./Icon";
interface Props {
  brief: string | null;
  source: string | null;
  loading: boolean;
  onDownloadReport?: () => void;
  reportLoading?: boolean;
}
export default function BriefPanel({
  brief,
  source,
  loading,
  onDownloadReport,
  reportLoading,
}: Props) {
  if (loading)
    return (
      <div className="brief-content" role="status">
        <div className="brief-loading">
          <span className="small-spinner" />
          Preparing situation brief
        </div>
        <p className="supporting-text">
          Turning the assessment into response priorities and field
          recommendations.
        </p>
        <div className="skeleton-lines">
          <span />
          <span />
          <span />
          <span />
        </div>
      </div>
    );
  if (!brief)
    return (
      <div className="detail-empty">
        <span className="empty-icon">
          <Icon name="file" size={27} />
        </span>
        <h3>A brief built for the field.</h3>
        <p>
          Run an assessment to get a damage summary, response priorities, and
          recommended next steps.
        </p>
        <span className="empty-hint">
          Your situation brief will appear here
        </span>
      </div>
    );
  return (
    <div className="brief-content">
      <div className="brief-heading">
        <h3>Executive summary</h3>
        <span className="neutral-badge">English</span>
      </div>
      <article className="brief-text">{brief}</article>
      <div className="brief-provenance">
        <Icon name="info" size={15} />
        <span>
          {source === "fireworks"
            ? "Generated summary · Review against field reports"
            : "Template summary · Based on assessment data"}
        </span>
      </div>
      <button
        className="button report-download"
        onClick={onDownloadReport}
        disabled={!onDownloadReport || reportLoading}
      >
        <Icon name="download" size={16} />
        {reportLoading ? "Preparing PDF…" : "Download field report (PDF)"}
      </button>
    </div>
  );
}
