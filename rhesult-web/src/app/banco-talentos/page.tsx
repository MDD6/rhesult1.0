import type { Metadata } from "next";
import { TalentBankPageClient } from "@/features/talent-bank/components/TalentBankPageClient";

export const metadata: Metadata = {
  title: "Banco de Talentos • RHesult",
};

export default function BancoTalentosPage() {
  return <TalentBankPageClient />;
}
