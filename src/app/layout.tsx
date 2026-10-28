import type { Metadata } from 'next';
import './globals.css';
import { OptionWorkflowProvider } from '@/context/OptionWorkflowContext';

export const metadata: Metadata = {
  title: 'Options Lot Calculator | Option Chain & Capital Allocation',
  description:
    'Groww-inspired option chain selector and whole-lot capital allocation calculator for NIFTY 50, BANK NIFTY, SENSEX, and MCX Commodities.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#090c10] text-[#f0f6fc] antialiased min-h-screen selection:bg-indigo-500/30 selection:text-white">
        <OptionWorkflowProvider>{children}</OptionWorkflowProvider>
      </body>
    </html>
  );
}
