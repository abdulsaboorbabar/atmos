import { Search, Home, Bookmark, Hourglass, Info, Menu } from 'lucide-react';
import { useWeatherStore } from '../store/useWeatherStore';
import { ViewType } from './BottomNav';
import { cn } from '../lib/utils';

interface TopBarProps {
  onSearchClick: () => void;
  activeView?: ViewType;
  onViewChange?: (view: ViewType) => void;
  onMenuClick?: () => void;
}

export function TopBar({ onSearchClick, activeView, onViewChange, onMenuClick }: TopBarProps) {
  const isStandalone = useWeatherStore((state) => state.isStandalone);
  const theme = useWeatherStore((state) => state.theme);

  const websiteTabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'saved', label: 'Saved', icon: Bookmark },
    { id: 'time-machine', label: 'Decades', icon: Hourglass },
    { id: 'about', label: 'About Us', icon: Info },
  ] as const;

  return (
    <header className={cn(
      "fixed top-0 w-full z-50 px-6 md:px-10 h-20 flex justify-between items-center border-b transition-colors duration-300",
      theme === 'light' ? "bg-white/80 border-black/5" : "bg-[#050505]/80 border-white/5"
    )}>
      <div className="flex items-center gap-8">
        <span className={cn(
          "text-2xl font-black tracking-[0.25em] uppercase italic cursor-pointer transition-colors",
          theme === 'light' ? "text-[#1a1a1c]" : "text-white"
        )} onClick={() => onViewChange?.('home')}>ATMOS</span>
        
        {/* Full Desktop Navigation links - visible only in Website Mode */}
        {!isStandalone && onViewChange && (
          <nav className="hidden md:flex items-center gap-6 ml-4">
            {websiteTabs.map((tab) => {
              const isActive = activeView === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => onViewChange(tab.id as ViewType)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300",
                    isActive 
                      ? (theme === 'light' ? 'text-[#1a1a1c] bg-black/5' : 'text-white bg-white/5')
                      : (theme === 'light' ? 'text-zinc-600 hover:text-[#1a1a1c] hover:bg-black/5' : 'text-zinc-300 hover:text-white hover:bg-white/5')
                  )}
                >
                  <Icon className="w-4 h-4" style={theme === 'light' ? { fill: 'none' } : {}} />
                  <span className="text-[10px] font-black uppercase tracking-wider">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        )}
      </div>

      <div className="flex items-center gap-2 md:gap-6">
        <button 
          onClick={onSearchClick}
          className={cn(
            "p-3 rounded-full transition-colors cursor-pointer",
            theme === 'light' ? "text-zinc-500 hover:text-[#1a1a1c] hover:bg-black/5" : "text-zinc-400 hover:text-white hover:bg-white/5"
          )}
        >
          <Search className="w-5 h-5" />
        </button>

        {/* Mobile Hamburger Menu - Visible only in Website Mode on Mobile */}
        {!isStandalone && (
          <button 
            onClick={onMenuClick}
            className={cn(
              "md:hidden p-3 rounded-full transition-colors cursor-pointer",
              theme === 'light' ? "text-zinc-500 hover:text-[#1a1a1c] hover:bg-black/5" : "text-zinc-400 hover:text-white hover:bg-white/5"
            )}
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
      </div>
    </header>
  );
}
