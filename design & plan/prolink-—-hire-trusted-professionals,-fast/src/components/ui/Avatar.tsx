import React, { useState } from 'react';
import { ShieldCheck } from 'lucide-react';

interface AvatarProps {
  src?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isOnline?: boolean;
  isVerified?: boolean;
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = 'md',
  isOnline,
  isVerified,
  className = ''
}) => {
  const [imgError, setImgError] = useState(false);

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-base font-semibold',
    xl: 'w-20 h-20 text-xl font-bold'
  }[size];

  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0].toUpperCase())
    .join('');

  return (
    <div className={`relative inline-block select-none shrink-0 ${className}`}>
      <div className={`${sizeClasses} rounded-full overflow-hidden border border-[#DCE8E0] bg-[#E6F4EA] text-[#0F6B3E] font-medium flex items-center justify-center`}>
        {src && !imgError ? (
          <img
            src={src}
            alt={name}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <span>{initials || 'PL'}</span>
        )}
      </div>

      {/* Online presence dot */}
      {isOnline !== undefined && (
        <span
          className={`absolute bottom-0 right-0 block rounded-full ring-2 ring-white ${
            isOnline ? 'bg-[#2FAE60]' : 'bg-[#A3B1A8]'
          } ${size === 'sm' ? 'w-2 h-2' : size === 'xl' ? 'w-4 h-4' : 'w-2.5 h-2.5'}`}
          title={isOnline ? 'Online now' : 'Offline'}
        />
      )}

      {/* Verified Shield Overlay */}
      {isVerified && (
        <span
          className={`absolute -top-1 -right-1 bg-white rounded-full p-0.5 shadow-2xs text-[#2FAE60]`}
          title="Verified Pro"
        >
          <ShieldCheck className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5 fill-[#E6F4EA]'} />
        </span>
      )}
    </div>
  );
};
