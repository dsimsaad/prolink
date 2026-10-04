import React, { useState } from 'react';
import { marketplaceStore } from '../../store/marketplaceStore';
import { CATEGORIES, MOCK_USERS, MOCK_JOBS, MOCK_OFFERS } from '../../data/mockData';
import { Button } from '../../components/ui/Button';
import { RatingStars } from '../../components/ui/RatingStars';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { StylizedMap } from '../../components/visuals/StylizedMap';
import {
  Search,
  MapPin,
  ShieldCheck,
  CreditCard,
  Star,
  Clock,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Building2,
  PhoneCall,
  Smartphone,
  ChevronDown,
  ChevronUp,
  Inbox
} from 'lucide-react';

export const GuestHome: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('Islamabad');
  const [howItWorksTab, setHowItWorksTab] = useState<'customer' | 'pro'>('customer');
  const [categoryTab, setCategoryTab] = useState<string>('Home repair');
  const [faqOpenIndex, setFaqOpenIndex] = useState<number | null>(0);

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      marketplaceStore.navigate('/customer/post-job');
      return;
    }
    marketplaceStore.navigate('/search', { q: searchQuery, city: selectedCity });
  };

  const popularChips = [
    'AC not cooling',
    'Water tank leakage',
    'UPS breaker tripping',
    'Sofa deep steam clean',
    'O-Level Physics tutor'
  ];

  const categoryGroups: Record<string, { title: string; price: string; link: string }[]> = {
    'Home repair': [
      { title: 'Concealed Water Leakage Repair', price: 'from PKR 1,800', link: 'Plumbing' },
      { title: 'Short Circuit & Breaker Tripping', price: 'from PKR 1,200', link: 'Electrical' },
      { title: 'Inverter AC Gas Refill & Service', price: 'from PKR 2,200', link: 'AC Repair & HVAC' },
      { title: 'Door Lock & Wardrobe Hinges Fix', price: 'from PKR 1,500', link: 'Carpentry' },
      { title: 'Automatic Washing Machine PCB', price: 'from PKR 2,000', link: 'Appliance Repair' },
      { title: 'Solar Net-Metering & Inverter Setup', price: 'from PKR 4,500', link: 'Electrical' },
      { title: 'Electric Geyser Heating Element', price: 'from PKR 1,400', link: 'Plumbing' }
    ],
    'Cleaning and care': [
      { title: '5-Seater Sofa Steam Shampooing', price: 'from PKR 3,500', link: 'Deep Cleaning' },
      { title: 'Full House Deep Post-Renovation Clean', price: 'from PKR 12,000', link: 'Deep Cleaning' },
      { title: 'Marble Floor Polishing & Buffing', price: 'from PKR 8,000', link: 'Deep Cleaning' },
      { title: 'Kitchen Chimney & Stove Degreasing', price: 'from PKR 2,800', link: 'Deep Cleaning' },
      { title: 'Water Tank Pressure Descaling', price: 'from PKR 3,000', link: 'Plumbing' },
      { title: 'Curtain & Carpet Dust Vacuuming', price: 'from PKR 2,500', link: 'Deep Cleaning' }
    ],
    'Tech and design': [
      { title: 'CCTV Security Camera 8-Channel Setup', price: 'from PKR 6,000', link: 'Electrical' },
      { title: 'Smart Home Touch Switches Installation', price: 'from PKR 3,200', link: 'Electrical' },
      { title: 'Wi-Fi Mesh Router Configuration', price: 'from PKR 2,000', link: 'Electrical' },
      { title: 'LED Wall Panel Concealed Cabling', price: 'from PKR 2,500', link: 'Electrical' },
      { title: 'Soundbar & Home Theater Acoustics', price: 'from PKR 3,500', link: 'Electrical' }
    ],
    'Education': [
      { title: 'Cambridge O-Level Physics & Math', price: 'from PKR 15,000/mo', link: 'Home Tutoring' },
      { title: 'A-Level Chemistry & Biology Mentor', price: 'from PKR 18,000/mo', link: 'Home Tutoring' },
      { title: 'FSc Pre-Medical Science Coaching', price: 'from PKR 12,000/mo', link: 'Home Tutoring' },
      { title: 'Tajweed Quran Teacher for Children', price: 'from PKR 6,000/mo', link: 'Home Tutoring' },
      { title: 'IELTS Academic Speaking Prep', price: 'from PKR 14,000/mo', link: 'Home Tutoring' }
    ],
    'Events': [
      { title: 'Generator Standby & Switchgear Wiring', price: 'from PKR 4,000', link: 'Electrical' },
      { title: 'Outdoor Fairylight Garden Illumination', price: 'from PKR 6,500', link: 'Electrical' },
      { title: 'Deep Move-Out Venue Cleaning', price: 'from PKR 14,000', link: 'Deep Cleaning' }
    ],
    'Vehicles': [
      { title: 'Car AC Gas Top-up & Coil Service', price: 'from PKR 2,800', link: 'AC Repair & HVAC' },
      { title: 'Battery Jumpstart & Alternator Test', price: 'from PKR 1,200', link: 'Electrical' },
      { title: 'Car Detailing & Interior Shampoo', price: 'from PKR 4,500', link: 'Deep Cleaning' }
    ]
  };

  const featuredPros = MOCK_USERS.filter(u => u.role === 'professional').slice(0, 4);

  const sampleJobsWithOffers = [
    {
      job: MOCK_JOBS[0],
      offers: [MOCK_OFFERS[0], MOCK_OFFERS[1]]
    },
    {
      job: MOCK_JOBS[1],
      offers: [MOCK_OFFERS[3], MOCK_OFFERS[4]]
    },
    {
      job: MOCK_JOBS[4],
      offers: [MOCK_OFFERS[5]]
    }
  ];

  const faqs = [
    {
      q: 'How does ProLink work for customers looking to hire?',
      a: 'ProLink is customer-driven. You post what you need done in 60 seconds (with photos and your schedule). We notify relevant, background-verified professionals near you. Verified pros send itemized offers with transparent pricing, arrival time, and inspection fees. You compare reviews and accept the best match.'
    },
    {
      q: 'Are the professionals background checked and verified?',
      a: 'Yes. Every professional on ProLink must undergo biometric or CNIC verification against official records, verify their active Pakistani mobile number, submit trade experience certifications (e.g. TEVTA / NAVTTC), and maintain a minimum 4.5 community rating.'
    },
    {
      q: 'How does ProLink secure my payment?',
      a: 'We use a protected Escrow mechanism. When you accept an offer, your funds are safely held in escrow. The professional performs the service. Only after you confirm that the job is complete and satisfactory are the funds released to the professional.'
    },
    {
      q: 'What if a professional quotes one price and demands more on site?',
      a: 'ProLink strictly forbids bait-and-switch pricing. Every accepted offer constitutes a binding price for the described scope. If additional parts or unpredicted labor are needed, the professional must submit an itemized change request through the platform that you must explicitly approve.'
    },
    {
      q: 'What is the ProLink inspection fee policy?',
      a: 'Pros can specify their inspection fee upfront in their offer (many charge PKR 0 if hired). You see this fee before accepting, ensuring complete transparency with zero hidden visit charges.'
    },
    {
      q: 'Which cities are currently supported?',
      a: 'We currently cover all major sectors and phases across Islamabad, Rawalpindi, Lahore, and Karachi, with rapid expansion into Faisalabad and Peshawar.'
    },
    {
      q: 'How can I register as a skilled artisan or technician?',
      a: 'Click "Join as a Professional" or "Become a Professional". Complete our 5-step onboarding where you enter your trade skills, operating radius, and upload your CNIC. Once our Islamabad HQ team approves your credentials, you will start receiving job requests instantly.'
    },
    {
      q: 'What happens if I have a dispute or property damage?',
      a: 'ProLink provides dedicated dispute resolution. Every job booked through our escrow system includes ProLink Safety Cover with our dispute mediation team ready to step in within 2 hours.'
    }
  ];

  return (
    <div className="space-y-16 sm:space-y-24">
      {/* ==================== 4. HERO SECTION ==================== */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#F4FAF6] via-white to-white pt-8 pb-16 lg:py-20 border-b border-[#DCE8E0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6 text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#E6F4EA] border border-[#CDE9D6] rounded-full text-xs font-semibold text-[#0F6B3E]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#2FAE60]" />
                <span>Pakistan's Verified Skilled Artisans Network</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-extrabold text-[#0C2A1B] tracking-tight leading-[1.12]">
                Find the right professional for every job.
              </h1>

              <p className="text-base sm:text-lg text-[#34453B] max-w-xl font-normal leading-relaxed">
                Post your job in 60 seconds. Receive verified offers from top-rated electricians, plumbers, HVAC specialists and painters nearby. Escrow protected.
              </p>

              {/* Large Hero Search Bar */}
              <form
                onSubmit={handleHeroSearch}
                className="bg-white p-2 border border-[#DCE8E0] rounded-[12px] shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center gap-2 max-w-2xl"
              >
                <div className="flex-1 flex items-center gap-2.5 px-3">
                  <Search className="w-5 h-5 text-[#6A7B70] shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="What service do you need? (e.g. AC gas leak, wiring)"
                    className="w-full h-11 text-sm bg-transparent placeholder:text-[#A3B1A8] text-[#0C2A1B] focus:outline-none"
                  />
                </div>

                <div className="h-8 w-px bg-[#DCE8E0] hidden sm:block" />

                <div className="flex items-center gap-2 px-3 border-t sm:border-t-0 border-[#DCE8E0] pt-2 sm:pt-0">
                  <MapPin className="w-4 h-4 text-[#0F6B3E] shrink-0" />
                  <select
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    className="h-10 text-xs font-semibold text-[#0C2A1B] bg-transparent focus:outline-none cursor-pointer"
                  >
                    <option value="Islamabad">Islamabad</option>
                    <option value="Lahore">Lahore</option>
                    <option value="Karachi">Karachi</option>
                    <option value="Rawalpindi">Rawalpindi</option>
                  </select>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  className="h-11 px-6 font-bold shadow-xs cursor-pointer"
                >
                  Search Pros
                </Button>
              </form>

              {/* Popular Search Chips */}
              <div className="flex items-center flex-wrap gap-2 text-xs">
                <span className="text-[#6A7B70] font-medium">Popular:</span>
                {popularChips.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => {
                      setSearchQuery(chip);
                      marketplaceStore.navigate('/search', { q: chip, city: selectedCity });
                    }}
                    className="px-2.5 py-1 rounded-full bg-white border border-[#DCE8E0] text-[#34453B] hover:border-[#0F6B3E] hover:text-[#0F6B3E] transition-colors cursor-pointer"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Trust Points */}
              <div className="flex flex-wrap items-center gap-6 pt-2 text-xs font-medium text-[#34453B]">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#2FAE60]" />
                  <span>CNIC & Biometric Verified</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-[#0F6B3E]" />
                  <span>Pay Only on Completion</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-[#E8A317] fill-[#E8A317]" />
                  <span>4.9 Avg Client Rating</span>
                </div>
              </div>
            </div>

            {/* Right Visual Frame */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md lg:max-w-none rounded-[16px] overflow-hidden border border-[#DCE8E0] shadow-xl bg-white">
                <img
                  src="/src/assets/images/hero_craftsman_pro_1791024679723.jpg"
                  alt="Verified Master Technician at work"
                  referrerPolicy="no-referrer"
                  className="w-full h-[440px] object-cover object-center"
                />

                {/* Floating Card 1: Verified Badge */}
                <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-[10px] border border-[#DCE8E0] shadow-md flex items-center gap-2.5 animate-in fade-in">
                  <div className="w-8 h-8 rounded-full bg-[#E6F4EA] flex items-center justify-center text-[#0F6B3E]">
                    <ShieldCheck className="w-4 h-4 text-[#2FAE60]" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#0C2A1B]">Verified Master Artisan</div>
                    <div className="text-[10px] text-[#6A7B70]">NADRA & Skills Audited</div>
                  </div>
                </div>

                {/* Floating Card 2: Rating */}
                <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-[10px] border border-[#DCE8E0] shadow-md flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-[#E8A317] fill-[#E8A317]" />
                  <span className="text-xs font-bold text-[#0C2A1B] tabular-nums">4.94</span>
                  <span className="text-[10px] text-[#6A7B70]">(2,340 jobs)</span>
                </div>

                {/* Floating Card 3: Live Activity Feed */}
                <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md p-3 rounded-[10px] border border-[#DCE8E0] shadow-lg space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-[#0F6B3E] tracking-wider flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#2FAE60] animate-ping" />
                      Live Platform Activity
                    </span>
                    <span className="text-[10px] text-[#A3B1A8] font-mono">Real-time</span>
                  </div>
                  <div className="text-xs text-[#0C2A1B] font-medium leading-snug">
                    Customer in <strong>Sector F-7, Islamabad</strong> accepted Tariq's offer for UPS Inverter Breaker Tripping (PKR 3,200).
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== 5. TRUSTED BY / MEDIA ROW ==================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
        <span className="text-xs font-bold uppercase tracking-wider text-[#6A7B70]">
          Trusted by homeowners and organizations across Pakistan
        </span>
        <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-14 opacity-75 grayscale hover:grayscale-0 transition-all text-xs font-bold text-[#0C2A1B]">
          <span className="tracking-tight text-base font-serif">HABIB RESIDENCY</span>
          <span className="tracking-widest text-sm font-mono">BAHRIA TOWN HQ</span>
          <span className="tracking-tight text-base font-sans font-extrabold">EMERALD HEIGHTS</span>
          <span className="tracking-wide text-sm font-semibold">ISLAMABAD CLUB</span>
          <span className="tracking-tight text-base font-serif">LAHORE MEADOWS</span>
        </div>
      </section>

      {/* ==================== 6. POPULAR SERVICES CAROUSEL ==================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#0F6B3E]">Explore Services</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#0C2A1B] tracking-tight mt-1">
              Popular services in your city
            </h2>
          </div>
          <button
            onClick={() => marketplaceStore.navigate('/categories')}
            className="text-xs font-semibold text-[#0F6B3E] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>View All Categories</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 10 Services Carousel Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {CATEGORIES.map((cat) => (
            <div
              key={cat.id}
              onClick={() => marketplaceStore.navigate('/search', { category: cat.name, city: selectedCity })}
              className="group bg-white border border-[#DCE8E0] rounded-[10px] overflow-hidden hover:border-[#0F6B3E] hover:shadow-md transition-all cursor-pointer flex flex-col"
            >
              <div className="relative h-36 w-full overflow-hidden bg-[#F4FAF6]">
                <img
                  src={cat.photoUrl}
                  alt={cat.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <span className="absolute bottom-2 left-2 text-xs font-bold text-white leading-tight">
                  {cat.name}
                </span>
              </div>
              <div className="p-3 flex-1 flex flex-col justify-between space-y-1">
                <p className="text-[11px] text-[#6A7B70] line-clamp-2 leading-relaxed">
                  {cat.description}
                </p>
                <div className="text-xs font-semibold text-[#0F6B3E] tabular-nums pt-1">
                  Starting from PKR {cat.startingPricePKR.toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ==================== 7. TABBED DIRECTORY ==================== */}
      <section className="bg-[#F4FAF6] border-y border-[#DCE8E0] py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0F6B3E]">All Capabilities</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#0C2A1B] tracking-tight">
              A whole world of services at your fingertips
            </h2>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center justify-center gap-2 overflow-x-auto no-scrollbar pb-2">
            {Object.keys(categoryGroups).map((tab) => (
              <button
                key={tab}
                onClick={() => setCategoryTab(tab)}
                className={`px-4 py-2 rounded-[8px] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  categoryTab === tab
                    ? 'bg-[#0F6B3E] text-white shadow-2xs'
                    : 'bg-white text-[#34453B] border border-[#DCE8E0] hover:bg-[#E6F4EA]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab Content Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {categoryGroups[categoryTab].map((item, idx) => (
              <div
                key={idx}
                onClick={() => marketplaceStore.navigate('/search', { q: item.title, category: item.link, city: selectedCity })}
                className="p-3.5 bg-white border border-[#DCE8E0] rounded-[8px] hover:border-[#0F6B3E] hover:shadow-xs transition-all flex items-center justify-between cursor-pointer group"
              >
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-[#0C2A1B] group-hover:text-[#0F6B3E] transition-colors">
                    {item.title}
                  </div>
                  <div className="text-[11px] text-[#6A7B70] font-mono tabular-nums">
                    {item.price}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#A3B1A8] group-hover:text-[#0F6B3E] transition-colors" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== 8. HOW IT WORKS (WITH REAL MOCKUPS) ==================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="text-center max-w-xl mx-auto space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-[#0F6B3E]">Simple 4-Step Process</span>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#0C2A1B] tracking-tight">
            How ProLink works
          </h2>
          <div className="inline-flex p-1 bg-[#F4FAF6] border border-[#DCE8E0] rounded-[8px] mx-auto">
            <button
              onClick={() => setHowItWorksTab('customer')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-[6px] transition-colors cursor-pointer ${
                howItWorksTab === 'customer'
                  ? 'bg-white text-[#0C2A1B] shadow-2xs'
                  : 'text-[#6A7B70] hover:text-[#0C2A1B]'
              }`}
            >
              For Customers
            </button>
            <button
              onClick={() => setHowItWorksTab('pro')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-[6px] transition-colors cursor-pointer ${
                howItWorksTab === 'pro'
                  ? 'bg-[#0F6B3E] text-white shadow-2xs'
                  : 'text-[#6A7B70] hover:text-[#0C2A1B]'
              }`}
            >
              For Professionals
            </button>
          </div>
        </div>

        {/* 4 Steps Container */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {howItWorksTab === 'customer' ? (
            <>
              {/* Step 1 */}
              <div className="bg-white border border-[#DCE8E0] rounded-[10px] p-5 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <span className="text-xs font-mono font-bold text-[#0F6B3E]">STEP 01</span>
                  <h3 className="text-sm font-bold text-[#0C2A1B]">Post your job request</h3>
                  <p className="text-xs text-[#6A7B70] leading-relaxed">
                    Describe your problem (e.g. water leak, inverter trip) with photos and preferred time slot in 60s.
                  </p>
                </div>
                {/* Real UI Mockup */}
                <div className="p-2.5 bg-[#F4FAF6] rounded-[8px] border border-[#DCE8E0] space-y-1.5 text-[11px]">
                  <div className="font-semibold text-[#0C2A1B]">Water Tank Leakage Fix</div>
                  <div className="text-[10px] text-[#0F6B3E] font-medium">📍 F-7/2, Islamabad · Urgent</div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-white border border-[#DCE8E0] rounded-[10px] p-5 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <span className="text-xs font-mono font-bold text-[#0F6B3E]">STEP 02</span>
                  <h3 className="text-sm font-bold text-[#0C2A1B]">Receive custom offers</h3>
                  <p className="text-xs text-[#6A7B70] leading-relaxed">
                    Verified artisans review your request and send custom pricing, arrival ETA, and inspection guarantees.
                  </p>
                </div>
                {/* Real UI Mockup */}
                <div className="p-2.5 bg-[#F4FAF6] rounded-[8px] border border-[#DCE8E0] space-y-1.5 text-[11px]">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-[#0C2A1B]">Tariq M. (4.9★)</span>
                    <span className="font-bold text-[#0F6B3E]">PKR 3,200</span>
                  </div>
                  <div className="text-[10px] text-[#6A7B70]">Arriving in 25 mins</div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="bg-white border border-[#DCE8E0] rounded-[10px] p-5 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <span className="text-xs font-mono font-bold text-[#0F6B3E]">STEP 03</span>
                  <h3 className="text-sm font-bold text-[#0C2A1B]">Compare & hire safely</h3>
                  <p className="text-xs text-[#6A7B70] leading-relaxed">
                    Compare offers side-by-side, inspect ratings, and accept. Payment is held in secure escrow.
                  </p>
                </div>
                {/* Real UI Mockup */}
                <div className="p-2.5 bg-[#E6F4EA] rounded-[8px] border border-[#CDE9D6] space-y-1 text-[11px] text-center">
                  <span className="font-bold text-[#0F6B3E]">Offer Accepted</span>
                  <div className="text-[10px] text-[#0C2A1B]">Escrow funds held safely</div>
                </div>
              </div>

              {/* Step 4 */}
              <div className="bg-white border border-[#DCE8E0] rounded-[10px] p-5 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <span className="text-xs font-mono font-bold text-[#0F6B3E]">STEP 04</span>
                  <h3 className="text-sm font-bold text-[#0C2A1B]">Track & release funds</h3>
                  <p className="text-xs text-[#6A7B70] leading-relaxed">
                    Track arrival on the live map. Once the craftsman finishes and you are satisfied, release payment.
                  </p>
                </div>
                {/* Real UI Mockup */}
                <div className="p-2.5 bg-[#F4FAF6] rounded-[8px] border border-[#DCE8E0] space-y-1.5 text-[11px]">
                  <div className="flex items-center gap-1.5 text-[#2FAE60] font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Job Complete · Funds Released</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* For Professionals Steps */}
              <div className="bg-white border border-[#DCE8E0] rounded-[10px] p-5 space-y-3">
                <span className="text-xs font-mono font-bold text-[#0F6B3E]">STEP 01</span>
                <h3 className="text-sm font-bold text-[#0C2A1B]">Complete CNIC verification</h3>
                <p className="text-xs text-[#6A7B70]">
                  Submit your NADRA ID, skills, and past work photos to join our trusted circle.
                </p>
              </div>
              <div className="bg-white border border-[#DCE8E0] rounded-[10px] p-5 space-y-3">
                <span className="text-xs font-mono font-bold text-[#0F6B3E]">STEP 02</span>
                <h3 className="text-sm font-bold text-[#0C2A1B]">Get matched job alerts</h3>
                <p className="text-xs text-[#6A7B70]">
                  Our AI engine scores jobs in your sector. Only receive relevant requests matching your rate.
                </p>
              </div>
              <div className="bg-white border border-[#DCE8E0] rounded-[10px] p-5 space-y-3">
                <span className="text-xs font-mono font-bold text-[#0F6B3E]">STEP 03</span>
                <h3 className="text-sm font-bold text-[#0C2A1B]">Send competitive offers</h3>
                <p className="text-xs text-[#6A7B70]">
                  Set your labor rate and arrival time. No lead purchase fees or ad bidding costs.
                </p>
              </div>
              <div className="bg-white border border-[#DCE8E0] rounded-[10px] p-5 space-y-3">
                <span className="text-xs font-mono font-bold text-[#0F6B3E]">STEP 04</span>
                <h3 className="text-sm font-bold text-[#0C2A1B]">Get paid directly to bank</h3>
                <p className="text-xs text-[#6A7B70]">
                  Guaranteed escrow releases funds instantly to your JazzCash, Nayapay, or local bank account.
                </p>
              </div>
            </>
          )}
        </div>

        <div className="text-center pt-2">
          {howItWorksTab === 'customer' ? (
            <Button
              variant="primary"
              size="lg"
              onClick={() => marketplaceStore.navigate('/customer/post-job')}
              className="font-bold shadow-xs"
            >
              Post a Job for Free →
            </Button>
          ) : (
            <Button
              variant="primary"
              size="lg"
              onClick={() => marketplaceStore.navigate('/join', { role: 'pro' })}
              className="font-bold shadow-xs"
            >
              Apply as a Professional →
            </Button>
          )}
        </div>
      </section>

      {/* ==================== 9. WHY PROLINK (SPLIT SECTIONS WITH VISUALS) ==================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[#0F6B3E]">Uncompromising Standards</span>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#0C2A1B] tracking-tight">
            Why Pakistan chooses ProLink
          </h2>
        </div>

        {/* Split 1: Compare Real Offers Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-6 space-y-4">
            <span className="text-xs font-bold uppercase text-[#0F6B3E]">Transparent Bidding</span>
            <h3 className="text-2xl font-bold text-[#0C2A1B]">
              Compare real offers side-by-side. Never overpay.
            </h3>
            <p className="text-sm text-[#34453B] leading-relaxed">
              On traditional classifieds, you never know if an artisan is quoting double what they charged your neighbor. On ProLink, receive multiple written proposals with itemized breakdown of labor and materials before committing.
            </p>
            <div className="space-y-2 pt-2 text-xs font-medium text-[#0C2A1B]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#2FAE60]" />
                <span>Clear distinction between labor and replacement parts</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#2FAE60]" />
                <span>Pre-disclosed visit/inspection fees</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#2FAE60]" />
                <span>Verified client reviews specific to the exact service</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 bg-[#F4FAF6] border border-[#DCE8E0] rounded-[12px] p-5 space-y-3">
            <div className="text-xs font-bold text-[#0C2A1B] flex items-center justify-between">
              <span>Offers Received for Job #102</span>
              <span className="text-[10px] bg-[#E6F4EA] text-[#0F6B3E] px-2 py-0.5 rounded-full font-bold">
                3 Offers Ready
              </span>
            </div>
            <div className="space-y-2">
              <div className="p-3 bg-white border-2 border-[#0F6B3E] rounded-[8px] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#E6F4EA] flex items-center justify-center font-bold text-xs text-[#0F6B3E]">
                    SH
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#0C2A1B] flex items-center gap-1">
                      <span>Ustad Sajid Hussain</span>
                      <span className="text-[10px] text-[#E8A317]">★ 4.91</span>
                    </div>
                    <div className="text-[10px] text-[#6A7B70]">ETA: Tomorrow 9:30 AM · Non-destructive acoustic sensor</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-[#0F6B3E] tabular-nums">PKR 4,200</div>
                  <span className="text-[9px] bg-[#E6F4EA] text-[#0F6B3E] px-1 rounded font-bold">BEST MATCH</span>
                </div>
              </div>

              <div className="p-3 bg-white border border-[#DCE8E0] rounded-[8px] flex items-center justify-between opacity-85">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center font-bold text-xs text-[#6A7B70]">
                    SA
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#0C2A1B]">Shahbaz Akhtar</div>
                    <div className="text-[10px] text-[#6A7B70]">ETA: Tomorrow 11:00 AM · Pressure test</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-[#0C2A1B] tabular-nums">PKR 3,600</div>
                  <span className="text-[9px] text-[#6A7B70]">+ PKR 400 visit fee</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Split 2: Live Tracking & Sector Map */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-6 order-2 lg:order-1">
            <StylizedMap
              city="Islamabad"
              showRoute={true}
              routeEta="18 mins"
              height={300}
            />
          </div>

          <div className="lg:col-span-6 space-y-4 order-1 lg:order-2">
            <span className="text-xs font-bold uppercase text-[#0F6B3E]">Live GPS Dispatch</span>
            <h3 className="text-2xl font-bold text-[#0C2A1B]">
              Real-time technician tracking to your doorstep.
            </h3>
            <p className="text-sm text-[#34453B] leading-relaxed">
              No more repeated calls asking "Bhai kahan pohnche ho?". ProLink shows your assigned professional traveling across Islamabad and Lahore sectors with estimated arrival minutes.
            </p>
            <div className="space-y-2 pt-2 text-xs font-medium text-[#0C2A1B]">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#0F6B3E]" />
                <span>Accurate arrival window without waiting all day</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#2FAE60]" />
                <span>Masked phone contact so your personal number stays private</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== 10. FEATURED PROFESSIONALS ==================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#0F6B3E]">Verified Talent</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#0C2A1B] tracking-tight mt-1">
              Top-rated professionals on ProLink
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {featuredPros.map((pro) => (
            <div
              key={pro.id}
              onClick={() => marketplaceStore.navigate('/search', { q: pro.name, city: pro.city })}
              className="bg-white border border-[#DCE8E0] rounded-[10px] p-5 space-y-4 hover:border-[#0F6B3E] hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <Avatar
                    src={pro.avatar}
                    name={pro.name}
                    size="lg"
                    isOnline={true}
                    isVerified={true}
                  />
                  <Badge type={pro.level === 'top_rated' ? 'top_rated' : 'verified'} />
                </div>

                <div>
                  <h4 className="text-base font-bold text-[#0C2A1B]">{pro.name}</h4>
                  <p className="text-xs text-[#0F6B3E] font-semibold">{pro.category}</p>
                  <p className="text-[11px] text-[#6A7B70] mt-0.5">📍 {pro.area}, {pro.city}</p>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-[#DCE8E0]">
                  <RatingStars rating={pro.rating || 4.9} totalReviews={pro.totalReviews} size="sm" />
                  <span className="text-[11px] text-[#6A7B70]">{pro.completedJobs} jobs</span>
                </div>
              </div>

              <div className="pt-2 border-t border-[#DCE8E0] flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-[#A3B1A8] block">Starting Rate</span>
                  <span className="text-xs font-bold text-[#0C2A1B] tabular-nums">
                    PKR {pro.baseRate?.toLocaleString() || '1,500'}
                  </span>
                </div>
                <span className="text-xs font-semibold text-[#0F6B3E] flex items-center gap-0.5">
                  View Profile →
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ==================== 11. REAL JOBS, REAL OFFERS ==================== */}
      <section className="bg-[#F4FAF6] border-y border-[#DCE8E0] py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0F6B3E]">Open Marketplace</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#0C2A1B] tracking-tight">
              Real jobs, real offers
            </h2>
            <p className="text-xs text-[#6A7B70]">
              See anonymized recent requests and incoming quotes across the Twin Cities and Lahore.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {sampleJobsWithOffers.map((item, idx) => (
              <div
                key={idx}
                className="bg-white border border-[#DCE8E0] rounded-[10px] p-5 space-y-4 shadow-xs"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#0F6B3E] bg-[#E6F4EA] px-2 py-0.5 rounded-full">
                      {item.job.category}
                    </span>
                    <span className="text-[10px] text-[#A3B1A8] font-mono">
                      📍 {item.job.area}, {item.job.city}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-[#0C2A1B] line-clamp-2">
                    {item.job.title}
                  </h4>
                  <p className="text-xs text-[#6A7B70] line-clamp-2 leading-relaxed">
                    {item.job.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-[#DCE8E0] space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#A3B1A8] block">
                    Incoming Offers ({item.job.offersCount})
                  </span>
                  {item.offers.slice(0, 2).map((off) => (
                    <div
                      key={off.id}
                      className="p-2 bg-[#F4FAF6] rounded-[6px] flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar name={off.proName} size="sm" />
                        <div>
                          <div className="font-semibold text-[#0C2A1B] text-[11px]">{off.proName}</div>
                          <div className="text-[10px] text-[#6A7B70]">{off.arrivalTimeEstimate}</div>
                        </div>
                      </div>
                      <div className="font-bold text-[#0F6B3E] tabular-nums text-xs">
                        PKR {off.pricePKR.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== 12. STATS BAND (DEEP FOREST #0C2A1B) ==================== */}
      <section className="bg-[#0C2A1B] text-white py-16 border-y border-[#0F6B3E]/40 select-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-white/10">
            <div className="space-y-1">
              <div className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight tabular-nums">
                24,000+
              </div>
              <div className="text-xs text-[#CDE9D6]">Jobs Completed</div>
            </div>
            <div className="space-y-1 pt-4 md:pt-0">
              <div className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight tabular-nums">
                2,400+
              </div>
              <div className="text-xs text-[#CDE9D6]">Verified Artisans</div>
            </div>
            <div className="space-y-1 pt-4 md:pt-0">
              <div className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight tabular-nums">
                14 mins
              </div>
              <div className="text-xs text-[#CDE9D6]">Avg First Offer Time</div>
            </div>
            <div className="space-y-1 pt-4 md:pt-0">
              <div className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight tabular-nums">
                PKR 140M+
              </div>
              <div className="text-xs text-[#CDE9D6]">Protected Escrow Volume</div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== 13. TESTIMONIALS ==================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[#0F6B3E]">Authentic Reviews</span>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#0C2A1B] tracking-tight">
            Real feedback from Pakistani homes
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-[#DCE8E0] rounded-[10px] p-6 space-y-4 flex flex-col justify-between shadow-2xs">
            <div className="space-y-3">
              <RatingStars rating={5} showNumber={false} size="sm" />
              <p className="text-xs text-[#34453B] leading-relaxed italic">
                "Our velvet sofa in F-7 was badly stained after a family dawat. Mrs. Saima arrived with German steam extractors and had it looking brand new in 2 hours. Transparent billing with zero hassles."
              </p>
            </div>
            <div className="flex items-center gap-3 pt-3 border-t border-[#DCE8E0]">
              <div className="w-9 h-9 rounded-full bg-[#E6F4EA] flex items-center justify-center font-bold text-xs text-[#0F6B3E]">
                MH
              </div>
              <div>
                <div className="text-xs font-bold text-[#0C2A1B]">Mustafa Hashmi</div>
                <div className="text-[11px] text-[#6A7B70]">Resident · Sector F-7, Islamabad</div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#DCE8E0] rounded-[10px] p-6 space-y-4 flex flex-col justify-between shadow-2xs">
            <div className="space-y-3">
              <RatingStars rating={5} showNumber={false} size="sm" />
              <p className="text-xs text-[#34453B] leading-relaxed italic">
                "Our inverter AC stopped cooling during a 42-degree June afternoon in DHA Lahore. Kamran diagnosed the blown PCB capacitor on site, replaced it with original parts, and didn't overcharge."
              </p>
            </div>
            <div className="flex items-center gap-3 pt-3 border-t border-[#DCE8E0]">
              <div className="w-9 h-9 rounded-full bg-[#E6F4EA] flex items-center justify-center font-bold text-xs text-[#0F6B3E]">
                AM
              </div>
              <div>
                <div className="text-xs font-bold text-[#0C2A1B]">Dr. Ayesha Malik</div>
                <div className="text-[11px] text-[#6A7B70]">Physician · DHA Phase 5, Lahore</div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#DCE8E0] rounded-[10px] p-6 space-y-4 flex flex-col justify-between shadow-2xs">
            <div className="space-y-3">
              <RatingStars rating={5} showNumber={false} size="sm" />
              <p className="text-xs text-[#34453B] leading-relaxed italic">
                "Finding honest artisans in Rawalpindi used to give me headaches. Bilal bhai replaced our kitchen cabinet hinges smoothly. I love that funds are only released after inspecting the work."
              </p>
            </div>
            <div className="flex items-center gap-3 pt-3 border-t border-[#DCE8E0]">
              <div className="w-9 h-9 rounded-full bg-[#E6F4EA] flex items-center justify-center font-bold text-xs text-[#0F6B3E]">
                ZB
              </div>
              <div>
                <div className="text-xs font-bold text-[#0C2A1B]">Zainab Bibi</div>
                <div className="text-[11px] text-[#6A7B70]">Homeowner · Bahria Town Phase 4</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== 14. PROLINK FOR BUSINESS ==================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#0C2A1B] text-white rounded-[16px] p-8 sm:p-12 relative overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="space-y-4 max-w-xl z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-semibold text-[#CDE9D6]">
              <Building2 className="w-3.5 h-3.5" />
              <span>Commercial & Facility Management</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              ProLink for Business & Societies
            </h3>
            <p className="text-sm text-[#CDE9D6] leading-relaxed">
              Consolidated invoicing, dedicated account manager, background-verified workforce rosters, and priority dispatch for offices, schools, embassies, and residential housing societies.
            </p>
            <div className="pt-2 flex flex-wrap gap-4">
              <Button
                variant="primary"
                size="md"
                onClick={() => marketplaceStore.navigate('/business')}
                className="bg-[#2FAE60] hover:bg-[#239951] text-[#0C2A1B] font-bold"
              >
                Talk to Corporate Sales →
              </Button>
              <button
                onClick={() => marketplaceStore.navigate('/contact')}
                className="text-xs font-semibold text-white underline hover:text-[#CDE9D6] flex items-center gap-1.5"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Call +92 51 8844000</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 w-full lg:w-auto z-10 text-xs">
            <div className="bg-white/10 p-4 rounded-[10px] border border-white/10 space-y-1">
              <div className="text-xl font-bold text-white tabular-nums">40+</div>
              <div className="text-[#A3B1A8]">Corporate Accounts</div>
            </div>
            <div className="bg-white/10 p-4 rounded-[10px] border border-white/10 space-y-1">
              <div className="text-xl font-bold text-white tabular-nums">30-day</div>
              <div className="text-[#A3B1A8]">Credit Invoicing</div>
            </div>
            <div className="bg-white/10 p-4 rounded-[10px] border border-white/10 space-y-1">
              <div className="text-xl font-bold text-white tabular-nums">1 hr</div>
              <div className="text-[#A3B1A8]">Commercial SLA</div>
            </div>
            <div className="bg-white/10 p-4 rounded-[10px] border border-white/10 space-y-1">
              <div className="text-xl font-bold text-white tabular-nums">100%</div>
              <div className="text-[#A3B1A8]">FBR Tax Invoices</div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== 15. TRUST & SAFETY GRID ==================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[#0F6B3E]">Peace of Mind</span>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#0C2A1B] tracking-tight">
            Trust & Safety Framework
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-white border border-[#DCE8E0] rounded-[10px] space-y-3">
            <div className="w-10 h-10 rounded-[8px] bg-[#E6F4EA] flex items-center justify-center text-[#0F6B3E]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-[#0C2A1B]">Identity & Police Verification</h4>
            <p className="text-xs text-[#6A7B70] leading-relaxed">
              Every professional undergoes digital NADRA biometric match and background screening before being dispatched to family homes.
            </p>
          </div>

          <div className="p-6 bg-white border border-[#DCE8E0] rounded-[10px] space-y-3">
            <div className="w-10 h-10 rounded-[8px] bg-[#E6F4EA] flex items-center justify-center text-[#0F6B3E]">
              <CreditCard className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-[#0C2A1B]">Escrow Money Protection</h4>
            <p className="text-xs text-[#6A7B70] leading-relaxed">
              Your funds are securely held in state-regulated partner banking channels. No advance cash extortion or unfinished jobs.
            </p>
          </div>

          <div className="p-6 bg-white border border-[#DCE8E0] rounded-[10px] space-y-3">
            <div className="w-10 h-10 rounded-[8px] bg-[#E6F4EA] flex items-center justify-center text-[#0F6B3E]">
              <Sparkles className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-[#0C2A1B]">Workmanship Guarantee</h4>
            <p className="text-xs text-[#6A7B70] leading-relaxed">
              Every job includes a 7-day workmanship satisfaction warranty. If an issue recurs, our pro will re-inspect and fix it for free.
            </p>
          </div>
        </div>
      </section>

      {/* ==================== 16. MOBILE APP STRIP ==================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#F4FAF6] border border-[#DCE8E0] rounded-[16px] p-8 sm:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 max-w-lg">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0F6B3E]">Mobile Experience</span>
            <h3 className="text-2xl sm:text-3xl font-bold text-[#0C2A1B] tracking-tight">
              Manage your jobs & offers on the go
            </h3>
            <p className="text-xs sm:text-sm text-[#34453B] leading-relaxed">
              Real-time push notifications when offers arrive, in-app chat with photos, live GPS tracking, and instant escrow release from your smartphone.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => marketplaceStore.navigate('/mobile-app')}
                className="h-10 px-4 bg-[#0C2A1B] text-white rounded-[8px] text-xs font-semibold flex items-center gap-2 hover:bg-[#0F6B3E] transition-colors cursor-pointer"
              >
                <span>🍎 iOS App Store</span>
              </button>
              <button
                onClick={() => marketplaceStore.navigate('/mobile-app')}
                className="h-10 px-4 bg-[#0C2A1B] text-white rounded-[8px] text-xs font-semibold flex items-center gap-2 hover:bg-[#0F6B3E] transition-colors cursor-pointer"
              >
                <span>🤖 Google Play</span>
              </button>
            </div>
          </div>

          {/* Smartphone Mockup */}
          <div className="w-64 bg-white border-4 border-[#0C2A1B] rounded-[28px] p-3 shadow-xl space-y-3">
            <div className="w-16 h-4 bg-[#0C2A1B] rounded-full mx-auto" />
            <div className="p-3 bg-[#E6F4EA] rounded-[12px] space-y-1">
              <div className="text-[10px] text-[#0F6B3E] font-bold">New Offer Alert</div>
              <div className="text-xs font-bold text-[#0C2A1B]">PKR 3,200 from Tariq M.</div>
              <div className="text-[9px] text-[#6A7B70]">Arriving in 20 mins</div>
            </div>
            <div className="h-28 bg-[#F4FAF6] rounded-[10px] border border-[#DCE8E0] p-2 flex flex-col justify-between">
              <div className="text-[10px] font-semibold text-[#0C2A1B]">Live Route Dispatch</div>
              <div className="text-[9px] text-[#0F6B3E] font-bold">ETA: 18 minutes</div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== 17. FAQ ACCORDION ==================== */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[#0F6B3E]">Got Questions?</span>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#0C2A1B] tracking-tight">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="divide-y divide-[#DCE8E0] border-y border-[#DCE8E0]">
          {faqs.map((faq, idx) => {
            const isOpen = faqOpenIndex === idx;
            return (
              <div key={idx} className="py-4">
                <button
                  type="button"
                  onClick={() => setFaqOpenIndex(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between text-left text-sm font-bold text-[#0C2A1B] hover:text-[#0F6B3E] transition-colors cursor-pointer"
                >
                  <span>{faq.q}</span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-[#0F6B3E] shrink-0 ml-2" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[#6A7B70] shrink-0 ml-2" />
                  )}
                </button>
                {isOpen && (
                  <p className="text-xs text-[#34453B] leading-relaxed mt-2 pt-1 pr-6 animate-in fade-in">
                    {faq.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ==================== 18. FINAL CTA BAND ==================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="bg-[#0C2A1B] text-white rounded-[16px] p-8 sm:p-14 text-center space-y-6 relative overflow-hidden">
          <div className="max-w-2xl mx-auto space-y-3">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Ready to hire trusted professionals?
            </h2>
            <p className="text-sm text-[#CDE9D6]">
              Join over 24,000 satisfied homeowners in Islamabad, Lahore, and Karachi. Post your job for free in 60 seconds.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Button
              variant="primary"
              size="lg"
              onClick={() => marketplaceStore.navigate('/customer/post-job')}
              className="bg-[#2FAE60] hover:bg-[#239951] text-[#0C2A1B] font-bold shadow-md cursor-pointer"
            >
              Post a Job for Free →
            </Button>

            <button
              onClick={() => marketplaceStore.navigate('/join', { role: 'pro' })}
              className="h-12 px-6 rounded-[8px] border border-[#CDE9D6] text-white hover:bg-white/10 transition-colors text-sm font-semibold cursor-pointer"
            >
              Join as a Professional
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
