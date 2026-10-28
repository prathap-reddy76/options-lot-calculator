import React from 'react';

interface SliderProps {
  value: number; // 0 to 100 (CE percentage)
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
}

export const AllocationSlider: React.FC<SliderProps> = ({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
}) => {
  const cePercent = Math.min(100, Math.max(0, value));
  const pePercent = 100 - cePercent;

  const presets = [
    { label: '0 / 100 PE', ce: 0 },
    { label: '25 / 75', ce: 25 },
    { label: '50 / 50 Equal', ce: 50 },
    { label: '75 / 25', ce: 75 },
    { label: '100 / 0 CE', ce: 100 },
  ];

  return (
    <div className="w-full space-y-3">
      {/* Slider Visual Track */}
      <div className="relative pt-1">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={cePercent}
          disabled={disabled}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="w-full h-3 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: `linear-gradient(to right, #10b981 0%, #10b981 ${cePercent}%, #ef4444 ${cePercent}%, #ef4444 100%)`,
          }}
        />
        <div className="flex justify-between text-[11px] font-mono text-slate-400 mt-1.5">
          <span className="text-emerald-400 font-medium">CE: {cePercent}%</span>
          <span className="text-slate-400">Ratio Split</span>
          <span className="text-rose-400 font-medium">PE: {pePercent}%</span>
        </div>
      </div>

      {/* Quick Preset Buttons */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mr-1">
          Presets:
        </span>
        {presets.map((p) => {
          const isActive = cePercent === p.ce;
          return (
            <button
              key={p.ce}
              type="button"
              disabled={disabled}
              onClick={() => onChange(p.ce)}
              className={`text-xs px-2.5 py-1 rounded-md font-mono transition-all ${
                isActive
                  ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 font-semibold'
                  : 'bg-[#181f2f] text-slate-400 hover:text-slate-200 hover:bg-[#20293d] border border-[#252f47]'
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
