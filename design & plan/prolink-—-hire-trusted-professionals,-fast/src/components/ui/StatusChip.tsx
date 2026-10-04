import React from 'react';
import { Circle, Inbox, Clock, CheckCircle2, XCircle, Flag, ShieldAlert, ShieldCheck } from 'lucide-react';
import { JobStatus } from '../../types';

interface StatusChipProps {
  status: JobStatus | 'pending_verification' | 'verified' | 'rejected' | 'active' | 'suspended';
  size?: 'sm' | 'md';
  className?: string;
}

export const StatusChip: React.FC<StatusChipProps> = ({ status, size = 'sm', className = '' }) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-medium';
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';

  switch (status) {
    case 'open':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-[#E6F4EA] text-[#0B5632] font-medium border border-[#CDE9D6] ${sizeClasses} ${className}`}>
          <Circle className={`${iconSize} stroke-[2.5]`} />
          <span>Open</span>
        </span>
      );
    case 'offers_received':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-[#E6F4EA] text-[#0F6B3E] font-semibold border border-[#A9D3B5] ${sizeClasses} ${className}`}>
          <Inbox className={`${iconSize} stroke-[2]`} />
          <span>Offers Received</span>
        </span>
      );
    case 'in_progress':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-[#FEF3C7] text-[#92400E] font-medium border border-[#FDE68A] ${sizeClasses} ${className}`}>
          <Clock className={`${iconSize} stroke-[2]`} />
          <span>In Progress</span>
        </span>
      );
    case 'completed':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-[#0F6B3E]/10 text-[#0F6B3E] font-semibold border border-[#0F6B3E]/20 ${sizeClasses} ${className}`}>
          <CheckCircle2 className={`${iconSize} stroke-[2.5]`} />
          <span>Completed</span>
        </span>
      );
    case 'cancelled':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-[#FEE2E2] text-[#B42318] font-medium border border-[#FECACA] ${sizeClasses} ${className}`}>
          <XCircle className={`${iconSize} stroke-[2]`} />
          <span>Cancelled</span>
        </span>
      );
    case 'disputed':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-[#FEF2F2] text-[#991B1B] font-medium border border-[#FCA5A5] ${sizeClasses} ${className}`}>
          <Flag className={`${iconSize} stroke-[2]`} />
          <span>Disputed</span>
        </span>
      );
    case 'pending_verification':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-[#FFFBEB] text-[#B45309] font-medium border border-[#FCD34D] ${sizeClasses} ${className}`}>
          <ShieldAlert className={`${iconSize} stroke-[2]`} />
          <span>Pending Verification</span>
        </span>
      );
    case 'verified':
    case 'active':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-[#E6F4EA] text-[#0F6B3E] font-medium border border-[#CDE9D6] ${sizeClasses} ${className}`}>
          <ShieldCheck className={`${iconSize} stroke-[2]`} />
          <span>{status === 'active' ? 'Active' : 'Verified'}</span>
        </span>
      );
    case 'suspended':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-[#F3F4F6] text-[#4B5563] font-medium border border-[#E5E7EB] ${sizeClasses} ${className}`}>
          <XCircle className={`${iconSize} stroke-[2]`} />
          <span>Suspended</span>
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-[#F4FAF6] text-[#6A7B70] font-medium border border-[#DCE8E0] ${sizeClasses} ${className}`}>
          <span>{String(status)}</span>
        </span>
      );
  }
};
