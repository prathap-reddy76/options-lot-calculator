'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useOptionWorkflow } from '@/context/OptionWorkflowContext';
import {
  Calculator,
  RotateCcw,
  Sparkles,
  Layers,
  Cpu,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

interface HeaderProps {
  onReset?: () => void;
  onRestoreExample?: () => void;
  onOpenRoadmap?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onReset,
  onRestoreExample,
  onOpenRoadmap,
}) => {
  const pathname = usePathname();
  const {
    startAgain,
    loadExampleContracts,
    canContinue,
  } = useOptionWorkflow();

  const handleReset = onReset || startAgain;
  const handleRestoreExample = onRestoreExample || loadExampleContracts;

  const isStep1 = pathname === '/';
  const isStep2 = pathname === '/calculator';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#1e2538] bg-[#090c12]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand & Title */}
        <Link href="/" className="flex items-center gap-3 shrink-0 hover:opacity-95 transition-opacity">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-emerald-500 p-[1px] shadow-lg shadow-indigo-600/20">
            <div className="w-full h-full bg-[#0b0f19] rounded-[11px] flex items-center justify-center">
              <Calculator className="w-5 h-5 text-indigo-400" />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
                OPTIONS LOT CALCULATOR
              </h1>
              <Badge variant="ce" size="sm" className="hidden sm:inline-flex">
                Single-Page Automatic
              </Badge>
            </div>
            <p className="text-[11px] text-slate-400 hidden xs:block">
              Unified Real-Time Whole-Lot & Capital Allocation Engine
            </p>
          </div>
        </Link>

        {/* Center: Live Calculation Indicator */}
        <div className="hidden lg:flex items-center bg-[#10141f] border border-[#20273a] px-3 py-1.5 rounded-xl gap-2 text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-300 font-medium">Automatic Calculation Active</span>
          <span className="text-slate-500 font-mono text-[10px]">| Real-Time Reactivity</span>
        </div>

        {/* Quick Nav & Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {onOpenRoadmap && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onOpenRoadmap}
              icon={<Cpu className="w-3.5 h-3.5 text-indigo-400" />}
              className="hidden md:inline-flex"
            >
              Phase Architecture
            </Button>
          )}

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleRestoreExample}
            icon={<Sparkles className="w-3.5 h-3.5 text-amber-400" />}
            title="Restore test example values (NIFTY 24500 CE 40 / PE 60)"
          >
            <span className="hidden sm:inline">Load Example</span>
            <span className="sm:hidden">Example</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleReset}
            icon={<RotateCcw className="w-3.5 h-3.5" />}
            title="Reset selections and start again"
          >
            <span className="hidden sm:inline">Reset</span>
          </Button>
        </div>
      </div>
    </header>
  );
};
