import React from 'react';
import { Navigation, MapPin } from 'lucide-react';

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  title: string;
  label?: string;
  price?: string;
  urgency?: 'urgent' | 'today' | 'flexible';
  isHired?: boolean;
}

interface StylizedMapProps {
  city?: string;
  markers?: MapMarker[];
  showRoute?: boolean;
  routeEta?: string;
  showRadius?: boolean;
  radiusKm?: number;
  showDensityBubbles?: boolean;
  densityData?: { area: string; count: number; x: number; y: number }[];
  className?: string;
  height?: string | number;
  onMarkerClick?: (marker: MapMarker) => void;
}

export const StylizedMap: React.FC<StylizedMapProps> = ({
  city = 'Islamabad',
  markers = [],
  showRoute = false,
  routeEta = '18 mins',
  showRadius = false,
  radiusKm = 20,
  showDensityBubbles = false,
  densityData,
  className = '',
  height = 280,
  onMarkerClick
}) => {
  // Coords projected to a 600x380 SVG canvas
  return (
    <div
      className={`relative w-full overflow-hidden rounded-[10px] border border-[#DCE8E0] bg-[#F4FAF6] select-none ${className}`}
      style={{ height }}
    >
      <svg
        viewBox="0 0 600 380"
        className="w-full h-full"
        preserveAspectRatio="xMidYMid slice"
      >
        {/* Soft land texture */}
        <rect width="600" height="380" fill="#F4FAF6" />

        {/* Natural Water Body (e.g. Rawal Lake in Islamabad or Ravi River in Lahore) */}
        {city === 'Islamabad' ? (
          <path
            d="M 440,40 Q 480,90 490,140 T 540,210 T 590,240 L 600,240 L 600,0 L 410,0 Z"
            fill="#E1EFEA"
            stroke="#CDE9D6"
            strokeWidth="1.5"
          />
        ) : (
          <path
            d="M 0,60 Q 180,80 320,50 T 600,30 L 600,0 L 0,0 Z"
            fill="#E1EFEA"
            stroke="#CDE9D6"
            strokeWidth="1.5"
          />
        )}

        {/* Margalla Hills backdrop for Islamabad */}
        {city === 'Islamabad' && (
          <path
            d="M 0,25 Q 120,5 240,20 T 480,10 T 600,22 L 600,0 L 0,0 Z"
            fill="#E6F4EA"
            stroke="#CDE9D6"
            strokeWidth="1"
          />
        )}

        {/* Major arterial roads (White crisp bands with subtle border) */}
        <g stroke="#FFFFFF" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round">
          {/* Main Highway / Expressway */}
          <line x1="40" y1="40" x2="560" y2="340" />
          {/* Jinnah Avenue / Main Boulevard */}
          <line x1="80" y1="360" x2="480" y2="30" />
          {/* 7th Avenue / Cross arteries */}
          <line x1="280" y1="20" x2="280" y2="360" />
          <line x1="180" y1="50" x2="180" y2="350" />
          <line x1="380" y1="30" x2="380" y2="360" />
          <line x1="60" y1="180" x2="540" y2="180" />
          <line x1="120" y1="260" x2="520" y2="260" />
        </g>

        {/* Road center lines */}
        <g stroke="#E3EFE8" strokeWidth="1.5" strokeDasharray="4,4">
          <line x1="40" y1="40" x2="560" y2="340" />
          <line x1="80" y1="360" x2="480" y2="30" />
          <line x1="280" y1="20" x2="280" y2="360" />
        </g>

        {/* Sector Grids & Labels */}
        <g className="text-[11px] font-medium fill-[#6A7B70] tracking-wider select-none">
          {city === 'Islamabad' ? (
            <>
              <text x="140" y="110">F-8</text>
              <text x="240" y="110">F-7</text>
              <text x="340" y="110">F-6</text>
              <text x="140" y="210">G-8</text>
              <text x="240" y="210">G-7</text>
              <text x="340" y="210">BLUE AREA</text>
              <text x="140" y="300">I-8</text>
              <text x="240" y="300">H-8</text>
              <text x="470" y="90" className="text-[10px] fill-[#2FAE60]">RAWAL LAKE</text>
              <text x="70" y="40" className="text-[10px] fill-[#2FAE60]">MARGALLA FOOTHILLS</text>
            </>
          ) : (
            <>
              <text x="140" y="120">GULBERG III</text>
              <text x="320" y="120">DHA PHASE 5</text>
              <text x="140" y="240">MODEL TOWN</text>
              <text x="320" y="240">CANTT</text>
              <text x="240" y="320">JOHAR TOWN</text>
            </>
          )}
        </g>

        {/* Travel radius circle (if enabled) */}
        {showRadius && (
          <g>
            <circle
              cx="260"
              cy="180"
              r="110"
              fill="#E6F4EA"
              fillOpacity="0.45"
              stroke="#2FAE60"
              strokeWidth="1.5"
              strokeDasharray="6,4"
            />
            <circle cx="260" cy="180" r="5" fill="#0F6B3E" />
            <text x="270" y="176" className="text-[10px] font-semibold fill-[#0F6B3E]">
              {radiusKm} km travel radius
            </text>
          </g>
        )}

        {/* Route Line & ETA Chip (Customer live tracking) */}
        {showRoute && (
          <g>
            {/* Pulsing route line */}
            <path
              d="M 175,220 Q 220,190 245,150 T 265,115"
              fill="none"
              stroke="#0F6B3E"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d="M 175,220 Q 220,190 245,150 T 265,115"
              fill="none"
              stroke="#CDE9D6"
              strokeWidth="2"
              strokeDasharray="4,6"
              strokeLinecap="round"
            />

            {/* Moving Pro Marker */}
            <g transform="translate(205, 175)">
              <circle r="14" fill="#0F6B3E" />
              <circle r="18" fill="#0F6B3E" fillOpacity="0.25" className="animate-ping" />
              <path d="M -5,-5 L 5,0 L -5,5 Z" fill="#FFFFFF" />
            </g>

            {/* Destination Pin (Customer home) */}
            <g transform="translate(265, 115)">
              <circle r="8" fill="#E8A317" stroke="#FFFFFF" strokeWidth="2" />
              <circle r="3" fill="#0C2A1B" />
            </g>

            {/* Route ETA Floating Chip */}
            <g transform="translate(195, 135)">
              <rect
                x="0"
                y="0"
                width="82"
                height="24"
                rx="6"
                fill="#0C2A1B"
                stroke="#DCE8E0"
                strokeWidth="1"
              />
              <text x="8" y="16" fill="#FFFFFF" className="text-[11px] font-semibold">
                ETA {routeEta}
              </text>
            </g>
          </g>
        )}

        {/* Admin Density Bubbles (if enabled) */}
        {showDensityBubbles && (densityData || [
          { area: 'F-7 / F-8', count: 184, x: 210, y: 110 },
          { area: 'Blue Area', count: 142, x: 330, y: 170 },
          { area: 'I-8 / G-9', count: 96, x: 190, y: 250 },
          { area: 'DHA II / Bahria', count: 210, x: 440, y: 290 }
        ]).map((d, i) => (
          <g key={i} transform={`translate(${d.x}, ${d.y})`}>
            <circle
              r={24 + Math.min(30, d.count / 6)}
              fill="#0F6B3E"
              fillOpacity="0.18"
              stroke="#0F6B3E"
              strokeWidth="1.5"
            />
            <circle r="16" fill="#FFFFFF" stroke="#0F6B3E" strokeWidth="1" />
            <text x="0" y="4" textAnchor="middle" className="text-[11px] font-bold fill-[#0C2A1B] tabular-nums">
              {d.count}
            </text>
            <text x="0" y="24" textAnchor="middle" className="text-[10px] font-medium fill-[#34453B]">
              {d.area}
            </text>
          </g>
        ))}

        {/* Discrete Pins */}
        {markers.map((m, idx) => {
          // Normalize lat/lng or distribute across canvas
          const x = 120 + ((idx * 85) % 400);
          const y = 90 + ((idx * 65) % 240);
          const isUrgent = m.urgency === 'urgent';
          const pinColor = isUrgent ? '#B42318' : m.urgency === 'today' ? '#C77D0A' : '#0F6B3E';

          return (
            <g
              key={m.id}
              transform={`translate(${x}, ${y})`}
              className="cursor-pointer group"
              onClick={() => onMarkerClick && onMarkerClick(m)}
            >
              <circle
                r="12"
                fill={pinColor}
                stroke="#FFFFFF"
                strokeWidth="2"
                className="transition-transform group-hover:scale-125"
              />
              <circle r="4" fill="#FFFFFF" />
              {m.price && (
                <g transform="translate(14, -10)">
                  <rect
                    x="0"
                    y="0"
                    width="62"
                    height="18"
                    rx="4"
                    fill="#FFFFFF"
                    stroke="#DCE8E0"
                    strokeWidth="1"
                    className="shadow-xs"
                  />
                  <text x="6" y="13" className="text-[10px] font-bold fill-[#0C2A1B] tabular-nums">
                    {m.price}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>

      {/* Floating map controls & city badge */}
      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2.5 py-1 bg-white/95 border border-[#DCE8E0] rounded-[6px] shadow-xs text-xs font-semibold text-[#0C2A1B]">
        <MapPin className="w-3.5 h-3.5 text-[#0F6B3E]" />
        <span>{city}, Pakistan</span>
      </div>

      {showRoute && (
        <div className="absolute bottom-2.5 right-2.5 flex items-center gap-2 px-3 py-1.5 bg-[#0C2A1B] text-white rounded-[6px] shadow-xs text-xs font-medium">
          <Navigation className="w-3.5 h-3.5 text-[#2FAE60] animate-pulse" />
          <span>Live technician GPS dispatch</span>
        </div>
      )}
    </div>
  );
};
