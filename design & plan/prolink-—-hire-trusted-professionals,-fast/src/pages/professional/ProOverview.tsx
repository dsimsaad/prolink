import React, { useState } from 'react';
import { useMarketplace, marketplaceStore } from '../../store/marketplaceStore';
import { MOCK_JOBS, MOCK_OFFERS, MOCK_USERS, MOCK_REVIEWS } from '../../data/mockData';
import { calculateMatchScore } from '../../services/intelligence';
import { MetricsStrip, MetricItem } from '../../components/ui/MetricsStrip';
import { Button } from '../../components/ui/Button';
import { RatingStars, RatingDistribution } from '../../components/ui/RatingStars';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { StylizedMap } from '../../components/visuals/StylizedMap';
import {
  CleanAreaChart,
  CleanFunnelChart,
  CleanDemandHeatmap,
  ChartCard
} from '../../components/charts/DashboardCharts';
import {
  Power,
  Compass,
  FileCheck,
  Hammer,
  DollarSign,
  TrendingUp,
  Clock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  AlertCircle,
  HelpCircle,
  Award
} from 'lucide-react';

export const ProOverview: React.FC = () => {
  const { currentUser } = useMarketplace();
  const [selectedPeriod, setSelectedPeriod] = useState('30 days');
  const [isAvailable, setIsAvailable] = useState(true);

  const pro = currentUser || MOCK_USERS[12]; // Tariq Mehmood

  // Pro KPI Metrics Strip
  const proMetrics: MetricItem[] = [
    {
      id: 'earnings-month',
      label: 'Earnings this Month',
      value: 'PKR 86.4k',
      delta: { value: '+14.2%', direction: 'positive', timeframe: 'vs last mo' },
      sparkline: [42, 54, 61, 72, 86.4],
      onClick: () => marketplaceStore.navigate('/pro/earnings')
    },
    {
      id: 'pending-payouts',
      label: 'Pending Escrow Payout',
      value: 'PKR 14,200',
      delta: { value: 'Ready in 24h', direction: 'neutral' },
      sparkline: [10, 12, 14.2],
      onClick: () => marketplaceStore.navigate('/pro/earnings')
    },
    {
      id: 'active-jobs',
      label: 'Active Jobs In Progress',
      value: 1,
      delta: { value: 'On schedule', direction: 'positive' },
      sparkline: [1, 2, 1, 2, 1],
      onClick: () => marketplaceStore.navigate('/pro/active')
    },
    {
      id: 'win-rate',
      label: 'Offer Win Rate',
      value: '42.8%',
      delta: { value: '+4.5%', direction: 'positive' },
      sparkline: [34, 38, 41, 42.8]
    },
    {
      id: 'response-time',
      label: 'Avg Response Time',
      value: '12 min',
      delta: { value: 'Top 5% in Islamabad', direction: 'positive' },
      sparkline: [18, 16, 14, 12]
    },
    {
      id: 'rating',
      label: 'Overall Rating',
      value: '4.94 ★',
      delta: { value: '182 verified reviews', direction: 'positive' },
      sparkline: [4.9, 4.92, 4.94]
    }
  ];

  // Matched jobs for Tariq
  const openJobs = MOCK_JOBS.filter(j => j.status === 'open' || j.status === 'offers_received').slice(0, 3);
  const matchedJobs = openJobs.map(job => {
    const match = calculateMatchScore(job, pro);
    return { job, match };
  });

  // Funnel steps
  const funnelSteps = [
    { label: 'Offers Sent', count: 48, pct: 100 },
    { label: 'Viewed by Customer', count: 42, pct: 88 },
    { label: 'Shortlisted for Compare', count: 28, pct: 58 },
    { label: 'Offers Won & Hired', count: 21, pct: 44 }
  ];

  // Map markers for nearby jobs
  const nearbyMarkers = openJobs.map(j => ({
    id: j.id,
    lat: j.lat || 33.72,
    lng: j.lng || 73.05,
    title: j.title,
    price: `PKR ${j.budgetMin}`,
    urgency: j.urgency
  }));

  // Reviews distribution
  const reviewDistribution = { 5: 164, 4: 16, 3: 2, 2: 0, 1: 0 };

  return (
    <div className="space-y-8">
      {/* 1. Header with availability toggle, profile strength & level progress */}
      <div className="bg-[#F4FAF6] border border-[#DCE8E0] rounded-[12px] p-6 lg:p-8 bg-grid-subtle flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0C2A1B] tracking-tight">
              Salam, {pro.name.split(' ')[0]}! ⚡
            </h1>
            <Badge type="top_rated" />
            <span className="text-xs font-semibold px-2.5 py-0.5 bg-[#E6F4EA] text-[#0F6B3E] rounded-full border border-[#CDE9D6]">
              {pro.category}
            </span>
          </div>

          <p className="text-xs sm:text-sm text-[#6A7B70]">
            Operating within <strong>{pro.travelRadiusKm || 25} km of {pro.area}, {pro.city}</strong>. You have <strong>4 high-match jobs</strong> waiting for offers.
          </p>

          {/* Level Progress Bar & Next Level Req */}
          <div className="space-y-1.5 max-w-md pt-1">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-[#0F6B3E]">Top Rated Artisan Status</span>
              <span className="text-[#6A7B70] text-[11px]">Level 3 (Max)</span>
            </div>
            <div className="h-2 bg-[#E6F4EA] rounded-full overflow-hidden border border-[#CDE9D6]">
              <div className="h-full bg-[#0F6B3E] w-[94%]" />
            </div>
            <div className="text-[11px] text-[#6A7B70] flex justify-between">
              <span>94% Profile Strength</span>
              <span>Next badge: Diamond Master (at 250 jobs)</span>
            </div>
          </div>
        </div>

        {/* Right side: Availability switch & Quick CTA */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 shrink-0">
          <div className="p-3 bg-white border border-[#DCE8E0] rounded-[10px] space-y-1">
            <div className="text-[10px] uppercase font-semibold text-[#A3B1A8]">
              Dispatch Status
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${isAvailable ? 'bg-[#2FAE60] animate-pulse' : 'bg-[#A3B1A8]'}`} />
              <span className="text-xs font-bold text-[#0C2A1B]">
                {isAvailable ? 'Receiving Urgent Jobs' : 'Status: Paused'}
              </span>
              <button
                type="button"
                onClick={() => {
                  const next = !isAvailable;
                  setIsAvailable(next);
                  marketplaceStore.addToast(
                    next ? 'Status: Available' : 'Status: Paused',
                    next ? 'You will receive immediate alerts for nearby urgent jobs.' : 'New job matches paused.',
                    'info'
                  );
                }}
                className="ml-2 text-xs font-semibold text-[#0F6B3E] hover:underline cursor-pointer"
              >
                Change
              </button>
            </div>
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={() => marketplaceStore.navigate('/pro/feed')}
            className="font-bold shadow-xs"
          >
            <Compass className="w-4 h-4 mr-1.5" />
            Browse Job Feed
          </Button>
        </div>
      </div>

      {/* 2. KPI Metrics Strip */}
      <MetricsStrip
        metrics={proMetrics}
        selectedPeriod={selectedPeriod}
        onPeriodChange={setSelectedPeriod}
      />

      {/* 3. Matched Jobs Feed with Score Breakdown */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#0C2A1B]">
              Top Matched Jobs Near You
            </h2>
            <p className="text-xs text-[#6A7B70]">
              Ordered by urgency, skill alignment, and proximity to {pro.area}
            </p>
          </div>
          <button
            onClick={() => marketplaceStore.navigate('/pro/feed')}
            className="text-xs text-[#0F6B3E] font-semibold hover:underline"
          >
            View All in Feed →
          </button>
        </div>

        <div className="space-y-3">
          {matchedJobs.map(({ job, match }) => (
            <div
              key={job.id}
              onClick={() => marketplaceStore.navigate(`/pro/feed/${job.id}`)}
              className="bg-white border border-[#DCE8E0] rounded-[10px] p-5 hover:border-[#0F6B3E] hover:shadow-xs transition-all cursor-pointer space-y-3 group"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-[#0F6B3E] text-white text-[11px] font-bold rounded-full flex items-center gap-1">
                      <Award className="w-3 h-3" />
                      {match.totalScore}% Match
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      job.urgency === 'urgent'
                        ? 'bg-[#FEF2F2] text-[#B42318] border border-[#FECACA]'
                        : 'bg-[#FFFBEB] text-[#B45309]'
                    }`}>
                      {job.urgency === 'urgent' ? '⚡ Emergency Dispatch' : 'Today'}
                    </span>
                    <span className="text-xs text-[#A3B1A8] font-mono">#{job.id}</span>
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-[#0C2A1B] group-hover:text-[#0F6B3E] transition-colors">
                    {job.title}
                  </h3>
                </div>

                <div className="text-right">
                  <span className="text-sm font-extrabold text-[#0F6B3E] tabular-nums">
                    PKR {job.budgetMin.toLocaleString()} - {job.budgetMax.toLocaleString()}
                  </span>
                  <span className="text-[11px] text-[#6A7B70] block">
                    Customer Budget
                  </span>
                </div>
              </div>

              <p className="text-xs text-[#6A7B70] line-clamp-2 leading-relaxed">
                {job.description}
              </p>

              {/* Match Breakdown & Submit button */}
              <div className="pt-2 border-t border-[#DCE8E0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-4 text-[#6A7B70]">
                  <span>📍 {job.area}, {job.city}</span>
                  <span>·</span>
                  <span>Timing: <strong className="text-[#0C2A1B]">{job.dateScheduled}</strong></span>
                  <span>·</span>
                  <span>{job.offersCount} competitor offers</span>
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
                  Compose Offer →
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Split: Nearby Jobs on Stylized Map + Offers Expiring & Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Map of nearby jobs with travel radius */}
        <div className="lg:col-span-7 bg-white border border-[#DCE8E0] rounded-[10px] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#0C2A1B]">Nearby Jobs in Your Coverage Radius</h3>
              <p className="text-xs text-[#6A7B70]">Pins colored by urgency. Showing {pro.travelRadiusKm} km coverage</p>
            </div>
            <span className="text-xs font-semibold text-[#0F6B3E] bg-[#E6F4EA] px-2 py-0.5 rounded-full">
              {openJobs.length} Live Openings
            </span>
          </div>

          <StylizedMap
            city={pro.city || 'Islamabad'}
            markers={nearbyMarkers}
            showRadius={true}
            radiusKm={pro.travelRadiusKm || 25}
            height={280}
            onMarkerClick={(m) => marketplaceStore.navigate(`/pro/feed/${m.id}`)}
          />
        </div>

        {/* Funnel & Conversion Metrics */}
        <div className="lg:col-span-5 bg-white border border-[#DCE8E0] rounded-[10px] p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-[#0C2A1B]">Offer Conversion Funnel</h3>
            <p className="text-xs text-[#6A7B70]">Your proposal performance over the last 30 days</p>
          </div>

          <CleanFunnelChart steps={funnelSteps} />

          <div className="p-3 bg-[#F4FAF6] border border-[#DCE8E0] rounded-[8px] text-xs text-[#34453B] space-y-1">
            <span className="font-bold text-[#0F6B3E] block">Pro Tip to Win More Jobs:</span>
            <p className="text-[11px] text-[#6A7B70] leading-snug">
              Pros who offer free inspection and an arrival ETA under 30 minutes win <strong>3.2x more jobs</strong> on ProLink.
            </p>
          </div>
        </div>
      </div>

      {/* 5. Split: Demand Heatmap & Client Reviews Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Demand Heatmap */}
        <div className="lg:col-span-7 bg-white border border-[#DCE8E0] rounded-[10px] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#0C2A1B]">Weekly Demand Heatmap</h3>
              <p className="text-xs text-[#6A7B70]">Peak hours when customers in Islamabad post service requests</p>
            </div>
            <span className="text-xs font-semibold text-[#0F6B3E]">Scale: 1 (Low) to 10 (Peak)</span>
          </div>

          <CleanDemandHeatmap />
        </div>

        {/* Reviews Summary */}
        <div className="lg:col-span-5 bg-white border border-[#DCE8E0] rounded-[10px] p-5 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#0C2A1B]">Rating Distribution</h3>
              <span className="text-xs font-bold text-[#0C2A1B] tabular-nums">4.94 / 5.0</span>
            </div>
            <p className="text-xs text-[#6A7B70] mt-0.5">Based on 182 verified completed jobs</p>
          </div>

          <RatingDistribution distribution={reviewDistribution} total={182} />

          <div className="pt-2 border-t border-[#DCE8E0] space-y-1.5">
            <span className="text-xs font-semibold text-[#0C2A1B] block">Common Praise Keywords:</span>
            <div className="flex flex-wrap gap-1">
              {['Neat wiring', 'Punctual arrival', 'Honest pricing', 'Safe inspection', 'Fluke tester'].map(kw => (
                <span key={kw} className="px-2 py-0.5 bg-[#E6F4EA] text-[#0F6B3E] text-[10px] font-semibold rounded-full">
                  ✓ {kw}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
