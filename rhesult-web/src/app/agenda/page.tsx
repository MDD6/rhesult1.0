import type { Metadata } from "next";
import { AgendaPageClient } from "@/features/agenda/components/AgendaPageClient";

export const metadata: Metadata = {
  title: "Agenda de Entrevistas • RHesult",
};

export default function AgendaPage() {
  return <AgendaPageClient />;
}
