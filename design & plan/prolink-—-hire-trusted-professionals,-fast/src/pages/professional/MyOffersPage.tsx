import React, { useState, useEffect } from 'react';
import { useMarketplace, marketplaceStore } from '../../store/marketplaceStore';
import { MOCK_OFFERS, MOCK_USERS } from '../../data/mockData';
import { api } from '../../services/api';
import { Offer, OfferStatus } from '../../types';
import { Button } from '../../components/ui/Button';
import { Clock, CheckCircle2, XCircle, AlertCircle, ArrowRight, DollarSign } from 'lucide-react';

export const MyOffersPage: React.FC = () => {
  const { currentUser } = useMarketplace();
  const pro = currentUser || MOCK_USERS[12]; // Tariq Mehmood

  const [activeTab, setActiveTab] = useState<OfferStatus | 'all'>('all');
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOffers = async () => {
    setLoading(true);
    const data = await api.getOffersForPro(pro.id);
    setOffers(data.length > 0 ? data : MOCK_OFFERS.slice(0, 6));
    setLoading(false);
  };

  useEffect(() => {
    loadOffers();
  }, [pro.id]);

  const filtered = offers.filter(o => {
    if (activeTab !== 'all' && o.status !== activeTab) return false;
    return true;
  });

  const handleWithdraw = async (offerId: string) => {
    setOffers(offers.map(o => o.id === offerId ? { ...o, status: 'withdrawn' } : o));
    marketplaceStore.addToast('Offer Withdrawn', 'Your proposal was retracted from the customer.', 'info');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0C2A1B]">My Submitted Offers</h1>
        <p className="text-xs text-[#6A7B70] mt-0.5">
          Track customer responses, accepted contracts, and withdraw or adjust quotes.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[#DCE8E0] pb-2 overflow-x-auto no-scrollbar">
        {[
          { id: 'all', label: 'All Offers' },
          { id: 'pending', label: 'Pending Customer Decision' },
          { id: 'accepted', label: 'Won / Accepted' },
          { id: 'rejected', label: 'Declined' },
          { id: 'expired', label: 'Expired' }
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`px-3 py-1.5 rounded-[6px] text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
              activeTab === t.id
                ? 'bg-[#0F6B3E] text-white shadow-2xs'
                : 'text-[#6A7B70] hover:text-[#0C2A1B] hover:bg-[#F4FAF6]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Offers List */}
      <div className="space-y-3">
        {filtered.map((off) => {
          const isAccepted = off.status === 'accepted';
          const isPending = off.status === 'pending';

          return (
            <div
              key={off.id}
              className="bg-white border border-[#DCE8E0] rounded-[10px] p-5 space-y-3 shadow-xs"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isAccepted
                        ? 'bg-[#E6F4EA] text-[#0F6B3E]'
                        : isPending
                        ? 'bg-[#FFFBEB] text-[#B45309]'
                        : 'bg-[#F3F4F6] text-[#4B5563]'
                    }`}>
                      {off.status.toUpperCase()}
                    </span>
                    <span className="text-xs text-[#A3B1A8] font-mono">Offer #{off.id}</span>
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-[#0C2A1B]">
                    {off.jobTitle || 'Residential Electrical / Service Request'}
                  </h3>
                </div>

                <div className="text-right">
                  <span className="text-base font-extrabold text-[#0F6B3E] tabular-nums">
                    PKR {off.totalEstimatePKR.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-[#6A7B70] block">
                    Labor: PKR {off.pricePKR} · Inspection: {off.inspectionFeePKR === 0 ? 'FREE' : `PKR ${off.inspectionFeePKR}`}
                  </span>
                </div>
              </div>

              <p className="text-xs text-[#34453B] leading-relaxed italic">
                "{off.message}"
              </p>

              <div className="pt-2 border-t border-[#DCE8E0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-4 text-[#6A7B70]">
                  <span>Arrival ETA: <strong className="text-[#0C2A1B]">{off.arrivalTimeEstimate}</strong></span>
                  <span>·</span>
                  <span>Submitted {new Date(off.createdAt).toLocaleDateString()}</span>
                </div>

                <div className="flex items-center gap-2">
                  {isAccepted && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => marketplaceStore.navigate('/pro/active')}
                      className="text-xs font-bold"
                    >
                      Open Active Workspace →
                    </Button>
                  )}

                  {isPending && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleWithdraw(off.id)}
                      className="text-xs text-[#B42318] hover:bg-[#FEF2F2]"
                    >
                      Withdraw Offer
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
