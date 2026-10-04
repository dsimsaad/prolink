import React, { useState, useEffect } from 'react';
import { useMarketplace, marketplaceStore } from '../../store/marketplaceStore';
import { api } from '../../services/api';
import { MOCK_ANALYTICS_MONTHS, MOCK_USERS, MOCK_JOBS } from '../../data/mockData';
import { MetricsStrip, MetricItem } from '../../components/ui/MetricsStrip';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { StatusChip } from '../../components/ui/StatusChip';
import { StylizedMap } from '../../components/visuals/StylizedMap';
import {
  CleanAreaChart,
  CleanBarChart,
  CleanDonutChart,
  CleanFunnelChart,
  ChartCard
} from '../../components/charts/DashboardCharts';
import {
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Server,
  ArrowRight,
  Download,
  Users,
  Briefcase
} from 'lucide-react';

export const AdminOverview: React.FC = () => {
  const [period, setPeriod] = useState('30 days');
  const [adminStats, setAdminStats] = useState<any>(null);

  useEffect(() => {
    async function loadStats() {
      const stats = await api.getAdminStats();
      setAdminStats(stats);
    }
    loadStats();
  }, []);

  // Row 1: Primary Financial & Operational Metrics Strip
  const primaryAdminMetrics: MetricItem[] = [
    {
      id: 'gmv',
      label: 'Gross Marketplace Vol (GMV)',
      value: 'PKR 11.48M',
      delta: { value: '+12.4%', direction: 'positive', timeframe: 'vs last mo' },
      sparkline: [3.4, 4.2, 5.9, 7.9, 9.4, 11.48],
      tooltip: 'Total contract value processed across all jobs'
    },
    {
      id: 'revenue',
      label: 'Platform Net Revenue',
      value: 'PKR 574.0k',
      delta: { value: '+12.4%', direction: 'positive' },
      sparkline: [171, 210, 299, 396, 470, 574],
      tooltip: '5% escrow platform commission'
    },
    {
      id: 'active-users',
      label: 'Monthly Active Users',
      value: '1,280',
      delta: { value: '+8.2%', direction: 'positive' },
      sparkline: [700, 850, 980, 1120, 1280]
    },
    {
      id: 'new-signups',
      label: 'New Verified Signups',
      value: '142',
      delta: { value: '+18%', direction: 'positive', timeframe: 'this week' },
      sparkline: [80, 95, 110, 125, 142]
    },
    {
      id: 'fill-rate',
      label: 'Job Match Fill Rate',
      value: '95.8%',
      delta: { value: '+1.2%', direction: 'positive' },
      sparkline: [88, 90, 92, 94, 95.8]
    },
    {
      id: 'first-offer-time',
      label: 'Avg Time to 1st Offer',
      value: '14.2 min',
      delta: { value: '-2.1 min', direction: 'positive', timeframe: 'faster' },
      sparkline: [22, 19, 17, 15, 14.2]
    }
  ];

  // Secondary Strip: Governance & Quality
  const secondaryAdminMetrics: MetricItem[] = [
    {
      id: 'dispute-rate',
      label: 'Dispute & Claim Rate',
      value: '0.8%',
      delta: { value: 'Below 1.5% SLA limit', direction: 'positive' },
      sparkline: [1.2, 1.0, 0.9, 0.8]
    },
    {
      id: 'satisfaction',
      label: 'Community CSAT Score',
      value: '4.88 ★',
      delta: { value: '98.2% positive reviews', direction: 'positive' },
      sparkline: [4.8, 4.84, 4.86, 4.88]
    },
    {
      id: 'pending-verif',
      label: 'Pending Verifications',
      value: '3 Pending',
      delta: { value: 'Review in < 4h', direction: 'neutral' },
      onClick: () => marketplaceStore.navigate('/admin/verification')
    },
    {
      id: 'escrow-held',
      label: 'Active Escrow Held',
      value: 'PKR 842.5k',
      delta: { value: 'In safe custody', direction: 'neutral' },
      sparkline: [400, 600, 750, 842.5]
    }
  ];

  // GMV & Revenue Chart series
  const gmvRevenueTrend = MOCK_ANALYTICS_MONTHS.map(m => ({
    label: m.month.split(' ')[0],
    value: m.gmv,
    secondary: m.revenue
  }));

  // Jobs by category
  const jobsCategoryDonut = [
    { label: 'Electrical', value: 480, color: '#0F6B3E' },
    { label: 'Plumbing', value: 390, color: '#2FAE60' },
    { label: 'AC & HVAC', value: 340, color: '#6BCB77' },
    { label: 'Cleaning', value: 290, color: '#A9D3B5' },
    { label: 'Carpentry', value: 180, color: '#CDE9D6' }
  ];

  // Funnel
  const adminMarketplaceFunnel = [
    { label: 'Jobs Posted', count: 1490, pct: 100 },
    { label: 'Offers Dispatched', count: 4850, pct: 96 },
    { label: 'Offer Accepted (Hired)', count: 1428, pct: 95 },
    { label: 'Successfully Completed', count: 1390, pct: 93 }
  ];

  // Top Pros Leaderboard
  const topPros = MOCK_USERS.filter(u => u.role === 'professional').slice(0, 4);

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2FAE60] animate-pulse" />
            <span className="text-xs font-semibold text-[#0F6B3E] uppercase tracking-wider">
              Central Command & Telemetry
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0C2A1B] tracking-tight mt-1">
            Executive Marketplace Overview
          </h1>
          <p className="text-xs text-[#6A7B70]">
            System metrics across Islamabad, Lahore, Karachi, and Rawalpindi hubs.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => marketplaceStore.navigate('/admin/verification')}
            className="text-xs font-semibold"
          >
            <ShieldCheck className="w-3.5 h-3.5 mr-1 text-[#0F6B3E]" />
            Verification Queue (3)
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => marketplaceStore.navigate('/admin/matching')}
            className="text-xs font-semibold"
          >
            AI Matching Engine →
          </Button>
        </div>
      </div>

      {/* Primary KPI Metrics Strip */}
      <MetricsStrip
        metrics={primaryAdminMetrics}
        selectedPeriod={period}
        onPeriodChange={setPeriod}
      />

      {/* Secondary Metrics Strip (Governance & Quality) */}
      <MetricsStrip
        metrics={secondaryAdminMetrics}
        periods={[]}
      />

      {/* Charts Grid: GMV Trend + Marketplace Funnel + Category Share */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* GMV Trend (8 cols) */}
        <div className="lg:col-span-8">
          <ChartCard title="Gross Marketplace Volume (GMV) Trend" subtitle="Monthly transaction total in PKR">
            <CleanAreaChart data={gmvRevenueTrend} />
          </ChartCard>
        </div>

        {/* Funnel (4 cols) */}
        <div className="lg:col-span-4">
          <ChartCard title="Marketplace Fill Funnel" subtitle="Job lifecycle conversion rate" periodSelector={false}>
            <CleanFunnelChart steps={adminMarketplaceFunnel} />
          </ChartCard>
        </div>
      </div>

      {/* Geographic Density on Stylized Map + Top Professionals */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Map with Density Bubbles */}
        <div className="lg:col-span-7 bg-white border border-[#DCE8E0] rounded-[10px] p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#0C2A1B]">Active Job Density by Sector</h3>
              <p className="text-xs text-[#6A7B70]">Live job volume distribution across Islamabad capital territory</p>
            </div>
            <span className="text-xs font-semibold text-[#0F6B3E] bg-[#E6F4EA] px-2 py-0.5 rounded-full">
              Live Bubbles
            </span>
          </div>

          <StylizedMap
            city="Islamabad"
            showDensityBubbles={true}
            height={280}
          />
        </div>

        {/* Top Professionals Leaderboard */}
        <div className="lg:col-span-5 bg-white border border-[#DCE8E0] rounded-[10px] p-5 space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#0C2A1B]">Top Artisan Leaderboard</h3>
              <p className="text-xs text-[#6A7B70]">Highest revenue and 5-star ratings this month</p>
            </div>
            <button
              onClick={() => marketplaceStore.navigate('/admin/users')}
              className="text-xs text-[#0F6B3E] font-semibold hover:underline"
            >
              All Users →
            </button>
          </div>

          <div className="divide-y divide-[#DCE8E0]">
            {topPros.map((p, idx) => (
              <div key={p.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="w-5 text-center font-bold text-[#6A7B70]">{idx + 1}</span>
                  <Avatar src={p.avatar} name={p.name} size="sm" isVerified={true} />
                  <div>
                    <h4 className="font-bold text-[#0C2A1B]">{p.name}</h4>
                    <span className="text-[10px] text-[#0F6B3E]">{p.category} · {p.city}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-bold text-[#0C2A1B] tabular-nums">★ {p.rating}</div>
                  <div className="text-[10px] text-[#6A7B70]">{p.completedJobs} jobs</div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-2.5 bg-[#F4FAF6] border border-[#DCE8E0] rounded-[6px] text-xs text-[#34453B] flex items-center justify-between">
            <span>Overall pro retention rate:</span>
            <strong className="text-[#0F6B3E] font-mono">96.4%</strong>
          </div>
        </div>
      </div>

      {/* System Health Panel (Uptime, API Latency, Error Rate) */}
      <div className="bg-[#0C2A1B] text-white rounded-[10px] p-6 space-y-4 border border-[#0F6B3E]/40">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <Server className="w-5 h-5 text-[#2FAE60]" />
            <h3 className="text-sm font-bold text-white">System Infrastructure & Microservice Health</h3>
          </div>
          <span className="px-2.5 py-0.5 bg-[#2FAE60] text-[#0C2A1B] text-[10px] font-bold rounded-full">
            ALL SYSTEMS NOMINAL
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div className="space-y-1">
            <span className="text-[#A3B1A8] block">API Gateway Response</span>
            <div className="text-xl font-bold text-white font-mono tabular-nums">42 ms</div>
            <span className="text-[10px] text-[#2FAE60]">Optimal</span>
          </div>

          <div className="space-y-1">
            <span className="text-[#A3B1A8] block">AI Matching Service</span>
            <div className="text-xl font-bold text-white font-mono tabular-nums">18 ms</div>
            <span className="text-[10px] text-[#2FAE60]">Score v2.4 Active</span>
          </div>

          <div className="space-y-1">
            <span className="text-[#A3B1A8] block">SMS OTP Gateway (+92)</span>
            <div className="text-xl font-bold text-white font-mono tabular-nums">99.7%</div>
            <span className="text-[10px] text-[#2FAE60]">Delivery rate</span>
          </div>

          <div className="space-y-1">
            <span className="text-[#A3B1A8] block">Escrow Ledger Invariants</span>
            <div className="text-xl font-bold text-white font-mono tabular-nums">Balanced</div>
            <span className="text-[10px] text-[#2FAE60]">Zero discrepancies</span>
          </div>
        </div>
      </div>
    </div>
  );
};
