import type { Metadata } from "next";
import { TalentBankApplicationMobilePageClient } from "@/features/talent-bank/components/TalentBankApplicationMobilePageClient";

export const metadata: Metadata = {
  title: "Inscrições • RHesult",
};

export default function InscricoesPage() {
  return <TalentBankApplicationMobilePageClient />;
}
