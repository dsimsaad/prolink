import React, { useState } from 'react';
import { ArrowUpRight, ArrowDownRight, ChevronRight, HelpCircle } from 'lucide-react';

export interface MetricItem {
  id: string;
  label: string;
  value: string | number;
  unit?: string;
  delta?: {
    value: string;
    direction: 'positive' | 'negative' | 'neutral';
    timeframe?: string;
  };
  tooltip?: string;
  sparkline?: number[];
  onClick?: () => void;
}

interface MetricsStripProps {
  metrics: MetricItem[];
  periods?: string[];
  selectedPeriod?: string;
  onPeriodChange?: (period: string) => void;
  loading?: boolean;
  className?: string;
}

export const MetricsStrip: React.FC<MetricsStripProps> = ({
  metrics,
  periods = ['Today', '7 days', '30 days', '12 months'],
  selectedPeriod: controlledPeriod,
  onPeriodChange,
  loading = false,
  className = ''
}) => {
  const [internalPeriod, setInternalPeriod] = useState(periods[2] || '30 days');
  const currentPeriod = controlledPeriod || internalPeriod;

  const handlePeriodChange = (p: string) => {
    setInternalPeriod(p);
    onPeriodChange?.(p);
  };

  return (
    <div className={`space-y-2.5 ${className}`}>
      {/* Top row with period selector */}
      {periods.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#6A7B70]">
            Performance Metrics
          </div>
          <div className="inline-flex items-center gap-1 p-0.5 bg-[#F4FAF6] border border-[#DCE8E0] rounded-[8px]">
            {periods.map((p) => {
              const isActive = currentPeriod === p;
              return (
                <button
                  key={p}
                  onClick={() => handlePeriodChange(p)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-[6px] transition-colors cursor-pointer select-none ${
                    isActive
                      ? 'bg-white text-[#0C2A1B] shadow-2xs font-semibold'
                      : 'text-[#6A7B70] hover:text-[#0C2A1B]'
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main KPI metrics strip container */}
      <div className="w-full bg-white border border-[#DCE8E0] rounded-[10px] grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 divide-y md:divide-y-0 md:divide-x divide-[#DCE8E0] overflow-hidden">
        {metrics.map((m) => {
          return (
            <div
              key={m.id}
              onClick={m.onClick}
              className={`p-4 transition-colors flex flex-col justify-between group ${
                m.onClick ? 'cursor-pointer hover:bg-[#F4FAF6]' : ''
              }`}
            >
              {/* Metric Label & Optional Tooltip */}
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[13px] font-medium text-[#6A7B70] truncate group-hover:text-[#0C2A1B]">
                  {m.label}
                </span>
                {m.tooltip ? (
                  <span title={m.tooltip} className="text-[#A3B1A8] hover:text-[#6A7B70]">
                    <HelpCircle className="w-3.5 h-3.5" />
                  </span>
                ) : m.onClick ? (
                  <ChevronRight className="w-3.5 h-3.5 text-transparent group-hover:text-[#0F6B3E] transition-colors" />
                ) : null}
              </div>

              {/* Metric Value */}
              <div className="flex items-baseline gap-1 my-1">
                <span className="text-[26px] lg:text-[28px] font-semibold text-[#0C2A1B] tracking-tight tabular-nums">
                  {loading ? (
                    <div className="h-8 w-24 bg-[#E6F4EA] animate-pulse rounded-[4px]" />
                  ) : (
                    m.value
                  )}
                </span>
                {m.unit && !loading && (
                  <span className="text-xs font-medium text-[#6A7B70]">
                    {m.unit}
                  </span>
                )}
              </div>

              {/* Quiet Delta Row & Sparkline */}
              <div className="flex items-center justify-between pt-1">
                {m.delta ? (
                  <div className="flex items-center gap-1 text-xs">
                    {m.delta.direction === 'positive' ? (
                      <span className="inline-flex items-center text-[#2FAE60] font-medium">
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        <span>{m.delta.value}</span>
                      </span>
                    ) : m.delta.direction === 'negative' ? (
                      <span className="inline-flex items-center text-[#B42318] font-medium">
                        <ArrowDownRight className="w-3.5 h-3.5" />
                        <span>{m.delta.value}</span>
                      </span>
                    ) : (
                      <span className="text-[#6A7B70] font-medium">
                        {m.delta.value}
                      </span>
                    )}
                    <span className="text-[11px] text-[#A3B1A8] hidden xl:inline">
                      {m.delta.timeframe || 'vs prev'}
                    </span>
                  </div>
                ) : (
                  <div className="h-4" />
                )}

                {/* 1.5px Forest Sparkline */}
                {m.sparkline && m.sparkline.length > 2 && (
                  <svg className="w-14 h-4 hidden sm:block shrink-0" viewBox="0 0 56 16">
                    <polyline
                      fill="none"
                      stroke="#0F6B3E"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={m.sparkline
                        .map((val, idx) => {
                          const x = (idx / (m.sparkline!.length - 1)) * 54 + 1;
                          const max = Math.max(...m.sparkline!);
                          const min = Math.min(...m.sparkline!);
                          const range = max - min || 1;
                          const y = 15 - ((val - min) / range) * 13;
                          return `${x},${y}`;
                        })
                        .join(' ')}
                    />
                  </svg>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
