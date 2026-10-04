import React, { useState } from 'react';
import { MoreHorizontal } from 'lucide-react';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  periodSelector?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  subtitle,
  periodSelector = true,
  children,
  className = ''
}) => {
  const [period, setPeriod] = useState('30D');

  return (
    <div className={`bg-white border border-[#DCE8E0] rounded-[10px] p-5 flex flex-col justify-between ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-[#0C2A1B]">{title}</h3>
          {subtitle && <p className="text-xs text-[#6A7B70] mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {periodSelector && (
            <div className="flex items-center gap-0.5 bg-[#F4FAF6] border border-[#DCE8E0] rounded-[6px] p-0.5 text-[11px] font-medium">
              {['7D', '30D', '1Y'].map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-2 py-0.5 rounded-[4px] cursor-pointer transition-colors ${
                    period === p ? 'bg-white text-[#0C2A1B] shadow-2xs font-semibold' : 'text-[#6A7B70] hover:text-[#0C2A1B]'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
          <button className="text-[#A3B1A8] hover:text-[#0C2A1B] p-1 rounded-[4px] hover:bg-[#F4FAF6] cursor-pointer">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="w-full flex-1 min-h-[200px] flex items-center justify-center">
        {children}
      </div>
    </div>
  );
};

// 1. Area Chart (Smooth curve with green gradient & tooltip)
export const CleanAreaChart: React.FC<{
  data: { label: string; value: number; secondary?: number }[];
  height?: number;
  formatValue?: (v: number) => string;
}> = ({ data, height = 220, formatValue = (v) => `PKR ${v.toLocaleString()}` }) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const maxValue = Math.max(...data.map(d => d.value), 1);
  const width = 500;
  const paddingX = 40;
  const paddingY = 25;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  // Build SVG points
  const points = data.map((d, i) => {
    const x = paddingX + (i / (data.length - 1)) * chartWidth;
    const y = height - paddingY - (d.value / maxValue) * chartHeight;
    return { x, y, data: d };
  });

  const pathD = points.reduce((acc, p, i, arr) => {
    if (i === 0) return `M ${p.x},${p.y}`;
    const prev = arr[i - 1];
    const cx = (prev.x + p.x) / 2;
    return `${acc} C ${cx},${prev.y} ${cx},${p.y} ${p.x},${p.y}`;
  }, '');

  const areaD = `${pathD} L ${points[points.length - 1].x},${height - paddingY} L ${points[0].x},${height - paddingY} Z`;

  return (
    <div className="w-full relative select-none">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible"
        onMouseLeave={() => setHoverIndex(null)}
      >
        <defs>
          <linearGradient id="areaGreenGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0F6B3E" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#0F6B3E" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Horizontal gridlines */}
        {[0, 0.33, 0.66, 1].map((ratio) => {
          const y = height - paddingY - ratio * chartHeight;
          return (
            <g key={ratio}>
              <line
                x1={paddingX}
                y1={y}
                x2={width - paddingX}
                y2={y}
                stroke="#E6F4EA"
                strokeWidth="1"
              />
              <text
                x={paddingX - 8}
                y={y + 3}
                textAnchor="end"
                className="text-[10px] fill-[#A3B1A8] font-mono tabular-nums"
              >
                {Math.round((maxValue * ratio) / 1000)}k
              </text>
            </g>
          );
        })}

        {/* Filled Area */}
        <path d={areaD} fill="url(#areaGreenGrad)" />

        {/* Primary Stroke */}
        <path d={pathD} fill="none" stroke="#0F6B3E" strokeWidth="2.5" strokeLinecap="round" />

        {/* Interactive Points */}
        {points.map((p, i) => (
          <g key={i}>
            <circle
              cx={p.x}
              cy={p.y}
              r={hoverIndex === i ? 5 : 3}
              fill="#FFFFFF"
              stroke="#0F6B3E"
              strokeWidth="2"
              className="cursor-pointer transition-all"
              onMouseEnter={() => setHoverIndex(i)}
            />
            <rect
              x={p.x - 15}
              y={0}
              width={30}
              height={height}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => setHoverIndex(i)}
            />
            {/* X Axis labels */}
            {(i === 0 || i === Math.floor(data.length / 2) || i === data.length - 1) && (
              <text
                x={p.x}
                y={height - 8}
                textAnchor="middle"
                className="text-[10px] fill-[#6A7B70] font-medium"
              >
                {p.data.label}
              </text>
            )}
          </g>
        ))}
      </svg>

      {/* Floating Hover Tooltip */}
      {hoverIndex !== null && (
        <div
          className="absolute pointer-events-none -top-2 transform -translate-x-1/2 bg-[#0C2A1B] text-white px-2.5 py-1 rounded-[6px] shadow-sm text-xs"
          style={{ left: `${(points[hoverIndex].x / width) * 100}%` }}
        >
          <div className="text-[10px] text-[#CDE9D6]">{data[hoverIndex].label}</div>
          <div className="font-semibold tabular-nums">{formatValue(data[hoverIndex].value)}</div>
        </div>
      )}
    </div>
  );
};

// 2. Bar Chart (Budget vs Final Price or Monthly Volume)
export const CleanBarChart: React.FC<{
  data: { label: string; primary: number; secondary?: number }[];
  height?: number;
  legendLabel?: { primary: string; secondary?: string };
}> = ({ data, height = 200, legendLabel = { primary: 'Actual Spent', secondary: 'Initial Budget' } }) => {
  const max = Math.max(...data.map(d => Math.max(d.primary, d.secondary || 0)), 1);

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center gap-4 text-xs font-medium text-[#6A7B70]">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-[#0F6B3E]" />
          <span>{legendLabel.primary}</span>
        </div>
        {legendLabel.secondary && (
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#A9D3B5]" />
            <span>{legendLabel.secondary}</span>
          </div>
        )}
      </div>

      <div className="w-full flex items-end justify-between gap-2 pt-4 border-b border-[#DCE8E0]" style={{ height }}>
        {data.map((d, i) => {
          const h1 = Math.round((d.primary / max) * (height - 35));
          const h2 = d.secondary ? Math.round((d.secondary / max) * (height - 35)) : 0;

          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
              <div className="w-full flex items-end justify-center gap-1 h-full">
                <div
                  className="w-3.5 bg-[#0F6B3E] rounded-t-[4px] transition-all duration-300 group-hover:bg-[#0B5632]"
                  style={{ height: h1 }}
                  title={`${d.label}: ${d.primary.toLocaleString()}`}
                />
                {d.secondary !== undefined && (
                  <div
                    className="w-3.5 bg-[#A9D3B5] rounded-t-[4px] transition-all duration-300"
                    style={{ height: h2 }}
                    title={`${d.label} (Budget): ${d.secondary.toLocaleString()}`}
                  />
                )}
              </div>
              <span className="text-[10px] text-[#6A7B70] font-medium truncate w-full text-center mt-1">
                {d.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// 3. Donut Chart (Category breakdown)
export const CleanDonutChart: React.FC<{
  data: { label: string; value: number; color?: string }[];
  size?: number;
}> = ({ data, size = 180 }) => {
  const total = data.reduce((acc, d) => acc + d.value, 0) || 1;
  const defaultColors = ['#0F6B3E', '#2FAE60', '#6BCB77', '#A9D3B5', '#CDE9D6', '#0C2A1B'];

  // SVG donut math
  let cumulative = 0;
  const radius = 68;
  const strokeWidth = 26;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 w-full py-2">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox="0 0 180 180" className="w-full h-full -rotate-90">
          {data.map((d, i) => {
            const pct = d.value / total;
            const strokeDasharray = `${pct * circumference} ${circumference}`;
            const strokeDashoffset = -cumulative * circumference;
            cumulative += pct;
            const color = d.color || defaultColors[i % defaultColors.length];

            return (
              <circle
                key={i}
                cx="90"
                cy="90"
                r={radius}
                fill="none"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-300 hover:opacity-85"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
          <span className="text-[11px] font-semibold text-[#6A7B70] uppercase">Total</span>
          <span className="text-xl font-bold text-[#0C2A1B] tabular-nums">
            {total.toLocaleString()}
          </span>
        </div>
      </div>

      <div className="space-y-1.5 min-w-[140px]">
        {data.map((d, i) => {
          const color = d.color || defaultColors[i % defaultColors.length];
          const pct = Math.round((d.value / total) * 100);
          return (
            <div key={i} className="flex items-center justify-between text-xs gap-3">
              <div className="flex items-center gap-2 truncate">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <span className="text-[#34453B] truncate">{d.label}</span>
              </div>
              <span className="font-mono text-[#6A7B70] tabular-nums">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// 4. Offer Funnel Chart (Sent, Viewed, Shortlisted, Won)
export const CleanFunnelChart: React.FC<{
  steps: { label: string; count: number; pct: number }[];
}> = ({ steps }) => {
  return (
    <div className="w-full space-y-2.5">
      {steps.map((s, idx) => (
        <div key={s.label} className="space-y-1">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-[#0C2A1B]">{s.label}</span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-[#0F6B3E] tabular-nums">{s.count}</span>
              <span className="text-[#6A7B70] text-[11px] tabular-nums">({s.pct}%)</span>
            </div>
          </div>
          <div className="h-4 bg-[#F4FAF6] border border-[#DCE8E0] rounded-[6px] overflow-hidden p-0.5">
            <div
              className="h-full rounded-[4px] bg-[#0F6B3E] transition-all duration-500"
              style={{
                width: `${s.pct}%`,
                opacity: 1 - idx * 0.18
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

// 5. Demand Heatmap (Single green scale)
export const CleanDemandHeatmap: React.FC = () => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const times = ['Morning', 'Noon', 'Evening', 'Night'];

  // Single green scale values 0-10
  const matrix = [
    [3, 5, 8, 4],
    [4, 6, 9, 3],
    [5, 6, 8, 5],
    [6, 7, 9, 4],
    [7, 8, 10, 6],
    [9, 10, 10, 7],
    [8, 9, 7, 5]
  ];

  const getColor = (v: number) => {
    if (v >= 9) return 'bg-[#0F6B3E] text-white';
    if (v >= 7) return 'bg-[#2FAE60] text-white';
    if (v >= 5) return 'bg-[#A9D3B5] text-[#0C2A1B]';
    return 'bg-[#E6F4EA] text-[#0F6B3E]';
  };

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[280px] space-y-1.5">
        <div className="grid grid-cols-5 text-[11px] font-semibold text-[#6A7B70] text-center pb-1">
          <div className="text-left">Day</div>
          {times.map(t => <div key={t}>{t}</div>)}
        </div>
        {days.map((day, dIdx) => (
          <div key={day} className="grid grid-cols-5 gap-1.5 items-center">
            <span className="text-xs font-medium text-[#0C2A1B]">{day}</span>
            {matrix[dIdx].map((val, tIdx) => (
              <div
                key={tIdx}
                className={`h-7 rounded-[4px] flex items-center justify-center text-xs font-semibold tabular-nums select-none ${getColor(val)}`}
                title={`${day} ${times[tIdx]}: Demand intensity ${val}/10`}
              >
                {val}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
