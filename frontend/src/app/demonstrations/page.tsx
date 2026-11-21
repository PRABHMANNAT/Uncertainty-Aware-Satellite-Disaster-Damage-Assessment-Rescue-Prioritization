import DemonstrationCenter from "@/components/DemonstrationCenter";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Demonstrations | DisasterIQ",
  description:
    "Guided natural-disaster demonstrations and dated historical satellite comparisons, with attributed imagery and assessment limitations.",
};
export default function DemonstrationsPage() {
  return <DemonstrationCenter />;
}
