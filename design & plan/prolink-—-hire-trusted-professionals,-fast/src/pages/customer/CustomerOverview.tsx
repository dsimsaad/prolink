import React, { useState } from 'react';
import { useMarketplace, marketplaceStore } from '../../store/marketplaceStore';
import { MOCK_JOBS, MOCK_OFFERS, MOCK_USERS, CATEGORIES } from '../../data/mockData';
import { api } from '../../services/api';
import { MetricsStrip, MetricItem } from '../../components/ui/MetricsStrip';
import { Button } from '../../components/ui/Button';
import { StatusChip } from '../../components/ui/StatusChip';
import { RatingStars } from '../../components/ui/RatingStars';
import { Avatar } from '../../components/ui/Avatar';
import { StylizedMap } from '../../components/visuals/StylizedMap';
import { CleanAreaChart, CleanBarChart, CleanDonutChart, ChartCard } from '../../components/charts/DashboardCharts';
import {
  PlusCircle,
  Inbox,
  Clock,
  ArrowRight,
  Phone,
  MessageSquare,
  ChevronRight,
  Search,
  Download,
  Calendar,
  Wallet,
  CheckCircle2,
  AlertCircle,
  Award
} from 'lucide-react';

export const CustomerOverview: React.FC = () => {
  const { currentUser, compareOfferIds } = useMarketplace();
  const [selectedPeriod, setSelectedPeriod] = useState('30 days');
  const [tableSearch, setTableSearch] = useState('');
  const [tableFilter, setTableFilter] = useState('all');

  const customer = currentUser || MOCK_USERS[0];

  // Primary active job for tracker (Job 101 - Emergency UPS Breaker Tripping)
  const activeTrackerJob = MOCK_JOBS.find(j => j.id === 'job-101') || MOCK_JOBS[0];

  // Latest offers waiting for review (Job 102 - Master Bathroom Leak)
  const waitingJob = MOCK_JOBS.find(j => j.id === 'job-102');
  const offersForWaitingJob = MOCK_OFFERS.filter(o => o.jobId === 'job-102' && o.status === 'pending');

  // KPI Metrics Strip
  const customerMetrics: MetricItem[] = [
    {
      id: 'active-jobs',
      label: 'Active Jobs',
      value: 2,
      delta: { value: '+1', direction: 'positive', timeframe: 'this week' },
      sparkline: [1, 2, 1, 3, 2, 2],
      onClick: () => marketplaceStore.navigate('/customer/jobs')
    },
    {
      id: 'offers-waiting',
      label: 'Offers Waiting',
      value: 3,
      delta: { value: 'Ready to compare', direction: 'positive' },
      sparkline: [0, 1, 2, 4, 3],
      onClick: () => marketplaceStore.navigate('/customer/jobs/job-102')
    },
    {
      id: 'completed-jobs',
      label: 'Completed Jobs',
      value: 9,
      delta: { value: '+2', direction: 'positive', timeframe: 'vs last mo' },
      sparkline: [4, 5, 6, 7, 8, 9],
      onClick: () => marketplaceStore.navigate('/customer/jobs')
    },
    {
      id: 'total-spent',
      label: 'Total Spent',
      value: 'PKR 94.5k',
      delta: { value: 'Within budget', direction: 'neutral' },
      sparkline: [20, 35, 52, 68, 85, 94]
    },
    {
      id: 'avg-saving',
      label: 'Avg Saving vs Budget',
      value: '18.4%',
      delta: { value: '+3.2%', direction: 'positive' },
      sparkline: [12, 14, 15, 17, 18.4]
    },
    {
      id: 'first-offer-time',
      label: 'Avg Time to 1st Offer',
      value: '12 min',
      delta: { value: '-4 min', direction: 'positive', timeframe: 'faster' },
      sparkline: [25, 20, 16, 14, 12]
    }
  ];

  // Spending analytics data
  const spendingTrend = [
    { label: 'May', value: 12000 },
    { label: 'Jun', value: 16500 },
    { label: 'Jul', value: 14000 },
    { label: 'Aug', value: 24000 },
    { label: 'Sep', value: 19500 },
    { label: 'Oct', value: 8500 }
  ];

  const budgetVsActual = [
    { label: 'Electrical', primary: 4400, secondary: 5000 },
    { label: 'Cleaning', primary: 5500, secondary: 6500 },
    { label: 'Plumbing', primary: 4200, secondary: 6000 },
    { label: 'Carpentry', primary: 4200, secondary: 5500 }
  ];

  const categoryBreakdown = [
    { label: 'Electrical', value: 34500, color: '#0F6B3E' },
    { label: 'Plumbing', value: 24000, color: '#2FAE60' },
    { label: 'Cleaning', value: 22000, color: '#6BCB77' },
    { label: 'Carpentry', value: 14000, color: '#CDE9D6' }
  ];

  // Filtered Job History Table
  const allCustomerJobs = MOCK_JOBS.filter(j => j.customerId === customer.id || j.customerId === 'cust-1');
  const filteredJobs = allCustomerJobs.filter(j => {
    if (tableFilter !== 'all' && j.status !== tableFilter) return false;
    if (tableSearch && !j.title.toLowerCase().includes(tableSearch.toLowerCase())) return false;
    return true;
  });

  const handleExportCsv = () => {
    const csvContent = "data:text/csv;charset=utf-8,"
      + ["Job ID,Title,Category,City,Status,Budget"].join(",") + "\n"
      + filteredJobs.map(e => `${e.id},"${e.title}",${e.category},${e.city},${e.status},PKR ${e.budgetMin}-${e.budgetMax}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ProLink_Jobs_Export_${customer.name.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    marketplaceStore.addToast('CSV Exported', `${filteredJobs.length} job records downloaded.`, 'success');
  };

  return (
    <div className="space-y-8">
      {/* 1. Header with greeting and subtle line-pattern background */}
      <div className="bg-[#F4FAF6] border border-[#DCE8E0] rounded-[12px] p-6 lg:p-8 bg-grid-subtle flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#2FAE60]" />
            <span className="text-xs font-semibold text-[#0F6B3E] uppercase tracking-wider">
              Customer Operations Dashboard
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0C2A1B] tracking-tight">
            Welcome back, {customer.name}
          </h1>
          <p className="text-xs sm:text-sm text-[#6A7B70]">
            You have <strong>1 job currently in progress</strong> and <strong>3 new offers</strong> awaiting your review in Sector F-7.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Button
            variant="primary"
            size="md"
            onClick={() => marketplaceStore.navigate('/customer/post-job')}
            className="font-bold shadow-xs"
          >
            <PlusCircle className="w-4 h-4 mr-1.5" />
            Post a Job
          </Button>

          <Button
            variant="outline"
            size="md"
            onClick={() => marketplaceStore.navigate('/customer/jobs/job-102')}
            className="font-semibold text-xs"
          >
            Compare Offers ({offersForWaitingJob.length})
          </Button>

          <Button
            variant="outline"
            size="md"
            onClick={() => marketplaceStore.navigate('/customer/jobs')}
            className="font-semibold text-xs hidden sm:inline-flex"
          >
            Rebook Past Pro
          </Button>
        </div>
      </div>

      {/* 2. Action-Needed Banner */}
      {waitingJob && (
        <div className="p-4 bg-[#FFFBEB] border border-[#FDE68A] rounded-[10px] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#FEF3C7] flex items-center justify-center text-[#B45309] shrink-0 mt-0.5 sm:mt-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#92400E]">
                  Action Needed: Offers Awaiting Selection
                </span>
                <span className="text-[10px] bg-[#FDE68A] text-[#78350F] px-1.5 py-0.2 rounded font-mono">
                  Job #{waitingJob.id}
                </span>
              </div>
              <p className="text-xs text-[#78350F] mt-0.5">
                "{waitingJob.title}" has 3 verified proposals starting from PKR 3,600. Inspect offers before pro availability expires.
              </p>
            </div>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => marketplaceStore.navigate(`/customer/jobs/${waitingJob.id}`)}
            className="bg-[#B45309] hover:bg-[#92400E] text-white shrink-0 font-bold self-start sm:self-auto text-xs"
          >
            Review & Accept Offers →
          </Button>
        </div>
      )}

      {/* 3. KPI Metrics Strip */}
      <MetricsStrip
        metrics={customerMetrics}
        selectedPeriod={selectedPeriod}
        onPeriodChange={setSelectedPeriod}
      />

      {/* 4. Active Job Tracker (Live GPS route & ETA) */}
      <div className="bg-white border border-[#DCE8E0] rounded-[10px] p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#DCE8E0]">
          <div>
            <div className="flex items-center gap-2">
              <StatusChip status="in_progress" />
              <span className="text-xs text-[#0F6B3E] font-semibold">Active Technician Dispatch</span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-[#0C2A1B] mt-1">
              {activeTrackerJob.title}
            </h3>
            <span className="text-xs text-[#6A7B70]">
              📍 Destination: {activeTrackerJob.address || 'Sector F-7/2, Islamabad'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => marketplaceStore.addToast('Calling Professional...', 'Connecting to +92 300 5544112 via secure gateway.', 'info')}
              className="text-xs font-semibold"
            >
              <Phone className="w-3.5 h-3.5 mr-1 text-[#0F6B3E]" />
              Call Pro
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => marketplaceStore.navigate(`/customer/jobs/${activeTrackerJob.id}`)}
              className="text-xs font-semibold"
            >
              <MessageSquare className="w-3.5 h-3.5 mr-1" />
              Job Chat & Log
            </Button>
          </div>
        </div>

        {/* Tracker split: Map + Pro Info */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-7">
            <StylizedMap
              city="Islamabad"
              showRoute={true}
              routeEta="18 mins"
              height={260}
            />
          </div>

          <div className="lg:col-span-5 space-y-4">
            {/* Pro Card */}
            <div className="p-4 bg-[#F4FAF6] border border-[#DCE8E0] rounded-[10px] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar
                    src={activeTrackerJob.hiredProAvatar}
                    name={activeTrackerJob.hiredProName || 'Tariq Mehmood'}
                    size="md"
                    isVerified={true}
                    isOnline={true}
                  />
                  <div>
                    <h4 className="text-xs font-bold text-[#0C2A1B]">
                      {activeTrackerJob.hiredProName || 'Tariq Mehmood'}
                    </h4>
                    <p className="text-[11px] text-[#0F6B3E] font-medium">Master Electrician · Top Rated</p>
                    <RatingStars rating={4.94} totalReviews={182} size="sm" />
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-[#0F6B3E] tabular-nums">PKR 4,400</span>
                  <span className="text-[10px] text-[#6A7B70] block">Held in Escrow</span>
                </div>
              </div>

              {/* Status Note */}
              <div className="p-2.5 bg-white border border-[#DCE8E0] rounded-[6px] text-xs text-[#34453B] space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-[#0C2A1B]">
                  <Clock className="w-3.5 h-3.5 text-[#0F6B3E]" />
                  <span>En Route · ETA 18 minutes</span>
                </div>
                <p className="text-[11px] text-[#6A7B70] leading-snug">
                  "Arriving via Jinnah Avenue. Tool kit and replacement Schneider 40A breakers ready."
                </p>
              </div>
            </div>

            {/* Stepper Steps */}
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center gap-2 text-[#0F6B3E] font-semibold">
                <CheckCircle2 className="w-4 h-4 text-[#2FAE60]" />
                <span>Job confirmed & Escrow deposit held</span>
              </div>
              <div className="flex items-center gap-2 text-[#0F6B3E] font-semibold">
                <CheckCircle2 className="w-4 h-4 text-[#2FAE60]" />
                <span>Technician dispatched on GPS</span>
              </div>
              <div className="flex items-center gap-2 text-[#6A7B70]">
                <span className="w-4 h-4 rounded-full border border-[#DCE8E0] flex items-center justify-center text-[10px]">3</span>
                <span>Work execution & safety inspection</span>
              </div>
              <div className="flex items-center gap-2 text-[#6A7B70]">
                <span className="w-4 h-4 rounded-full border border-[#DCE8E0] flex items-center justify-center text-[10px]">4</span>
                <span>Client satisfaction sign-off & funds release</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Offers Inbox (Latest offers with compare action) */}
      <div className="bg-white border border-[#DCE8E0] rounded-[10px] p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[#0C2A1B]">
              Latest Offers Inbox ({offersForWaitingJob.length})
            </h3>
            <p className="text-xs text-[#6A7B70]">
              Review incoming quotes for your active request: "{waitingJob?.title}"
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Select all waiting offers for compare
              offersForWaitingJob.forEach(o => {
                if (!compareOfferIds.includes(o.id)) {
                  marketplaceStore.toggleCompareOffer(o.id);
                }
              });
              marketplaceStore.setCompareDrawerOpen(true);
            }}
            className="text-xs font-semibold"
          >
            Compare All 3 Side-by-Side
          </Button>
        </div>

        <div className="divide-y divide-[#DCE8E0]">
          {offersForWaitingJob.map((off) => {
            const isComparing = compareOfferIds.includes(off.id);

            return (
              <div
                key={off.id}
                className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  <Avatar src={off.proAvatar} name={off.proName} size="md" isVerified={true} />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-[#0C2A1B]">{off.proName}</h4>
                      <RatingStars rating={off.proRating} totalReviews={off.proReviewCount} size="sm" />
                      {off.isBestMatch && (
                        <span className="px-2 py-0.2 bg-[#0F6B3E] text-white text-[10px] font-bold rounded-full flex items-center gap-1">
                          <Award className="w-3 h-3" />
                          BEST MATCH
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#34453B] line-clamp-2 max-w-xl">
                      "{off.message}"
                    </p>
                    <div className="flex items-center gap-3 text-[11px] text-[#6A7B70] pt-0.5">
                      <span>Arrival: <strong>{off.arrivalTimeEstimate}</strong></span>
                      <span>·</span>
                      <span>Visit fee: <strong>{off.inspectionFeePKR === 0 ? 'FREE' : `PKR ${off.inspectionFeePKR}`}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end md:self-auto">
                  <div className="text-right">
                    <span className="text-base font-extrabold text-[#0F6B3E] tabular-nums">
                      PKR {off.totalEstimatePKR.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-[#6A7B70] block">Estimated Total</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => marketplaceStore.toggleCompareOffer(off.id)}
                    className={`h-9 px-3 text-xs font-medium rounded-[8px] border transition-colors cursor-pointer ${
                      isComparing
                        ? 'bg-[#0F6B3E] text-white border-[#0F6B3E]'
                        : 'bg-white text-[#0C2A1B] border-[#DCE8E0] hover:bg-[#F4FAF6]'
                    }`}
                  >
                    {isComparing ? '✓ Comparing' : '+ Compare'}
                  </button>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={async () => {
                      await api.acceptOffer(off.id);
                      marketplaceStore.addToast('Offer Accepted! 🤝', 'Job assigned to ' + off.proName, 'success');
                      marketplaceStore.navigate(`/customer/jobs/${off.jobId}`);
                    }}
                    className="font-bold text-xs"
                  >
                    Accept Offer
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. Spending Analytics Grid (Area Chart, Donut, Budget vs Actual) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartCard title="Monthly Spending Trend" subtitle="PKR spent on home maintenance">
          <CleanAreaChart data={spendingTrend} />
        </ChartCard>

        <ChartCard title="Expenditure by Category" subtitle="Distribution of completed services">
          <CleanDonutChart data={categoryBreakdown} />
        </ChartCard>

        <ChartCard title="Budget vs Final Quote" subtitle="Estimated savings per trade">
          <CleanBarChart data={budgetVsActual} />
        </ChartCard>
      </div>

      {/* 7. Job History Table with Search, Filter & CSV Export */}
      <div className="bg-white border border-[#DCE8E0] rounded-[10px] overflow-hidden space-y-4 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-[#0C2A1B]">Job Activity Ledger</h3>
            <p className="text-xs text-[#6A7B70]">All service requests logged for this property account</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <input
                type="text"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                placeholder="Search jobs..."
                className="h-9 pl-8 pr-3 text-xs bg-[#F4FAF6] border border-[#DCE8E0] rounded-[8px] w-44 focus:outline-none"
              />
              <Search className="w-3.5 h-3.5 text-[#6A7B70] absolute left-2.5 top-3 pointer-events-none" />
            </div>

            <select
              value={tableFilter}
              onChange={(e) => setTableFilter(e.target.value)}
              className="h-9 px-2 text-xs bg-[#F4FAF6] border border-[#DCE8E0] rounded-[8px] text-[#0C2A1B] cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="open">Open</option>
              <option value="offers_received">Offers Received</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              className="text-xs"
            >
              <Download className="w-3.5 h-3.5 mr-1" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#DCE8E0] bg-[#F4FAF6] text-[#6A7B70] font-semibold">
                <th className="py-2.5 px-3">Job ID</th>
                <th className="py-2.5 px-3">Job Title & Category</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Assigned Pro</th>
                <th className="py-2.5 px-3 text-right">Budget Range</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DCE8E0]">
              {filteredJobs.slice(0, 6).map((job) => (
                <tr
                  key={job.id}
                  onClick={() => marketplaceStore.navigate(`/customer/jobs/${job.id}`)}
                  className="hover:bg-[#F4FAF6] transition-colors cursor-pointer group"
                >
                  <td className="py-3 px-3 font-mono text-[#6A7B70]">#{job.id}</td>
                  <td className="py-3 px-3">
                    <div className="font-semibold text-[#0C2A1B] group-hover:text-[#0F6B3E] transition-colors">
                      {job.title}
                    </div>
                    <div className="text-[11px] text-[#6A7B70]">
                      {job.category} · {job.city}
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <StatusChip status={job.status} />
                  </td>
                  <td className="py-3 px-3 text-[#34453B]">
                    {job.hiredProName ? (
                      <span className="font-semibold text-[#0F6B3E]">{job.hiredProName}</span>
                    ) : (
                      <span className="text-[#A3B1A8]">{job.offersCount} offers waiting</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums font-medium text-[#0C2A1B]">
                    PKR {job.budgetMin.toLocaleString()} - {job.budgetMax.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <ChevronRight className="w-4 h-4 text-[#A3B1A8] group-hover:text-[#0F6B3E] inline-block" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
