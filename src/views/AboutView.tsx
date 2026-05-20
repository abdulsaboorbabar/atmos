import { GlassCard } from '../components/GlassCard';
import { useWeatherStore } from '../store/useWeatherStore';
import { User, ShieldCheck, Database, Info, Mail } from 'lucide-react';
import { cn } from '../lib/utils';

export function AboutView() {
  const theme = useWeatherStore((state) => state.theme);

  return (
    <div className="pt-8 pb-32 px-4 md:px-10 max-w-4xl mx-auto space-y-12">
      {/* Hero Header */}
      <div className="animate-fade-in text-center py-10">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-[32px] glass-card mb-8 shadow-2xl">
          <Info className={cn("w-10 h-10", theme === 'light' ? "text-[#1a1a1c]" : "text-white")} />
        </div>
        <h2 className={cn("text-4xl md:text-5xl font-black tracking-tight mb-4", theme === 'light' ? "text-[#1a1a1c]" : "text-white")}>
          The ATMOS Project
        </h2>
        <p className="text-zinc-500 font-medium text-lg max-w-2xl mx-auto leading-relaxed">
          A pure, uncompromised meteorological intelligence platform designed to replace the cluttered, ad-heavy weather applications of today.
        </p>
      </div>

      {/* Grid Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Developer Story */}
        <section className="animate-fade-in">
          <GlassCard className="h-full border-white/5 p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-4 mb-6">
                <div className={cn("p-3 rounded-2xl", theme === 'light' ? "bg-blue-500/10 text-blue-600" : "bg-blue-500/20 text-blue-400")}>
                  <User className="w-6 h-6" />
                </div>
                <h3 className={cn("text-xl font-bold tracking-tight", theme === 'light' ? "text-[#1a1a1c]" : "text-white")}>
                  The Solo Developer
                </h3>
              </div>
              <p className={cn("leading-relaxed font-light mb-6", theme === 'light' ? "text-zinc-700" : "text-zinc-400")}>
                ATMOS was engineered from the ground up by solo developer <strong>Abdul Saboor Babar</strong>. Frustrated by inaccurate web results, aggressive advertising, hidden subscriptions, and invasive cookie tracking on mainstream weather platforms, Abdul set out to build a clean sanctuary for meteorological data.
              </p>
            </div>
            <div className="flex items-center gap-2 text-zinc-500">
              <Mail className="w-4 h-4" />
              <span className="text-xs font-medium tracking-wide">abdulsaboorbabar@gmail.com</span>
            </div>
          </GlassCard>
        </section>

        {/* The Data Source */}
        <section className="animate-fade-in">
          <GlassCard className="h-full border-white/5 p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-4 mb-6">
                <div className={cn("p-3 rounded-2xl", theme === 'light' ? "bg-[#F27D26]/10 text-[#F27D26]" : "bg-[#F27D26]/20 text-[#F27D26]")}>
                  <Database className="w-6 h-6" />
                </div>
                <h3 className={cn("text-xl font-bold tracking-tight", theme === 'light' ? "text-[#1a1a1c]" : "text-white")}>
                  NASA Grade Intelligence
                </h3>
              </div>
              <p className={cn("leading-relaxed font-light mb-6", theme === 'light' ? "text-zinc-700" : "text-zinc-400")}>
                To guarantee absolute precision, ATMOS bypasses commercial weather providers. Instead, it pulls raw telemetry directly from <strong>NASA EOSDIS</strong> (Earth Observing System Data) and the European Centre for Medium-Range Weather Forecasts (<strong>ECMWF ERA5</strong>).
              </p>
            </div>
            <div className="flex gap-3">
              <span className="px-3 py-1 rounded-sm bg-black/5 border border-black/10 dark:bg-white/5 dark:border-white/10 text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em]">NASA EOSDIS</span>
              <span className="px-3 py-1 rounded-sm bg-black/5 border border-black/10 dark:bg-white/5 dark:border-white/10 text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em]">ECMWF ERA5</span>
            </div>
          </GlassCard>
        </section>

        {/* Privacy First */}
        <section className="animate-fade-in md:col-span-2">
          <GlassCard className="border-white/5 p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className={cn("p-3 rounded-2xl", theme === 'light' ? "bg-emerald-500/10 text-emerald-600" : "bg-emerald-500/20 text-emerald-400")}>
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className={cn("text-xl font-bold tracking-tight", theme === 'light' ? "text-[#1a1a1c]" : "text-white")}>
                Absolute Privacy Guarantee
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <h4 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-2">Zero Ads</h4>
                <p className={cn("text-sm font-light leading-relaxed", theme === 'light' ? "text-zinc-700" : "text-zinc-400")}>
                  ATMOS is and will always remain a completely free platform. There are no banner ads, no video popups, and no paywalled features.
                </p>
              </div>
              <div>
                <h4 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-2">Zero Tracking</h4>
                <p className={cn("text-sm font-light leading-relaxed", theme === 'light' ? "text-zinc-700" : "text-zinc-400")}>
                  We do not use analytics trackers, cross-site cookies, or fingerprinting. Your location data is processed locally on your device and never sold.
                </p>
              </div>
              <div>
                <h4 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-2">Standalone PWA</h4>
                <p className={cn("text-sm font-light leading-relaxed", theme === 'light' ? "text-zinc-700" : "text-zinc-400")}>
                  You can install ATMOS directly to your device as a Native Progressive Web App for offline functionality, unlocked settings, and a true premium app experience.
                </p>
              </div>
            </div>
          </GlassCard>
        </section>

      </div>
    </div>
  );
}
