import { useState, useEffect } from 'react';
import { Search as SearchIcon, X, MapPin, ChevronRight, History, Compass, Loader2, AlertCircle } from 'lucide-react';
import { GlassCard } from '../components/GlassCard';
import { useWeatherStore } from '../store/useWeatherStore';
import { searchLocations, reverseGeocode } from '../services/locationService';
import { useDebounce } from '../hooks/useDebounce';
import { LocationCoordinates } from '../types';

interface SearchViewProps {
  onSelect: () => void;
}

const SUGGESTED_COORDINATES = [
  { city: 'Karachi', country: 'Pakistan', lat: 24.8607, lon: 67.0011, temp: 32, condition: 'Sunny', time: 'PKST' },
  { city: 'Lahore', country: 'Pakistan', lat: 31.5204, lon: 74.3587, temp: 30, condition: 'Clear', time: 'PKST' },
  { city: 'Islamabad', country: 'Pakistan', lat: 33.6844, lon: 73.0479, temp: 28, condition: 'Clear', time: 'PKST' }
];

export function SearchView({ onSelect }: SearchViewProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LocationCoordinates[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  
  const debouncedQuery = useDebounce(query, 400);

  const selectLocation = useWeatherStore((state) => state.selectLocation);
  const addRecentSearch = useWeatherStore((state) => state.addRecentSearch);
  const clearRecentSearches = useWeatherStore((state) => state.clearRecentSearches);
  const recentSearches = useWeatherStore((state) => state.recentSearches);
  const setCurrentLocation = useWeatherStore((state) => state.setCurrentLocation);

  // 1. Nominatim Forward Geocoding on Debounced Query Change
  useEffect(() => {
    async function triggerSearch() {
      if (debouncedQuery.trim().length < 2) {
        setResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const locations = await searchLocations(debouncedQuery);
        setResults(locations);
      } catch (e) {
        console.error('Failed to search geocodes:', e);
      } finally {
        setIsSearching(false);
      }
    }

    triggerSearch();
  }, [debouncedQuery]);

  // 2. Select Location Handler
  const handleSelect = (loc: LocationCoordinates) => {
    // Save to Zustand and add search tag
    selectLocation(loc);
    
    // Add only the primary city name to history tag
    const cityName = loc.name.split(',')[0];
    addRecentSearch(cityName);
    
    // Clear search UI
    setQuery('');
    setResults([]);
    
    // Switch to HomeView
    onSelect();
  };

  // 3. Browser Location Auto-Detection
  const handleDetectLocation = () => {
    if (!('geolocation' in navigator)) {
      setGeoError("Geolocation is not supported by your browser.");
      return;
    }

    setIsDetecting(true);
    setGeoError(null);

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
            handleSelect(detectedLoc);
          } catch (e) {
            console.error(e);
            setGeoError("Atmospheric Database lookup failed for coordinates.");
          } finally {
            setIsDetecting(false);
          }
        },
        (error) => {
          console.warn(`Geolocation failed (highAccuracy=${highAccuracy}):`, error);
          if (highAccuracy) {
            // Fallback immediately to standard precision (ideal for desktops/VMs)
            retrievePosition(false);
          } else {
            let errorMsg = "Unable to retrieve location. Please check system permissions.";
            if (error.code === error.PERMISSION_DENIED) {
              errorMsg = "Location access denied. Please enable location permissions in browser settings.";
            } else if (error.code === error.POSITION_UNAVAILABLE) {
              errorMsg = "Browser geolocation service is unavailable.";
            } else if (error.code === error.TIMEOUT) {
              errorMsg = "Location request timed out. Retrying may succeed.";
            }
            setGeoError(errorMsg);
            setIsDetecting(false);
          }
        },
        { enableHighAccuracy: highAccuracy, timeout: highAccuracy ? 8000 : 12000 }
      );
    };

    retrievePosition(true);
  };

  // 4. Quick History lookup click
  const handleHistoryClick = async (cityName: string) => {
    setIsSearching(true);
    try {
      const matchedLocs = await searchLocations(cityName);
      if (matchedLocs.length > 0) {
        handleSelect(matchedLocs[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="pt-24 pb-32 px-4 md:px-10 max-w-4xl mx-auto space-y-12">
      {/* Search Input Box */}
      <div className="animate-fade-in relative z-40">
        <div className="rounded-full flex items-center px-8 py-5 border border-white/10 bg-white/5 shadow-2xl">
          <SearchIcon className="w-5 h-5 text-[#F27D26] mr-4" />
          <input
            autoFocus
            className="bg-transparent border-none outline-none w-full text-lg placeholder:text-zinc-600 text-white focus:ring-0 uppercase font-light tracking-widest"
            placeholder="Search for a city or airport"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button 
              onClick={() => { setQuery(''); setResults([]); }}
              className="ml-4 text-zinc-500 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Autocomplete Dropdown Panel */}
        {(isSearching || results.length > 0) && (
          <GlassCard className="absolute top-full left-0 right-0 mt-3 overflow-hidden divide-y divide-white/5 p-0 shadow-2xl border-white/10 max-h-[350px] overflow-y-auto">
            {isSearching ? (
              <div className="p-6 text-center text-zinc-500 font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-3">
                <Loader2 className="w-4 h-4 animate-spin text-[#F27D26]" />
                Searching GPS Database...
              </div>
            ) : (
              results.map((res) => (
                <div 
                  key={`${res.lat}-${res.lon}`}
                  onClick={() => handleSelect(res)}
                  className="flex items-center justify-between p-5 hover:bg-white/5 cursor-pointer transition-colors"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-white uppercase tracking-wider">{res.name}</span>
                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mt-1">
                      Coordinates: {res.lat.toFixed(4)}, {res.lon.toFixed(4)}
                    </span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-zinc-400">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              ))
            )}
          </GlassCard>
        )}
      </div>

      {/* Geolocation Telemetry Error Banner */}
      {geoError && (
        <div className="animate-fade-in p-5 rounded-xl border border-red-500/20 bg-red-950/20 flex gap-3 text-red-400 items-start text-xs leading-relaxed">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500 mt-0.5" />
          <div className="flex-1">
            <span className="font-black uppercase tracking-widest block mb-1">Telemetry Alert</span>
            {geoError}
          </div>
          <button 
            onClick={() => setGeoError(null)} 
            className="text-red-400/50 hover:text-red-400 transition-colors uppercase font-black text-[9px] tracking-widest"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Auto Detect Location Button */}
      <button
        onClick={handleDetectLocation}
        disabled={isDetecting}
        className="w-full flex items-center justify-center gap-3 py-4 glass-card rounded-xl text-white font-medium hover:bg-white/5 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
      >
        {isDetecting ? (
          <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
        ) : (
          <MapPin className="w-5 h-5 text-blue-400" />
        )}
        {isDetecting ? "Acquiring GPS Signal..." : "Auto detect location"}
      </button>

      {/* Suggested Cities */}
      <section>
        <div className="flex items-center gap-4 mb-6">
          <span className="meta-label text-[#F27D26]">Suggested Pakistan Stations</span>
          <div className="h-px w-24 bg-[#F27D26] opacity-30"></div>
        </div>
        <div className="space-y-4">
          {SUGGESTED_COORDINATES.map((city, index) => (
            <div className="animate-fade-in"
              key={city.city}
            >
              <GlassCard 
                onClick={() => handleSelect({ lat: city.lat, lon: city.lon, name: `${city.city}, ${city.country}` })} 
                className="flex justify-between items-center group p-8 border-white/5 cursor-pointer hover:bg-white/5 active:scale-[0.99] transition-all"
              >
                <div className="flex flex-col">
                  <span className="text-3xl font-light text-white tracking-[0.1em] uppercase">{city.city}</span>
                  <span className="meta-label mt-2">{city.country} // {city.time}</span>
                </div>
                <div className="flex items-center gap-10">
                  <div className="text-right">
                    <span className="text-4xl font-black text-white block tracking-tighter">{city.temp}°</span>
                    <span className="text-[9px] font-black text-[#F27D26] uppercase tracking-[0.3em]">{city.condition}</span>
                  </div>
                  <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </div>
              </GlassCard>
            </div>
          ))}
        </div>
      </section>

      {/* Recent Searches */}
      <section>
        <div className="flex justify-between items-center mb-6 px-4">
          <span className="meta-label">History Logs</span>
          {recentSearches.length > 0 && (
            <button 
              onClick={clearRecentSearches}
              className="text-[#F27D26] text-[10px] font-black uppercase tracking-widest hover:underline cursor-pointer"
            >
              Clear all
            </button>
          )}
        </div>
        
        {recentSearches.length === 0 ? (
          <p className="text-xs text-zinc-600 font-bold uppercase tracking-widest px-4">No recent search records.</p>
        ) : (
          <div className="flex flex-wrap gap-4 px-2">
            {recentSearches.map((city, index) => (
              <div className="animate-fade-in px-6 py-2 rounded-full border border-white/10 flex items-center gap-3 text-zinc-400 hover:bg-white hover:text-black transition-all cursor-pointer font-black text-[10px] uppercase tracking-widest"
                key={`${city}-${index}`}
                onClick={() => handleHistoryClick(city)}
              >
                <History className="w-3 h-3 opacity-40" />
                {city}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Map Quick Access */}
      {false && (
        <section className="animate-fade-in mt-8">
          <div className="relative w-full h-48 rounded-2xl overflow-hidden glass-card group cursor-pointer">
            <img
              alt="Global weather radar view"
              className="w-full h-full object-cover opacity-50 grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAxv_CdroYRemJo3mYop5LfCE0CPwaxdAVEr50Nf3nL1xUCUEF4uqB7aom9eYUr-a-Zq056L3wsIlgCgcgwWV9azMsP7C_8VFcgm3sXjAaAm8KCy1E81HURJ_QzzLVDc-_EeO5nziRSOfMTPDghy1rZOImLMQdJsMIIgqgqmSzHISRi8-pr4PiaW2ArGq5Kl051IVBT08mBu5uc4alw_fZ4QWESkJ1Yl7MYREE-ugJecLG_Cukeg-k34CW752aIq8rqEJZAAiuS0r4"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#131313] via-transparent to-transparent opacity-60"></div>
            <div className="absolute bottom-6 left-6">
              <h3 className="text-2xl font-bold text-white tracking-tight">Interactive Map</h3>
              <p className="text-sm text-zinc-400">Explore weather conditions globally</p>
            </div>
            <button className="absolute bottom-6 right-6 p-3 bg-[#adc6ff] text-[#002e69] rounded-full shadow-lg hover:rotate-12 transition-transform active:scale-90">
              <Compass className="w-6 h-6" />
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
