import Image from "next/image";
import Link from "next/link";
import { RESEARCH_TITLE } from "@/lib/research";

export default function ResearchIdentity({
  sidebar = false,
}: {
  sidebar?: boolean;
}) {
  return (
    <Link
      href="/"
      className={`research-identity${sidebar ? " sidebar-identity" : ""}`}
      aria-label="Research project home"
    >
      <Image
        src={`/branding/chandigarh-university-${sidebar ? "white" : "dark"}.webp`}
        alt="Chandigarh University"
        width={sidebar ? 245 : 304}
        height={sidebar ? 87 : 109}
        className="university-logo"
        priority
        unoptimized
      />
      <span className="research-identity-copy">
        <span className="research-identity-label">Research project</span>
        <span className="research-paper-title">{RESEARCH_TITLE}</span>
      </span>
    </Link>
  );
}
