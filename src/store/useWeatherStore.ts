import { create } from 'zustand';
import { LocationCoordinates, UnifiedWeather } from '../types';

interface WeatherState {
  currentLocation: LocationCoordinates | null;
  selectedLocation: LocationCoordinates;
  favorites: LocationCoordinates[];
  recentSearches: string[];
  tempUnit: 'C' | 'F';
  speedUnit: 'kmh' | 'mph';
  offlineCache: UnifiedWeather | null;
  isOffline: boolean;
  theme: 'dark' | 'cyber' | 'light';
  timeFormat: '12h' | '24h';
  isStandalone: boolean;
  
  // Actions
  setCurrentLocation: (loc: LocationCoordinates) => void;
  selectLocation: (loc: LocationCoordinates) => void;
  addFavorite: (loc: LocationCoordinates) => void;
  removeFavorite: (name: string) => void;
  addRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
  setTempUnit: (unit: 'C' | 'F') => void;
  setSpeedUnit: (unit: 'kmh' | 'mph') => void;
  setOfflineCache: (weather: UnifiedWeather) => void;
  setNetworkStatus: (status: boolean) => void;
  setTheme: (theme: 'dark' | 'cyber' | 'light') => void;
  setTimeFormat: (format: '12h' | '24h') => void;
  setStandalone: (status: boolean) => void;
}

// Default fallback (London)
const DEFAULT_LOCATION: LocationCoordinates = {
  lat: 51.5074,
  lon: -0.1278,
  name: 'London, United Kingdom'
};

// Safe localStorage loading
const loadFromStorage = <T>(key: string, fallback: T): T => {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : fallback;
  } catch {
    return fallback;
  }
};

const saveToStorage = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Failed to save key ${key} to storage:`, e);
  }
};

const initialIsStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone || false;
const loadedTheme = 'light';
const initialTheme = 'light';

export const useWeatherStore = create<WeatherState>((set) => ({
  currentLocation: null,
  selectedLocation: loadFromStorage<LocationCoordinates>('atmos_selected_location', DEFAULT_LOCATION),
  favorites: loadFromStorage<LocationCoordinates[]>('atmos_favorites', [
    { lat: 35.6762, lon: 139.6503, name: 'Tokyo, Japan' },
    { lat: 40.7128, lon: -74.0060, name: 'New York, United States' },
    { lat: 48.8566, lon: 2.3522, name: 'Paris, France' }
  ]),
  recentSearches: loadFromStorage<string[]>('atmos_recent_searches', ['Paris', 'Reykjavik', 'Seoul']),
  tempUnit: loadFromStorage<'C' | 'F'>('atmos_temp_unit', 'C'),
  speedUnit: loadFromStorage<'kmh' | 'mph'>('atmos_speed_unit', 'kmh'),
  offlineCache: loadFromStorage<UnifiedWeather | null>('atmos_offline_cache', null),
  isOffline: !navigator.onLine,
  theme: initialTheme,
  timeFormat: loadFromStorage<'12h' | '24h'>('atmos_time_format', '12h'),
  isStandalone: initialIsStandalone,

  setCurrentLocation: (loc) => set({ currentLocation: loc }),
  
  selectLocation: (loc) => {
    saveToStorage('atmos_selected_location', loc);
    set({ selectedLocation: loc });
  },

  addFavorite: (loc) => set((state) => {
    const exists = state.favorites.some((f) => f.name.toLowerCase() === loc.name.toLowerCase());
    if (exists) return {};
    const updated = [...state.favorites, loc];
    saveToStorage('atmos_favorites', updated);
    return { favorites: updated };
  }),

  removeFavorite: (name) => set((state) => {
    const updated = state.favorites.filter((f) => f.name.toLowerCase() !== name.toLowerCase());
    saveToStorage('atmos_favorites', updated);
    return { favorites: updated };
  }),

  addRecentSearch: (query) => set((state) => {
    const cleaned = query.trim();
    if (!cleaned) return {};
    
    // Remove if already exists to push it to the top
    const filtered = state.recentSearches.filter((s) => s.toLowerCase() !== cleaned.toLowerCase());
    const updated = [cleaned, ...filtered].slice(0, 8); // Limit to 8 entries
    saveToStorage('atmos_recent_searches', updated);
    return { recentSearches: updated };
  }),

  clearRecentSearches: () => {
    saveToStorage('atmos_recent_searches', []);
    set({ recentSearches: [] });
  },

  setTempUnit: (tempUnit) => {
    saveToStorage('atmos_temp_unit', tempUnit);
    set({ tempUnit });
  },

  setSpeedUnit: (speedUnit) => {
    saveToStorage('atmos_speed_unit', speedUnit);
    set({ speedUnit });
  },

  setOfflineCache: (offlineCache) => {
    saveToStorage('atmos_offline_cache', offlineCache);
    set({ offlineCache });
  },

  setNetworkStatus: (isOffline) => set({ isOffline }),

  setTheme: () => {
    saveToStorage('atmos_theme', 'light');
    set({ theme: 'light' });
  },

  setTimeFormat: (timeFormat) => {
    saveToStorage('atmos_time_format', timeFormat);
    set({ timeFormat });
  },

  setStandalone: (isStandalone) => set({ isStandalone })
}));
