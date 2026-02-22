import type { Metadata } from "next";
import { TalentBankApplicationMobilePageClient } from "@/features/talent-bank/components/TalentBankApplicationMobilePageClient";

export const metadata: Metadata = {
  title: "Aplicação Banco de Talentos • RHesult",
};

export default function BancoTalentosAplicacaoPage() {
  return <TalentBankApplicationMobilePageClient />;
}
