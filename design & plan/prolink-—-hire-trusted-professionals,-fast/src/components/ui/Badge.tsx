import React from 'react';
import { ShieldCheck, Award, Zap } from 'lucide-react';

interface BadgeProps {
  type: 'verified' | 'top_rated' | 'fast_responder';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ type, size = 'sm', className = '' }) => {
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';
  const textClass = size === 'sm' ? 'text-[11px] py-0.5 px-2' : 'text-xs py-1 px-2.5';

  switch (type) {
    case 'top_rated':
      return (
        <span className={`inline-flex items-center gap-1 rounded-full font-semibold bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A] shadow-2xs ${textClass} ${className}`}>
          <Award className={`${iconSize} text-[#E8A317]`} />
          <span>Top Rated</span>
        </span>
      );
    case 'verified':
      return (
        <span className={`inline-flex items-center gap-1 rounded-full font-semibold bg-[#E6F4EA] text-[#0F6B3E] border border-[#CDE9D6] ${textClass} ${className}`}>
          <ShieldCheck className={`${iconSize} text-[#2FAE60]`} />
          <span>Verified Pro</span>
        </span>
      );
    case 'fast_responder':
      return (
        <span className={`inline-flex items-center gap-1 rounded-full font-semibold bg-[#F4FAF6] text-[#0C2A1B] border border-[#DCE8E0] ${textClass} ${className}`}>
          <Zap className={`${iconSize} text-[#E8A317] fill-[#E8A317]`} />
          <span>Fast Responder</span>
        </span>
      );
  }
};
