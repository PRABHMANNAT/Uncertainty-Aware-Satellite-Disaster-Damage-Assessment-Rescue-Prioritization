import DemonstrationCenter from "@/components/DemonstrationCenter";
import type { Metadata } from "next";
import { RESEARCH_TITLE } from "@/lib/research";

export const metadata: Metadata = {
  title: `Demonstrations | ${RESEARCH_TITLE}`,
  description:
    "Guided natural-disaster demonstrations and dated historical satellite comparisons, with attributed imagery and assessment limitations.",
};
export default function DemonstrationsPage() {
  return <DemonstrationCenter />;
}
