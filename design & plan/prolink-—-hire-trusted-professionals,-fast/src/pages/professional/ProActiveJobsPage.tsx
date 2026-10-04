import React, { useState, useEffect } from 'react';
import { useMarketplace, marketplaceStore } from '../../store/marketplaceStore';
import { MOCK_JOBS } from '../../data/mockData';
import { api } from '../../services/api';
import { Job } from '../../types';
import { Button } from '../../components/ui/Button';
import { StatusChip } from '../../components/ui/StatusChip';
import { Avatar } from '../../components/ui/Avatar';
import { StylizedMap } from '../../components/visuals/StylizedMap';
import {
  Clock,
  MapPin,
  Phone,
  CheckCircle2,
  Camera,
  Upload,
  AlertCircle,
  ShieldCheck,
  Send,
  CheckSquare
} from 'lucide-react';

export const ProActiveJobsPage: React.FC = () => {
  const [activeJob, setActiveJob] = useState<Job>(MOCK_JOBS[0]);
  const [proStatus, setProStatus] = useState<'on_the_way' | 'started' | 'finished'>('on_the_way');
  const [checklist, setChecklist] = useState([
    { id: 1, label: 'Inspect distribution box for loose neutral lines', done: true },
    { id: 2, label: 'Run clamp meter thermal test under refrigerator load', done: true },
    { id: 3, label: 'Replace burned 32A breaker with Schneider 40A C-curve', done: false },
    { id: 4, label: 'Demonstrate zero tripping under full load to customer', done: false }
  ]);
  const [progressNotes, setProgressNotes] = useState('Replaced breaker socket and tightened busbar connectors.');
  const [completionRequested, setCompletionRequested] = useState(false);

  const toggleCheck = (id: number) => {
    setChecklist(checklist.map(item => item.id === id ? { ...item, done: !item.done } : item));
  };

  const handleUpdateStatus = async (status: 'on_the_way' | 'started' | 'finished') => {
    setProStatus(status);
    await api.updateProWorkLog(activeJob.id, {
      status,
      notes: [progressNotes],
      etaMinutes: status === 'on_the_way' ? 15 : 0
    });
    marketplaceStore.addToast('Job Status Updated', `Status changed to ${status.replace(/_/g, ' ')}. Customer notified.`, 'info');
  };

  const handleRequestCompletion = () => {
    setCompletionRequested(true);
    marketplaceStore.addToast('Completion Requested! 🎯', 'Client received inspection prompt to release escrow payment.', 'success');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <StatusChip status="in_progress" />
            <span className="text-xs font-semibold text-[#0F6B3E] uppercase tracking-wider">Active Workspace</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0C2A1B] mt-1">
            {activeJob.title}
          </h1>
          <p className="text-xs text-[#6A7B70]">
            Client: <strong>{activeJob.customerName}</strong> · {activeJob.address || `${activeJob.area}, ${activeJob.city}`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => marketplaceStore.addToast('Calling Customer...', `Dialing ${activeJob.customerPhone || '+92 300 8521470'}`, 'info')}
            className="text-xs font-semibold"
          >
            <Phone className="w-3.5 h-3.5 mr-1 text-[#0F6B3E]" />
            Call Customer
          </Button>
        </div>
      </div>

      {/* Execution Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Status Controller, Checklist & Photos */}
        <div className="lg:col-span-7 space-y-6">
          {/* Status Segmented Buttons */}
          <div className="bg-white border border-[#DCE8E0] rounded-[10px] p-5 space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0F6B3E] block">
              Execution Status Control
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleUpdateStatus('on_the_way')}
                className={`py-3 px-2 rounded-[8px] border text-center transition-colors cursor-pointer ${
                  proStatus === 'on_the_way'
                    ? 'bg-[#0F6B3E] text-white border-[#0F6B3E] font-bold shadow-xs'
                    : 'bg-white text-[#34453B] border-[#DCE8E0] hover:bg-[#F4FAF6]'
                }`}
              >
                <div className="text-xs">🚗 On the Way</div>
                <div className="text-[10px] opacity-80 mt-0.5">En Route</div>
              </button>

              <button
                type="button"
                onClick={() => handleUpdateStatus('started')}
                className={`py-3 px-2 rounded-[8px] border text-center transition-colors cursor-pointer ${
                  proStatus === 'started'
                    ? 'bg-[#0F6B3E] text-white border-[#0F6B3E] font-bold shadow-xs'
                    : 'bg-white text-[#34453B] border-[#DCE8E0] hover:bg-[#F4FAF6]'
                }`}
              >
                <div className="text-xs">🔧 Work Started</div>
                <div className="text-[10px] opacity-80 mt-0.5">On Site</div>
              </button>

              <button
                type="button"
                onClick={() => handleUpdateStatus('finished')}
                className={`py-3 px-2 rounded-[8px] border text-center transition-colors cursor-pointer ${
                  proStatus === 'finished'
                    ? 'bg-[#0F6B3E] text-white border-[#0F6B3E] font-bold shadow-xs'
                    : 'bg-white text-[#34453B] border-[#DCE8E0] hover:bg-[#F4FAF6]'
                }`}
              >
                <div className="text-xs">✅ Work Finished</div>
                <div className="text-[10px] opacity-80 mt-0.5">Ready for Review</div>
              </button>
            </div>
          </div>

          {/* Task Checklist */}
          <div className="bg-white border border-[#DCE8E0] rounded-[10px] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#0C2A1B]">Technician Quality Checklist</h3>
              <span className="text-xs font-semibold text-[#0F6B3E]">
                {checklist.filter(c => c.done).length} / {checklist.length} Complete
              </span>
            </div>

            <div className="space-y-2">
              {checklist.map((item) => (
                <div
                  key={item.id}
                  onClick={() => toggleCheck(item.id)}
                  className={`p-3 rounded-[8px] border flex items-center justify-between cursor-pointer transition-colors ${
                    item.done
                      ? 'bg-[#E6F4EA] border-[#CDE9D6] text-[#0F6B3E]'
                      : 'bg-white border-[#DCE8E0] text-[#34453B] hover:bg-[#F4FAF6]'
                  }`}
                >
                  <span className={`text-xs ${item.done ? 'line-through opacity-85' : 'font-medium'}`}>
                    {item.label}
                  </span>
                  <CheckSquare className={`w-4 h-4 shrink-0 ${item.done ? 'text-[#0F6B3E]' : 'text-[#A3B1A8]'}`} />
                </div>
              ))}
            </div>
          </div>

          {/* Progress Photos Upload */}
          <div className="bg-white border border-[#DCE8E0] rounded-[10px] p-5 space-y-4">
            <h3 className="text-sm font-bold text-[#0C2A1B]">Job Progress Photos</h3>
            <div className="flex flex-wrap gap-3">
              <div className="w-24 h-24 rounded-[8px] overflow-hidden border border-[#DCE8E0] relative group">
                <img
                  src="/src/assets/images/hero_craftsman_pro_1791024679723.jpg"
                  alt="Work in progress"
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] px-1 rounded">
                  Before
                </span>
              </div>

              <div className="w-24 h-24 rounded-[8px] border-2 border-dashed border-[#A9D3B5] bg-[#F4FAF6] flex flex-col items-center justify-center text-xs text-[#0F6B3E] cursor-pointer hover:bg-[#E6F4EA]">
                <Camera className="w-5 h-5 mb-1 text-[#0F6B3E]" />
                <span className="text-[11px] font-semibold">Take Photo</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Map, Escrow Protection & Request Completion */}
        <div className="lg:col-span-5 space-y-6">
          {/* Customer Location & GPS Navigation */}
          <div className="bg-white border border-[#DCE8E0] rounded-[10px] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#0C2A1B]">Customer Destination</h3>
              <span className="text-xs text-[#0F6B3E] font-medium">{activeJob.area}</span>
            </div>
            <StylizedMap
              city={activeJob.city}
              showRoute={true}
              routeEta="18 mins"
              height={220}
            />
          </div>

          {/* Locked Escrow Amount */}
          <div className="bg-[#F4FAF6] border border-[#DCE8E0] rounded-[10px] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#6A7B70]">Escrow Contract Amount</span>
              <span className="text-[10px] bg-[#E6F4EA] text-[#0F6B3E] font-bold px-2 py-0.5 rounded-full">
                Guaranteed Deposit
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold text-[#0C2A1B] tabular-nums">
                PKR 4,400
              </span>
              <span className="text-xs text-[#6A7B70]">
                Net Payout: PKR 4,180 (after 5% platform fee)
              </span>
            </div>

            <div className="pt-2 border-t border-[#DCE8E0] text-[11px] text-[#6A7B70] leading-snug">
              Client has deposited funds into ProLink escrow. Once you finish work and client inspects, funds are credited immediately.
            </div>
          </div>

          {/* Request Completion Button */}
          <div className="bg-white border border-[#DCE8E0] rounded-[10px] p-5 space-y-3">
            <h3 className="text-sm font-bold text-[#0C2A1B]">Final Inspection & Payout</h3>
            <p className="text-xs text-[#6A7B70]">
              When all physical work and testing is complete, request the client to sign off and release escrow.
            </p>

            <Button
              variant="primary"
              size="lg"
              disabled={completionRequested}
              onClick={handleRequestCompletion}
              className="w-full font-bold shadow-xs text-sm"
            >
              {completionRequested ? '✓ Completion Request Sent' : 'Request Completion & Payment Release →'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
