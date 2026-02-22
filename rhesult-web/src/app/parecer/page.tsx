import type { Metadata } from "next";
import { ParecerPageClient } from "@/features/parecer/components/ParecerPageClient";

export const metadata: Metadata = {
  title: "Parecer Técnico • RHesult",
};

export default function ParecerPage() {
  return <ParecerPageClient />;
}
