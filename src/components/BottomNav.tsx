import { Home, Search, Bookmark, Settings, Hourglass } from 'lucide-react';
import { cn } from '../lib/utils';
import { useWeatherStore } from '../store/useWeatherStore';

export type ViewType = 'home' | 'search' | 'saved' | 'settings' | 'time-machine' | 'about';

interface BottomNavProps {
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
}

export function BottomNav({ activeView, onViewChange }: BottomNavProps) {
  const theme = useWeatherStore((state) => state.theme);
  const isStandalone = useWeatherStore((state) => state.isStandalone);
  
  const tabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'saved', label: 'Saved', icon: Bookmark },
    { id: 'time-machine', label: 'Decades', icon: Hourglass },
    { id: 'settings', label: 'Settings', icon: Settings },
  ] as const;

  // In Website Mode (!isStandalone), we completely hide the bottom bar
  // to force standard desktop website navigation paradigms via TopBar.
  if (!isStandalone) return null;

  return (
    <nav className={cn(
      "fixed bottom-0 left-0 right-0 w-full z-50 backdrop-blur-2xl border-t h-20 pb-safe px-4 flex justify-around items-center transition-colors duration-300",
      theme === 'light' ? "bg-white/90 border-black/5" : "bg-[#050505]/90 border-white/5"
    )}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeView === tab.id;
        
        // Dynamic colors based on theme
        let btnClass = "";
        let iconClass = "w-5 h-5 transition-all duration-300 ";
        
        if (isActive) {
          if (theme === 'light') {
            btnClass = "text-[#1a1a1c] bg-black/5 theme-nav-active";
          } else {
            btnClass = "text-white bg-white/5 theme-nav-active";
          }
        } else {
          if (theme === 'light') {
            btnClass = "text-zinc-600 hover:text-[#1a1a1c] hover:bg-black/5";
          } else {
            btnClass = "text-zinc-300 hover:text-white hover:bg-white/5";
          }
        }
        
        return (
          <button
            key={tab.id}
            onClick={() => onViewChange(tab.id)}
            className={cn(
              'flex flex-col items-center gap-1 transition-all duration-300 relative px-4 py-2 rounded-full',
              btnClass
            )}
          >
            <Icon className={iconClass} style={theme === 'light' ? { fill: 'none' } : {}} />
            <span className="text-[9px] font-black uppercase tracking-[0.1em]">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
