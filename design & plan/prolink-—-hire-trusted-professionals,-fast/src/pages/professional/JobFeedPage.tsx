import React, { useState } from 'react';
import { useMarketplace, marketplaceStore } from '../../store/marketplaceStore';
import { MOCK_JOBS, MOCK_USERS, CATEGORIES } from '../../data/mockData';
import { calculateMatchScore, sortJobsByUrgencyAndAge } from '../../services/intelligence';
import { Button } from '../../components/ui/Button';
import { StatusChip } from '../../components/ui/StatusChip';
import { Search, Filter, MapPin, Clock, Award, ChevronRight } from 'lucide-react';

export const JobFeedPage: React.FC = () => {
  const { currentUser } = useMarketplace();
  const pro = currentUser || MOCK_USERS[12]; // Tariq Mehmood

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedUrgency, setSelectedUrgency] = useState<string>('All');
  const [maxBudget, setMaxBudget] = useState<number>(50000);

  // Available open or offers_received jobs
  const openJobs = MOCK_JOBS.filter(j => j.status === 'open' || j.status === 'offers_received');

  const jobsWithMatches = openJobs.map(job => ({
    job,
    match: calculateMatchScore(job, pro)
  }));

  const filtered = jobsWithMatches.filter(({ job }) => {
    if (selectedCategory !== 'All' && job.category !== selectedCategory) return false;
    if (selectedUrgency !== 'All' && job.urgency !== selectedUrgency) return false;
    if (job.budgetMax > maxBudget) return false;
    if (search && !job.title.toLowerCase().includes(search.toLowerCase()) && !job.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const sorted = filtered.sort((a, b) => b.match.totalScore - a.match.totalScore);

  return (
    <div className="space-y-6">
      {/* Top Title & Explanation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0C2A1B]">Live Job Feed</h1>
          <p className="text-xs text-[#6A7B70] mt-0.5">
            Real customer requests dispatched in real-time. Ranked by match score for your trade.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-[#0F6B3E] bg-[#E6F4EA] px-3 py-1.5 rounded-full border border-[#CDE9D6]">
          <span className="w-2 h-2 rounded-full bg-[#2FAE60] animate-pulse" />
          <span>{filtered.length} Jobs Available Now</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#DCE8E0] rounded-[10px] p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search keyword (e.g. breaker, AC)..."
              className="w-full h-9 pl-8 pr-3 text-xs bg-[#F4FAF6] border border-[#DCE8E0] rounded-[8px] focus:outline-none"
            />
            <Search className="w-3.5 h-3.5 text-[#6A7B70] absolute left-2.5 top-3 pointer-events-none" />
          </div>

          {/* Category */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-9 px-3 text-xs bg-[#F4FAF6] border border-[#DCE8E0] rounded-[8px] text-[#0C2A1B] cursor-pointer"
          >
            <option value="All">All Categories</option>
            {CATEGORIES.map(c => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>

          {/* Urgency */}
          <select
            value={selectedUrgency}
            onChange={(e) => setSelectedUrgency(e.target.value)}
            className="h-9 px-3 text-xs bg-[#F4FAF6] border border-[#DCE8E0] rounded-[8px] text-[#0C2A1B] cursor-pointer"
          >
            <option value="All">All Urgencies</option>
            <option value="urgent">Urgent (Immediate)</option>
            <option value="today">Today</option>
            <option value="flexible">Flexible</option>
          </select>

          {/* Reset button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearch('');
              setSelectedCategory('All');
              setSelectedUrgency('All');
            }}
            className="h-9 text-xs"
          >
            Reset Filters
          </Button>
        </div>
      </div>

      {/* Jobs List */}
      <div className="space-y-3">
        {sorted.map(({ job, match }) => (
          <div
            key={job.id}
            onClick={() => marketplaceStore.navigate(`/pro/feed/${job.id}`)}
            className="bg-white border border-[#DCE8E0] rounded-[10px] p-5 hover:border-[#0F6B3E] hover:shadow-xs transition-all cursor-pointer space-y-3 group"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-[#0F6B3E] text-white text-xs font-bold rounded-full flex items-center gap-1">
                    <Award className="w-3.5 h-3.5" />
                    {match.totalScore}% Match
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    job.urgency === 'urgent'
                      ? 'bg-[#FEF2F2] text-[#B42318] border border-[#FECACA]'
                      : 'bg-[#FFFBEB] text-[#B45309]'
                  }`}>
                    {job.urgency === 'urgent' ? '⚡ Emergency Dispatch' : 'Today'}
                  </span>
                  <span className="text-xs text-[#0F6B3E] font-semibold bg-[#E6F4EA] px-2 py-0.5 rounded-full">
                    {job.category}
                  </span>
                  <span className="text-xs text-[#A3B1A8] font-mono">#{job.id}</span>
                </div>

                <h3 className="text-sm sm:text-base font-bold text-[#0C2A1B] group-hover:text-[#0F6B3E] transition-colors">
                  {job.title}
                </h3>
              </div>

              <div className="text-right">
                <span className="text-base font-extrabold text-[#0F6B3E] tabular-nums">
                  PKR {job.budgetMin.toLocaleString()} - {job.budgetMax.toLocaleString()}
                </span>
                <span className="text-[11px] text-[#6A7B70] block">Customer Budget</span>
              </div>
            </div>

            <p className="text-xs text-[#6A7B70] line-clamp-2 leading-relaxed">
              {job.description}
            </p>

            <div className="pt-2 border-t border-[#DCE8E0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-4 text-[#6A7B70]">
                <span>📍 {job.area}, {job.city}</span>
                <span>·</span>
                <span>Scheduled: <strong className="text-[#0C2A1B]">{job.dateScheduled}</strong></span>
                <span>·</span>
                <span>{job.offersCount} competing quotes</span>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  marketplaceStore.navigate(`/pro/feed/${job.id}`);
                }}
                className="font-bold text-xs"
              >
                Submit Offer →
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
