import type { Metadata } from "next";
import ResearchExplorer from "@/components/research/ResearchExplorer";
import { RESEARCH_TITLE } from "@/lib/research";

export const metadata: Metadata = {
  title: `Paper Explorer | ${RESEARCH_TITLE}`,
  description:
    "Explore the implemented satellite-damage workflow, priority formula, uncertainty concepts, and validation metrics through interactive explanations and clearly labelled educational examples.",
};
export default function ResearchPage() {
  return <ResearchExplorer />;
}
