import React, { useState, useEffect } from 'react';
import { useMarketplace, marketplaceStore } from '../../store/marketplaceStore';
import { MOCK_JOBS, MOCK_OFFERS } from '../../data/mockData';
import { api } from '../../services/api';
import { Job, Offer } from '../../types';
import { StatusChip } from '../../components/ui/StatusChip';
import { RatingStars } from '../../components/ui/RatingStars';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { StylizedMap } from '../../components/visuals/StylizedMap';
import { ReviewModal } from '../../components/layout/ReviewModal';
import {
  Clock,
  MapPin,
  ShieldCheck,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Inbox,
  ArrowLeft,
  Award,
  Phone,
  MessageSquare,
  ChevronDown
} from 'lucide-react';

export const CustomerJobDetails: React.FC<{ jobId?: string }> = ({ jobId: propJobId }) => {
  const { currentPath, compareOfferIds } = useMarketplace();

  // Extract job ID from prop or URL
  const jobId = propJobId || currentPath.split('/').pop() || 'job-101';

  const [job, setJob] = useState<Job | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [offersSort, setOffersSort] = useState<'best' | 'price' | 'time' | 'rating'>('best');
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchJobData = async () => {
    setLoading(true);
    const fetchedJob = await api.getJobById(jobId);
    const fetchedOffers = await api.getOffersForJob(jobId);
    setJob(fetchedJob || MOCK_JOBS[0]);
    setOffers(fetchedOffers);
    setLoading(false);
  };

  useEffect(() => {
    fetchJobData();
  }, [jobId]);

  if (loading || !job) {
    return (
      <div className="space-y-4 max-w-5xl mx-auto py-8">
        <div className="h-8 w-48 bg-[#E6F4EA] animate-pulse rounded" />
        <div className="h-32 bg-white border border-[#DCE8E0] rounded-[10px] animate-pulse" />
      </div>
    );
  }

  // Handle Offer Accept
  const handleAcceptOffer = async (offerId: string) => {
    try {
      const { job: updated } = await api.acceptOffer(offerId);
      setJob(updated);
      await fetchJobData();
      marketplaceStore.addToast('Offer Accepted! 🤝', 'Job moved to In Progress. Technician notified.', 'success');
    } catch (e) {
      marketplaceStore.addToast('Action failed', 'Could not accept offer', 'error');
    }
  };

  // Handle Review submission
  const handleReviewSubmit = async (review: { rating: number; tags: string[]; text: string }) => {
    try {
      const completed = await api.completeJobAndReview(job.id, review);
      setJob(completed);
      setReviewModalOpen(false);
      marketplaceStore.addToast('Job Completed & Reviewed! ⭐', 'Escrow funds released to technician.', 'success');
    } catch (e) {
      marketplaceStore.addToast('Action failed', 'Could not submit review', 'error');
    }
  };

  // Sorted Offers
  const sortedOffers = [...offers].sort((a, b) => {
    if (offersSort === 'best') return (b.matchScore || 0) - (a.matchScore || 0);
    if (offersSort === 'price') return a.totalEstimatePKR - b.totalEstimatePKR;
    if (offersSort === 'rating') return b.proRating - a.proRating;
    return a.arrivalTimeEstimate.localeCompare(b.arrivalTimeEstimate);
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Breadcrumb & Back */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => marketplaceStore.navigate('/customer/jobs')}
          className="flex items-center gap-1.5 text-xs text-[#6A7B70] hover:text-[#0C2A1B] cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to My Jobs</span>
        </button>
        <span className="text-xs text-[#A3B1A8] font-mono">Job #{job.id}</span>
      </div>

      {/* Header Banner */}
      <div className="bg-white border border-[#DCE8E0] rounded-[10px] p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <StatusChip status={job.status} />
              <span className="text-xs font-semibold text-[#0F6B3E] bg-[#E6F4EA] px-2 py-0.5 rounded-full">
                {job.category}
              </span>
              <span className="text-xs text-[#6A7B70]">
                Posted {new Date(job.createdAt).toLocaleDateString()}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#0C2A1B]">
              {job.title}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {job.status === 'in_progress' && (
              <Button
                variant="primary"
                size="md"
                onClick={() => setReviewModalOpen(true)}
                className="font-bold shadow-xs text-xs"
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                Mark Completed & Review
              </Button>
            )}
          </div>
        </div>

        {/* Progress Timeline Stepper */}
        <div className="pt-3 border-t border-[#DCE8E0] grid grid-cols-5 text-center text-xs">
          <div className="space-y-1 text-[#0F6B3E] font-semibold">
            <div className="w-5 h-5 rounded-full bg-[#0F6B3E] text-white flex items-center justify-center text-[10px] mx-auto">✓</div>
            <div>Posted</div>
          </div>
          <div className={`space-y-1 ${job.offersCount > 0 ? 'text-[#0F6B3E] font-semibold' : 'text-[#A3B1A8]'}`}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] mx-auto ${job.offersCount > 0 ? 'bg-[#0F6B3E] text-white' : 'border border-[#DCE8E0]'}`}>
              {job.offersCount > 0 ? '✓' : '2'}
            </div>
            <div>Offers In ({job.offersCount})</div>
          </div>
          <div className={`space-y-1 ${job.hiredProId ? 'text-[#0F6B3E] font-semibold' : 'text-[#A3B1A8]'}`}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] mx-auto ${job.hiredProId ? 'bg-[#0F6B3E] text-white' : 'border border-[#DCE8E0]'}`}>
              {job.hiredProId ? '✓' : '3'}
            </div>
            <div>Hired</div>
          </div>
          <div className={`space-y-1 ${job.status === 'in_progress' || job.status === 'completed' ? 'text-[#0F6B3E] font-semibold' : 'text-[#A3B1A8]'}`}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] mx-auto ${job.status === 'in_progress' || job.status === 'completed' ? 'bg-[#0F6B3E] text-white' : 'border border-[#DCE8E0]'}`}>
              {job.status === 'in_progress' || job.status === 'completed' ? '✓' : '4'}
            </div>
            <div>In Progress</div>
          </div>
          <div className={`space-y-1 ${job.status === 'completed' ? 'text-[#0F6B3E] font-semibold' : 'text-[#A3B1A8]'}`}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] mx-auto ${job.status === 'completed' ? 'bg-[#0F6B3E] text-white' : 'border border-[#DCE8E0]'}`}>
              {job.status === 'completed' ? '✓' : '5'}
            </div>
            <div>Completed</div>
          </div>
        </div>
      </div>

      {/* Main Grid: Details Left + Offers Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Job Info, Attachments, Map, Payment */}
        <div className="lg:col-span-5 space-y-6">
          {/* Job Details Card */}
          <div className="bg-white border border-[#DCE8E0] rounded-[10px] p-5 space-y-4">
            <h3 className="text-sm font-bold text-[#0C2A1B]">Job Scope & Budget</h3>
            <p className="text-xs text-[#34453B] leading-relaxed">
              {job.description}
            </p>

            <div className="pt-2 border-t border-[#DCE8E0] space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#6A7B70]">Expected Budget:</span>
                <span className="font-bold text-[#0C2A1B] tabular-nums">
                  PKR {job.budgetMin.toLocaleString()} - {job.budgetMax.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6A7B70]">Urgency:</span>
                <span className="font-semibold text-[#0F6B3E] capitalize">{job.urgency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6A7B70]">Scheduled Timing:</span>
                <span className="font-medium text-[#0C2A1B]">{job.dateScheduled}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6A7B70]">Address:</span>
                <span className="font-medium text-[#0C2A1B]">{job.address || `${job.area}, ${job.city}`}</span>
              </div>
            </div>
          </div>

          {/* Location on StylizedMap */}
          <div className="bg-white border border-[#DCE8E0] rounded-[10px] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#0C2A1B]">Service Location</h3>
              <span className="text-xs text-[#0F6B3E] font-medium">{job.city}</span>
            </div>
            <StylizedMap
              city={job.city}
              showRoute={job.status === 'in_progress'}
              routeEta={job.proWorkLog?.etaMinutes ? `${job.proWorkLog.etaMinutes} mins` : '18 mins'}
              height={200}
            />
          </div>

          {/* Escrow Payment Status Box */}
          <div className="bg-white border border-[#DCE8E0] rounded-[10px] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#0C2A1B]">Escrow Protection</h3>
              <CreditCard className="w-4 h-4 text-[#0F6B3E]" />
            </div>
            <div className="p-3 bg-[#F4FAF6] border border-[#DCE8E0] rounded-[8px] space-y-1.5 text-xs">
              <div className="flex justify-between items-center font-semibold">
                <span className="text-[#34453B]">Escrow Status:</span>
                <span className={job.status === 'completed' ? 'text-[#2FAE60]' : 'text-[#0F6B3E]'}>
                  {job.status === 'completed' ? 'Funds Released' : job.status === 'in_progress' ? 'Held in Escrow' : 'Awaiting Booking'}
                </span>
              </div>
              <p className="text-[11px] text-[#6A7B70] leading-snug">
                Funds are protected in ProLink partner banking channels. No cash is paid until you verify work completion.
              </p>
            </div>
          </div>

          {/* Client Review (if already reviewed) */}
          {job.clientReview && (
            <div className="bg-[#E6F4EA] border border-[#CDE9D6] rounded-[10px] p-5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#0F6B3E]">Your Review for this Job</span>
                <RatingStars rating={job.clientReview.rating} size="sm" showNumber={false} />
              </div>
              <p className="text-[#0B5632] italic leading-relaxed">
                "{job.clientReview.text}"
              </p>
              <div className="flex flex-wrap gap-1 pt-1">
                {job.clientReview.tags.map(t => (
                  <span key={t} className="px-2 py-0.5 bg-white text-[#0F6B3E] rounded-full text-[10px] font-semibold">
                    ✓ {t}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Offers List & Comparison */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white border border-[#DCE8E0] rounded-[10px] p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#DCE8E0]">
              <div>
                <h3 className="text-base font-bold text-[#0C2A1B]">
                  Incoming Offers ({offers.length})
                </h3>
                <p className="text-xs text-[#6A7B70]">
                  Itemized proposals from verified artisans matching this request
                </p>
              </div>

              {/* Sort selector */}
              <div className="flex items-center gap-1 text-xs">
                <span className="text-[#6A7B70]">Sort:</span>
                <select
                  value={offersSort}
                  onChange={(e) => setOffersSort(e.target.value as any)}
                  className="h-8 px-2 bg-[#F4FAF6] border border-[#DCE8E0] rounded-[6px] text-xs font-semibold text-[#0C2A1B] cursor-pointer"
                >
                  <option value="best">Best Match Score</option>
                  <option value="price">Lowest Price</option>
                  <option value="rating">Highest Rated</option>
                  <option value="time">Fastest Arrival</option>
                </select>
              </div>
            </div>

            {/* Offers List */}
            {offers.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <Inbox className="w-8 h-8 text-[#A3B1A8] mx-auto" />
                <h4 className="text-xs font-bold text-[#0C2A1B]">No offers submitted yet</h4>
                <p className="text-xs text-[#6A7B70]">Nearby pros have been alerted. Check back shortly.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {sortedOffers.map((off) => {
                  const isAccepted = off.status === 'accepted' || job.selectedOfferId === off.id;
                  const isComparing = compareOfferIds.includes(off.id);

                  return (
                    <div
                      key={off.id}
                      className={`p-4 rounded-[10px] border transition-all space-y-3 ${
                        isAccepted
                          ? 'border-[#0F6B3E] bg-[#E6F4EA]/40'
                          : off.isBestMatch
                          ? 'border-[#A9D3B5] bg-[#F4FAF6]'
                          : 'border-[#DCE8E0] bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar src={off.proAvatar} name={off.proName} size="md" isVerified={true} isOnline={true} />
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-bold text-[#0C2A1B]">{off.proName}</h4>
                              <RatingStars rating={off.proRating} totalReviews={off.proReviewCount} size="sm" />
                            </div>
                            <span className="text-[11px] text-[#0F6B3E] font-medium">{off.proCategory || 'Skilled Pro'}</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-base font-extrabold text-[#0F6B3E] tabular-nums">
                            PKR {off.totalEstimatePKR.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-[#6A7B70] block">Estimated Total</span>
                        </div>
                      </div>

                      {/* Message and details */}
                      <p className="text-xs text-[#34453B] leading-relaxed italic">
                        "{off.message}"
                      </p>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#DCE8E0] text-xs">
                        <div className="flex items-center gap-3 text-[#6A7B70]">
                          <span className="flex items-center gap-1 font-medium text-[#0C2A1B]">
                            <Clock className="w-3.5 h-3.5 text-[#0F6B3E]" />
                            {off.arrivalTimeEstimate}
                          </span>
                          <span>·</span>
                          <span>Inspection: {off.inspectionFeePKR === 0 ? 'FREE' : `PKR ${off.inspectionFeePKR}`}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => marketplaceStore.toggleCompareOffer(off.id)}
                            className={`px-2.5 py-1 text-xs rounded-[6px] border cursor-pointer transition-colors ${
                              isComparing
                                ? 'bg-[#0F6B3E] text-white border-[#0F6B3E]'
                                : 'bg-white text-[#0C2A1B] border-[#DCE8E0] hover:bg-[#F4FAF6]'
                            }`}
                          >
                            {isComparing ? '✓ Comparing' : '+ Compare'}
                          </button>

                          {job.status !== 'in_progress' && job.status !== 'completed' && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleAcceptOffer(off.id)}
                              className="text-xs font-bold"
                            >
                              Accept Offer
                            </Button>
                          )}

                          {isAccepted && (
                            <span className="px-2.5 py-1 bg-[#0F6B3E] text-white font-bold text-xs rounded-[6px]">
                              Hired ✓
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Review Modal */}
      <ReviewModal
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        onSubmit={handleReviewSubmit}
        proName={job.hiredProName || 'Professional'}
        jobTitle={job.title}
      />
    </div>
  );
};
