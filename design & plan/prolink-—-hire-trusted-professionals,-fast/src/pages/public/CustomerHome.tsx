import React, { useState } from 'react';
import { useMarketplace, marketplaceStore } from '../../store/marketplaceStore';
import { MOCK_JOBS, MOCK_USERS, CATEGORIES } from '../../data/mockData';
import { Button } from '../../components/ui/Button';
import { StatusChip } from '../../components/ui/StatusChip';
import { RatingStars } from '../../components/ui/RatingStars';
import { Avatar } from '../../components/ui/Avatar';
import {
  Search,
  PlusCircle,
  AlertCircle,
  ChevronRight,
  Clock,
  ArrowRight,
  Sparkles,
  Gift,
  Share2
} from 'lucide-react';

export const CustomerHome: React.FC = () => {
  const { currentUser } = useMarketplace();
  const [homeSearch, setHomeSearch] = useState('');

  const customerName = currentUser?.name?.split(' ')[0] || 'Mustafa';
  const customerArea = currentUser?.area || 'Sector F-7/2, Islamabad';

  // Active jobs for customer
  const activeJobs = MOCK_JOBS.filter(
    j => j.customerId === (currentUser?.id || 'cust-1') && (j.status === 'in_progress' || j.status === 'offers_received')
  );

  const offersWaitingJobs = MOCK_JOBS.filter(
    j => j.customerId === (currentUser?.id || 'cust-1') && j.status === 'offers_received'
  );

  const completedJobs = MOCK_JOBS.filter(
    j => j.customerId === (currentUser?.id || 'cust-1') && j.status === 'completed'
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!homeSearch.trim()) return;
    marketplaceStore.navigate('/search', { q: homeSearch, city: currentUser?.city || 'Islamabad' });
  };

  return (
    <div className="space-y-8 pb-12">
      {/* 1. Header Greeting & Primary Action */}
      <div className="bg-[#F4FAF6] border-b border-[#DCE8E0] py-8 -mt-4 sm:-mt-6 lg:-mt-8 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#0F6B3E]">
                Personalized Customer Hub
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0C2A1B] tracking-tight mt-0.5">
                Salam, {customerName}! 👋
              </h1>
              <p className="text-xs text-[#6A7B70] mt-0.5">
                Connected to local verified professionals in <strong>{customerArea}</strong>.
              </p>
            </div>

            <Button
              variant="primary"
              size="md"
              onClick={() => marketplaceStore.navigate('/customer/post-job')}
              className="font-bold shadow-xs shrink-0 self-start sm:self-auto"
            >
              <PlusCircle className="w-4 h-4 mr-1.5" />
              Post a New Job
            </Button>
          </div>

          {/* Quick Search */}
          <form onSubmit={handleSearch} className="relative max-w-2xl">
            <input
              type="text"
              value={homeSearch}
              onChange={(e) => setHomeSearch(e.target.value)}
              placeholder="What do you need done today? (e.g. AC chemical wash, pipe leak, sofa shampoo)"
              className="w-full h-11 pl-10 pr-24 text-xs sm:text-sm bg-white border border-[#DCE8E0] rounded-[10px] shadow-2xs text-[#0C2A1B] focus:outline-none focus:ring-2 focus:ring-[#0F6B3E]"
            />
            <Search className="w-4 h-4 text-[#6A7B70] absolute left-3.5 top-3.5 pointer-events-none" />
            <button
              type="submit"
              className="absolute right-1.5 top-1.5 h-8 px-3.5 bg-[#0F6B3E] text-white text-xs font-semibold rounded-[6px] hover:bg-[#0B5632] cursor-pointer"
            >
              Find Pros
            </button>
          </form>
        </div>
      </div>

      <div className="max-w-5xl mx-auto space-y-8">
        {/* 2. Needs Your Attention Strip */}
        {offersWaitingJobs.length > 0 && (
          <div className="p-4 bg-[#FFFBEB] border border-[#FDE68A] rounded-[10px] flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#FEF3C7] flex items-center justify-center text-[#B45309] shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#92400E]">
                  Action Needed: {offersWaitingJobs[0].offersCount} Offers Waiting for Review
                </h4>
                <p className="text-xs text-[#78350F] mt-0.5">
                  "{offersWaitingJobs[0].title.slice(0, 50)}..." has verified offers starting from PKR 3,600.
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => marketplaceStore.navigate(`/customer/jobs/${offersWaitingJobs[0].id}`)}
              className="bg-white border-[#FDE68A] text-[#92400E] hover:bg-[#FEF3C7] shrink-0 font-semibold text-xs"
            >
              Compare Offers →
            </Button>
          </div>
        )}

        {/* 3. Active Jobs Compact Cards with Stepper */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#0C2A1B]">Your Active Jobs</h2>
            <button
              onClick={() => marketplaceStore.navigate('/customer/jobs')}
              className="text-xs text-[#0F6B3E] font-semibold hover:underline"
            >
              View All Jobs →
            </button>
          </div>

          <div className="space-y-3">
            {activeJobs.map((job) => (
              <div
                key={job.id}
                onClick={() => marketplaceStore.navigate(`/customer/jobs/${job.id}`)}
                className="bg-white border border-[#DCE8E0] rounded-[10px] p-4 hover:border-[#0F6B3E] hover:shadow-xs transition-all cursor-pointer space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <StatusChip status={job.status} />
                      <span className="text-xs text-[#6A7B70] font-mono">Job #{job.id}</span>
                    </div>
                    <h3 className="text-sm font-bold text-[#0C2A1B]">{job.title}</h3>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold text-[#0F6B3E] tabular-nums">
                      PKR {job.budgetMin.toLocaleString()} - {job.budgetMax.toLocaleString()}
                    </span>
                    <span className="text-[11px] text-[#6A7B70] block">Scheduled: {job.dateScheduled}</span>
                  </div>
                </div>

                {/* Progress Stepper Mini */}
                <div className="pt-2 border-t border-[#DCE8E0] flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 text-[#0F6B3E] font-medium">
                    <span className="w-2 h-2 rounded-full bg-[#0F6B3E]" />
                    <span>Posted</span>
                  </div>
                  <div className="h-0.5 flex-1 mx-2 bg-[#CDE9D6]" />
                  <div className="flex items-center gap-1.5 text-[#0F6B3E] font-medium">
                    <span className="w-2 h-2 rounded-full bg-[#0F6B3E]" />
                    <span>Offers In</span>
                  </div>
                  <div className="h-0.5 flex-1 mx-2 bg-[#CDE9D6]" />
                  <div className={`flex items-center gap-1.5 font-medium ${job.status === 'in_progress' ? 'text-[#0F6B3E]' : 'text-[#A3B1A8]'}`}>
                    <span className={`w-2 h-2 rounded-full ${job.status === 'in_progress' ? 'bg-[#0F6B3E]' : 'bg-[#DCE8E0]'}`} />
                    <span>Hired & In Progress</span>
                  </div>
                  <div className="h-0.5 flex-1 mx-2 bg-[#DCE8E0]" />
                  <div className="flex items-center gap-1.5 text-[#A3B1A8]">
                    <span className="w-2 h-2 rounded-full bg-[#DCE8E0]" />
                    <span>Completed</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4. Book Again / Recommended Pros */}
        <div className="space-y-3">
          <h2 className="text-base font-bold text-[#0C2A1B]">Book Again from Past Jobs</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white border border-[#DCE8E0] rounded-[10px] p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar name="Mrs. Saima Noor" size="md" isVerified={true} isOnline={true} />
                <div>
                  <h4 className="text-xs font-bold text-[#0C2A1B]">Mrs. Saima Noor</h4>
                  <p className="text-[11px] text-[#0F6B3E]">Deep Cleaning · Top Rated</p>
                  <RatingStars rating={4.93} totalReviews={78} size="sm" />
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => marketplaceStore.navigate('/customer/post-job')}
                className="text-xs font-semibold"
              >
                Rebook
              </Button>
            </div>

            <div className="bg-white border border-[#DCE8E0] rounded-[10px] p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar name="Tariq Mehmood" size="md" isVerified={true} isOnline={true} />
                <div>
                  <h4 className="text-xs font-bold text-[#0C2A1B]">Tariq Mehmood</h4>
                  <p className="text-[11px] text-[#0F6B3E]">Electrical Master · Top Rated</p>
                  <RatingStars rating={4.94} totalReviews={182} size="sm" />
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => marketplaceStore.navigate('/customer/post-job')}
                className="text-xs font-semibold"
              >
                Rebook
              </Button>
            </div>
          </div>
        </div>

        {/* 5. Popular Services Carousel */}
        <div className="space-y-3">
          <h2 className="text-base font-bold text-[#0C2A1B]">Explore Services in Islamabad</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {CATEGORIES.slice(0, 4).map((c) => (
              <div
                key={c.id}
                onClick={() => marketplaceStore.navigate('/search', { category: c.name })}
                className="p-3 bg-white border border-[#DCE8E0] rounded-[8px] hover:border-[#0F6B3E] transition-colors cursor-pointer group"
              >
                <div className="text-xs font-bold text-[#0C2A1B] group-hover:text-[#0F6B3E]">
                  {c.name}
                </div>
                <div className="text-[11px] text-[#6A7B70] mt-0.5">
                  from PKR {c.startingPricePKR.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 6. Referral Card */}
        <div className="p-5 bg-[#E6F4EA] border border-[#CDE9D6] rounded-[10px] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#0F6B3E] flex items-center justify-center text-white shrink-0">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#0C2A1B]">Give PKR 500, Get PKR 500</h4>
              <p className="text-xs text-[#0B5632] mt-0.5">
                Invite neighbors or family in your housing society to ProLink. When they complete their first job, both of you earn PKR 500 escrow balance.
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => marketplaceStore.addToast('Referral Link Copied! 📋', 'Share prolink.pk/invite/mustafa with friends.', 'success')}
            className="shrink-0 font-bold"
          >
            <Share2 className="w-3.5 h-3.5 mr-1.5" />
            Share Referral Link
          </Button>
        </div>
      </div>
    </div>
  );
};
