import React, { useState, useEffect } from 'react';
import { marketplaceStore } from '../../store/marketplaceStore';
import { api } from '../../services/api';
import { Job } from '../../types';
import { CATEGORIES } from '../../data/mockData';
import { StatusChip } from '../../components/ui/StatusChip';
import { Button } from '../../components/ui/Button';
import { Search, Filter, AlertTriangle, XCircle, X } from 'lucide-react';

export const AdminJobsOffersPage: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchJobs = async () => {
    setLoading(true);
    const data = await api.getJobs();
    setJobs(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const filteredJobs = jobs.filter(j => {
    if (statusFilter !== 'all' && j.status !== statusFilter) return false;
    if (cityFilter !== 'all' && j.city !== cityFilter) return false;
    if (search && !j.title.toLowerCase().includes(search.toLowerCase()) && !j.category.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleForceCancel = async (jobId: string) => {
    await api.updateJobStatus(jobId, 'cancelled');
    await fetchJobs();
    setSelectedJob(null);
    marketplaceStore.addToast('Job Cancelled', `Job #${jobId} was force-cancelled by admin. Escrow refunded.`, 'info');
  };

  const handleFlagJob = async (jobId: string) => {
    await api.updateJobStatus(jobId, 'disputed');
    await fetchJobs();
    setSelectedJob(null);
    marketplaceStore.addToast('Job Flagged', `Job #${jobId} moved to Dispute Investigation queue.`, 'warning');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0C2A1B]">Jobs & Offers Telemetry</h1>
        <p className="text-xs text-[#6A7B70] mt-0.5">
          Real-time oversight of all customer requests, bidding activity, and escrow contracts.
        </p>
      </div>

      {/* Filters Bar */}
      <div className="bg-white border border-[#DCE8E0] rounded-[10px] p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title or category..."
              className="w-56 h-9 pl-8 pr-3 text-xs bg-[#F4FAF6] border border-[#DCE8E0] rounded-[8px] focus:outline-none"
            />
            <Search className="w-3.5 h-3.5 text-[#6A7B70] absolute left-2.5 top-3 pointer-events-none" />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 text-xs bg-[#F4FAF6] border border-[#DCE8E0] rounded-[8px] text-[#0C2A1B] cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="offers_received">Offers Received</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="disputed">Disputed</option>
          </select>

          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="h-9 px-3 text-xs bg-[#F4FAF6] border border-[#DCE8E0] rounded-[8px] text-[#0C2A1B] cursor-pointer"
          >
            <option value="all">All Cities</option>
            <option value="Islamabad">Islamabad</option>
            <option value="Lahore">Lahore</option>
            <option value="Karachi">Karachi</option>
            <option value="Rawalpindi">Rawalpindi</option>
          </select>
        </div>

        <span className="text-xs text-[#6A7B70] font-medium">
          Showing <strong>{filteredJobs.length}</strong> jobs
        </span>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#DCE8E0] rounded-[10px] overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#DCE8E0] bg-[#F4FAF6] text-[#6A7B70] font-semibold">
              <th className="py-3 px-4">Job ID</th>
              <th className="py-3 px-4">Title & Category</th>
              <th className="py-3 px-4">Customer</th>
              <th className="py-3 px-4">Location</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Budget / Value</th>
              <th className="py-3 px-4 text-right">Inspect</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#DCE8E0]">
            {filteredJobs.map((job) => (
              <tr
                key={job.id}
                onClick={() => setSelectedJob(job)}
                className="hover:bg-[#F4FAF6] transition-colors cursor-pointer group"
              >
                <td className="py-3 px-4 font-mono text-[#6A7B70]">#{job.id}</td>
                <td className="py-3 px-4">
                  <div className="font-bold text-[#0C2A1B] group-hover:text-[#0F6B3E]">
                    {job.title}
                  </div>
                  <span className="text-[10px] text-[#0F6B3E] font-semibold">{job.category}</span>
                </td>
                <td className="py-3 px-4 text-[#34453B]">
                  {job.customerName}
                </td>
                <td className="py-3 px-4 text-[#6A7B70]">
                  {job.area}, {job.city}
                </td>
                <td className="py-3 px-4">
                  <StatusChip status={job.status} />
                </td>
                <td className="py-3 px-4 text-right tabular-nums font-medium text-[#0C2A1B]">
                  PKR {job.budgetMin.toLocaleString()} - {job.budgetMax.toLocaleString()}
                </td>
                <td className="py-3 px-4 text-right">
                  <button className="text-xs font-semibold text-[#0F6B3E] hover:underline cursor-pointer">
                    Examine →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Drawer */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white h-full p-6 space-y-6 overflow-y-auto shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-200">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#DCE8E0]">
                <span className="text-xs font-bold text-[#0F6B3E] uppercase tracking-wider">
                  Admin Oversight Drawer
                </span>
                <button onClick={() => setSelectedJob(null)} className="text-[#6A7B70] hover:text-[#0C2A1B]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <StatusChip status={selectedJob.status} />
                  <span className="text-xs text-[#A3B1A8] font-mono">#{selectedJob.id}</span>
                </div>
                <h3 className="text-base font-bold text-[#0C2A1B] mt-1">
                  {selectedJob.title}
                </h3>
              </div>

              <div className="p-3 bg-[#F4FAF6] rounded-[8px] border border-[#DCE8E0] space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#6A7B70]">Customer:</span>
                  <strong className="text-[#0C2A1B]">{selectedJob.customerName}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6A7B70]">Location:</span>
                  <span>{selectedJob.area}, {selectedJob.city}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6A7B70]">Assigned Pro:</span>
                  <strong className="text-[#0F6B3E]">{selectedJob.hiredProName || 'None (Open)'}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6A7B70]">Offers Count:</span>
                  <span>{selectedJob.offersCount} quotes</span>
                </div>
              </div>

              <p className="text-xs text-[#34453B] leading-relaxed">
                {selectedJob.description}
              </p>
            </div>

            {/* Moderation Controls */}
            <div className="pt-4 border-t border-[#DCE8E0] space-y-2">
              <Button
                variant="outline"
                size="md"
                onClick={() => handleFlagJob(selectedJob.id)}
                className="w-full text-xs font-semibold text-[#B45309] border-[#FDE68A] hover:bg-[#FEF3C7]"
              >
                <AlertTriangle className="w-4 h-4 mr-1.5" />
                Flag for Dispute Investigation
              </Button>

              <Button
                variant="danger"
                size="md"
                onClick={() => handleForceCancel(selectedJob.id)}
                className="w-full text-xs font-bold"
              >
                <XCircle className="w-4 h-4 mr-1.5" />
                Force-Cancel Job & Refund Escrow
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
