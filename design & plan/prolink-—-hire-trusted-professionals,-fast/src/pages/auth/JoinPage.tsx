import React, { useState } from 'react';
import { useMarketplace, marketplaceStore } from '../../store/marketplaceStore';
import { Input } from '../../components/ui/Input';
import { PasswordInput } from '../../components/ui/PasswordInput';
import { PhoneInput, OtpInput } from '../../components/ui/PhoneInput';
import { Button } from '../../components/ui/Button';
import { CATEGORIES } from '../../data/mockData';
import { api } from '../../services/api';
import {
  CheckCircle2,
  ShieldCheck,
  Upload,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  MapPin,
  Clock,
  Award
} from 'lucide-react';

export const JoinPage: React.FC = () => {
  const { queryParams, postJobDraft } = useMarketplace();
  const initialRole = queryParams['role'] === 'pro' ? 'professional' : 'customer';

  const [role, setRole] = useState<'customer' | 'professional'>(initialRole);

  // Customer form state
  const [customerStep, setCustomerStep] = useState<'form' | 'otp' | 'tour'>('form');
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [custPassword, setCustPassword] = useState('');
  const [custCity, setCustCity] = useState('Islamabad');
  const [custTerms, setCustTerms] = useState(true);
  const [custOtp, setCustOtp] = useState('');
  const [tourSlide, setTourSlide] = useState(0);

  // Professional Onboarding 5-Step state
  const [proStep, setProStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [proName, setProName] = useState('');
  const [proPhone, setProPhone] = useState('');
  const [proEmail, setProEmail] = useState('');
  const [proPassword, setProPassword] = useState('');
  const [proOtp, setProOtp] = useState('');
  const [proCategory, setProCategory] = useState('Electrical');
  const [proSkills, setProSkills] = useState<string[]>(['Inverter Wiring', 'DB Breakers', 'Short Circuit Tracing']);
  const [newSkillInput, setNewSkillInput] = useState('');
  const [proExpYears, setProExpYears] = useState(8);
  const [proCity, setProCity] = useState('Islamabad');
  const [proArea, setProArea] = useState('G-9');
  const [proRadiusKm, setProRadiusKm] = useState(25);
  const [proBaseRate, setProBaseRate] = useState(1500);
  const [proInspectionFee, setProInspectionFee] = useState(500);
  const [proBio, setProBio] = useState('Certified master technician with TEVTA accreditation. Committed to transparent, tidy, and guaranteed service.');
  const [cnicNumber, setCnicNumber] = useState('37405-1234567-1');
  const [uploadedCnic, setUploadedCnic] = useState(true);
  const [uploadedSelfie, setUploadedSelfie] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Handle Customer Submit
  const handleCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName || !custPhone || !custEmail || !custPassword) {
      setError('Please fill all required fields.');
      return;
    }
    setError('');
    setCustomerStep('otp');
  };

  const handleCustomerOtpComplete = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    setLoading(false);
    setCustomerStep('tour');
  };

  const finishCustomerJoin = async () => {
    const newUser = await api.registerUser({
      name: custName || 'New Customer',
      email: custEmail || 'customer@example.com',
      phone: `+92 ${custPhone}`,
      city: custCity,
      role: 'customer'
    });

    marketplaceStore.setCurrentUser(newUser);
    marketplaceStore.setRole('customer');

    // If had a draft job, create it automatically
    if (postJobDraft) {
      const created = await api.createJob({
        customerId: newUser.id,
        customerName: newUser.name,
        customerPhone: newUser.phone,
        title: postJobDraft.title,
        description: postJobDraft.description,
        category: postJobDraft.category,
        subCategory: postJobDraft.subCategory,
        city: postJobDraft.city,
        area: postJobDraft.area,
        urgency: postJobDraft.urgency,
        dateScheduled: postJobDraft.dateScheduled,
        budgetMin: postJobDraft.budgetMin,
        budgetMax: postJobDraft.budgetMax,
        photos: postJobDraft.photos
      });
      marketplaceStore.setPostJobDraft(null);
      marketplaceStore.simulateIncomingOffersForJob(created.id, created.title);
      marketplaceStore.navigate(`/customer/jobs/${created.id}`);
      marketplaceStore.addToast('Job posted successfully! 🎉', 'Nearby verified professionals have been notified.', 'success');
    } else {
      marketplaceStore.navigate('/customer/overview');
      marketplaceStore.addToast('Welcome to ProLink!', 'Your account is ready. You can now post jobs and hire verified pros.', 'success');
    }
  };

  // Handle Pro Step 5 (Submit for Verification)
  const handleProSubmit = async () => {
    setLoading(true);
    const newPro = await api.registerUser({
      name: proName || 'Muhammad Professional',
      email: proEmail || 'pro@example.com',
      phone: `+92 ${proPhone}`,
      role: 'professional',
      category: proCategory,
      skills: proSkills,
      experienceYears: proExpYears,
      city: proCity,
      area: proArea,
      travelRadiusKm: proRadiusKm,
      baseRate: proBaseRate,
      inspectionFee: proInspectionFee,
      bio: proBio
    });
    setLoading(false);
    setProStep(6); // Step 6 is "Verification in Progress"
    marketplaceStore.addToast('Application submitted! 📋', 'Your profile and CNIC are in the Admin Verification Queue.', 'info');
  };

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left Form Area */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-10 lg:p-12 max-w-2xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => marketplaceStore.navigate('/')}
            className="flex items-center gap-2 cursor-pointer focus:outline-none"
          >
            <div className="w-8 h-8 rounded-[8px] bg-[#0F6B3E] flex items-center justify-center text-white shadow-2xs font-bold text-lg">
              <svg viewBox="0 0 32 32" className="w-5 h-5 fill-current">
                <path d="M10 8h7a5 5 0 0 1 5 5c0 2.76-2.24 5-5 5h-4v6h-3V8zm3 3v4h4a2 2 0 0 0 0-4h-4z" />
                <circle cx="20" cy="19" r="3.5" fill="#2FAE60" />
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tight text-[#0C2A1B]">
              ProLink
            </span>
          </button>

          <span className="text-xs text-[#6A7B70]">
            Already have an account?{' '}
            <button
              onClick={() => marketplaceStore.navigate('/sign-in')}
              className="text-[#0F6B3E] font-semibold hover:underline cursor-pointer"
            >
              Sign In
            </button>
          </span>
        </div>

        {/* Content Box */}
        <div className="my-auto py-6">
          {/* Role Toggle Customer vs Pro */}
          {customerStep === 'form' && proStep === 1 && (
            <div className="mb-6 p-1 bg-[#F4FAF6] border border-[#DCE8E0] rounded-[10px] grid grid-cols-2 max-w-md">
              <button
                type="button"
                onClick={() => setRole('customer')}
                className={`py-2 text-xs font-semibold rounded-[8px] transition-colors cursor-pointer ${
                  role === 'customer'
                    ? 'bg-white text-[#0C2A1B] shadow-2xs'
                    : 'text-[#6A7B70] hover:text-[#0C2A1B]'
                }`}
              >
                👤 Hire Services (Customer)
              </button>
              <button
                type="button"
                onClick={() => setRole('professional')}
                className={`py-2 text-xs font-semibold rounded-[8px] transition-colors cursor-pointer ${
                  role === 'professional'
                    ? 'bg-[#0F6B3E] text-white shadow-2xs'
                    : 'text-[#6A7B70] hover:text-[#0C2A1B]'
                }`}
              >
                ⚡ Work & Earn (Professional)
              </button>
            </div>
          )}

          {/* ==================== CUSTOMER PATH ==================== */}
          {role === 'customer' && (
            <div>
              {customerStep === 'form' && (
                <form onSubmit={handleCustomerSubmit} className="space-y-4">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-[#0C2A1B] tracking-tight">
                      Join as a Customer
                    </h1>
                    <p className="text-sm text-[#6A7B70] mt-1">
                      Post jobs, receive instant competitive offers, and hire trusted pros across Pakistan.
                    </p>
                  </div>

                  {error && (
                    <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-[8px] text-xs text-[#B42318] font-medium">
                      {error}
                    </div>
                  )}

                  <Input
                    label="Full Name"
                    value={custName}
                    onChange={(e) => setCustName(e.target.value)}
                    placeholder="e.g. Mustafa Hashmi"
                    required
                  />

                  <PhoneInput
                    label="Mobile Number (+92)"
                    value={custPhone}
                    onChange={setCustPhone}
                    placeholder="300 8521470"
                  />

                  <Input
                    label="Email Address"
                    type="email"
                    value={custEmail}
                    onChange={(e) => setCustEmail(e.target.value)}
                    placeholder="mustafa.hashmi@gmail.com"
                    required
                  />

                  <PasswordInput
                    label="Create Password"
                    value={custPassword}
                    onChange={(e) => setCustPassword(e.target.value)}
                    showStrengthMeter={true}
                    placeholder="Minimum 8 characters"
                    required
                  />

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-[#0C2A1B]">
                      Primary City
                    </label>
                    <select
                      value={custCity}
                      onChange={(e) => setCustCity(e.target.value)}
                      className="w-full h-10 px-3 text-sm bg-white border border-[#DCE8E0] rounded-[8px] text-[#0C2A1B] focus:outline-none focus:ring-2 focus:ring-[#0F6B3E]"
                    >
                      <option value="Islamabad">Islamabad</option>
                      <option value="Lahore">Lahore</option>
                      <option value="Karachi">Karachi</option>
                      <option value="Rawalpindi">Rawalpindi</option>
                    </select>
                  </div>

                  <label className="flex items-start gap-2 pt-2 text-xs text-[#34453B] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={custTerms}
                      onChange={(e) => setCustTerms(e.target.checked)}
                      className="mt-0.5 rounded border-[#DCE8E0] text-[#0F6B3E] focus:ring-[#0F6B3E]"
                    />
                    <span>
                      I agree to the ProLink User Agreement, Escrow Payment Terms, and Privacy Policy.
                    </span>
                  </label>

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full font-bold"
                  >
                    Continue to Phone Verification →
                  </Button>
                </form>
              )}

              {customerStep === 'otp' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-[#0C2A1B]">
                      Verify your mobile number
                    </h2>
                    <p className="text-sm text-[#6A7B70] mt-1">
                      We sent a 6-digit confirmation code via SMS to{' '}
                      <strong className="text-[#0C2A1B]">+92 {custPhone || '300 8521470'}</strong>.
                    </p>
                  </div>

                  <div className="py-2">
                    <OtpInput
                      value={custOtp}
                      onChange={setCustOtp}
                      onComplete={handleCustomerOtpComplete}
                      onResend={() => marketplaceStore.addToast('Code Resent', 'A new 6-digit OTP has been sent via SMS.', 'info')}
                    />
                  </div>

                  <Button
                    variant="primary"
                    size="lg"
                    loading={loading}
                    disabled={custOtp.length < 6}
                    onClick={handleCustomerOtpComplete}
                    className="w-full font-bold"
                  >
                    Verify & Create Account
                  </Button>

                  <button
                    type="button"
                    onClick={() => setCustomerStep('form')}
                    className="text-xs text-[#6A7B70] hover:text-[#0C2A1B] flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Change phone number</span>
                  </button>
                </div>
              )}

              {/* 3-Slide Welcome Tour */}
              {customerStep === 'tour' && (
                <div className="space-y-6 text-center max-w-md mx-auto py-4">
                  <div className="w-16 h-16 bg-[#E6F4EA] rounded-full flex items-center justify-center text-[#0F6B3E] mx-auto border border-[#CDE9D6]">
                    {tourSlide === 0 && <Sparkles className="w-8 h-8" />}
                    {tourSlide === 1 && <ShieldCheck className="w-8 h-8" />}
                    {tourSlide === 2 && <Award className="w-8 h-8" />}
                  </div>

                  {tourSlide === 0 && (
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold text-[#0C2A1B]">
                        1. Post Any Service Job in 60 Seconds
                      </h3>
                      <p className="text-sm text-[#6A7B70]">
                        Tell us what you need done, your location, and urgency. Our smart matching system dispatches your job to verified professionals.
                      </p>
                    </div>
                  )}

                  {tourSlide === 1 && (
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold text-[#0C2A1B]">
                        2. Compare Real Transparent Offers
                      </h3>
                      <p className="text-sm text-[#6A7B70]">
                        No hidden surprises. Compare itemized labor, arrival time, inspection fees, and authentic ratings side-by-side.
                      </p>
                    </div>
                  )}

                  {tourSlide === 2 && (
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold text-[#0C2A1B]">
                        3. Protected Escrow Guarantee
                      </h3>
                      <p className="text-sm text-[#6A7B70]">
                        Payment is securely held in ProLink Escrow. You only release funds when the job is completed and you are 100% satisfied.
                      </p>
                    </div>
                  )}

                  {/* Slide Indicators */}
                  <div className="flex justify-center gap-2 pt-2">
                    {[0, 1, 2].map(idx => (
                      <span
                        key={idx}
                        className={`h-2 rounded-full transition-all ${
                          tourSlide === idx ? 'w-6 bg-[#0F6B3E]' : 'w-2 bg-[#DCE8E0]'
                        }`}
                      />
                    ))}
                  </div>

                  <div className="pt-4 flex gap-3">
                    {tourSlide < 2 ? (
                      <Button
                        variant="primary"
                        size="md"
                        onClick={() => setTourSlide(s => s + 1)}
                        className="w-full font-bold"
                      >
                        Next Step →
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        size="md"
                        onClick={finishCustomerJoin}
                        className="w-full font-bold"
                      >
                        {postJobDraft ? 'Publish My Draft Job →' : 'Enter Customer Portal →'}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==================== PROFESSIONAL 5-STEP ONBOARDING ==================== */}
          {role === 'professional' && (
            <div className="space-y-6">
              {/* Stepper Progress Bar */}
              {proStep <= 5 && (
                <div className="space-y-2 pb-2">
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-[#0F6B3E]">Step {proStep} of 5</span>
                    <span className="text-[#6A7B70]">
                      {proStep === 1 && 'Account & Verification'}
                      {proStep === 2 && 'Services & Skills'}
                      {proStep === 3 && 'Service Area & Rates'}
                      {proStep === 4 && 'NADRA CNIC Verification'}
                      {proStep === 5 && 'Review & Submit'}
                    </span>
                  </div>
                  <div className="h-1.5 bg-[#E6F4EA] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#0F6B3E] transition-all duration-300"
                      style={{ width: `${(proStep / 5) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Step 1: Pro Account */}
              {proStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-xl font-bold text-[#0C2A1B]">Professional Account Details</h2>
                    <p className="text-xs text-[#6A7B70] mt-0.5">Enter your legal full name matching your government CNIC.</p>
                  </div>

                  <Input
                    label="Full Legal Name"
                    value={proName}
                    onChange={(e) => setProName(e.target.value)}
                    placeholder="e.g. Tariq Mehmood"
                    required
                  />

                  <PhoneInput
                    label="Mobile Number (+92)"
                    value={proPhone}
                    onChange={setProPhone}
                    placeholder="300 5544112"
                  />

                  <Input
                    label="Email Address"
                    type="email"
                    value={proEmail}
                    onChange={(e) => setProEmail(e.target.value)}
                    placeholder="tariq.pro@gmail.com"
                    required
                  />

                  <PasswordInput
                    label="Password"
                    value={proPassword}
                    onChange={(e) => setProPassword(e.target.value)}
                    showStrengthMeter={true}
                    placeholder="Create a strong password"
                    required
                  />

                  <Button
                    variant="primary"
                    size="lg"
                    onClick={() => {
                      if (!proName || !proPhone) {
                        setError('Name and phone are required');
                        return;
                      }
                      setProStep(2);
                    }}
                    className="w-full font-bold"
                  >
                    Next: Services & Skills →
                  </Button>
                </div>
              )}

              {/* Step 2: Services & Skills */}
              {proStep === 2 && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-xl font-bold text-[#0C2A1B]">Your Services & Skills</h2>
                    <p className="text-xs text-[#6A7B70] mt-0.5">Select your primary category and list specific capabilities.</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-[#0C2A1B]">Primary Service Category</label>
                    <select
                      value={proCategory}
                      onChange={(e) => setProCategory(e.target.value)}
                      className="w-full h-10 px-3 text-sm bg-white border border-[#DCE8E0] rounded-[8px] text-[#0C2A1B] focus:outline-none focus:ring-2 focus:ring-[#0F6B3E]"
                    >
                      {CATEGORIES.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-[#0C2A1B]">Years of Professional Experience</label>
                    <input
                      type="number"
                      min={1}
                      max={40}
                      value={proExpYears}
                      onChange={(e) => setProExpYears(Number(e.target.value))}
                      className="w-full h-10 px-3 text-sm bg-white border border-[#DCE8E0] rounded-[8px] text-[#0C2A1B] tabular-nums"
                    />
                  </div>

                  {/* Skills Tag Input */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-[#0C2A1B]">Skills & Specialties</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newSkillInput}
                        onChange={(e) => setNewSkillInput(e.target.value)}
                        placeholder="Add skill (e.g. Inverter PCB, Tile-safe plumbing)"
                        className="flex-1 h-9 px-3 text-xs bg-white border border-[#DCE8E0] rounded-[8px]"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newSkillInput.trim()) {
                            e.preventDefault();
                            setProSkills([...proSkills, newSkillInput.trim()]);
                            setNewSkillInput('');
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (newSkillInput.trim()) {
                            setProSkills([...proSkills, newSkillInput.trim()]);
                            setNewSkillInput('');
                          }
                        }}
                      >
                        Add
                      </Button>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {proSkills.map((s, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#E6F4EA] text-[#0F6B3E] rounded-full text-xs font-medium border border-[#CDE9D6]"
                        >
                          <span>{s}</span>
                          <button
                            type="button"
                            onClick={() => setProSkills(proSkills.filter((_, i) => i !== idx))}
                            className="text-[#0F6B3E] hover:text-[#B42318] cursor-pointer"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-3">
                    <Button variant="outline" size="md" onClick={() => setProStep(1)}>
                      Back
                    </Button>
                    <Button variant="primary" size="md" onClick={() => setProStep(3)} className="flex-1 font-bold">
                      Next: Service Area & Rates →
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 3: Area & Rates */}
              {proStep === 3 && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-xl font-bold text-[#0C2A1B]">Service Area & Standard Rates</h2>
                    <p className="text-xs text-[#6A7B70] mt-0.5">Set transparent reference rates (actual offer prices are set per job).</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-[#0C2A1B]">Operating City</label>
                      <select
                        value={proCity}
                        onChange={(e) => setProCity(e.target.value)}
                        className="w-full h-10 px-3 text-sm bg-white border border-[#DCE8E0] rounded-[8px]"
                      >
                        <option value="Islamabad">Islamabad</option>
                        <option value="Lahore">Lahore</option>
                        <option value="Karachi">Karachi</option>
                        <option value="Rawalpindi">Rawalpindi</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-[#0C2A1B]">Base Sector / Area</label>
                      <input
                        type="text"
                        value={proArea}
                        onChange={(e) => setProArea(e.target.value)}
                        placeholder="e.g. G-9 or Gulberg III"
                        className="w-full h-10 px-3 text-sm bg-white border border-[#DCE8E0] rounded-[8px]"
                      />
                    </div>
                  </div>

                  {/* Travel Radius Slider */}
                  <div className="space-y-2 p-3 bg-[#F4FAF6] border border-[#DCE8E0] rounded-[8px]">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-[#0C2A1B]">Travel Distance Radius</span>
                      <span className="font-bold text-[#0F6B3E] tabular-nums">{proRadiusKm} km</span>
                    </div>
                    <input
                      type="range"
                      min={5}
                      max={60}
                      step={5}
                      value={proRadiusKm}
                      onChange={(e) => setProRadiusKm(Number(e.target.value))}
                      className="w-full accent-[#0F6B3E]"
                    />
                    <div className="flex justify-between text-[11px] text-[#6A7B70]">
                      <span>5 km (Local sector)</span>
                      <span>60 km (Cross-city)</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-[#0C2A1B]">Starting Base Rate (PKR)</label>
                      <input
                        type="number"
                        step={100}
                        value={proBaseRate}
                        onChange={(e) => setProBaseRate(Number(e.target.value))}
                        className="w-full h-10 px-3 text-sm bg-white border border-[#DCE8E0] rounded-[8px] tabular-nums"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-[#0C2A1B]">Standard Inspection Fee (PKR)</label>
                      <input
                        type="number"
                        step={100}
                        value={proInspectionFee}
                        onChange={(e) => setProInspectionFee(Number(e.target.value))}
                        className="w-full h-10 px-3 text-sm bg-white border border-[#DCE8E0] rounded-[8px] tabular-nums"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-3">
                    <Button variant="outline" size="md" onClick={() => setProStep(2)}>
                      Back
                    </Button>
                    <Button variant="primary" size="md" onClick={() => setProStep(4)} className="flex-1 font-bold">
                      Next: NADRA Verification →
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 4: Verification (ID & Selfie) */}
              {proStep === 4 && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-xl font-bold text-[#0C2A1B]">Identity & CNIC Verification</h2>
                    <p className="text-xs text-[#6A7B70] mt-0.5">NADRA biometric or CNIC verification is mandatory for all ProLink artisans.</p>
                  </div>

                  <Input
                    label="National Identity Card (CNIC Number)"
                    value={cnicNumber}
                    onChange={(e) => setCnicNumber(e.target.value)}
                    placeholder="37405-1234567-1"
                    required
                  />

                  {/* ID Upload Previews */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="border border-dashed border-[#A9D3B5] bg-[#F4FAF6] rounded-[8px] p-3 text-center space-y-2">
                      <div className="w-10 h-10 rounded-full bg-[#E6F4EA] flex items-center justify-center text-[#0F6B3E] mx-auto">
                        <Upload className="w-4 h-4" />
                      </div>
                      <div className="text-xs font-semibold text-[#0C2A1B]">CNIC Front Side</div>
                      <div className="text-[10px] text-[#2FAE60] flex items-center justify-center gap-1 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Ready (Mock Uploaded)</span>
                      </div>
                    </div>

                    <div className="border border-dashed border-[#A9D3B5] bg-[#F4FAF6] rounded-[8px] p-3 text-center space-y-2">
                      <div className="w-10 h-10 rounded-full bg-[#E6F4EA] flex items-center justify-center text-[#0F6B3E] mx-auto">
                        <Upload className="w-4 h-4" />
                      </div>
                      <div className="text-xs font-semibold text-[#0C2A1B]">Live Selfie Photo</div>
                      <div className="text-[10px] text-[#2FAE60] flex items-center justify-center gap-1 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Ready (Mock Uploaded)</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-[#0C2A1B]">Professional Bio</label>
                    <textarea
                      rows={3}
                      value={proBio}
                      onChange={(e) => setProBio(e.target.value)}
                      className="w-full p-2.5 text-xs bg-white border border-[#DCE8E0] rounded-[8px] text-[#0C2A1B] focus:outline-none focus:ring-2 focus:ring-[#0F6B3E]"
                    />
                  </div>

                  <div className="flex gap-3 pt-3">
                    <Button variant="outline" size="md" onClick={() => setProStep(3)}>
                      Back
                    </Button>
                    <Button variant="primary" size="md" onClick={() => setProStep(5)} className="flex-1 font-bold">
                      Next: Review Profile →
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 5: Review & Submit */}
              {proStep === 5 && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-xl font-bold text-[#0C2A1B]">Review & Submit Application</h2>
                    <p className="text-xs text-[#6A7B70] mt-0.5">Confirm your submitted information before dispatching to verification team.</p>
                  </div>

                  <div className="bg-[#F4FAF6] border border-[#DCE8E0] rounded-[10px] p-4 space-y-3 text-xs">
                    <div className="flex justify-between py-1 border-b border-[#DCE8E0]">
                      <span className="text-[#6A7B70]">Full Name:</span>
                      <strong className="text-[#0C2A1B]">{proName || 'Tariq Mehmood'}</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#DCE8E0]">
                      <span className="text-[#6A7B70]">Primary Category:</span>
                      <strong className="text-[#0F6B3E]">{proCategory}</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#DCE8E0]">
                      <span className="text-[#6A7B70]">Experience:</span>
                      <span className="font-semibold text-[#0C2A1B]">{proExpYears} years</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#DCE8E0]">
                      <span className="text-[#6A7B70]">Operating City:</span>
                      <span className="font-semibold text-[#0C2A1B]">{proCity} ({proRadiusKm} km radius)</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#DCE8E0]">
                      <span className="text-[#6A7B70]">CNIC Document:</span>
                      <span className="font-semibold text-[#2FAE60] flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {cnicNumber}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-3">
                    <Button variant="outline" size="md" onClick={() => setProStep(4)}>
                      Back
                    </Button>
                    <Button
                      variant="primary"
                      size="md"
                      loading={loading}
                      onClick={handleProSubmit}
                      className="flex-1 font-bold"
                    >
                      Submit for Verification 🚀
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 6: Verification in Progress Screen */}
              {proStep === 6 && (
                <div className="space-y-6 text-center py-6 max-w-md mx-auto">
                  <div className="w-16 h-16 bg-[#FFFBEB] rounded-full flex items-center justify-center text-[#B45309] mx-auto border border-[#FDE68A]">
                    <ShieldCheck className="w-8 h-8 text-[#C77D0A]" />
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-[#0C2A1B]">
                      Verification in Progress
                    </h2>
                    <p className="text-xs text-[#6A7B70]">
                      Your application has been logged into the ProLink Admin Verification Queue. Average verification turnaround is <strong>2 to 4 hours</strong>.
                    </p>
                  </div>

                  {/* Checklist */}
                  <div className="text-left bg-[#F4FAF6] border border-[#DCE8E0] rounded-[10px] p-4 space-y-2.5 text-xs">
                    <div className="flex items-center gap-2 text-[#0F6B3E] font-medium">
                      <CheckCircle2 className="w-4 h-4 text-[#2FAE60]" />
                      <span>Account credentials created</span>
                    </div>
                    <div className="flex items-center gap-2 text-[#0F6B3E] font-medium">
                      <CheckCircle2 className="w-4 h-4 text-[#2FAE60]" />
                      <span>CNIC document & portrait submitted</span>
                    </div>
                    <div className="flex items-center gap-2 text-[#C77D0A] font-medium">
                      <Clock className="w-4 h-4 animate-spin text-[#C77D0A]" />
                      <span>Staff document & NADRA cross-check (Pending)</span>
                    </div>
                    <div className="flex items-center gap-2 text-[#A3B1A8]">
                      <div className="w-4 h-4 rounded-full border border-[#DCE8E0]" />
                      <span>Pro Badge activation & job dispatch</span>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col gap-2">
                    <Button
                      variant="primary"
                      size="md"
                      onClick={() => {
                        marketplaceStore.setRole('professional');
                        marketplaceStore.navigate('/pro/overview');
                      }}
                      className="font-bold w-full"
                    >
                      Enter Pro Portal Preview →
                    </Button>
                    <button
                      type="button"
                      onClick={() => {
                        marketplaceStore.setRole('admin');
                        marketplaceStore.navigate('/admin/verification');
                      }}
                      className="text-xs text-[#0F6B3E] font-semibold hover:underline"
                    >
                      (Dev Shortcut) View in Admin Verification Queue
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-6 border-t border-[#DCE8E0] text-xs text-[#A3B1A8] flex justify-between">
          <span>ProLink Artisan Trust Program</span>
          <span>Security Guaranteed</span>
        </div>
      </div>

      {/* Right Column: Visual Side Panel */}
      <div className="hidden lg:flex flex-1 relative bg-[#0C2A1B] text-white p-12 flex-col justify-between overflow-hidden">
        <img
          src={role === 'professional' ? '/src/assets/images/pro_electrician_headshot_1791024696030.jpg' : '/src/assets/images/pro_cleaner_interior_1791024743673.jpg'}
          alt="ProLink"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover opacity-20 mix-blend-luminosity"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0C2A1B] via-[#0C2A1B]/75 to-transparent" />

        <div className="relative z-10">
          <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold text-[#CDE9D6] border border-white/10">
            {role === 'professional' ? 'Empowering Skilled Pakistanis' : 'Reliable Service On Demand'}
          </span>
        </div>

        <div className="relative z-10 max-w-lg space-y-6">
          <blockquote className="text-2xl font-bold leading-snug tracking-tight text-white">
            {role === 'professional'
              ? '"I joined ProLink in Islamabad 8 months ago. Instead of sitting idle in my workshop, verified jobs in F-7 and E-11 are sent directly to my phone with guaranteed payment."'
              : '"No more haggling with random handymen. We hire through ProLink, compare transparent quotes with reviews, and pay securely when the job is done."'}
          </blockquote>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full border-2 border-[#2FAE60] bg-[#E6F4EA] flex items-center justify-center text-[#0F6B3E] font-bold text-lg">
              {role === 'professional' ? 'TM' : 'AM'}
            </div>
            <div>
              <div className="font-bold text-sm text-white">
                {role === 'professional' ? 'Tariq Mehmood' : 'Dr. Ayesha Malik'}
              </div>
              <div className="text-xs text-[#CDE9D6]">
                {role === 'professional' ? 'Top Rated Master Electrician · Islamabad' : 'Resident · DHA Phase 5, Lahore'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
