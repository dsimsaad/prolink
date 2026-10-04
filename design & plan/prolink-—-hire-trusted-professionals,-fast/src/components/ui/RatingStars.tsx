import React from 'react';
import { Star } from 'lucide-react';

interface RatingStarsProps {
  rating: number;
  totalReviews?: number;
  size?: 'sm' | 'md' | 'lg';
  showNumber?: boolean;
  className?: string;
}

export const RatingStars: React.FC<RatingStarsProps> = ({
  rating,
  totalReviews,
  size = 'md',
  showNumber = true,
  className = ''
}) => {
  const starSize = size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';
  const textSize = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base font-semibold' : 'text-sm font-medium';

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <div className="flex items-center gap-0.5 text-[#E8A317]">
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = rating >= star;
          const half = !filled && rating >= star - 0.5;

          return (
            <Star
              key={star}
              className={`${starSize} ${filled ? 'fill-[#E8A317]' : half ? 'fill-[#E8A317]/50' : 'fill-neutral-200 text-neutral-300'}`}
            />
          );
        })}
      </div>
      {showNumber && (
        <span className={`${textSize} text-[#0C2A1B] tabular-nums font-semibold`}>
          {rating.toFixed(2)}
        </span>
      )}
      {totalReviews !== undefined && (
        <span className="text-xs text-[#6A7B70] tabular-nums">
          ({totalReviews})
        </span>
      )}
    </div>
  );
};

export const RatingDistribution: React.FC<{ distribution: Record<number, number>; total: number }> = ({ distribution, total }) => {
  return (
    <div className="space-y-1.5 w-full">
      {[5, 4, 3, 2, 1].map((stars) => {
        const count = distribution[stars] || 0;
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        return (
          <div key={stars} className="flex items-center gap-2 text-xs">
            <span className="w-10 text-right text-[#6A7B70] font-medium flex items-center justify-end gap-1">
              <span>{stars}</span>
              <Star className="w-3 h-3 fill-[#E8A317] text-[#E8A317]" />
            </span>
            <div className="flex-1 h-2 bg-[#F4FAF6] border border-[#DCE8E0] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#0F6B3E] rounded-full transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="w-8 text-right text-[#6A7B70] tabular-nums font-mono">
              {pct}%
            </span>
          </div>
        );
      })}
    </div>
  );
};
