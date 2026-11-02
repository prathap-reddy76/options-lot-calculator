'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Redirects legacy /calculator route to the unified Single-Page Calculator at /
 */
export default function CalculatorRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return (
    <div className="min-h-screen bg-[#090c10] text-[#f0f6fc] flex flex-col items-center justify-center p-4">
      <div className="bg-[#10141f] border border-[#20273a] rounded-2xl p-8 max-w-md w-full text-center space-y-4 shadow-xl">
        <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <h2 className="text-base font-bold text-white">Single-Page Options Lot Calculator</h2>
        <p className="text-xs text-slate-400">
          The calculator has been combined into a unified single-page workflow. Redirecting to home...
        </p>
      </div>
    </div>
  );
}
