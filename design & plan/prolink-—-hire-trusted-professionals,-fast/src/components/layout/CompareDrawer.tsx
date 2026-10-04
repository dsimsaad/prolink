import React from 'react';
import { useMarketplace, marketplaceStore } from '../../store/marketplaceStore';
import { MOCK_OFFERS } from '../../data/mockData';
import { api } from '../../services/api';
import { Avatar } from '../ui/Avatar';
import { RatingStars } from '../ui/RatingStars';
import { Button } from '../ui/Button';
import { X, Check, Award, Clock, DollarSign, ShieldCheck } from 'lucide-react';

export const CompareDrawer: React.FC = () => {
  const { compareOfferIds, compareDrawerOpen } = useMarketplace();

  if (!compareDrawerOpen || compareOfferIds.length === 0) return null;

  const offers = MOCK_OFFERS.filter(o => compareOfferIds.includes(o.id));

  const handleAccept = async (offerId: string) => {
    try {
      await api.acceptOffer(offerId);
      marketplaceStore.clearCompare();
      marketplaceStore.addToast('Offer Accepted! 🤝', 'Job status updated to In Progress. Professional notified.', 'success');
      marketplaceStore.navigate('/customer/jobs/job-101');
    } catch (e) {
      marketplaceStore.addToast('Action failed', 'Could not accept offer', 'error');
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 bg-white border-t-2 border-[#0F6B3E] shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-4">
        {/* Drawer Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#DCE8E0]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0F6B3E]" />
            <h3 className="text-base font-bold text-[#0C2A1B]">
              Side-by-Side Offer Comparison ({offers.length} selected)
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => marketplaceStore.clearCompare()}
              className="text-xs text-[#6A7B70] hover:text-[#0C2A1B] cursor-pointer"
            >
              Clear Selection
            </button>
            <button
              onClick={() => marketplaceStore.setCompareDrawerOpen(false)}
              className="p-1 rounded text-[#6A7B70] hover:text-[#0C2A1B] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Comparison Grid */}
        <div className={`grid grid-cols-1 sm:grid-cols-${offers.length} gap-4`}>
          {offers.map((off) => (
            <div
              key={off.id}
              className={`p-4 rounded-[10px] border flex flex-col justify-between space-y-4 ${
                off.isBestMatch
                  ? 'border-[#0F6B3E] bg-[#F4FAF6]'
                  : 'border-[#DCE8E0] bg-white'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <Avatar src={off.proAvatar} name={off.proName} size="md" isVerified={true} />
                    <div>
                      <h4 className="text-xs font-bold text-[#0C2A1B]">{off.proName}</h4>
                      <RatingStars rating={off.proRating} totalReviews={off.proReviewCount} size="sm" />
                    </div>
                  </div>
                  {off.isBestMatch && (
                    <span className="px-2 py-0.5 bg-[#0F6B3E] text-white text-[10px] font-bold rounded-full flex items-center gap-1">
                      <Award className="w-3 h-3" />
                      BEST MATCH
                    </span>
                  )}
                </div>

                {/* Offer Price Breakdown */}
                <div className="p-3 bg-white rounded-[8px] border border-[#DCE8E0] space-y-1.5 text-xs">
                  <div className="flex justify-between text-[#6A7B70]">
                    <span>Labor Service:</span>
                    <span className="tabular-nums font-medium text-[#0C2A1B]">PKR {off.pricePKR.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-[#6A7B70]">
                    <span>Inspection Fee:</span>
                    <span className="tabular-nums font-medium text-[#0C2A1B]">
                      {off.inspectionFeePKR === 0 ? 'FREE (PKR 0)' : `PKR ${off.inspectionFeePKR}`}
                    </span>
                  </div>
                  <div className="flex justify-between text-[#6A7B70]">
                    <span>Est. Materials:</span>
                    <span className="tabular-nums font-medium text-[#0C2A1B]">PKR {off.materialsEstimatedPKR.toLocaleString()}</span>
                  </div>
                  <div className="pt-1.5 border-t border-[#DCE8E0] flex justify-between font-bold text-sm text-[#0F6B3E]">
                    <span>Total Estimate:</span>
                    <span className="tabular-nums">PKR {off.totalEstimatePKR.toLocaleString()}</span>
                  </div>
                </div>

                <div className="space-y-1 text-xs text-[#34453B]">
                  <div className="flex items-center gap-1.5 font-medium text-[#0C2A1B]">
                    <Clock className="w-3.5 h-3.5 text-[#0F6B3E]" />
                    <span>Arrival: {off.arrivalTimeEstimate}</span>
                  </div>
                  <p className="text-[11px] text-[#6A7B70] italic line-clamp-3 leading-relaxed">
                    "{off.message}"
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => handleAccept(off.id)}
                  className="w-full font-bold shadow-xs text-xs"
                >
                  <Check className="w-3.5 h-3.5 mr-1" />
                  Accept & Book Pro
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
