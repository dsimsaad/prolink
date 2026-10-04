import React, { useState } from 'react';
import { useMarketplace, marketplaceStore } from '../../store/marketplaceStore';
import { MOCK_JOBS } from '../../data/mockData';
import { StatusChip } from '../../components/ui/StatusChip';
import { Button } from '../../components/ui/Button';
import { JobStatus } from '../../types';
import { Search, PlusCircle, ChevronRight, Inbox, Clock } from 'lucide-react';

export const MyJobsPage: React.FC = () => {
  const { currentUser } = useMarketplace();
  const [activeTab, setActiveTab] = useState<string>('all');
  const [search, setSearch] = useState('');

  const customerId = currentUser?.id || 'cust-1';
  const allCustomerJobs = MOCK_JOBS.filter(j => j.customerId === customerId || j.customerId === 'cust-1');

  const tabs: { id: string; label: string; count: number }[] = [
    { id: 'all', label: 'All Jobs', count: allCustomerJobs.length },
    { id: 'open', label: 'Open', count: allCustomerJobs.filter(j => j.status === 'open').length },
    { id: 'offers_received', label: 'Offers Received', count: allCustomerJobs.filter(j => j.status === 'offers_received').length },
    { id: 'in_progress', label: 'In Progress', count: allCustomerJobs.filter(j => j.status === 'in_progress').length },
    { id: 'completed', label: 'Completed', count: allCustomerJobs.filter(j => j.status === 'completed').length },
    { id: 'cancelled', label: 'Cancelled', count: allCustomerJobs.filter(j => j.status === 'cancelled').length }
  ];

  const filteredJobs = allCustomerJobs.filter(j => {
    if (activeTab !== 'all' && j.status !== activeTab) return false;
    if (search && !j.title.toLowerCase().includes(search.toLowerCase()) && !j.category.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0C2A1B]">My Posted Jobs</h1>
          <p className="text-xs text-[#6A7B70] mt-0.5">
            Monitor real-time offers, track hired artisans, and review completed work.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => marketplaceStore.navigate('/customer/post-job')}
          className="font-bold self-start sm:self-auto shadow-xs"
        >
          <PlusCircle className="w-4 h-4 mr-1.5" />
          Post New Job
        </Button>
      </div>

      {/* Tabs & Search Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#DCE8E0] pb-2">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-3 py-1.5 rounded-[6px] text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === t.id
                  ? 'bg-[#0F6B3E] text-white shadow-2xs'
                  : 'text-[#6A7B70] hover:text-[#0C2A1B] hover:bg-[#F4FAF6]'
              }`}
            >
              <span>{t.label}</span>
              <span className={`ml-1.5 text-[10px] px-1.5 py-0.2 rounded-full ${
                activeTab === t.id ? 'bg-white/20 text-white' : 'bg-[#E6F4EA] text-[#0F6B3E]'
              }`}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or category..."
            className="w-full sm:w-64 h-9 pl-8 pr-3 text-xs bg-[#F4FAF6] border border-[#DCE8E0] rounded-[8px] focus:outline-none focus:ring-1 focus:ring-[#0F6B3E]"
          />
          <Search className="w-3.5 h-3.5 text-[#6A7B70] absolute left-2.5 top-3 pointer-events-none" />
        </div>
      </div>

      {/* Jobs List */}
      {filteredJobs.length === 0 ? (
        <div className="text-center py-12 bg-white border border-[#DCE8E0] rounded-[10px] space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#E6F4EA] text-[#0F6B3E] flex items-center justify-center mx-auto">
            <Inbox className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-[#0C2A1B]">No jobs match your filter</h3>
          <p className="text-xs text-[#6A7B70] max-w-sm mx-auto">
            Try switching tabs or clear your search query to view your service history.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setActiveTab('all'); setSearch(''); }}
          >
            Reset Filters
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredJobs.map((job) => (
            <div
              key={job.id}
              onClick={() => marketplaceStore.navigate(`/customer/jobs/${job.id}`)}
              className="bg-white border border-[#DCE8E0] rounded-[10px] p-5 hover:border-[#0F6B3E] hover:shadow-xs transition-all cursor-pointer space-y-3 group"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <StatusChip status={job.status} />
                    <span className="text-[11px] font-semibold text-[#0F6B3E] bg-[#E6F4EA] px-2 py-0.5 rounded-full">
                      {job.category}
                    </span>
                    <span className="text-xs text-[#A3B1A8] font-mono">#{job.id}</span>
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-[#0C2A1B] group-hover:text-[#0F6B3E] transition-colors">
                    {job.title}
                  </h3>
                </div>

                <div className="text-right">
                  <span className="text-sm font-extrabold text-[#0C2A1B] tabular-nums">
                    PKR {job.budgetMin.toLocaleString()} - {job.budgetMax.toLocaleString()}
                  </span>
                  <span className="text-[11px] text-[#6A7B70] block">
                    📍 {job.area}, {job.city}
                  </span>
                </div>
              </div>

              <p className="text-xs text-[#6A7B70] line-clamp-2 leading-relaxed">
                {job.description}
              </p>

              <div className="pt-2 border-t border-[#DCE8E0] flex items-center justify-between text-xs">
                <div className="flex items-center gap-4 text-[#6A7B70]">
                  <span>Timing: <strong className="text-[#0C2A1B]">{job.dateScheduled}</strong></span>
                  <span>·</span>
                  <span>Offers: <strong className="text-[#0F6B3E]">{job.offersCount} received</strong></span>
                  {job.hiredProName && (
                    <>
                      <span>·</span>
                      <span>Assigned: <strong className="text-[#0F6B3E]">{job.hiredProName}</strong></span>
                    </>
                  )}
                </div>

                <span className="text-xs font-semibold text-[#0F6B3E] flex items-center gap-0.5 group-hover:underline">
                  View Details & Offers →
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
