import React, { useState, useEffect } from 'react';
import { useMarketplace, marketplaceStore } from '../../store/marketplaceStore';
import { MOCK_JOBS, MOCK_USERS } from '../../data/mockData';
import { api } from '../../services/api';
import { Job } from '../../types';
import { Button } from '../../components/ui/Button';
import { StatusChip } from '../../components/ui/StatusChip';
import { RatingStars } from '../../components/ui/RatingStars';
import { Avatar } from '../../components/ui/Avatar';
import {
  ArrowLeft,
  Clock,
  MapPin,
  CheckCircle2,
  DollarSign,
  Send,
  HelpCircle,
  ShieldCheck,
  Eye
} from 'lucide-react';

export const ProJobDetailsOfferComposer: React.FC<{ jobId?: string }> = ({ jobId: propJobId }) => {
  const { currentPath, currentUser } = useMarketplace();
  const pro = currentUser || MOCK_USERS[12]; // Tariq Mehmood

  // Job ID from prop or URL
  const jobId = propJobId || currentPath.split('/').pop() || 'job-103';

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

  // Offer Composer Fields
  const [laborPrice, setLaborPrice] = useState(3400);
  const [inspectionFee, setInspectionFee] = useState(0);
  const [materialsEst, setMaterialsEst] = useState(800);
  const [arrivalTime, setArrivalTime] = useState('30 - 45 minutes');
  const [offerMessage, setOfferMessage] = useState(
    'Assalam o Alaikum. I am a licensed master technician with 14 years experience. I have laser levels and replacement circuit parts ready in my service van.'
  );
  const [submitting, setSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    async function loadJob() {
      setLoading(true);
      const j = await api.getJobById(jobId);
      setJob(j || MOCK_JOBS[2]);
      if (j?.budgetMin) {
        setLaborPrice(j.budgetMin + 500);
      }
      setLoading(false);
    }
    loadJob();
  }, [jobId]);

  if (loading || !job) {
    return (
      <div className="space-y-4 max-w-5xl mx-auto py-8">
        <div className="h-8 w-48 bg-[#E6F4EA] animate-pulse rounded" />
        <div className="h-64 bg-white border border-[#DCE8E0] rounded-[10px] animate-pulse" />
      </div>
    );
  }

  const totalEstimate = laborPrice + inspectionFee + materialsEst;

  const handleSubmitOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await api.submitOffer({
        jobId: job.id,
        jobTitle: job.title,
        proId: pro.id,
        proName: pro.name,
        proAvatar: pro.avatar,
        proRating: pro.rating || 4.9,
        proReviewCount: pro.totalReviews || 100,
        proLevel: pro.level || 'top_rated',
        proCategory: pro.category,
        pricePKR: laborPrice,
        inspectionFeePKR: inspectionFee,
        materialsEstimatedPKR: materialsEst,
        totalEstimatePKR: totalEstimate,
        arrivalTimeEstimate: arrivalTime,
        message: offerMessage
      });

      setSubmitting(false);
      marketplaceStore.addToast('Offer Submitted! 🚀', `Your quote of PKR ${totalEstimate.toLocaleString()} was sent to ${job.customerName}.`, 'success');
      marketplaceStore.navigate('/pro/offers');
    } catch (err) {
      setSubmitting(false);
      marketplaceStore.addToast('Error', 'Could not submit offer.', 'error');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => marketplaceStore.navigate('/pro/feed')}
          className="flex items-center gap-1.5 text-xs text-[#6A7B70] hover:text-[#0C2A1B] cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Live Job Feed</span>
        </button>
        <span className="text-xs text-[#A3B1A8] font-mono">Job #{job.id}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Job Information & Customer Trust Details */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white border border-[#DCE8E0] rounded-[10px] p-6 space-y-4">
            <div className="flex items-center gap-2">
              <StatusChip status={job.status} />
              <span className="text-xs font-semibold text-[#0F6B3E] bg-[#E6F4EA] px-2 py-0.5 rounded-full">
                {job.category}
              </span>
              <span className="text-xs text-[#A3B1A8]">
                {job.urgency === 'urgent' ? '⚡ Urgent' : 'Today'}
              </span>
            </div>

            <h1 className="text-xl font-bold text-[#0C2A1B] leading-snug">
              {job.title}
            </h1>

            <p className="text-xs text-[#34453B] leading-relaxed">
              {job.description}
            </p>

            {/* Customer info card */}
            <div className="p-3.5 bg-[#F4FAF6] border border-[#DCE8E0] rounded-[8px] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar name={job.customerName} size="md" />
                <div>
                  <div className="text-xs font-bold text-[#0C2A1B]">{job.customerName}</div>
                  <div className="text-[11px] text-[#6A7B70]">📍 {job.area}, {job.city}</div>
                  <RatingStars rating={4.9} totalReviews={12} size="sm" showNumber={false} />
                </div>
              </div>
              <span className="text-xs font-semibold text-[#0F6B3E] bg-white px-2.5 py-1 rounded-[6px] border border-[#DCE8E0]">
                Verified Client
              </span>
            </div>

            {/* Benchmark stats */}
            <div className="pt-2 border-t border-[#DCE8E0] space-y-2 text-xs">
              <div className="flex justify-between text-[#6A7B70]">
                <span>Customer Expected Range:</span>
                <span className="font-bold text-[#0C2A1B] tabular-nums">
                  PKR {job.budgetMin.toLocaleString()} - {job.budgetMax.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-[#6A7B70]">
                <span>Market Average Accepted Price:</span>
                <span className="font-bold text-[#0F6B3E] tabular-nums">
                  PKR {Math.round((job.budgetMin + job.budgetMax) / 2).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-[#6A7B70]">
                <span>Scheduled Timing:</span>
                <span className="font-medium text-[#0C2A1B]">{job.dateScheduled}</span>
              </div>
            </div>
          </div>

          {/* Guarantee Note */}
          <div className="p-4 bg-[#E6F4EA] border border-[#CDE9D6] rounded-[10px] space-y-2 text-xs text-[#0B5632]">
            <div className="flex items-center gap-2 font-bold">
              <ShieldCheck className="w-4 h-4 text-[#2FAE60]" />
              <span>ProLink Escrow Payment Protection</span>
            </div>
            <p className="leading-relaxed">
              When the client accepts your offer, the full amount is locked into escrow. Once you complete the service on site, payout is released directly to your account.
            </p>
          </div>
        </div>

        {/* Right: Offer Composer */}
        <div className="lg:col-span-6">
          <div className="bg-white border border-[#DCE8E0] rounded-[10px] p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#DCE8E0]">
              <div>
                <h2 className="text-base font-bold text-[#0C2A1B]">Offer Composer</h2>
                <p className="text-xs text-[#6A7B70]">Craft a transparent proposal for this client</p>
              </div>
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="text-xs font-semibold text-[#0F6B3E] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{showPreview ? 'Hide Preview' : 'Preview Client Card'}</span>
              </button>
            </div>

            {/* Client View Preview if toggled */}
            {showPreview && (
              <div className="p-4 bg-[#F4FAF6] border-2 border-[#0F6B3E] rounded-[8px] space-y-2 text-xs animate-in fade-in">
                <span className="text-[10px] uppercase font-bold text-[#0F6B3E] tracking-wider block">
                  Preview: How Customer Views Your Offer
                </span>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[#0C2A1B]">{pro.name} (4.94 ★)</span>
                  <span className="text-base font-extrabold text-[#0F6B3E] tabular-nums">
                    PKR {totalEstimate.toLocaleString()}
                  </span>
                </div>
                <div className="text-[11px] text-[#6A7B70]">
                  Arrival: {arrivalTime} · Inspection: {inspectionFee === 0 ? 'FREE' : `PKR ${inspectionFee}`}
                </div>
                <p className="text-[11px] text-[#34453B] italic">"{offerMessage}"</p>
              </div>
            )}

            <form onSubmit={handleSubmitOffer} className="space-y-4">
              {/* Itemized Pricing */}
              <div className="space-y-3 p-3.5 bg-[#F4FAF6] rounded-[8px] border border-[#DCE8E0]">
                <span className="text-xs font-bold text-[#0C2A1B] block">
                  Itemized Price Breakdown
                </span>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#34453B]">Labor / Service</label>
                    <input
                      type="number"
                      step={100}
                      value={laborPrice}
                      onChange={(e) => setLaborPrice(Number(e.target.value))}
                      className="w-full h-9 px-2 text-xs bg-white border border-[#DCE8E0] rounded-[6px] text-[#0C2A1B] font-bold tabular-nums"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#34453B]">Inspection Fee</label>
                    <input
                      type="number"
                      step={100}
                      value={inspectionFee}
                      onChange={(e) => setInspectionFee(Number(e.target.value))}
                      className="w-full h-9 px-2 text-xs bg-white border border-[#DCE8E0] rounded-[6px] text-[#0C2A1B] font-bold tabular-nums"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#34453B]">Est. Materials</label>
                    <input
                      type="number"
                      step={100}
                      value={materialsEst}
                      onChange={(e) => setMaterialsEst(Number(e.target.value))}
                      className="w-full h-9 px-2 text-xs bg-white border border-[#DCE8E0] rounded-[6px] text-[#0C2A1B] font-bold tabular-nums"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-[#DCE8E0] flex justify-between items-center text-xs font-bold text-[#0F6B3E]">
                  <span>Total Offer Quote to Customer:</span>
                  <span className="text-sm tabular-nums">PKR {totalEstimate.toLocaleString()}</span>
                </div>
              </div>

              {/* Arrival Time Picker */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#0C2A1B]">
                  Estimated Arrival Time Window
                </label>
                <select
                  value={arrivalTime}
                  onChange={(e) => setArrivalTime(e.target.value)}
                  className="w-full h-10 px-3 text-xs bg-white border border-[#DCE8E0] rounded-[8px] text-[#0C2A1B] cursor-pointer"
                >
                  <option value="20 - 30 minutes">20 - 30 minutes (Immediate dispatch)</option>
                  <option value="45 minutes">45 minutes</option>
                  <option value="1 - 2 hours">1 - 2 hours</option>
                  <option value="Today evening (5 - 7 PM)">Today evening (5 - 7 PM)</option>
                  <option value="Tomorrow morning (9 - 11 AM)">Tomorrow morning (9 - 11 AM)</option>
                </select>
              </div>

              {/* Offer Message */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#0C2A1B]">
                  Message to Customer
                </label>
                <textarea
                  rows={4}
                  value={offerMessage}
                  onChange={(e) => setOfferMessage(e.target.value)}
                  placeholder="Explain your approach, testing tools, and warranty..."
                  className="w-full p-3 text-xs bg-white border border-[#DCE8E0] rounded-[8px] focus:outline-none focus:ring-2 focus:ring-[#0F6B3E] text-[#0C2A1B]"
                  required
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={submitting}
                  className="w-full font-bold shadow-xs text-sm"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Submit Binding Offer (PKR {totalEstimate.toLocaleString()})
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
