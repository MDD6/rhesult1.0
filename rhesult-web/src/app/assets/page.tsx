import type { Metadata } from "next";
import { CorporativoPageClient } from "@/features/corporativo/components/CorporativoPageClient";

export const metadata: Metadata = {
  title: "Corporativo • RHesult",
};

export default function AssetsPage() {
  return <CorporativoPageClient />;
}
