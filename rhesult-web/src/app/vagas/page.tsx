import { Suspense } from 'react';
import { VagasPageClient } from '@/features/vagas/components/VagasPageClient';

export const metadata = {
  title: 'Vagas – Rhesult',
  description: 'Gestão de vagas'
};

function VagasLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#F58634]"></div>
        <p className="mt-4 text-gray-600">Carregando vagas...</p>
      </div>
    </div>
  );
}

export default function VagasPage() {
  return (
    <Suspense fallback={<VagasLoading />}>
      <VagasPageClient />
    </Suspense>
  );
}
