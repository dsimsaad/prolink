import React, { useState } from 'react';
import { Star, X, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/Button';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (review: { rating: number; tags: string[]; text: string }) => void;
  proName: string;
  jobTitle: string;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  proName,
  jobTitle
}) => {
  const [rating, setRating] = useState(5);
  const [selectedTags, setSelectedTags] = useState<string[]>(['On time', 'Clean work', 'Transparent fee']);
  const [reviewText, setReviewText] = useState('Excellent work. Resolved the circuit fault promptly and tested all breakers.');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const availableTags = [
    'On time',
    'Clean work',
    'Transparent fee',
    'Polite behavior',
    'Genuine parts',
    'Zero mess left',
    'Fair rate',
    'Master craftsman'
  ];

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onSubmit({
        rating,
        tags: selectedTags,
        text: reviewText
      });
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-[12px] border border-[#DCE8E0] shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in zoom-in-95">
        <div className="flex items-start justify-between pb-3 border-b border-[#DCE8E0]">
          <div>
            <span className="text-xs font-semibold text-[#0F6B3E] uppercase tracking-wider">
              Mark Job Completed & Release Escrow
            </span>
            <h3 className="text-lg font-bold text-[#0C2A1B] mt-0.5">
              Review {proName}
            </h3>
            <p className="text-xs text-[#6A7B70] mt-0.5">
              For "{jobTitle.slice(0, 45)}..."
            </p>
          </div>
          <button onClick={onClose} className="text-[#A3B1A8] hover:text-[#0C2A1B] cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Star selector */}
          <div className="text-center space-y-1 py-2">
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="p-1 cursor-pointer focus:outline-none transition-transform hover:scale-115"
                >
                  <Star
                    className={`w-8 h-8 ${
                      rating >= star
                        ? 'fill-[#E8A317] text-[#E8A317]'
                        : 'fill-neutral-100 text-neutral-300'
                    }`}
                  />
                </button>
              ))}
            </div>
            <span className="text-xs font-semibold text-[#0C2A1B] block">
              {rating === 5 ? 'Exceptional Work (5 Stars)' : rating === 4 ? 'Very Good (4 Stars)' : `${rating} Stars`}
            </span>
          </div>

          {/* Quick compliment tags */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#0C2A1B]">
              What did the professional do well?
            </label>
            <div className="flex flex-wrap gap-1.5">
              {availableTags.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-2.5 py-1 text-xs rounded-full border transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#E6F4EA] text-[#0F6B3E] border-[#A9D3B5] font-semibold'
                        : 'bg-white text-[#6A7B70] border-[#DCE8E0] hover:border-[#A9D3B5]'
                    }`}
                  >
                    {isSelected && '✓ '} {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Review Text */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#0C2A1B]">
              Detailed feedback
            </label>
            <textarea
              rows={3}
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Describe your experience with punctuality, clean execution, and pricing..."
              className="w-full p-3 text-xs bg-white border border-[#DCE8E0] rounded-[8px] focus:outline-none focus:ring-2 focus:ring-[#0F6B3E] text-[#0C2A1B]"
              required
            />
          </div>

          {/* Escrow Release Notice */}
          <div className="p-3 bg-[#E6F4EA] rounded-[8px] border border-[#CDE9D6] text-xs text-[#0B5632] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#2FAE60] shrink-0" />
            <span>Submitting this review releases the held escrow payment directly to the professional's account.</span>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={loading}
              className="flex-1 font-bold"
            >
              Submit Review & Release Funds
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
