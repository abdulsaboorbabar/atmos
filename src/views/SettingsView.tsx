import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon,
  Thermometer,
  Wind,
  Palette,
  Eye,
  AlertTriangle,
  Bell,
  Database,
  Info,
  ShieldCheck,
  Terminal,
  ChevronRight,
  History,
  Loader2,
  X,
  MessageSquare,
  Star,
  User,
  Sparkles,
  Mail,
  Clock,
  Download
} from 'lucide-react';
import { GlassCard } from '../components/GlassCard';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useWeatherStore } from '../store/useWeatherStore';
import { useQueryClient } from '@tanstack/react-query';

export function SettingsView() {
  const [glassmorphism, setGlassmorphism] = useState(true);
  const [alerts, setAlerts] = useState(true);
  const [summary, setSummary] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Overlay Modal States: 'about' | 'privacy' | 'review' | 'contact' | null
  const [activeModal, setActiveModal] = useState<'about' | 'privacy' | 'review' | 'contact' | null>(null);

  // Dynamic state from Zustand Weather Store
  const tempUnit = useWeatherStore((state) => state.tempUnit);
  const speedUnit = useWeatherStore((state) => state.speedUnit);
  const theme = useWeatherStore((state) => state.theme);
  const timeFormat = useWeatherStore((state) => state.timeFormat);
  const selectedLocation = useWeatherStore((state) => state.selectedLocation);

  const setTempUnit = useWeatherStore((state) => state.setTempUnit);
  const setSpeedUnit = useWeatherStore((state) => state.setSpeedUnit);
  const setTheme = useWeatherStore((state) => state.setTheme);
  const setTimeFormat = useWeatherStore((state) => state.setTimeFormat);

  // PWA Install Prompt State
  const [installPrompt, setInstallPrompt] = useState<any>(() => (window as any).deferredPrompt);

  useEffect(() => {
    const handleInstallable = () => {
      setInstallPrompt((window as any).deferredPrompt);
    };
    const handleInstalled = () => {
      setInstallPrompt(null);
    };

    window.addEventListener('atmos_pwa_installable', handleInstallable);
    window.addEventListener('atmos_pwa_installed', handleInstalled);

    return () => {
      window.removeEventListener('atmos_pwa_installable', handleInstallable);
      window.removeEventListener('atmos_pwa_installed', handleInstalled);
    };
  }, []);

  const handleInstallApp = async () => {
    const promptEvent = installPrompt || (window as any).deferredPrompt;
    if (!promptEvent) return;
    
    // Show the install prompt
    promptEvent.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await promptEvent.userChoice;
    console.log(`User response to install prompt: ${outcome}`);
    
    if (outcome === 'accepted') {
      (window as any).deferredPrompt = null;
      setInstallPrompt(null);
    } else {
      console.log('User dismissed PWA installation prompt. Option remains active.');
    }
  };

  // Review & Suggestion states
  const [reviewName, setReviewName] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmitSuccess, setIsSubmitSuccess] = useState(false);
  const [reviewsList, setReviewsList] = useState<{name: string, rating: number, comment: string, date: string}[]>(() => {
    try {
      const saved = localStorage.getItem('atmos_reviews');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const queryClient = useQueryClient();

  // Functional cache invalidation for the data sync pipeline
  const handleSyncPipeline = async () => {
    setIsSyncing(true);
    try {
      await queryClient.refetchQueries({
        queryKey: ['weather', selectedLocation.lat, selectedLocation.lon]
      });
      // Small artificial timeout to show premium visual sync pulse
      await new Promise((resolve) => setTimeout(resolve, 800));
    } catch (e) {
      console.error(e);
    } finally {
      setIsSyncing(false);
    }
  };

  // Submit feedback locally
  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewComment.trim()) return;

    const newReview = {
      name: reviewName.trim() || 'Anonymous Explorer',
      rating: reviewRating,
      comment: reviewComment.trim(),
      date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    };

    const updated = [newReview, ...reviewsList];
    setReviewsList(updated);
    try {
      localStorage.setItem('atmos_reviews', JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }

    setIsSubmitSuccess(true);
    setTimeout(() => {
      setIsSubmitSuccess(false);
      setReviewName('');
      setReviewComment('');
      setReviewRating(5);
      setActiveModal(null);
    }, 1800);
  };

  return (
    <div className="pt-24 pb-32 px-4 md:px-10 max-w-3xl mx-auto space-y-10">
      {/* Premium Hero Visual */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-6"
      >
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-[32px] glass-card mb-6 shadow-2xl">
          <SettingsIcon className="w-10 h-10 text-blue-400 fill-blue-400/20 animate-pulse" />
        </div>
        <h2 className="text-3xl font-bold text-white tracking-tight mb-2 theme-text-primary">Settings</h2>
        <p className="text-zinc-500 font-medium theme-text-secondary">Manage your atmospheric experience</p>
      </motion.div>

      {/* Section: Weather Units */}
      <section>
        <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em] mb-4 px-2">Weather Units</h3>
        <GlassCard className="divide-y divide-white/5 p-0 overflow-hidden">
          {/* Temperature unit */}
          <div className="flex items-center justify-between p-5">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-xl bg-white/5 text-zinc-400">
                <Thermometer className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-white theme-text-primary">Temperature</p>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider theme-text-secondary">
                  {tempUnit === 'C' ? 'Celsius (°C)' : 'Fahrenheit (°F)'}
                </p>
              </div>
            </div>
            <div className="flex bg-zinc-900 rounded-lg p-1 border border-white/5 theme-btn-container">
              <button 
                onClick={() => setTempUnit('C')}
                className={cn(
                  "px-5 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer",
                  tempUnit === 'C' ? "bg-blue-400 text-blue-950 shadow-lg" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                °C
              </button>
              <button 
                onClick={() => setTempUnit('F')}
                className={cn(
                  "px-5 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer",
                  tempUnit === 'F' ? "bg-blue-400 text-blue-950 shadow-lg" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                °F
              </button>
            </div>
          </div>
          
          {/* Wind Speed unit */}
          <div className="flex items-center justify-between p-5">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-xl bg-white/5 text-zinc-400">
                <Wind className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-white theme-text-primary">Wind Speed</p>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider theme-text-secondary">
                  {speedUnit === 'kmh' ? 'Kilometers per hour (km/h)' : 'Miles per hour (mph)'}
                </p>
              </div>
            </div>
            <div className="flex bg-zinc-900 rounded-lg p-1 border border-white/5 theme-btn-container">
              <button 
                onClick={() => setSpeedUnit('kmh')}
                className={cn(
                  "px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer",
                  speedUnit === 'kmh' ? "bg-blue-400 text-blue-950 shadow-lg" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                km/h
              </button>
              <button 
                onClick={() => setSpeedUnit('mph')}
                className={cn(
                  "px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer",
                  speedUnit === 'mph' ? "bg-blue-400 text-blue-950 shadow-lg" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                mph
              </button>
            </div>
          </div>

          {/* Time Format selector */}
          <div className="flex items-center justify-between p-5">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-xl bg-white/5 text-zinc-400">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-white theme-text-primary">Time Format</p>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider theme-text-secondary">
                  {timeFormat === '12h' ? '12-Hour (AM/PM)' : '24-Hour (Military)'}
                </p>
              </div>
            </div>
            <div className="flex bg-zinc-900 rounded-lg p-1 border border-white/5 theme-btn-container">
              <button 
                onClick={() => setTimeFormat('12h')}
                className={cn(
                  "px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer",
                  timeFormat === '12h' ? "bg-blue-400 text-blue-950 shadow-lg" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                12h
              </button>
              <button 
                onClick={() => setTimeFormat('24h')}
                className={cn(
                  "px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer",
                  timeFormat === '24h' ? "bg-blue-400 text-blue-950 shadow-lg" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                24h
              </button>
            </div>
          </div>
        </GlassCard>
      </section>

      {/* Section: Appearance */}
      <section>
        <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em] mb-4 px-2">Appearance</h3>
        <GlassCard className="divide-y divide-white/5 p-0 overflow-hidden">
          {/* Working Theme Switcher */}
          {/* Theme Switcher completely hidden for default Light mode setup
          <div className="flex items-center justify-between p-5">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-xl bg-white/5 text-zinc-400">
                <Palette className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-white theme-text-primary">Theme</p>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider theme-text-secondary">
                  {theme === 'cyber' ? 'Neon Cyber-Glow' : theme === 'light' ? 'Frost Alabaster (Light)' : 'Carbon Obsidian'}
                </p>
              </div>
            </div>
            <div className="flex bg-zinc-900 rounded-lg p-1 border border-white/5 theme-btn-container">
              <button 
                onClick={() => setTheme('dark')}
                className={cn(
                  "px-3 py-1.5 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer",
                  theme === 'dark' ? "bg-blue-400 text-blue-950 shadow-lg" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                Carbon
              </button>
              <button 
                onClick={() => setTheme('cyber')}
                className={cn(
                  "px-3 py-1.5 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer",
                  theme === 'cyber' ? "bg-purple-500 text-white shadow-lg" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                Cyber
              </button>
              <button 
                onClick={() => setTheme('light')}
                className={cn(
                  "px-3 py-1.5 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer",
                  theme === 'light' ? "bg-amber-500 text-amber-950 shadow-lg" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                Light
              </button>
            </div>
          </div>
          */}

          <div className="flex items-center justify-between p-5">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-xl bg-white/5 text-zinc-400">
                <Eye className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-white theme-text-primary">Glassmorphism Effects</p>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider theme-text-secondary">Advanced backdrop blurring</p>
              </div>
            </div>
            <button 
              onClick={() => setGlassmorphism(!glassmorphism)}
              className={cn(
                "relative w-12 h-6 rounded-full transition-colors duration-300 cursor-pointer",
                glassmorphism ? "bg-blue-400" : "bg-zinc-800"
              )}
            >
              <div className={cn(
                "absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 shadow-sm",
                glassmorphism ? "transform translate-x-6 bg-[#002e69]" : "transform translate-x-0"
              )} />
            </button>
          </div>
        </GlassCard>
      </section>

      {/* Section: Native Application Shell */}
      <section>
        <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em] mb-4 px-2">Native Integration</h3>
        <GlassCard className="p-8 border-white/5 bg-gradient-to-br from-blue-500/5 to-transparent">
          {installPrompt ? (
            <div className="space-y-6">
              <div className="flex items-start gap-6">
                <div className="p-4 rounded-[20px] bg-blue-500/10 text-blue-400">
                  <Download className="w-6 h-6 animate-bounce" />
                </div>
                <div>
                  <p className="text-lg font-bold text-white tracking-tight uppercase theme-text-primary">Install Atmos App</p>
                  <p className="text-xs text-zinc-500 mt-2 leading-relaxed font-light theme-text-secondary">
                    Launch ATMOS directly from your home screen or dock as a standalone, lightweight utility with instant loading capabilities.
                  </p>
                </div>
              </div>
              <button 
                onClick={handleInstallApp}
                className="w-full py-4.5 rounded-full bg-blue-500 hover:bg-blue-600 text-white text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 cursor-pointer shadow-lg shadow-blue-500/10 theme-cta-btn"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                Install Atmos Desktop / Mobile
              </button>
            </div>
          ) : (
            <div className="flex items-start gap-6">
              <div className="p-4 rounded-[20px] bg-emerald-500/10 text-emerald-400">
                <ShieldCheck className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <p className="text-lg font-bold text-white tracking-tight uppercase theme-text-primary">Native App Status</p>
                <p className="text-xs text-zinc-500 mt-2 leading-relaxed font-light theme-text-secondary">
                  ATMOS is fully calibrated and running as an offline-capable standalone Progressive Web App. If you want to install it on this device, you can trigger it directly inside Chrome's options (⋮) by selecting <strong className="text-white">"Install ATMOS..."</strong> or <strong className="text-white">"Add to Home Screen"</strong>.
                </p>
              </div>
            </div>
          )}
        </GlassCard>
      </section>

      {/* Section: Alerts & Safety */}
      <section>
        <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em] mb-4 px-2">Alerts & Safety</h3>
        <GlassCard className="divide-y divide-white/5 p-0 overflow-hidden">
          <div className="flex items-center justify-between p-5">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-xl bg-red-400/10 text-red-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-white theme-text-primary">Severe Weather Alerts</p>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider theme-text-secondary">Real-time emergency warnings</p>
              </div>
            </div>
            <button 
              onClick={() => setAlerts(!alerts)}
              className={cn(
                "relative w-12 h-6 rounded-full transition-colors duration-300 cursor-pointer",
                alerts ? "bg-blue-400" : "bg-zinc-800"
              )}
            >
              <div className={cn(
                "absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 shadow-sm",
                alerts ? "transform translate-x-6 bg-[#002e69]" : "transform translate-x-0"
              )} />
            </button>
          </div>

          <div className="flex items-center justify-between p-5">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-xl bg-white/5 text-zinc-400">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-white theme-text-primary">Daily Summary</p>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider theme-text-secondary">Morning forecast briefing</p>
              </div>
            </div>
            <button 
              onClick={() => setSummary(!summary)}
              className={cn(
                "relative w-12 h-6 rounded-full transition-colors duration-300 cursor-pointer",
                summary ? "bg-blue-400" : "bg-zinc-800"
              )}
            >
              <div className={cn(
                "absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 shadow-sm",
                summary ? "transform translate-x-6 bg-[#002e69]" : "transform translate-x-0"
              )} />
            </button>
          </div>
        </GlassCard>
      </section>

      {/* Section: Weather Source */}
      <section>
        <span className="meta-label mb-6 block px-2">Weather Source</span>
        <GlassCard className="p-8 border-white/5">
          <div className="flex items-start gap-6 mb-10">
            <div className="p-4 rounded-[20px] bg-white/5 text-[#F27D26]">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <p className="text-lg font-bold text-white tracking-tight uppercase theme-text-primary">Open-Meteo Intel</p>
              <p className="text-sm text-zinc-500 mt-2 leading-relaxed font-light theme-text-secondary">
                Professional weather data for developers and scientists, powered by NASA and ECMWF models.
              </p>
              <div className="flex gap-4 mt-6">
                <span className="px-3 py-1 rounded-sm bg-white/5 border border-white/10 text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em] theme-text-secondary">NASA EOSDIS</span>
                <span className="px-3 py-1 rounded-sm bg-white/5 border border-white/10 text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em] theme-text-secondary">ECMWF ERA5</span>
              </div>
            </div>
          </div>
          <button 
            onClick={handleSyncPipeline}
            disabled={isSyncing}
            className="w-full py-5 rounded-full border border-white/10 text-white text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white hover:text-black transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 theme-action-btn"
          >
            {isSyncing ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#F27D26]" />
            ) : (
              <History className="w-4 h-4" />
            )}
            {isSyncing ? "Refreshing Atmosphere..." : "Sync Data Pipeline"}
          </button>
        </GlassCard>
      </section>

      {/* Info Section */}
      <section>
        <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em] mb-4 px-2">Information</h3>
        <GlassCard className="divide-y divide-white/5 p-0 overflow-hidden">
          {/* About Atmos Modal Trigger */}
          <div 
            onClick={() => setActiveModal('about')}
            className="flex items-center justify-between p-5 cursor-pointer hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-4">
              <Info className="w-5 h-5 text-zinc-400" />
              <p className="text-sm font-bold text-white theme-text-primary">About Atmos</p>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-600 animate-pulse" />
          </div>
          
          {/* Privacy Policy Modal Trigger */}
          <div 
            onClick={() => setActiveModal('privacy')}
            className="flex items-center justify-between p-5 cursor-pointer hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-4">
              <ShieldCheck className="w-5 h-5 text-zinc-400" />
              <p className="text-sm font-bold text-white theme-text-primary">Privacy Policy</p>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-600 animate-pulse" />
          </div>

          {/* Contact Developer Modal Trigger */}
          <div 
            onClick={() => setActiveModal('contact')}
            className="flex items-center justify-between p-5 cursor-pointer hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-4">
              <Mail className="w-5 h-5 text-zinc-400" />
              <p className="text-sm font-bold text-white theme-text-primary">Contact Developer</p>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-600 animate-pulse" />
          </div>

          <div className="flex items-center justify-between p-5">
            <div className="flex items-center gap-4">
              <Terminal className="w-5 h-5 text-zinc-400" />
              <p className="text-sm font-bold text-white theme-text-primary">Version</p>
            </div>
            <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest theme-text-secondary">v2.5.0-stable</span>
          </div>
        </GlassCard>
      </section>

      {/* CTA / Support */}
      <div className="flex flex-col items-center gap-8 py-16">
        <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse" />
        <p className="text-xs font-bold text-zinc-600 text-center tracking-widest px-12 leading-relaxed uppercase theme-text-secondary">
          Designed for clarity. Engineered for precision. <br/>Crafted by saboor.eth
        </p>
        <button 
          onClick={() => setActiveModal('review')}
          className="px-10 py-4 bg-white text-[#131313] rounded-full text-xs font-black uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/5 cursor-pointer theme-cta-btn"
        >
          Leave a Review
        </button>
      </div>

      {/* OVERLAY GLASSMORPHIC MODAL DIALOGS */}
      <AnimatePresence>
        {activeModal && (
          <>
            {/* Modal Backdrop Blurring */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveModal(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] cursor-pointer"
            />

            {/* Content Card Overlay */}
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 40 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 40 }}
                className="w-full max-w-lg max-h-[85vh] bg-[#060606]/95 border border-white/10 rounded-[32px] p-8 shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-y-auto hide-scrollbar backdrop-blur-3xl theme-modal pointer-events-auto"
              >
              {/* Modal Header */}
              <div className="flex justify-between items-center pb-4 border-b border-white/5 mb-6">
                <div className="flex items-center gap-2">
                  {activeModal === 'about' && <Info className="w-5 h-5 text-[#F27D26]" />}
                  {activeModal === 'privacy' && <ShieldCheck className="w-5 h-5 text-emerald-400" />}
                  {activeModal === 'contact' && <Mail className="w-5 h-5 text-amber-400" />}
                  {activeModal === 'review' && <MessageSquare className="w-5 h-5 text-purple-400" />}
                  <h4 className="text-sm font-black uppercase tracking-[0.2em] text-white theme-text-primary">
                    {activeModal === 'about' && "About Atmos"}
                    {activeModal === 'privacy' && "Privacy Architecture"}
                    {activeModal === 'contact' && "Contact Developer"}
                    {activeModal === 'review' && "Review & Suggestions"}
                  </h4>
                </div>
                <button 
                  onClick={() => setActiveModal(null)}
                  className="p-2 border border-white/10 rounded-full hover:bg-white hover:text-black transition-all cursor-pointer theme-text-primary"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 1. About Atmos Modal Content */}
              {activeModal === 'about' && (
                <div className="space-y-6 text-zinc-300 leading-relaxed font-light text-xs theme-text-secondary">
                  <p>
                    <strong className="text-white font-bold theme-text-primary">ATMOS</strong> is a premium, real-time meteorological intelligence platform designed and built by solo developer <strong className="text-[#F27D26] font-black uppercase">Abdul Saboor Babar</strong>.
                  </p>
                  <div className="p-4 rounded-2xl border border-white/5 bg-white/5 space-y-3">
                    <span className="text-[8px] font-black uppercase tracking-wider text-zinc-500 block">The Rationale</span>
                    <p className="italic">
                      "I built Atmos because existing weather websites are bloated with inaccurate forecasting models, heavy tracking advertisements, expensive paywalled premium tiers, and exhausting consent overlays. Everyday, reliable forecasts shouldn't require trading your privacy or buying a subscription."
                    </p>
                  </div>
                  <p>
                    ATMOS addresses these frustrations directly by functioning as a 100% free, open-source atmospheric command center. By utilizing modern engineering architectures, it streams scientific datasets directly from <strong className="text-white font-bold theme-text-primary">NASA EOSDIS</strong> and the <strong className="text-white font-bold theme-text-primary">ECMWF ERA5</strong> atmospheric simulation engines via Open-Meteo.
                  </p>
                  <p>
                    The result is a clean, lightning-fast dashboard that provides precise, real-time climatology, extreme-weather biometric safety precautions, and decadal analytics without selling cookies or collecting personal details. 
                  </p>
                  <div className="pt-4 border-t border-white/5 flex items-center justify-between text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                    <span>Solo Engineering Initiative</span>
                    <span>© 2026 ATMOS Inc.</span>
                  </div>
                </div>
              )}

              {/* 2. Privacy Policy Modal Content */}
              {activeModal === 'privacy' && (
                <div className="space-y-6 text-zinc-300 leading-relaxed font-light text-xs theme-text-secondary">
                  <p>
                    Privacy is not a feature at Atmos—it is our core architectural foundation. Because this platform is built out of frustration with corporate tracking scripts, we maintain a strict **zero-data-collection** footprint.
                  </p>
                  <div className="space-y-4">
                    <div className="flex gap-3 items-start">
                      <div className="p-1 text-emerald-400 bg-emerald-400/10 rounded-md font-bold text-xs mt-0.5">✓</div>
                      <div>
                        <h5 className="font-bold text-white text-xs theme-text-primary">Zero Cookies & Trackers</h5>
                        <p className="text-[11px] text-zinc-400 mt-0.5 theme-text-secondary">We do not set analytical, marketing, or advertising cookies. Our system loads zero third-party trackers.</p>
                      </div>
                    </div>
                    <div className="flex gap-3 items-start">
                      <div className="p-1 text-emerald-400 bg-emerald-400/10 rounded-md font-bold text-xs mt-0.5">✓</div>
                      <div>
                        <h5 className="font-bold text-white text-xs theme-text-primary">Local Browser Storage</h5>
                        <p className="text-[11px] text-zinc-400 mt-0.5 theme-text-secondary">All configuration parameters (measurement units, search history, saved locations, submitted feedback) are saved locally inside your browser's <code>localStorage</code>.</p>
                      </div>
                    </div>
                    <div className="flex gap-3 items-start">
                      <div className="p-1 text-emerald-400 bg-emerald-400/10 rounded-md font-bold text-xs mt-0.5">✓</div>
                      <div>
                        <h5 className="font-bold text-white text-xs theme-text-primary">Anonymous External Queries</h5>
                        <p className="text-[11px] text-zinc-400 mt-0.5 theme-text-secondary">API requests dispatched to NASA POWER and Open-Meteo contain solely the latitude, longitude, and elevation parameters. No demographic or identifying markers are ever transmitted.</p>
                      </div>
                    </div>
                  </div>
                  <p className="pt-4 border-t border-white/5 text-[9px] font-bold text-zinc-500 uppercase tracking-widest text-center">
                    Pure telemetry. Pure security.
                  </p>
                </div>
              )}

              {/* 3. Contact Developer Modal Content */}
              {activeModal === 'contact' && (
                <div className="space-y-6 text-zinc-300 leading-relaxed font-light text-xs theme-text-secondary">
                  <p>
                    Have questions, suggestions, or need customized meteorological deployments? You can connect directly with the developer:
                  </p>
                  
                  <div className="p-5 rounded-2xl border border-white/5 bg-white/5 space-y-4 theme-contact-box">
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] font-black uppercase tracking-wider text-zinc-500">Developer Email</span>
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Active Channel</span>
                    </div>
                    
                    <div className="flex items-center justify-between p-3.5 bg-black/40 rounded-xl border border-white/5 theme-email-bar">
                      <span className="font-semibold text-white tracking-wide text-xs select-all theme-text-primary">abdulsaboorbabar@gmail.com</span>
                      <a 
                        href="mailto:abdulsaboorbabar@gmail.com"
                        className="px-3.5 py-2 bg-white text-black hover:scale-105 active:scale-95 transition-all rounded-md text-[9px] font-black uppercase tracking-widest theme-action-btn"
                      >
                        Send Mail
                      </a>
                    </div>
                  </div>

                  <p>
                    For corporate data licensing, customized bento API structures, or bug telemetry submissions, please write with clear diagnostic logs. Responses are usually dispatched within 24-48 hours.
                  </p>

                  <div className="pt-4 border-t border-white/5 text-[9px] font-bold text-zinc-500 uppercase tracking-widest text-center">
                    Thank you for choosing Atmos.
                  </div>
                </div>
              )}

              {/* 4. Review & Feedback Modal Content */}
              {activeModal === 'review' && (
                <div className="space-y-6">
                  {isSubmitSuccess ? (
                    <motion.div 
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-center py-10 space-y-4"
                    >
                      <div className="p-4 rounded-full bg-emerald-400/10 text-emerald-400 inline-flex">
                        <Sparkles className="w-8 h-8 animate-pulse" />
                      </div>
                      <h5 className="text-base font-black uppercase text-white tracking-widest theme-text-primary">Review Registered!</h5>
                      <p className="text-[11px] text-zinc-500 max-w-xs mx-auto leading-relaxed theme-text-secondary">
                        Thank you! Your feedback has been stored securely in local telemetry to assist future Atmos system calibration.
                      </p>
                    </motion.div>
                  ) : (
                    <form onSubmit={handleSubmitReview} className="space-y-5">
                      <div className="space-y-2">
                        <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">Your Name (Optional)</label>
                        <div className="relative">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                          <input 
                            type="text" 
                            placeholder="e.g. Abdul Saboor"
                            value={reviewName}
                            onChange={(e) => setReviewName(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-xs text-white outline-none focus:border-white/20 transition-all font-light"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">System Calibration Rating</label>
                        <div className="flex gap-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              type="button"
                              key={star}
                              onClick={() => setReviewRating(star)}
                              className="p-1 cursor-pointer hover:scale-110 active:scale-95 transition-all outline-none"
                            >
                              <Star 
                                className={cn(
                                  "w-6 h-6",
                                  star <= reviewRating ? "text-[#F27D26] fill-[#F27D26]" : "text-zinc-700"
                                )}
                              />
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">Suggestions & Reviews</label>
                        <textarea
                          placeholder="Provide details of your experience, features you would like added, or telemetry optimizations..."
                          required
                          rows={4}
                          value={reviewComment}
                          onChange={(e) => setReviewComment(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-xs text-white outline-none focus:border-white/20 transition-all font-light resize-none theme-textarea"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-4 bg-white text-black font-black uppercase text-[10px] tracking-[0.2em] rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer theme-cta-btn"
                      >
                        Submit Feedback
                      </button>
                    </form>
                  )}

                  {/* Locally Persisted Reviews Log */}
                  {reviewsList.length > 0 && (
                    <div className="pt-6 border-t border-white/5 space-y-4">
                      <span className="text-[9px] font-black uppercase tracking-[0.25em] text-[#F27D26] block">Persisted Reviews Log</span>
                      <div className="space-y-3 max-h-48 overflow-y-auto pr-1 hide-scrollbar">
                        {reviewsList.map((rev, i) => (
                          <div key={i} className="p-3 bg-white/5 border border-white/5 rounded-xl space-y-1 theme-email-bar">
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="font-bold text-white theme-text-primary">{rev.name}</span>
                              <span className="text-zinc-500 font-medium theme-text-secondary">{rev.date}</span>
                            </div>
                            <div className="flex gap-0.5">
                              {Array.from({ length: 5 }).map((_, sIdx) => (
                                <Star 
                                  key={sIdx} 
                                  className={cn("w-2.5 h-2.5", sIdx < rev.rating ? "text-[#F27D26] fill-[#F27D26]" : "text-zinc-700")} 
                                />
                              ))}
                            </div>
                            <p className="text-[10px] text-zinc-400 font-light mt-1 theme-text-secondary">{rev.comment}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
