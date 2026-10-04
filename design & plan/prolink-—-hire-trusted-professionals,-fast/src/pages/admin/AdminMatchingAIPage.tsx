import React, { useState } from 'react';
import { marketplaceStore } from '../../store/marketplaceStore';
import { MOCK_JOBS, MOCK_USERS } from '../../data/mockData';
import { calculateMatchScore } from '../../services/intelligence';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { RatingStars } from '../../components/ui/RatingStars';
import { Cpu, Sliders, CheckCircle2, RefreshCw, Award, Zap } from 'lucide-react';

export const AdminMatchingAIPage: React.FC = () => {
  // Weights (normalized to 100%)
  const [weights, setWeights] = useState({
    skills: 35,
    distance: 25,
    rating: 20,
    priceFit: 10,
    responseTime: 10
  });

  const sampleJob = MOCK_JOBS[0]; // Emergency UPS Inverter Breaker Tripping
  const pros = MOCK_USERS.filter(u => u.role === 'professional');

  // Convert percentage weights to fractions
  const totalWeight = weights.skills + weights.distance + weights.rating + weights.priceFit + weights.responseTime;
  const normalized = {
    skills: weights.skills / totalWeight,
    distance: weights.distance / totalWeight,
    rating: weights.rating / totalWeight,
    priceFit: weights.priceFit / totalWeight,
    responseTime: weights.responseTime / totalWeight
  };

  // Re-rank pros live
  const rankedPros = pros.map(pro => {
    const scoreData = calculateMatchScore(sampleJob, pro, normalized);
    return { pro, scoreData };
  }).sort((a, b) => b.scoreData.totalScore - a.scoreData.totalScore);

  const abTests = [
    { name: 'A/B-104: Distance penalty vs Sector radius', variantA: 'Radius 25km (Control)', variantB: 'Dynamic sector grid', uplift: '+6.2% Fill Rate', status: 'Running (84% confidence)' },
    { name: 'A/B-105: Free inspection fee weighting boost', variantA: 'Standard 10%', variantB: 'Boost to 20%', uplift: '+14.1% Win Rate', status: 'Concluded (Applied)' },
    { name: 'A/B-106: Verified badge prominence in scoring', variantA: 'Flat +5 pts', variantB: 'Multiplier 1.15x', uplift: '+4.8% CSAT', status: 'Running' }
  ];

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#2FAE60] animate-pulse" />
          <span className="text-xs font-semibold text-[#0F6B3E] uppercase tracking-wider">
            Algorithmic Engine & Intelligence
          </span>
        </div>
        <h1 className="text-2xl font-bold text-[#0C2A1B] mt-1">
          Smart Matching Algorithm & Tuning
        </h1>
        <p className="text-xs text-[#6A7B70]">
          Adjust scoring weights for dispatch ranking and simulate live professional ranking.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Weight Sliders & Calibration */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-[#DCE8E0] rounded-[10px] p-5 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#DCE8E0]">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#0F6B3E]" />
                <h3 className="text-sm font-bold text-[#0C2A1B]">Dispatch Weight Controls</h3>
              </div>
              <button
                type="button"
                onClick={() => setWeights({ skills: 35, distance: 25, rating: 20, priceFit: 10, responseTime: 10 })}
                className="text-xs text-[#0F6B3E] font-semibold hover:underline cursor-pointer flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                Reset Defaults
              </button>
            </div>

            {/* Slider 1: Skills */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-[#0C2A1B]">Trade Skills & Category Fit</span>
                <span className="font-bold text-[#0F6B3E] tabular-nums">{weights.skills}%</span>
              </div>
              <input
                type="range"
                min={10}
                max={60}
                value={weights.skills}
                onChange={(e) => setWeights({ ...weights, skills: Number(e.target.value) })}
                className="w-full accent-[#0F6B3E]"
              />
              <span className="text-[10px] text-[#6A7B70]">Matches exact keywords in description (e.g. inverter, PCB)</span>
            </div>

            {/* Slider 2: Distance */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-[#0C2A1B]">Proximity & Sector Distance</span>
                <span className="font-bold text-[#0F6B3E] tabular-nums">{weights.distance}%</span>
              </div>
              <input
                type="range"
                min={10}
                max={50}
                value={weights.distance}
                onChange={(e) => setWeights({ ...weights, distance: Number(e.target.value) })}
                className="w-full accent-[#0F6B3E]"
              />
              <span className="text-[10px] text-[#6A7B70]">Prioritizes artisans in adjacent sectors (e.g. F-7 to G-9)</span>
            </div>

            {/* Slider 3: Rating */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-[#0C2A1B]">Client Rating & Quality History</span>
                <span className="font-bold text-[#0F6B3E] tabular-nums">{weights.rating}%</span>
              </div>
              <input
                type="range"
                min={5}
                max={40}
                value={weights.rating}
                onChange={(e) => setWeights({ ...weights, rating: Number(e.target.value) })}
                className="w-full accent-[#0F6B3E]"
              />
              <span className="text-[10px] text-[#6A7B70]">Weighted average of 5-star customer reviews</span>
            </div>

            {/* Slider 4: Price Fit */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-[#0C2A1B]">Price & Budget Alignment</span>
                <span className="font-bold text-[#0F6B3E] tabular-nums">{weights.priceFit}%</span>
              </div>
              <input
                type="range"
                min={5}
                max={30}
                value={weights.priceFit}
                onChange={(e) => setWeights({ ...weights, priceFit: Number(e.target.value) })}
                className="w-full accent-[#0F6B3E]"
              />
              <span className="text-[10px] text-[#6A7B70]">Pro base rate vs customer budget boundary</span>
            </div>

            {/* Slider 5: Response Time */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-[#0C2A1B]">Response Time & Availability</span>
                <span className="font-bold text-[#0F6B3E] tabular-nums">{weights.responseTime}%</span>
              </div>
              <input
                type="range"
                min={5}
                max={30}
                value={weights.responseTime}
                onChange={(e) => setWeights({ ...weights, responseTime: Number(e.target.value) })}
                className="w-full accent-[#0F6B3E]"
              />
              <span className="text-[10px] text-[#6A7B70]">Median proposal turnaround in minutes</span>
            </div>

            <Button
              variant="primary"
              size="md"
              onClick={() => marketplaceStore.addToast('Weights Deployed', 'New matching algorithm deployed to live dispatch gateway.', 'success')}
              className="w-full font-bold text-xs"
            >
              Deploy Weights to Production
            </Button>
          </div>

          {/* Model Status Card */}
          <div className="p-4 bg-[#F4FAF6] border border-[#DCE8E0] rounded-[10px] space-y-2 text-xs">
            <div className="flex items-center justify-between font-bold text-[#0C2A1B]">
              <span>Category Auto-Classifier (NLP)</span>
              <span className="text-[#2FAE60] flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> 98.4% Accuracy
              </span>
            </div>
            <p className="text-[#6A7B70] leading-snug">
              Trained on 42,000 localized Pakistani Urdu/English colloquial phrases (e.g. 'deemak', 'geyser element', 'chilling gas', 'ac out nahi chal raha').
            </p>
          </div>
        </div>

        {/* Right: Live Re-Rank Preview */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-[#DCE8E0] rounded-[10px] p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#DCE8E0]">
              <div>
                <h3 className="text-sm font-bold text-[#0C2A1B]">
                  Live Re-Rank Preview on Benchmark Job
                </h3>
                <p className="text-xs text-[#6A7B70]">
                  Job: "{sampleJob.title}" ({sampleJob.area}, {sampleJob.city})
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-[#0F6B3E] bg-[#E6F4EA] px-2 py-0.5 rounded-full">
                Real-time Preview
              </span>
            </div>

            <div className="space-y-3">
              {rankedPros.slice(0, 5).map(({ pro, scoreData }, idx) => (
                <div
                  key={pro.id}
                  className={`p-3.5 rounded-[8px] border flex items-center justify-between gap-4 transition-all ${
                    idx === 0
                      ? 'border-[#0F6B3E] bg-[#F4FAF6]'
                      : 'border-[#DCE8E0] bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-center font-extrabold text-[#0C2A1B] text-sm tabular-nums">
                      #{idx + 1}
                    </span>
                    <Avatar src={pro.avatar} name={pro.name} size="md" isVerified={true} />
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-[#0C2A1B]">{pro.name}</span>
                        {idx === 0 && (
                          <span className="text-[9px] font-bold bg-[#0F6B3E] text-white px-1.5 rounded-full">
                            TOP DISPATCH
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#6A7B70]">
                        {pro.category} · {pro.area} · ★ {pro.rating}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-base font-extrabold text-[#0F6B3E] tabular-nums">
                      {scoreData.totalScore}%
                    </div>
                    <div className="text-[10px] text-[#A3B1A8] font-mono">
                      S:{scoreData.breakdown.skills} D:{scoreData.breakdown.distance}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Active A/B Experiments */}
          <div className="bg-white border border-[#DCE8E0] rounded-[10px] p-5 space-y-3">
            <h3 className="text-sm font-bold text-[#0C2A1B]">Active Algorithm A/B Experiments</h3>
            <div className="divide-y divide-[#DCE8E0]">
              {abTests.map((t) => (
                <div key={t.name} className="py-2.5 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <strong className="text-[#0C2A1B]">{t.name}</strong>
                    <span className="text-[10px] font-bold text-[#2FAE60] bg-[#E6F4EA] px-2 py-0.5 rounded-full">
                      {t.uplift}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#6A7B70] flex justify-between">
                    <span>{t.variantA} vs {t.variantB}</span>
                    <span className="font-mono text-[#A3B1A8]">{t.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
