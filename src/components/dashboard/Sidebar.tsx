'use client';

import React from 'react';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  FileSpreadsheet,
  AlertTriangle,
  Layers,
  BarChart3,
  HelpCircle,
} from 'lucide-react';

interface SidebarProps {
  activeSection: string;
  onNavigate: (sectionId: string) => void;
  capitalAmount: number | null;
  affordableCeLots: number;
  affordablePeLots: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onNavigate,
  capitalAmount,
  affordableCeLots,
  affordablePeLots,
}) => {
  const navItems = [
    {
      id: 'section-market',
      label: 'Market Selection',
      icon: <Layers className="w-4 h-4" />,
    },
    {
      id: 'section-chain',
      label: 'Option Chain',
      icon: <Layers className="w-4 h-4 text-indigo-400" />,
    },
    {
      id: 'section-capital',
      label: 'Capital & Allocation',
      icon: <Wallet className="w-4 h-4" />,
    },
    {
      id: 'section-ce',
      label: 'CE Leg Calculator',
      icon: <TrendingUp className="w-4 h-4 text-emerald-400" />,
      badge: `${affordableCeLots} lots`,
    },
    {
      id: 'section-pe',
      label: 'PE Leg Calculator',
      icon: <TrendingDown className="w-4 h-4 text-rose-400" />,
      badge: `${affordablePeLots} lots`,
    },
    {
      id: 'section-distribution',
      label: 'Capital Distribution',
      icon: <BarChart3 className="w-4 h-4" />,
    },
    {
      id: 'section-summary',
      label: 'Executive Summary',
      icon: <FileSpreadsheet className="w-4 h-4 text-indigo-400" />,
    },
    {
      id: 'section-disclaimer',
      label: 'Disclaimer & Notes',
      icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
    },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 space-y-6 sticky top-20 self-start">
      {/* Navigation Card */}
      <div className="bg-[#10141f] border border-[#20273a] rounded-xl p-3 space-y-1">
        <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Navigation
        </div>

        {navItems.map((item) => {
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#161c2a]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {item.icon}
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Quick Info Box */}
      <div className="bg-[#0c1018] border border-[#1d2538] rounded-xl p-4 space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-300">
          <HelpCircle className="w-4 h-4 text-indigo-400" />
          <span>Manual Mode Active</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Zero external broker dependencies. All lot affordability calculations execute client-side
          instantly in real time.
        </p>
      </div>
    </aside>
  );
};
