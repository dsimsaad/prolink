import React, { useState, useEffect } from 'react';
import { useMarketplace, marketplaceStore } from '../../store/marketplaceStore';
import { CATEGORIES } from '../../data/mockData';
import { suggestCategory } from '../../services/intelligence';
import { api } from '../../services/api';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import {
  Sparkles,
  MapPin,
  Clock,
  DollarSign,
  Upload,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  X,
  ShieldCheck
} from 'lucide-react';

export const PostJobPage: React.FC = () => {
  const { currentUser, currentRole, postJobDraft } = useMarketplace();

  // Wizard Steps (1 - 4)
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form Fields
  const [title, setTitle] = useState(postJobDraft?.title || '');
  const [description, setDescription] = useState(postJobDraft?.description || '');
  const [category, setCategory] = useState(postJobDraft?.category || 'Electrical');
  const [city, setCity] = useState(postJobDraft?.city || currentUser?.city || 'Islamabad');
  const [area, setArea] = useState(postJobDraft?.area || currentUser?.area || 'Sector F-7/2');
  const [urgency, setUrgency] = useState<'urgent' | 'today' | 'flexible'>(postJobDraft?.urgency || 'today');
  const [dateScheduled, setDateScheduled] = useState(postJobDraft?.dateScheduled || 'Today, 4:00 PM');
  const [budgetMin, setBudgetMin] = useState(postJobDraft?.budgetMin || 2500);
  const [budgetMax, setBudgetMax] = useState(postJobDraft?.budgetMax || 5000);
  const [photos, setPhotos] = useState<string[]>(postJobDraft?.photos || ['/src/assets/images/pro_plumber_action_1791024711564.jpg']);

  // Suggested category hint
  const [suggestedCat, setSuggestedCat] = useState<string | null>(null);
  const [suggestedConf, setSuggestedConf] = useState(0);

  const [loading, setLoading] = useState(false);
  const [submittedJobId, setSubmittedJobId] = useState<string | null>(null);

  // Live intelligent category suggestion
  useEffect(() => {
    const text = `${title} ${description}`;
    const result = suggestCategory(text);
    if (result.category) {
      setSuggestedCat(result.category.name);
      setSuggestedConf(result.confidence);
    } else {
      setSuggestedCat(null);
    }
  }, [title, description]);

  const handleSubmitJob = async () => {
    // If guest, save draft and redirect to join/login
    if (currentRole === 'guest') {
      marketplaceStore.setPostJobDraft({
        title,
        description,
        category,
        city,
        area,
        urgency,
        dateScheduled,
        budgetMin,
        budgetMax,
        photos
      });
      marketplaceStore.addToast('Draft Saved', 'Create an account or sign in to publish your job.', 'info');
      marketplaceStore.navigate('/join');
      return;
    }

    setLoading(true);
    const newJob = await api.createJob({
      customerId: currentUser?.id || 'cust-1',
      customerName: currentUser?.name || 'Mustafa Hashmi',
      customerPhone: currentUser?.phone || '+92 300 8521470',
      title,
      description,
      category,
      city,
      area,
      urgency,
      dateScheduled,
      budgetMin,
      budgetMax,
      photos
    });

    setLoading(false);
    setSubmittedJobId(newJob.id);
    marketplaceStore.simulateIncomingOffersForJob(newJob.id, newJob.title);
  };

  return (
    <div className="max-w-3xl mx-auto py-4 sm:py-6 space-y-6">
      {/* Stepper Progress Bar */}
      {!submittedJobId && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-[#0F6B3E]">Step {step} of 4</span>
            <span className="text-[#6A7B70]">
              {step === 1 && 'Describe the Job'}
              {step === 2 && 'Location & Timing'}
              {step === 3 && 'Budget & Photos'}
              {step === 4 && 'Review & Post'}
            </span>
          </div>
          <div className="h-1.5 bg-[#E6F4EA] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#0F6B3E] transition-all duration-300"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Main Wizard Container */}
      <div className="bg-white border border-[#DCE8E0] rounded-[12px] p-6 sm:p-8 shadow-xs">
        {submittedJobId ? (
          /* Success Screen */
          <div className="text-center py-8 space-y-5 max-w-md mx-auto">
            <div className="w-16 h-16 rounded-full bg-[#E6F4EA] border border-[#CDE9D6] flex items-center justify-center text-[#2FAE60] mx-auto animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-2xl font-bold text-[#0C2A1B]">
                Your Job is Live! 🎉
              </h2>
              <p className="text-xs text-[#6A7B70]">
                Job #{submittedJobId} is now broadcasting to verified professionals in {area}, {city}.
              </p>
            </div>

            <div className="p-4 bg-[#F4FAF6] border border-[#DCE8E0] rounded-[10px] space-y-2 text-xs text-left">
              <div className="flex items-center gap-2 text-[#0F6B3E] font-semibold">
                <span className="w-2 h-2 rounded-full bg-[#2FAE60] animate-ping" />
                <span>Smart Matching Engine active</span>
              </div>
              <p className="text-[#34453B] leading-relaxed">
                We've alerted <strong>8 top-rated pros</strong> within your travel radius. You will receive notifications as custom quotes arrive.
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-3">
              <Button
                variant="primary"
                size="md"
                onClick={() => marketplaceStore.navigate(`/customer/jobs/${submittedJobId}`)}
                className="font-bold w-full"
              >
                Go to Job & View Live Offers →
              </Button>
              <button
                type="button"
                onClick={() => marketplaceStore.navigate('/customer/overview')}
                className="text-xs text-[#6A7B70] hover:text-[#0C2A1B] cursor-pointer"
              >
                Return to Overview
              </button>
            </div>
          </div>
        ) : (
          <div>
            {/* Step 1: Describe the Job */}
            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-[#0C2A1B]">Describe what you need done</h2>
                  <p className="text-xs text-[#6A7B70] mt-0.5">
                    Clear details help professionals send accurate price estimates with no surprises.
                  </p>
                </div>

                <Input
                  label="Job Title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Master bathroom pipe leak or Inverter AC gas refill"
                  required
                />

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[#0C2A1B]">
                    Detailed Description
                  </label>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe symptoms, equipment models, ceiling stains, or specific requirements..."
                    className="w-full p-3 text-xs bg-white border border-[#DCE8E0] rounded-[8px] focus:outline-none focus:ring-2 focus:ring-[#0F6B3E] text-[#0C2A1B]"
                    required
                  />
                </div>

                {/* Intelligent Category Suggestion Hint */}
                {suggestedCat && (
                  <div className="p-3 bg-[#E6F4EA] border border-[#CDE9D6] rounded-[8px] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#0F6B3E] shrink-0" />
                      <span className="text-xs text-[#0B5632]">
                        Suggested category: <strong>{suggestedCat}</strong> ({suggestedConf}% confidence)
                      </span>
                    </div>
                    {category !== suggestedCat && (
                      <button
                        type="button"
                        onClick={() => setCategory(suggestedCat)}
                        className="text-xs font-semibold text-[#0F6B3E] underline hover:text-[#084626] cursor-pointer"
                      >
                        Apply suggestion
                      </button>
                    )}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[#0C2A1B]">
                    Select Trade Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full h-10 px-3 text-sm bg-white border border-[#DCE8E0] rounded-[8px] text-[#0C2A1B] focus:outline-none focus:ring-2 focus:ring-[#0F6B3E]"
                  >
                    {CATEGORIES.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="pt-4 flex justify-end">
                  <Button
                    variant="primary"
                    size="md"
                    disabled={!title.trim()}
                    onClick={() => setStep(2)}
                    className="font-bold"
                  >
                    Next: Location & Timing →
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Location and Timing */}
            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-[#0C2A1B]">Location & Timing</h2>
                  <p className="text-xs text-[#6A7B70] mt-0.5">
                    Pros in your immediate sector will be prioritized for rapid arrival.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-[#0C2A1B]">City</label>
                    <select
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full h-10 px-3 text-sm bg-white border border-[#DCE8E0] rounded-[8px]"
                    >
                      <option value="Islamabad">Islamabad</option>
                      <option value="Lahore">Lahore</option>
                      <option value="Karachi">Karachi</option>
                      <option value="Rawalpindi">Rawalpindi</option>
                    </select>
                  </div>

                  <Input
                    label="Specific Sector or Area"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    placeholder="e.g. F-7/2, DHA Phase 5, Gulberg III"
                    required
                  />
                </div>

                {/* Urgency Selector */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-[#0C2A1B]">
                    How urgent is this job?
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'urgent', label: 'Urgent', desc: 'Need pro within 1-2 hours' },
                      { id: 'today', label: 'Today', desc: 'Anytime today before evening' },
                      { id: 'flexible', label: 'Flexible', desc: 'This week or weekend' }
                    ].map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => setUrgency(u.id as any)}
                        className={`p-3 rounded-[8px] border text-left cursor-pointer transition-colors ${
                          urgency === u.id
                            ? 'border-[#0F6B3E] bg-[#E6F4EA] text-[#0C2A1B]'
                            : 'border-[#DCE8E0] bg-white text-[#34453B] hover:bg-[#F4FAF6]'
                        }`}
                      >
                        <div className="text-xs font-bold">{u.label}</div>
                        <div className="text-[10px] text-[#6A7B70] mt-0.5">{u.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <Input
                  label="Preferred Date & Time Window"
                  value={dateScheduled}
                  onChange={(e) => setDateScheduled(e.target.value)}
                  placeholder="e.g. Today at 3:30 PM or Saturday morning"
                />

                <div className="pt-4 flex justify-between">
                  <Button variant="outline" size="md" onClick={() => setStep(1)}>
                    Back
                  </Button>
                  <Button variant="primary" size="md" onClick={() => setStep(3)} className="font-bold">
                    Next: Budget & Photos →
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Budget and Photos */}
            {step === 3 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-[#0C2A1B]">Budget & Photos</h2>
                  <p className="text-xs text-[#6A7B70] mt-0.5">
                    Setting an approximate budget range helps filter professionals suited to your scale.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-[#0C2A1B]">
                      Minimum Expected Budget (PKR)
                    </label>
                    <input
                      type="number"
                      step={500}
                      value={budgetMin}
                      onChange={(e) => setBudgetMin(Number(e.target.value))}
                      className="w-full h-10 px-3 text-sm bg-white border border-[#DCE8E0] rounded-[8px] tabular-nums"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-[#0C2A1B]">
                      Maximum Expected Budget (PKR)
                    </label>
                    <input
                      type="number"
                      step={500}
                      value={budgetMax}
                      onChange={(e) => setBudgetMax(Number(e.target.value))}
                      className="w-full h-10 px-3 text-sm bg-white border border-[#DCE8E0] rounded-[8px] tabular-nums"
                    />
                  </div>
                </div>

                {/* Photo Previews */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-[#0C2A1B]">
                    Attachments & Defect Photos
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {photos.map((src, i) => (
                      <div key={i} className="relative w-24 h-24 rounded-[8px] overflow-hidden border border-[#DCE8E0]">
                        <img src={src} alt="Defect" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setPhotos(photos.filter((_, idx) => idx !== i))}
                          className="absolute top-1 right-1 p-0.5 bg-black/60 text-white rounded-full"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}

                    <div className="w-24 h-24 rounded-[8px] border-2 border-dashed border-[#A9D3B5] bg-[#F4FAF6] flex flex-col items-center justify-center text-xs text-[#0F6B3E] cursor-pointer hover:bg-[#E6F4EA]">
                      <Upload className="w-4 h-4 mb-1" />
                      <span>Add photo</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex justify-between">
                  <Button variant="outline" size="md" onClick={() => setStep(2)}>
                    Back
                  </Button>
                  <Button variant="primary" size="md" onClick={() => setStep(4)} className="font-bold">
                    Next: Review & Post →
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Review and Post */}
            {step === 4 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-[#0C2A1B]">Review & Post Request</h2>
                  <p className="text-xs text-[#6A7B70] mt-0.5">
                    Please double-check your job details before dispatching to our verified network.
                  </p>
                </div>

                <div className="p-4 bg-[#F4FAF6] border border-[#DCE8E0] rounded-[10px] space-y-3 text-xs">
                  <div className="flex justify-between py-1 border-b border-[#DCE8E0]">
                    <span className="text-[#6A7B70]">Job Title:</span>
                    <strong className="text-[#0C2A1B]">{title}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#DCE8E0]">
                    <span className="text-[#6A7B70]">Category:</span>
                    <span className="font-semibold text-[#0F6B3E]">{category}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#DCE8E0]">
                    <span className="text-[#6A7B70]">Location:</span>
                    <span className="font-medium text-[#0C2A1B]">{area}, {city}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#DCE8E0]">
                    <span className="text-[#6A7B70]">Urgency & Time:</span>
                    <span className="font-medium text-[#0C2A1B] capitalize">{urgency} ({dateScheduled})</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#DCE8E0]">
                    <span className="text-[#6A7B70]">Budget Range:</span>
                    <span className="font-bold text-[#0F6B3E] tabular-nums">PKR {budgetMin.toLocaleString()} - {budgetMax.toLocaleString()}</span>
                  </div>
                </div>

                <div className="p-3 bg-[#E6F4EA] border border-[#CDE9D6] rounded-[8px] text-xs text-[#0B5632] flex items-center gap-2 font-medium">
                  <ShieldCheck className="w-4 h-4 text-[#2FAE60] shrink-0" />
                  <span>Free to post. You only pay when you compare offers and hire your preferred professional.</span>
                </div>

                <div className="pt-4 flex justify-between">
                  <Button variant="outline" size="md" onClick={() => setStep(3)}>
                    Back
                  </Button>
                  <Button
                    variant="primary"
                    size="lg"
                    loading={loading}
                    onClick={handleSubmitJob}
                    className="font-bold shadow-xs"
                  >
                    Publish Job & Get Offers 🚀
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
