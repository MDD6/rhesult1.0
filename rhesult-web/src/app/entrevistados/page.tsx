import type { Metadata } from "next";
import { InterviewedPageClient } from "@/features/interviewed/components/InterviewedPageClient";

export const metadata: Metadata = {
  title: "Candidatos Entrevistados • RHesult",
};

export default function EntrevistadosPage() {
  return <InterviewedPageClient />;
}
