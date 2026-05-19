import { useState, useEffect } from 'react';
import { TopBar } from './components/TopBar';
import { BottomNav, type ViewType } from './components/BottomNav';
import { HomeView } from './views/HomeView';
import { SearchView } from './views/SearchView';
import { SavedView } from './views/SavedView';
import { SettingsView } from './views/SettingsView';
import { TimeMachineView } from './views/TimeMachineView';
import { AboutView } from './views/AboutView';
import { motion, AnimatePresence } from 'motion/react';
import { useWeatherStore } from './store/useWeatherStore';
import { reverseGeocode } from './services/locationService';
import { X, Cpu, Radio, MapPin, Database, Sparkles, Home, Bookmark, Hourglass, Info } from 'lucide-react';
import { cn } from './lib/utils';

export default function App() {
  const [activeView, setActiveView] = useState<ViewType>('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const selectLocation = useWeatherStore((state) => state.selectLocation);
  const selectedLocation = useWeatherStore((state) => state.selectedLocation);
  const setCurrentLocation = useWeatherStore((state) => state.setCurrentLocation);
  const setNetworkStatus = useWeatherStore((state) => state.setNetworkStatus);
  const isOffline = useWeatherStore((state) => state.isOffline);
  const theme = useWeatherStore((state) => state.theme);
  const isStandalone = useWeatherStore((state) => state.isStandalone);

  // 1. Connection Event Listeners & PWA Install Prompter
  useEffect(() => {
    const handleOnline = () => setNetworkStatus(false);
    const handleOffline = () => setNetworkStatus(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      (window as any).deferredPrompt = e;
      window.dispatchEvent(new CustomEvent('atmos_pwa_installable'));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const handleAppInstalled = () => {
      (window as any).deferredPrompt = null;
      window.dispatchEvent(new CustomEvent('atmos_pwa_installed'));
      console.log('ATMOS Native Shell Active');
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [setNetworkStatus]);

  // 2. Geolocation Auto Detection on Mount
  useEffect(() => {
    if ('geolocation' in navigator) {
      const retrievePosition = (highAccuracy: boolean) => {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            
            try {
              const resolvedName = await reverseGeocode(latitude, longitude);
              const detectedLoc = {
                lat: latitude,
                lon: longitude,
                name: resolvedName
              };
              
              setCurrentLocation(detectedLoc);
              
              const hasChosenBefore = localStorage.getItem('atmos_selected_location');
              if (!hasChosenBefore) {
                selectLocation(detectedLoc);
              }
            } catch (e) {
              console.error('Failed to resolve geolocated coordinates name:', e);
            }
          },
          (error) => {
            console.warn(`On-mount geolocation failed (highAccuracy=${highAccuracy}):`, error.message);
            if (highAccuracy) {
              // Retry with standard accuracy (highly reliable fallback for desktop/simulated nodes)
              retrievePosition(false);
            }
          },
          { enableHighAccuracy: highAccuracy, timeout: highAccuracy ? 8000 : 12000 }
        );
      };

      retrievePosition(true);
    }
  }, [setCurrentLocation, selectLocation]);

  const handleQuickSelect = (name: string, lat: number, lon: number) => {
    selectLocation({ name, lat, lon });
    setSidebarOpen(false);
    setActiveView('home');
  };

  return (
    <div className={cn(
      "min-h-screen text-white font-sans transition-all duration-500",
      theme === 'cyber' && "bg-[#0a0118] selection:bg-purple-500/30 selection:text-white theme-cyber",
      theme === 'light' && "bg-[#ffffff] selection:bg-blue-500/30 selection:text-[#1a1a1c] theme-light",
      theme === 'dark' && "bg-[#050505] selection:bg-[#F27D26]/30 selection:text-white"
    )}>
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="line-overlay" />
        <div 
          className="absolute top-[-100px] right-[-100px] w-[600px] h-[600px] opacity-15 transition-all duration-500" 
          style={{ 
            background: `radial-gradient(circle, ${theme === 'cyber' ? '#a855f7' : theme === 'light' ? '#0ea5e9' : '#F27D26'} 0%, transparent 70%)` 
          }}
        />
      </div>
      
      <TopBar 
        onSearchClick={() => {
          setSidebarOpen(false);
          setActiveView('search');
        }} 
        activeView={activeView}
        onViewChange={setActiveView}
        onMenuClick={() => setSidebarOpen(true)}
      />
      
      {/* Network Alert Notification */}
      {isOffline && (
        <div className="fixed top-20 left-0 right-0 z-40 bg-red-950/80 border-b border-red-500/20 backdrop-blur-xl text-center py-2.5 text-xs font-bold uppercase tracking-widest text-red-400">
          ⚠️ Running in Offline Mode. Displaying cached weather records.
        </div>
      )}
      
      <main className="relative pb-20 z-10 pt-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {activeView === 'home' && <HomeView />}
            {activeView === 'search' && <SearchView onSelect={() => setActiveView('home')} />}
            {activeView === 'saved' && <SavedView />}
            {activeView === 'time-machine' && <TimeMachineView />}
            {activeView === 'settings' && <SettingsView />}
            {activeView === 'about' && <AboutView />}
          </motion.div>
        </AnimatePresence>
      </main>

      <BottomNav activeView={activeView} onViewChange={setActiveView} />

      {/* Slide-out Sidebar Drawer Menu */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />

            {/* Sidebar panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 20 }}
              className="fixed top-0 right-0 h-full w-80 bg-[#0a0a0a]/90 backdrop-blur-3xl border-l border-white/5 z-50 p-8 shadow-2xl flex flex-col justify-between overflow-y-auto"
            >
              {/* Header */}
              <div className="space-y-8">
                <div className="flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="meta-label">System Control</span>
                    <span className="text-sm font-light tracking-widest uppercase">Atmospheric Telemetry</span>
                  </div>
                  <button 
                    onClick={() => setSidebarOpen(false)}
                    className="p-2 border border-white/10 rounded-full hover:bg-white hover:text-black transition-all cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Mobile Navigation Links (Website Mode Only) */}
                {!isStandalone && (
                  <div className="bg-white/5 rounded-[20px] p-5 border border-white/5 space-y-4">
                    <span className="text-[9px] font-black uppercase tracking-wider text-zinc-500">Navigation</span>
                    <div className="flex flex-col gap-2">
                      {[
                        { id: 'home', label: 'Home', icon: Home },
                        { id: 'saved', label: 'Saved', icon: Bookmark },
                        { id: 'time-machine', label: 'Decades', icon: Hourglass },
                        { id: 'about', label: 'About Us', icon: Info },
                      ].map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => {
                            setActiveView(tab.id as ViewType);
                            setSidebarOpen(false);
                          }}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-xl transition-all duration-300",
                            activeView === tab.id 
                              ? "bg-white/10 text-white"
                              : "text-zinc-300 hover:bg-white/5 hover:text-white"
                          )}
                        >
                          <tab.icon className="w-5 h-5" />
                          <span className={cn(
                            "text-xs font-bold tracking-wide uppercase",
                            activeView === tab.id ? "text-zinc-100" : "text-zinc-400"
                          )}>{tab.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {isStandalone && (
                  <>
                    {/* Station Location Info */}
                    <div className="bg-white/5 rounded-[20px] p-5 border border-white/5">
                      <div className="flex items-center gap-3 text-zinc-500 mb-2">
                        <MapPin className="w-4 h-4 text-[#F27D26]" />
                        <span className="text-[9px] font-black uppercase tracking-wider">Active Station</span>
                      </div>
                      <div className="text-white font-bold text-sm tracking-wide truncate">
                        {selectedLocation.name}
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-1 uppercase font-semibold">
                        GPS: {selectedLocation.lat.toFixed(4)}, {selectedLocation.lon.toFixed(4)}
                      </div>
                    </div>

                    {/* Sensor Diagnostics Status */}
                    <div className="space-y-4">
                      <span className="text-[9px] font-black uppercase tracking-wider text-zinc-500">System Link Checks</span>
                      
                      {/* Diagnostic 1: Solar */}
                      <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                        <div className="flex items-center gap-3">
                          <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                          <span className="text-[10px] font-black uppercase tracking-wide text-zinc-300">NASA POWER API</span>
                        </div>
                        <span className="text-[9px] font-bold uppercase text-emerald-400 bg-emerald-950/30 px-2.5 py-0.5 rounded-full border border-emerald-500/10">Active</span>
                      </div>

                      {/* Diagnostic 2: Open-Meteo */}
                      <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                        <div className="flex items-center gap-3">
                          <Cpu className="w-4 h-4 text-emerald-400 animate-pulse" />
                          <span className="text-[10px] font-black uppercase tracking-wide text-zinc-300">Open-Meteo Core</span>
                        </div>
                        <span className="text-[9px] font-bold uppercase text-emerald-400 bg-emerald-950/30 px-2.5 py-0.5 rounded-full border border-emerald-500/10">Linked</span>
                      </div>

                      {/* Diagnostic 3: Cache Storage */}
                      <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                        <div className="flex items-center gap-3">
                          <Database className="w-4 h-4 text-[#F27D26]" />
                          <span className="text-[10px] font-black uppercase tracking-wide text-zinc-300">Indexed Storage</span>
                        </div>
                        <span className="text-[9px] font-bold uppercase text-[#F27D26] bg-[#F27D26]/10 px-2.5 py-0.5 rounded-full border border-[#F27D26]/20">Cached</span>
                      </div>
                    </div>

                    {/* Quick Station Select shortcuts */}
                    <div className="space-y-3">
                      <span className="text-[9px] font-black uppercase tracking-wider text-zinc-500">Quick Station Presets</span>
                      <div className="grid grid-cols-2 gap-2">
                        <button 
                          onClick={() => handleQuickSelect('Tokyo, Japan', 35.6762, 139.6503)}
                          className="p-3 text-left bg-white/5 border border-white/5 hover:border-white/20 rounded-xl transition-all hover:scale-[1.02] cursor-pointer"
                        >
                          <div className="text-[10px] font-bold text-white">Tokyo</div>
                          <div className="text-[8px] text-zinc-500 uppercase mt-0.5">Asia Zone</div>
                        </button>
                        <button 
                          onClick={() => handleQuickSelect('New York, USA', 40.7128, -74.0060)}
                          className="p-3 text-left bg-white/5 border border-white/5 hover:border-white/20 rounded-xl transition-all hover:scale-[1.02] cursor-pointer"
                        >
                          <div className="text-[10px] font-bold text-white">New York</div>
                          <div className="text-[8px] text-zinc-500 uppercase mt-0.5">East Coast</div>
                        </button>
                        <button 
                          onClick={() => handleQuickSelect('London, UK', 51.5074, -0.1278)}
                          className="p-3 text-left bg-white/5 border border-white/5 hover:border-white/20 rounded-xl transition-all hover:scale-[1.02] cursor-pointer"
                        >
                          <div className="text-[10px] font-bold text-white">London</div>
                          <div className="text-[8px] text-zinc-500 uppercase mt-0.5">West Europe</div>
                        </button>
                        <button 
                          onClick={() => handleQuickSelect('Sydney, Australia', -33.8688, 151.2093)}
                          className="p-3 text-left bg-white/5 border border-white/5 hover:border-white/20 rounded-xl transition-all hover:scale-[1.02] cursor-pointer"
                        >
                          <div className="text-[10px] font-bold text-white">Sydney</div>
                          <div className="text-[8px] text-zinc-500 uppercase mt-0.5">Oceania</div>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Sidebar Footer */}
              {isStandalone && (
                <div className="pt-6 border-t border-white/5 text-center mt-8">
                  <div className="flex items-center justify-center gap-2 text-[#F27D26] mb-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] italic">Atmos Pro Core</span>
                  </div>
                  <p className="text-[8px] text-zinc-600 uppercase tracking-widest font-semibold">
                    Weather Intelligence v2.0
                  </p>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
