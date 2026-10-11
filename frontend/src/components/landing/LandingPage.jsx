import React, { useState, useEffect } from 'react';
import { useMill } from '../../context/MillContext';
import {
  Building2, Shield, Factory, Users, ShoppingBag,
  ArrowRight, CheckCircle2, AlertOctagon, TrendingUp, Sparkles,
  Scissors, Cpu, Eye, PhoneCall, Truck, Calculator, BookOpen, Layers,
  ChevronLeft, ChevronRight, Award, Trophy, Globe, Zap, Clock, ShieldCheck,
  Check, PhoneOff, ArrowUpRight, BarChart3, Star, Play, KeyRound, LogIn, Lock
} from 'lucide-react';
import MoltenMetal from '../ui/MoltenMetal';

export const LandingPage = ({ onNavigateToLogin, onNavigateToRegister }) => {
  const handleRoleSignIn = (email) => {
    if (onNavigateToLogin) {
      onNavigateToLogin(email);
    } else {
      setIsAuthModalOpen(true);
    }
  };
  const {
    setCurrentRole,
    loginAsRole,
    setIsAuthModalOpen,
    currentUser,
    yarnInventory,
    machines,
    inspectedRolls,
    orders,
    calculateMonthEndFinancials,
    showToast
  } = useMill();

  const financials = calculateMonthEndFinancials();
  const totalStockKg = yarnInventory.reduce((acc, y) => acc + y.currentStockKg, 0);
  const totalMetersToday = machines.reduce((acc, m) => acc + m.metersToday, 0);
  const passRatePct = Math.round(
    (inspectedRolls.filter(r => r.status === 'PASS').length / (inspectedRolls.length || 1)) * 100
  );

  // Hero Slider State
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slideProgress, setSlideProgress] = useState(0);

  const heroSlides = [
    {
      id: 1,
      tag: 'DIGITAL LOOM OPERATING SYSTEM',
      title: 'Transforming Textile Mills with Digital Intelligence',
      subtitle: 'Empowering busy fabric factories with unified spinning, weaving, defect detection, and dispatch management tailored for every loom.',
      cta: 'Launch Plant Manager Suite',
      role: 'manager',
      badge: 'ERP & MES UNIFIED',
      statNumber: '400M+',
      statLabel: 'Meters Woven Worldwide',
      highlightWord: 'Digital Intelligence'
    },
    {
      id: 2,
      tag: 'PRODUCTION TELEMETRY',
      title: 'Supercharge Floor Efficiency with Real-Time Loom Telemetry',
      subtitle: 'Real-time telemetry across Ring Spinning Frames, Airjet Looms, and Jet Dyeing Vessels without ever walking the noisy floor.',
      cta: 'View Live Floorboard',
      role: 'employee',
      badge: 'ZERO FLOOR WALKING',
      statNumber: '94.2%',
      statLabel: 'Overall Equipment Effectiveness',
      highlightWord: 'Real-Time Loom Telemetry'
    },
    {
      id: 3,
      tag: 'FINANCIAL ACCURACY',
      title: 'Smart Solutions: The Real Cost of a Single Fabric Roll',
      subtitle: 'Itemized unit roll costing combining yarn consumption bills, machine power kWh, and worker wages to close month-end books with clarity.',
      cta: 'Open Roll Cost Calculator',
      role: 'manager',
      badge: 'EXACT UNIT MARGINS',
      statNumber: '34.2%',
      statLabel: 'Net Operating Margin',
      highlightWord: 'Real Cost of a Single Fabric Roll'
    },
    {
      id: 4,
      tag: 'ASTM 4-POINT QUALITY CONTROL',
      title: 'Crafting Flawless Fabrics with Optical QC & Traceability',
      subtitle: 'Pinpoint holes, shade banding, and uneven weaving down to the exact meter. Digital tamper-evident birth certificates for every roll.',
      cta: 'Open QC Defect Console',
      role: 'employee',
      badge: 'ZERO BUYER COMPLAINTS',
      statNumber: '96.8%',
      statLabel: 'First-Pass Yield',
      highlightWord: 'Optical QC & Traceability'
    }
  ];

  // Auto-play slider timing
  useEffect(() => {
    const timer = setInterval(() => {
      setSlideProgress((prev) => {
        if (prev >= 100) {
          setCurrentSlide((curr) => (curr + 1) % heroSlides.length);
          return 0;
        }
        return prev + 2;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [heroSlides.length]);

  const selectSlide = (index) => {
    setCurrentSlide(index);
    setSlideProgress(0);
  };

  // Case Study carousel state
  const [caseStudyIndex, setCaseStudyIndex] = useState(0);
  const caseStudies = [
    {
      client: 'Zara Global Sourcing (Inditex)',
      badge: 'COMMERCIAL APPAREL',
      title: 'Automating Export Poplin Production with Real-Time Loom Telemetry',
      desc: 'Everest Textile Mills unified 50,000m commercial runs for Inditex, eliminating phone call delays and tracking 42 passed rolls directly into Nhava Sheva port containers.',
      stat1: '+127% YoY',
      label1: 'On-Time Export Dispatches',
      stat2: '+33% YoY',
      label2: 'Buyer Retention & Repeat Runs',
      actionRole: 'buyer',
      actionText: 'View Buyer Tracking Portal'
    },
    {
      client: 'Levi Strauss & Co. Denim',
      badge: 'HERITAGE WEAVING',
      title: 'Preventing 320 GSM Denim Bottlenecks with Machine Sensor Alerts',
      desc: 'When Harness #12 sensor tripped on Bonas Jacquard Loom #4, FabricOps instantly alerted technicians, re-routed warp yarn, and prevented an unmonitored ₹1.3M order delay.',
      stat1: '100%',
      label1: 'Machine Downtime Visibility',
      stat2: '0',
      label2: 'Lost Dispatches or Orphaned Rolls',
      actionRole: 'manager',
      actionText: 'Inspect Bottleneck Radar'
    },
    {
      client: 'H&M Sustainability Collection',
      badge: 'ORGANIC FLAX & LINEN',
      title: '100% Traceability from French Flax Inward to Finished Sheer Fabric',
      desc: 'Every roll carries a tamper-evident digital birth certificate proving 0 critical defects and authenticating French linen origins for international eco-audits.',
      stat1: '24 Rolls',
      label1: 'Certified Grade A+ Rolls',
      stat2: '4.8/5.0',
      label2: 'Quality Assurance Score',
      actionRole: 'employee',
      actionText: 'View Digital Roll Certificate'
    }
  ];

  // The 6 Scenes Filter Tabs
  const [activeStationFilter, setActiveStationFilter] = useState('ALL');

  const stations = [
    {
      id: 'gate',
      stationNum: 'STATION 01',
      title: 'Yarn Arrives at the Gate',
      category: 'WEIGHBRIDGE INWARD',
      problem: 'Tracked in a loose notebook. No warning before yarn runs low. Cannot tell if new buyer orders can start.',
      solution: 'Digital gate weighbridge logging with instant stock silo allocation, safety threshold warning radar, and 48-hour feasibility check.',
      role: 'employee',
      buttonText: 'Open Gate Console'
    },
    {
      id: 'floor',
      stationNum: 'STATION 02',
      title: 'Production Floor, Mid-Shift',
      category: 'LOOM TELEMETRY',
      problem: 'Walking the noisy floor to check machines. Idle machines unnoticed. Breakdowns cause surprise delays.',
      solution: 'Live floorboard across Spinning, Weaving & Dyeing. Live picks/min, meters produced today, and 1-click breakdown reporting.',
      role: 'employee',
      buttonText: 'Open Floor Telemetry'
    },
    {
      id: 'qc',
      stationNum: 'STATION 03',
      title: 'Checking Fabric Before it Leaves',
      category: 'ASTM 4-POINT QC',
      problem: 'Recorded on loose paper slips. Flawed rolls cause buyer disputes; impossible to trace back to loom.',
      solution: 'ASTM 4-Point digital inspection. Defects pinned by exact meter. QR barcode tracing back to loom and yarn batch.',
      role: 'employee',
      buttonText: 'Open QC Inspection'
    },
    {
      id: 'buyer',
      stationNum: 'STATION 04',
      title: 'A Buyer Calls Asking for Updates',
      category: 'SELF-SERVICE PORTAL',
      problem: 'Chaos of phone calls. Staff walks the floor, asks around, and promises to call back later.',
      solution: 'Buyer Self-Service Portal. Live 6-stage tracker showing whether fabric is spinning, weaving, in dyeing or ready to ship.',
      role: 'buyer',
      buttonText: 'Open Buyer Portal'
    },
    {
      id: 'dispatch',
      stationNum: 'STATION 05',
      title: 'Loading Truck for Dispatch',
      category: 'BAY VERIFICATION',
      problem: 'Rolls loaded without verification. Wrong fabric sent, duplicate dispatches, or rolls forgotten on shelf.',
      solution: 'Barcode bay scanning against Buyer Invoices. Real-time store shelf inventory vs loaded manifests. 1-click gate passes.',
      role: 'employee',
      buttonText: 'Open Dispatch Bay'
    },
    {
      id: 'pl',
      stationNum: 'STATION 06',
      title: 'The Owner Closing the Books',
      category: 'MONTH-END P&L',
      problem: 'Registers and bills everywhere. Nobody knows the real cost of a single roll of fabric or if the mill made money.',
      solution: 'True Unit Roll Cost Engine & Month-End P&L combining yarn bills, worker shift wages, and power tariffs in one ledger.',
      role: 'manager',
      buttonText: 'Open Month-End Books'
    }
  ];

  const filteredStations = activeStationFilter === 'ALL'
    ? stations
    : stations.filter(s => s.id === activeStationFilter);

  return (
    <div className="min-h-screen bg-[#070A12] text-slate-100 font-opensans selection:bg-[#5227FF] selection:text-white">

      {/* TOP INDUSTRIAL STATUS TICKER */}
      <div className="bg-[#0B0F1C]/95 border-b border-slate-800/80 px-4 py-2.5 text-xs text-slate-300 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-[1280px] mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-[#FF9FFC] font-rajdhani font-bold uppercase tracking-wider text-[11px]">
              <span className="w-2 h-2 rounded-full bg-[#FF9FFC] animate-ping"></span>
              MILL SYSTEM ONLINE
            </span>
            <span className="text-slate-700">|</span>
            <span className="text-slate-300 text-[11px] font-mono font-medium">Shift A Active (06:00 - 14:00)</span>
            <span className="text-slate-700 hidden sm:inline">|</span>
            <span className="text-slate-300 text-[11px] hidden sm:inline">Power Grid: <strong className="text-white font-mono">412 kW</strong></span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span className="text-[#FF9FFC] font-semibold font-mono">12,450 kg Yarn in Silos</span>
            <span className="text-slate-700">•</span>
            <span className="text-emerald-400 font-semibold">{passRatePct}% First-Pass Yield</span>
            <span className="text-slate-700">•</span>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 hidden md:inline">Quick Sign In:</span>
              <button
                onClick={() => handleRoleSignIn('admin@fabricops.com')}
                className="px-2 py-0.5 bg-purple-950/50 hover:bg-purple-900 border border-purple-500/40 text-purple-300 hover:text-white rounded text-[10px] font-rajdhani font-bold uppercase transition-all"
                title="Sign in with seeded MongoDB Admin account"
              >
                Admin
              </button>
              <button
                onClick={() => handleRoleSignIn('rajesh.weaver@fabricops.com')}
                className="px-2 py-0.5 bg-emerald-950/50 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 hover:text-white rounded text-[10px] font-rajdhani font-bold uppercase transition-all"
                title="Sign in with seeded MongoDB Operator account"
              >
                Operator
              </button>
              <button
                onClick={() => handleRoleSignIn('aditi@apexgarments.com')}
                className="px-2 py-0.5 bg-sky-950/50 hover:bg-sky-900 border border-sky-500/40 text-sky-300 hover:text-white rounded text-[10px] font-rajdhani font-bold uppercase transition-all"
                title="Sign in with seeded MongoDB Customer account"
              >
                Buyer
              </button>
              <span className="text-slate-700 hidden sm:inline">|</span>
              <button
                onClick={() => handleRoleSignIn('admin@fabricops.com')}
                className="px-3 py-1 bg-gradient-to-r from-[#5227FF] via-[#7B42FF] to-[#FF9FFC] hover:shadow-[0_0_15px_rgba(82,39,255,0.5)] text-white font-rajdhani font-bold uppercase tracking-wider rounded text-[11px] flex items-center gap-1.5 transition-all shadow-sm"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Station Sign In</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MOLTEN METAL HERO SLIDER SECTION */}
      <section className="relative overflow-hidden border-b border-slate-800/80">
        <div style={{ width: '100%', height: '600px', position: 'relative' }}>
          <MoltenMetal
            color1="#5227FF"
            color2="#FF9FFC"
            color3="#FFFFFF"
            speed={0.35}
            scale={4}
            detail={3}
            glow={1.6}
            coreSize={0.1}
            swirl={1}
            fold={-0.2}
            blackPoint={0.05}
            brightness={1.3}
            colorMode="molten"
            grain
            grainIntensity={0.05}
            mouseInteraction
            mouseStrength={0.3}
            opacity={1}
          />

          {/* Dark Glassmorphic Vignette Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#070A12]/92 via-[#070A12]/80 to-[#070A12]/85 backdrop-blur-[1px] flex flex-col justify-between pointer-events-none z-10">
            {/* Slide Content Container */}
            <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 w-full flex-1 flex flex-col justify-center pointer-events-auto">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">

                {/* Left Headline & Content */}
                <div className="lg:col-span-8 space-y-6">

                  {/* Category Pill Tag */}
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#5227FF]/20 border border-[#5227FF]/40 text-[#FF9FFC] text-xs font-rajdhani font-bold uppercase tracking-widest rounded-full backdrop-blur-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FF9FFC] animate-pulse"></span>
                    <span>{heroSlides[currentSlide].tag}</span>
                  </div>

                  {/* Massive Bold Heading */}
                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold font-rajdhani text-white leading-[1.08] tracking-tight drop-shadow-sm">
                    {heroSlides[currentSlide].title.split(heroSlides[currentSlide].highlightWord)[0]}
                    <span className="bg-gradient-to-r from-[#FF9FFC] via-[#FFFFFF] to-[#5227FF] bg-clip-text text-transparent underline decoration-[#5227FF] decoration-4 underline-offset-8">
                      {heroSlides[currentSlide].highlightWord}
                    </span>
                    {heroSlides[currentSlide].title.split(heroSlides[currentSlide].highlightWord)[1]}
                  </h1>

                  {/* Description Paragraph */}
                  <p className="text-base sm:text-lg text-slate-300 font-opensans leading-relaxed max-w-2xl font-normal">
                    {heroSlides[currentSlide].subtitle}
                  </p>

                  {/* CTA Buttons */}
                  <div className="pt-2 flex flex-wrap items-center gap-4">
                    <button
                      onClick={() => {
                        const targetRole = heroSlides[currentSlide].role;
                        const roleEmail = targetRole === 'manager' || targetRole === 'admin'
                          ? 'admin@fabricops.com'
                          : targetRole === 'employee' || targetRole === 'operator'
                          ? 'rajesh.weaver@fabricops.com'
                          : 'aditi@apexgarments.com';
                        handleRoleSignIn(roleEmail);
                      }}
                      className="px-8 py-4 bg-gradient-to-r from-[#5227FF] via-[#7B42FF] to-[#FF9FFC] hover:shadow-[0_8px_30px_rgba(82,39,255,0.45)] text-white font-rajdhani font-bold text-base tracking-wider uppercase flex items-center gap-3 rounded-lg transition-all duration-200 transform hover:-translate-y-0.5 shadow-lg"
                    >
                      <LogIn className="w-4 h-4" />
                      <span>{heroSlides[currentSlide].cta}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleRoleSignIn('aditi@apexgarments.com')}
                      className="px-7 py-4 bg-[#0D1220]/80 hover:bg-[#141B30] text-slate-100 font-rajdhani font-bold text-base tracking-wider uppercase border border-slate-700/80 hover:border-[#FF9FFC]/60 rounded-lg shadow-sm flex items-center gap-2 transition-all"
                    >
                      <ShoppingBag className="w-4 h-4 text-[#FF9FFC]" />
                      <span>Buyer Order Portal</span>
                    </button>
                  </div>
                </div>

                {/* Right Metric Callout Card */}
                <div className="lg:col-span-4 flex justify-start lg:justify-end">
                  <div className="p-8 bg-[#0D1220]/85 border border-slate-700/70 rounded-xl max-w-sm w-full space-y-4 backdrop-blur-xl shadow-2xl relative">
                    <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-[#5227FF] via-[#FF9FFC] to-transparent rounded-t-xl"></div>

                    <div className="flex items-center justify-between text-xs text-slate-400 font-rajdhani font-semibold uppercase tracking-wider">
                      <span>LIVE MILL PULSE</span>
                      <span className="text-[#FF9FFC] font-bold px-2 py-0.5 bg-[#5227FF]/20 rounded border border-[#5227FF]/30">{heroSlides[currentSlide].badge}</span>
                    </div>

                    <div>
                      <p className="text-5xl font-bold font-rajdhani text-white">
                        {heroSlides[currentSlide].statNumber}
                      </p>
                      <p className="text-xs text-slate-400 uppercase tracking-wider font-rajdhani font-semibold mt-1">
                        {heroSlides[currentSlide].statLabel}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-300">
                      <span className="font-medium">Shift Production:</span>
                      <span className="font-mono text-[#FF9FFC] font-bold text-sm">{(totalMetersToday).toLocaleString()} m</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Bottom Slider Controls */}
            <div className="w-full bg-[#0D1220]/90 border-t border-slate-800/80 px-4 py-3 relative z-20 pointer-events-auto">
              <div className="max-w-[1280px] mx-auto flex flex-wrap items-center justify-between gap-4">

                {/* Slide Navigation Tabs */}
                <div className="flex items-center gap-2 sm:gap-6 overflow-x-auto pb-1 sm:pb-0">
                  {heroSlides.map((slide, idx) => (
                    <button
                      key={slide.id}
                      onClick={() => selectSlide(idx)}
                      className={`text-left transition-all py-1.5 flex items-center gap-2 font-rajdhani text-xs sm:text-sm font-bold uppercase tracking-wider ${currentSlide === idx ? 'text-[#FF9FFC]' : 'text-slate-400 hover:text-white'}`}
                    >
                      <span className="text-[10px] font-mono opacity-60">0{idx + 1}</span>
                      <span>{slide.title.split(' ')[0]} {slide.title.split(' ')[1]}</span>
                      {currentSlide === idx && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FF9FFC] shadow-[0_0_8px_#FF9FFC]"></span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Chevrons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => selectSlide((currentSlide - 1 + heroSlides.length) % heroSlides.length)}
                    className="w-8 h-8 bg-slate-800/70 hover:bg-[#5227FF] text-slate-300 hover:text-white border border-slate-700 rounded flex items-center justify-center transition-colors"
                    aria-label="Previous Slide"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => selectSlide((currentSlide + 1) % heroSlides.length)}
                    className="w-8 h-8 bg-slate-800/70 hover:bg-[#5227FF] text-slate-300 hover:text-white border border-slate-700 rounded flex items-center justify-center transition-colors"
                    aria-label="Next Slide"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Glowing Molten Progress Bar */}
              <div className="absolute bottom-0 left-0 h-[3px] bg-gradient-to-r from-[#5227FF] via-[#FF9FFC] to-[#FFFFFF] shadow-[0_0_10px_#5227FF] transition-all duration-100" style={{ width: `${slideProgress}%` }}></div>
            </div>
          </div>
        </div>
      </section>

      {/* SPOTLIGHT ON HIGHLIGHTS */}
      <section className="py-16 bg-[#0A0E1A] border-b border-slate-800/80">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">

          <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
            <div>
              <p className="text-xs uppercase font-rajdhani font-bold tracking-[0.2em] text-[#FF9FFC]">
                SPOTLIGHT ON
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold font-rajdhani text-white mt-1">
                Highlights & Mill Achievements
              </h2>
            </div>
            <p className="text-xs text-slate-400 max-w-md font-opensans">
              Proven reliability across spinning rings, high-speed rapier and airjet looms, and commercial export logistics.
            </p>
          </div>

          {/* Highlights Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

            <div className="p-6 bg-[#0D1220]/80 border border-slate-800/80 rounded-xl hover:border-[#5227FF]/60 hover:shadow-[0_8px_30px_rgba(82,39,255,0.2)] transition-all space-y-3">
              <div className="w-10 h-10 bg-[#5227FF]/15 border border-[#5227FF]/30 rounded-lg flex items-center justify-center text-[#FF9FFC]">
                <Trophy className="w-5 h-5" />
              </div>
              <h3 className="text-2xl font-bold font-rajdhani text-white">Best Mill OS 2026</h3>
              <p className="text-xs font-semibold text-[#FF9FFC] font-rajdhani uppercase tracking-wider">Textile Manufacturing Awards</p>
              <p className="text-xs text-slate-400 font-normal leading-relaxed">
                Honored for replacing chaotic paper slips and phone calls with unified digital floor telemetry.
              </p>
            </div>

            <div className="p-6 bg-[#0D1220]/80 border border-slate-800/80 rounded-xl hover:border-[#5227FF]/60 hover:shadow-[0_8px_30px_rgba(82,39,255,0.2)] transition-all space-y-3">
              <div className="w-10 h-10 bg-[#5227FF]/15 border border-[#5227FF]/30 rounded-lg flex items-center justify-center text-[#FF9FFC]">
                <Globe className="w-5 h-5" />
              </div>
              <h3 className="text-2xl font-bold font-rajdhani text-white">400M+ Meters Woven</h3>
              <p className="text-xs font-semibold text-[#FF9FFC] font-rajdhani uppercase tracking-wider">Commercial Global Reach</p>
              <p className="text-xs text-slate-400 font-normal leading-relaxed">
                Active export shipments supplying leading apparel brands across Asia, Europe, and North America.
              </p>
            </div>

            <div className="p-6 bg-[#0D1220]/80 border border-slate-800/80 rounded-xl hover:border-[#5227FF]/60 hover:shadow-[0_8px_30px_rgba(82,39,255,0.2)] transition-all space-y-3">
              <div className="w-10 h-10 bg-[#5227FF]/15 border border-[#5227FF]/30 rounded-lg flex items-center justify-center text-[#FF9FFC]">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-2xl font-bold font-rajdhani text-white">100% Traceability</h3>
              <p className="text-xs font-semibold text-[#FF9FFC] font-rajdhani uppercase tracking-wider">ASTM 4-Point QC Standard</p>
              <p className="text-xs text-slate-400 font-normal leading-relaxed">
                Every fabric roll is bound to its yarn lot, loom code, operator, and digital inspection score.
              </p>
            </div>

            <div className="p-6 bg-[#0D1220]/80 border border-slate-800/80 rounded-xl hover:border-[#5227FF]/60 hover:shadow-[0_8px_30px_rgba(82,39,255,0.2)] transition-all space-y-3">
              <div className="w-10 h-10 bg-[#5227FF]/15 border border-[#5227FF]/30 rounded-lg flex items-center justify-center text-[#FF9FFC]">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-2xl font-bold font-rajdhani text-white">₹4.8M+ Monthly Books</h3>
              <p className="text-xs font-semibold text-[#FF9FFC] font-rajdhani uppercase tracking-wider">Consolidated Financials</p>
              <p className="text-xs text-slate-400 font-normal leading-relaxed">
                Yarn bills, worker shift wages, electricity kWh, and buyer invoices closed with exact penny margins.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* DISCOVER THE FUTURE / RESEARCH & INSIGHTS */}
      <section className="py-20 bg-[#070A12] border-b border-slate-800/80">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">

          {/* Section Header */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end mb-12">
            <div className="lg:col-span-6 space-y-2">
              <p className="text-xs uppercase font-rajdhani font-bold tracking-[0.2em] text-[#FF9FFC]">
                DISCOVER THE FUTURE
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold font-rajdhani text-white">
                Research & Mill Operational Insights
              </h2>
            </div>
            <div className="lg:col-span-6">
              <p className="text-sm text-slate-400 font-normal leading-relaxed">
                Explore cutting-edge textile automation, predictive loom breakdown algorithms,
                and unit roll costing equations powering the next generation of busy fabric factories.
              </p>
            </div>
          </div>

          {/* 4 Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

            {/* Insight Card 1 */}
            <div
              onClick={() => handleRoleSignIn('admin@fabricops.com')}
              className="group cursor-pointer bg-[#0D1220]/80 border border-slate-800/80 hover:border-[#FF9FFC]/60 hover:bg-[#11172A] hover:shadow-[0_8px_30px_rgba(255,159,252,0.2)] rounded-xl transition-all duration-300 p-6 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <span className="text-[11px] font-rajdhani font-bold uppercase tracking-wider text-[#FF9FFC] bg-[#5227FF]/20 px-2 py-0.5 border border-[#5227FF]/40 rounded">
                  ROLL COSTING
                </span>
                <h3 className="text-xl font-bold font-rajdhani text-white group-hover:text-[#FF9FFC] transition-colors leading-snug">
                  The True Cost of a Single Fabric Roll: Solving the Margin Mystery
                </h3>
                <p className="text-xs text-slate-400 font-normal leading-relaxed">
                  Why 80% of textile units struggle at month-end, and how itemizing yarn kg, power tariffs, and weaver man-hours restores profit clarity.
                </p>
              </div>
              <div className="pt-6 border-t border-slate-800 flex items-center justify-between text-xs font-rajdhani font-bold uppercase tracking-wider text-slate-300 group-hover:text-[#FF9FFC]">
                <span>Explore Calculator</span>
                <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Insight Card 2 */}
            <div
              onClick={() => handleRoleSignIn('aditi@apexgarments.com')}
              className="group cursor-pointer bg-[#0D1220]/80 border border-slate-800/80 hover:border-[#FF9FFC]/60 hover:bg-[#11172A] hover:shadow-[0_8px_30px_rgba(255,159,252,0.2)] rounded-xl transition-all duration-300 p-6 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <span className="text-[11px] font-rajdhani font-bold uppercase tracking-wider text-[#FF9FFC] bg-[#5227FF]/20 px-2 py-0.5 border border-[#5227FF]/40 rounded">
                  CASE STUDY
                </span>
                <h3 className="text-xl font-bold font-rajdhani text-white group-hover:text-[#FF9FFC] transition-colors leading-snug">
                  Eliminating 150+ Daily Buyer Phone Calls with Real-Time Telemetry
                </h3>
                <p className="text-xs text-slate-400 font-normal leading-relaxed">
                  How giving fashion sourcing heads a direct 6-stage tracker from spinning to truck dispatch eliminated chaotic callbacks entirely.
                </p>
              </div>
              <div className="pt-6 border-t border-slate-800 flex items-center justify-between text-xs font-rajdhani font-bold uppercase tracking-wider text-slate-300 group-hover:text-[#FF9FFC]">
                <span>Open Buyer Portal</span>
                <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Insight Card 3 */}
            <div
              onClick={() => handleRoleSignIn('rajesh.weaver@fabricops.com')}
              className="group cursor-pointer bg-[#0D1220]/80 border border-slate-800/80 hover:border-[#FF9FFC]/60 hover:bg-[#11172A] hover:shadow-[0_8px_30px_rgba(255,159,252,0.2)] rounded-xl transition-all duration-300 p-6 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <span className="text-[11px] font-rajdhani font-bold uppercase tracking-wider text-[#FF9FFC] bg-[#5227FF]/20 px-2 py-0.5 border border-[#5227FF]/40 rounded">
                  QUALITY CONTROL
                </span>
                <h3 className="text-xl font-bold font-rajdhani text-white group-hover:text-[#FF9FFC] transition-colors leading-snug">
                  ASTM D5430 4-Point Defect Scoring: Defeating Fabric Rejections
                </h3>
                <p className="text-xs text-slate-400 font-normal leading-relaxed">
                  Pinpointing warp snags, reed marks, and shade mismatches down to the exact meter before packing slips and gate passes are issued.
                </p>
              </div>
              <div className="pt-6 border-t border-slate-800 flex items-center justify-between text-xs font-rajdhani font-bold uppercase tracking-wider text-slate-300 group-hover:text-[#FF9FFC]">
                <span>Launch QC Console</span>
                <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Insight Card 4 */}
            <div
              onClick={() => handleRoleSignIn('admin@fabricops.com')}
              className="group cursor-pointer bg-[#0D1220]/80 border border-slate-800/80 hover:border-[#FF9FFC]/60 hover:bg-[#11172A] hover:shadow-[0_8px_30px_rgba(255,159,252,0.2)] rounded-xl transition-all duration-300 p-6 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <span className="text-[11px] font-rajdhani font-bold uppercase tracking-wider text-[#FF9FFC] bg-[#5227FF]/20 px-2 py-0.5 border border-[#5227FF]/40 rounded">
                  SUPPLY CHAIN
                </span>
                <h3 className="text-xl font-bold font-rajdhani text-white group-hover:text-[#FF9FFC] transition-colors leading-snug">
                  Early-Warning Silo Radar: Zero Idle Looms Due to Shortages
                </h3>
                <p className="text-xs text-slate-400 font-normal leading-relaxed">
                  Automatically alerting gate and procurement desks whenever combed cotton or linen slub falls below safety buffer thresholds.
                </p>
              </div>
              <div className="pt-6 border-t border-slate-800 flex items-center justify-between text-xs font-rajdhani font-bold uppercase tracking-wider text-slate-300 group-hover:text-[#FF9FFC]">
                <span>View Shortage Radar</span>
                <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* CLIENT SUCCESS CASE STUDY */}
      <section className="py-20 bg-[#0A0E1A] border-b border-slate-800/80">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

            {/* Left Case Study Text */}
            <div className="lg:col-span-7 space-y-6">
              <div className="flex items-center gap-2">
                <span className="text-xs font-rajdhani font-bold uppercase tracking-widest text-[#FF9FFC]">
                  CLIENT SUCCESS STORY
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-xs font-mono text-slate-400 font-semibold">{caseStudies[caseStudyIndex].badge}</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-bold font-rajdhani text-white leading-tight">
                {caseStudies[caseStudyIndex].title}
              </h2>

              <p className="text-slate-300 font-normal leading-relaxed text-sm">
                {caseStudies[caseStudyIndex].desc}
              </p>

              {/* YoY Stat Blocks */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800">
                <div className="p-5 bg-[#0D1220]/80 border border-slate-800/80 rounded-xl">
                  <p className="text-3xl sm:text-4xl font-bold font-rajdhani text-[#FF9FFC]">
                    {caseStudies[caseStudyIndex].stat1}
                  </p>
                  <p className="text-xs font-rajdhani uppercase tracking-wider text-slate-400 font-semibold mt-1">
                    {caseStudies[caseStudyIndex].label1}
                  </p>
                </div>
                <div className="p-5 bg-[#0D1220]/80 border border-slate-800/80 rounded-xl">
                  <p className="text-3xl sm:text-4xl font-bold font-rajdhani text-white">
                    {caseStudies[caseStudyIndex].stat2}
                  </p>
                  <p className="text-xs font-rajdhani uppercase tracking-wider text-slate-400 font-semibold mt-1">
                    {caseStudies[caseStudyIndex].label2}
                  </p>
                </div>
              </div>

              {/* Action Button & Carousel Controls */}
              <div className="pt-4 flex flex-wrap items-center justify-between gap-4">
                <button
                  onClick={() => setCurrentRole(caseStudies[caseStudyIndex].actionRole)}
                  className="px-6 py-3 bg-gradient-to-r from-[#5227FF] via-[#7B42FF] to-[#FF9FFC] hover:shadow-[0_6px_25px_rgba(82,39,255,0.4)] text-white font-rajdhani font-bold text-xs uppercase tracking-wider flex items-center gap-2 rounded-lg transition-all"
                >
                  <span>{caseStudies[caseStudyIndex].actionText}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                {/* Next / Prev buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCaseStudyIndex((caseStudyIndex - 1 + caseStudies.length) % caseStudies.length)}
                    className="w-9 h-9 bg-slate-800/80 border border-slate-700 text-slate-300 hover:text-white hover:bg-[#5227FF] rounded flex items-center justify-center transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-mono text-slate-400 font-bold px-2">
                    0{caseStudyIndex + 1} / 0{caseStudies.length}
                  </span>
                  <button
                    onClick={() => setCaseStudyIndex((caseStudyIndex + 1) % caseStudies.length)}
                    className="w-9 h-9 bg-slate-800/80 border border-slate-700 text-slate-300 hover:text-white hover:bg-[#5227FF] rounded flex items-center justify-center transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Right Interactive Verification Card */}
            <div className="lg:col-span-5">
              <div className="p-8 bg-[#0D1220]/90 border border-slate-700/60 rounded-xl shadow-2xl space-y-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-[#5227FF] via-[#FF9FFC] to-transparent"></div>

                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <span className="text-xs font-rajdhani font-bold uppercase tracking-wider text-[#FF9FFC]">
                    CLIENT VERIFICATION NOTE
                  </span>
                  <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-950/40 px-2 py-0.5 border border-emerald-800/50 rounded">
                    100% AUDITED
                  </span>
                </div>

                <div className="space-y-4 text-xs">
                  <div className="flex justify-between items-center py-2 border-b border-slate-800/60">
                    <span className="text-slate-400">Enterprise Buyer:</span>
                    <span className="text-white font-semibold">{caseStudies[caseStudyIndex].client}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-800/60">
                    <span className="text-slate-400">Deployment Type:</span>
                    <span className="text-[#FF9FFC] font-mono font-bold">FabricOps Unified Cloud MES</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-800/60">
                    <span className="text-slate-400">Dispatch Proof:</span>
                    <span className="text-emerald-400 font-mono font-bold">Tamper-Proof Gate Pass</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-slate-400">Telephone Call Reduction:</span>
                    <span className="text-white font-bold font-mono">100% Eliminated</span>
                  </div>
                </div>

                <div className="p-4 bg-[#5227FF]/10 border border-[#5227FF]/30 text-xs text-slate-300 italic rounded-lg">
                  “With Everest Mill's live portal, we track our 40s poplin and linen shipments minute-by-minute. We haven't picked up the phone to ask about an order status in four months.”
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* A DAY AT EVEREST MILLS: 6 STATIONS */}
      <section className="py-20 bg-[#070A12] border-b border-slate-800/80">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">

          <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
            <p className="text-xs uppercase font-rajdhani font-bold tracking-[0.2em] text-[#FF9FFC]">
              EMPOWERING FACTORY SOLUTIONS
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold font-rajdhani text-white">
              A Day at Everest Textile Mills
            </h2>
            <p className="text-sm text-slate-400 font-normal">
              Explore how every single chaotic scene on the manufacturing floor is replaced by direct digital intelligence.
            </p>
          </div>

          {/* Filter Bar */}
          <div className="flex justify-center items-center gap-2 sm:gap-4 overflow-x-auto pb-4 mb-10 border-b border-slate-800">
            <button
              onClick={() => setActiveStationFilter('ALL')}
              className={`px-4 py-2 font-rajdhani text-xs sm:text-sm font-bold uppercase tracking-wider transition-all relative ${activeStationFilter === 'ALL' ? 'text-[#FF9FFC]' : 'text-slate-400 hover:text-white'}`}
            >
              All 6 Stations
              {activeStationFilter === 'ALL' && (
                <span className="absolute bottom-[-17px] left-1/2 -translate-x-1/2 w-8 h-[3px] bg-[#5227FF] shadow-[0_0_8px_#5227FF]"></span>
              )}
            </button>
            {stations.map(st => (
              <button
                key={st.id}
                onClick={() => setActiveStationFilter(st.id)}
                className={`px-4 py-2 font-rajdhani text-xs sm:text-sm font-bold uppercase tracking-wider transition-all relative whitespace-nowrap ${activeStationFilter === st.id ? 'text-[#FF9FFC]' : 'text-slate-400 hover:text-white'}`}
              >
                {st.category}
                {activeStationFilter === st.id && (
                  <span className="absolute bottom-[-17px] left-1/2 -translate-x-1/2 w-8 h-[3px] bg-[#5227FF] shadow-[0_0_8px_#5227FF]"></span>
                )}
              </button>
            ))}
          </div>

          {/* Station Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStations.map((st) => (
              <div
                key={st.id}
                className="group bg-[#0D1220]/80 border border-slate-800/80 hover:border-[#5227FF]/60 rounded-xl p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-[0_8px_30px_rgba(82,39,255,0.2)]"
              >
                <div>
                  <div className="flex items-center justify-between text-xs mb-3">
                    <span className="font-mono text-slate-500 font-bold">{st.stationNum}</span>
                    <span className="text-[11px] font-rajdhani font-bold text-[#FF9FFC] uppercase tracking-wider bg-[#5227FF]/20 px-2 py-0.5 border border-[#5227FF]/30 rounded">
                      {st.category}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold font-rajdhani text-white group-hover:text-[#FF9FFC] transition-colors mb-4">
                    {st.title}
                  </h3>

                  {/* Problem vs Solution Split */}
                  <div className="space-y-3 mb-6">
                    <div className="p-3 bg-red-950/25 border border-red-800/40 text-xs rounded-lg">
                      <p className="text-red-400 font-rajdhani font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <AlertOctagon className="w-3.5 h-3.5" />
                        Today's Problem:
                      </p>
                      <p className="text-red-200 font-normal leading-relaxed">{st.problem}</p>
                    </div>

                    <div className="p-3 bg-emerald-950/25 border border-emerald-800/40 text-xs rounded-lg">
                      <p className="text-emerald-400 font-rajdhani font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        FabricOps Solution:
                      </p>
                      <p className="text-emerald-200 font-normal leading-relaxed">{st.solution}</p>
                    </div>
                  </div>
                </div>

                {/* Action Launch Button */}
                <button
                  onClick={() => {
                  const email = st.role === 'manager' ? 'admin@fabricops.com' : st.role === 'buyer' ? 'aditi@apexgarments.com' : 'rajesh.weaver@fabricops.com';
                  handleRoleSignIn(email);
                }}
                  className="w-full py-3 bg-slate-800/80 group-hover:bg-gradient-to-r group-hover:from-[#5227FF] group-hover:to-[#FF9FFC] text-slate-200 group-hover:text-white font-rajdhani font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 rounded-lg transition-all border border-slate-700/80 group-hover:border-transparent"
                >
                  <span>{st.buttonText}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* FOUR DEDICATED WORKSPACES: ROLE LAUNCHPAD */}
      <section className="py-20 bg-[#0A0E1A] border-b border-slate-800/80">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">

          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12 gap-4">
            <div className="space-y-2 max-w-2xl">
              <p className="text-xs uppercase font-rajdhani font-bold tracking-[0.2em] text-[#FF9FFC]">
                FOUR DEDICATED WORKSPACES
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold font-rajdhani text-white">
                Launch Role Consoles
              </h2>
              <p className="text-sm text-slate-400 font-normal">
                Each user persona operates in an isolated console with tailored responsibilities, live synchronization, and authentication.
              </p>
            </div>
            <button
              onClick={() => handleRoleSignIn('admin@fabricops.com')}
              className="px-5 py-2.5 bg-gradient-to-r from-[#5227FF] to-[#FF9FFC] hover:opacity-90 text-white shadow-md font-rajdhani font-bold text-xs uppercase tracking-wider flex items-center gap-2 rounded-lg self-start sm:self-auto transition-all shadow-sm"
            >
              <KeyRound className="w-4 h-4" />
              <span>4-Role Login Portal</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

            {/* Role 1: Admin */}
            <div
              onClick={() => handleRoleSignIn('admin@fabricops.com')}
              className="group cursor-pointer bg-[#0D1220]/80 border border-slate-800/80 hover:border-purple-500 rounded-xl p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-[0_8px_30px_rgba(168,85,247,0.25)] hover:-translate-y-1"
            >
              <div className="space-y-4">
                <div className="w-12 h-12 bg-purple-950/40 border border-purple-500/40 rounded-lg flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold font-rajdhani text-white group-hover:text-purple-400">
                      Administrator
                    </h3>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 bg-purple-900/60 text-purple-300 rounded font-bold">Vikram M.</span>
                  </div>
                  <p className="text-xs text-slate-400 font-normal mt-2 leading-relaxed">
                    Machinery registry (Rieter, Picanol, Monforts), yarn count catalogs, shift schedules, wage tiers, and immutable audit logs.
                  </p>
                </div>
              </div>
              <div className="pt-6 border-t border-slate-800 flex items-center justify-between text-xs font-rajdhani font-bold uppercase tracking-wider text-purple-400">
                <span>Sign In as Admin</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>

            {/* Role 2: Manager */}
            <div
              onClick={() => handleRoleSignIn('admin@fabricops.com')}
              className="group cursor-pointer bg-[#0D1220]/80 border-2 border-[#5227FF]/50 hover:border-[#FF9FFC] rounded-xl p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-[0_8px_30px_rgba(255,159,252,0.25)] hover:-translate-y-1 relative"
            >
              <div className="absolute top-0 right-0 px-2.5 py-0.5 bg-gradient-to-r from-[#5227FF] to-[#FF9FFC] text-white font-rajdhani font-bold text-[10px] uppercase rounded-tr-xl rounded-bl-lg">
                OWNER & P&L
              </div>
              <div className="space-y-4">
                <div className="w-12 h-12 bg-[#5227FF]/20 border border-[#5227FF]/40 rounded-lg flex items-center justify-center text-[#FF9FFC] group-hover:scale-110 transition-transform">
                  <Factory className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold font-rajdhani text-white group-hover:text-[#FF9FFC]">
                      Plant Manager
                    </h3>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 bg-amber-900/60 text-amber-300 rounded font-bold">Rajesh S.</span>
                  </div>
                  <p className="text-xs text-slate-400 font-normal mt-2 leading-relaxed">
                    Month-end P&L closing, True Roll Cost Calculator, bottleneck scheduling, raw material shortage radar, and idle alerts.
                  </p>
                </div>
              </div>
              <div className="pt-6 border-t border-slate-800 flex items-center justify-between text-xs font-rajdhani font-bold uppercase tracking-wider text-[#FF9FFC]">
                <span>Sign In as Manager</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>

            {/* Role 3: Employee */}
            <div
              onClick={() => handleRoleSignIn('rajesh.weaver@fabricops.com')}
              className="group cursor-pointer bg-[#0D1220]/80 border border-slate-800/80 hover:border-emerald-500 rounded-xl p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-[0_8px_30px_rgba(16,185,129,0.25)] hover:-translate-y-1"
            >
              <div className="space-y-4">
                <div className="w-12 h-12 bg-emerald-950/40 border border-emerald-500/40 rounded-lg flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold font-rajdhani text-white group-hover:text-emerald-400">
                      Floor Employee
                    </h3>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 bg-emerald-900/60 text-emerald-300 rounded font-bold">Ramesh S.</span>
                  </div>
                  <p className="text-xs text-slate-400 font-normal mt-2 leading-relaxed">
                    5 workstations: Gate weighbridge inward, live loom telemetry, ASTM 4-Point QC defect logging, dispatch bay loading & wages.
                  </p>
                </div>
              </div>
              <div className="pt-6 border-t border-slate-800 flex items-center justify-between text-xs font-rajdhani font-bold uppercase tracking-wider text-emerald-400">
                <span>Sign In as Floor Lead</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>

            {/* Role 4: Buyer */}
            <div
              onClick={() => handleRoleSignIn('aditi@apexgarments.com')}
              className="group cursor-pointer bg-[#0D1220]/80 border border-slate-800/80 hover:border-sky-500 rounded-xl p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-[0_8px_30px_rgba(14,165,233,0.25)] hover:-translate-y-1"
            >
              <div className="space-y-4">
                <div className="w-12 h-12 bg-sky-950/40 border border-sky-500/40 rounded-lg flex items-center justify-center text-sky-400 group-hover:scale-110 transition-transform">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold font-rajdhani text-white group-hover:text-sky-400">
                      Buyer Portal
                    </h3>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 bg-sky-900/60 text-sky-300 rounded font-bold">Marina S.</span>
                  </div>
                  <p className="text-xs text-slate-400 font-normal mt-2 leading-relaxed">
                    Self-service 6-stage order tracking, order placement with instant yarn check, digital roll certificates, and tax invoices.
                  </p>
                </div>
              </div>
              <div className="pt-6 border-t border-slate-800 flex items-center justify-between text-xs font-rajdhani font-bold uppercase tracking-wider text-sky-400">
                <span>Sign In as Global Buyer</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* TRUSTED CLIENTS / PARTNERSHIPS */}
      <section className="py-14 bg-[#070A12] border-b border-slate-800/80">
        <div className="max-w-[1280px] mx-auto px-4 text-center space-y-6">
          <p className="text-xs uppercase font-rajdhani font-bold tracking-[0.25em] text-slate-500">
            TRUSTED COMMERCIAL BUYERS & SUPPLY PARTNERS
          </p>

          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-14 opacity-80">
            <span className="font-rajdhani font-extrabold text-lg sm:text-2xl tracking-widest text-slate-300 hover:text-[#FF9FFC] transition-colors cursor-default">
              ZARA INDITEX
            </span>
            <span className="font-rajdhani font-extrabold text-lg sm:text-2xl tracking-widest text-slate-300 hover:text-[#FF9FFC] transition-colors cursor-default">
              H&M APPAREL
            </span>
            <span className="font-rajdhani font-extrabold text-lg sm:text-2xl tracking-widest text-slate-300 hover:text-[#FF9FFC] transition-colors cursor-default">
              LEVI STRAUSS & CO.
            </span>
            <span className="font-rajdhani font-extrabold text-lg sm:text-2xl tracking-widest text-slate-300 hover:text-[#FF9FFC] transition-colors cursor-default">
              MARKS & SPENCER
            </span>
            <span className="font-rajdhani font-extrabold text-lg sm:text-2xl tracking-widest text-slate-300 hover:text-[#FF9FFC] transition-colors cursor-default">
              FABINDIA
            </span>
            <span className="font-rajdhani font-extrabold text-lg sm:text-2xl tracking-widest text-slate-300 hover:text-[#FF9FFC] transition-colors cursor-default">
              VARDHMAN YARNS
            </span>
          </div>
        </div>
      </section>

      {/* CORPORATE FOOTER */}
      <footer className="bg-[#05070D] pt-16 pb-12 border-t border-slate-800/80 text-xs text-slate-400">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 space-y-12">

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">

            {/* Col 1: Brand & Bio */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold font-rajdhani tracking-wider text-white">
                  EVEREST TEXTILE MILLS
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 bg-gradient-to-r from-[#5227FF] to-[#FF9FFC] text-white font-bold uppercase rounded">
                  MillOS
                </span>
              </div>
              <p className="text-slate-400 font-normal leading-relaxed max-w-sm">
                The digital backbone of modern fabric factories. Replacing notebooks, floor walking, paper inspection slips,
                and telephone calls with unified manufacturing intelligence.
              </p>
              <p className="text-[11px] text-slate-500 font-mono">
                ISO 9001:2015 Certified Manufacturing • ASTM D5430 Inspection Standard
              </p>
            </div>

            {/* Col 2: Mill Solutions */}
            <div className="space-y-3">
              <h4 className="font-rajdhani font-bold text-white uppercase tracking-wider text-sm">
                Floor Solutions
              </h4>
              <ul className="space-y-2 font-normal">
                <li><button onClick={() => handleRoleSignIn('rajesh.weaver@fabricops.com')} className="hover:text-[#FF9FFC] transition-colors">Gate Weighbridge Inward</button></li>
                <li><button onClick={() => handleRoleSignIn('rajesh.weaver@fabricops.com')} className="hover:text-[#FF9FFC] transition-colors">Live Loom Floorboard</button></li>
                <li><button onClick={() => handleRoleSignIn('rajesh.weaver@fabricops.com')} className="hover:text-[#FF9FFC] transition-colors">ASTM 4-Point QC Logging</button></li>
                <li><button onClick={() => handleRoleSignIn('rajesh.weaver@fabricops.com')} className="hover:text-[#FF9FFC] transition-colors">Dispatch Bay Verification</button></li>
                <li><button onClick={() => handleRoleSignIn('rajesh.weaver@fabricops.com')} className="hover:text-[#FF9FFC] transition-colors">Worker Shift Wages</button></li>
              </ul>
            </div>

            {/* Col 3: Executive Suite */}
            <div className="space-y-3">
              <h4 className="font-rajdhani font-bold text-white uppercase tracking-wider text-sm">
                Management
              </h4>
              <ul className="space-y-2 font-normal">
                <li><button onClick={() => handleRoleSignIn('admin@fabricops.com')} className="hover:text-[#FF9FFC] transition-colors">Month-End P&L Closing</button></li>
                <li><button onClick={() => handleRoleSignIn('admin@fabricops.com')} className="hover:text-[#FF9FFC] transition-colors">True Roll Cost Engine</button></li>
                <li><button onClick={() => handleRoleSignIn('admin@fabricops.com')} className="hover:text-[#FF9FFC] transition-colors">Yarn Shortage Radar</button></li>
                <li><button onClick={() => handleRoleSignIn('admin@fabricops.com')} className="hover:text-[#FF9FFC] transition-colors">Loom Capacity Gantt</button></li>
                <li><button onClick={() => handleRoleSignIn('admin@fabricops.com')} className="hover:text-[#FF9FFC] transition-colors">Machinery Registry Master</button></li>
              </ul>
            </div>

            {/* Col 4: Buyer Direct */}
            <div className="space-y-3">
              <h4 className="font-rajdhani font-bold text-white uppercase tracking-wider text-sm">
                Buyer Link
              </h4>
              <ul className="space-y-2 font-normal">
                <li><button onClick={() => handleRoleSignIn('aditi@apexgarments.com')} className="hover:text-[#FF9FFC] transition-colors">Live 6-Stage Order Tracker</button></li>
                <li><button onClick={() => handleRoleSignIn('aditi@apexgarments.com')} className="hover:text-[#FF9FFC] transition-colors">Order with Yarn Check</button></li>
                <li><button onClick={() => handleRoleSignIn('aditi@apexgarments.com')} className="hover:text-[#FF9FFC] transition-colors">Digital Inspection Certs</button></li>
                <li><button onClick={() => handleRoleSignIn('aditi@apexgarments.com')} className="hover:text-[#FF9FFC] transition-colors">GST Tax Invoices</button></li>
                <li><button onClick={() => handleRoleSignIn('aditi@apexgarments.com')} className="hover:text-[#FF9FFC] transition-colors">Live Mill Chat Desk</button></li>
              </ul>
            </div>

          </div>

          <div className="pt-8 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-[11px] text-slate-500 font-normal">
            <p>© 2026 Everest Textile Mills Ltd. All Rights Reserved. FabricOps™ Operating System.</p>
            <div className="flex gap-6">
              <span className="hover:text-slate-300 cursor-pointer">Privacy Policy</span>
              <span className="hover:text-slate-300 cursor-pointer">Terms of Weave Service</span>
              <span className="hover:text-slate-300 cursor-pointer">ASTM D5430 Standards</span>
            </div>
          </div>

        </div>
      </footer>

    </div>
  );
};
