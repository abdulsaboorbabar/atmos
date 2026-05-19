import { useQuery } from '@tanstack/react-query';
import { useWeatherStore } from '../store/useWeatherStore';
import { fetchWeatherData } from '../services/weatherService';
import { fetchSolarData } from '../services/nasaService';
import { UnifiedWeather } from '../types';

/**
 * Integrated weather query hook utilizing TanStack Query
 * Manages parallel API fetches (Open-Meteo + NASA POWER) with standard caching & offline fallbacks
 */
export function useWeatherQuery() {
  const selectedLocation = useWeatherStore((state) => state.selectedLocation);
  const setOfflineCache = useWeatherStore((state) => state.setOfflineCache);
  const offlineCache = useWeatherStore((state) => state.offlineCache);
  const isOffline = useWeatherStore((state) => state.isOffline);

  return useQuery<UnifiedWeather>({
    queryKey: ['weather', selectedLocation.lat, selectedLocation.lon],
    queryFn: async () => {
      if (isOffline) {
        if (offlineCache) {
          return offlineCache;
        }
        throw new Error('Network is offline and no cached weather data is available.');
      }

      // Fetch primary forecasts and secondary solar insights in parallel
      const [weatherRes, solarRes] = await Promise.all([
        fetchWeatherData(selectedLocation),
        fetchSolarData(selectedLocation.lat, selectedLocation.lon)
      ]);

      const unified: UnifiedWeather = {
        ...weatherRes,
        solarData: solarRes
      };

      // Store in Zustand/localStorage cache for offline support
      setOfflineCache(unified);
      
      return unified;
    },
    staleTime: 15 * 60 * 1000, // 15 minutes staleness limit
    gcTime: 30 * 60 * 1000, // Keep in garbage collection for 30 minutes
    retry: 2,
    refetchOnWindowFocus: false,
    
    // Inject cached state immediately if we are offline or during initial render
    placeholderData: (previousData) => {
      if (previousData) return previousData;
      // If we have cached data for the currently selected location, return it
      if (offlineCache && 
          Math.abs(offlineCache.location.lat - selectedLocation.lat) < 0.01 && 
          Math.abs(offlineCache.location.lon - selectedLocation.lon) < 0.01) {
        return offlineCache;
      }
      // If we are completely offline and have any cache at all, use it rather than crashing
      if (isOffline && offlineCache) {
        return offlineCache;
      }
      return undefined;
    }
  });
}
