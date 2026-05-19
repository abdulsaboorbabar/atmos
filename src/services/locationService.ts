import { NominatimResult, LocationCoordinates } from '../types';

/**
 * OpenStreetMap Nominatim API Service
 * Handles forward geocoding (search autocomplete) and reverse geocoding (lat/lon to address)
 */

export async function searchLocations(query: string): Promise<LocationCoordinates[]> {
  if (!query || query.trim().length < 2) return [];

  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=10&addressdetails=1`;
  
  try {
    const response = await fetch(url, {
      headers: {
        // Nominatim requests identifying headers to prevent automated abuse
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`Nominatim error: ${response.statusText}`);
    }

    const data: NominatimResult[] = await response.json();
    
    // Map Nominatim results to our unified LocationCoordinates shape
    return data.map((item) => {
      // Build a clean descriptive name: "City, Country" or "Town, State, Country"
      const addr = item.address;
      const city = addr?.city || addr?.town || addr?.village || addr?.hamlet || addr?.suburb;
      const country = addr?.country || '';
      
      let displayName = item.display_name;
      if (city && country) {
        displayName = `${city}, ${country}`;
      } else if (city) {
        displayName = city;
      }
      
      return {
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
        name: displayName
      };
    });
  } catch (error) {
    console.error('Failed to geocode query:', error);
    return [];
  }
}

export async function reverseGeocode(lat: number, lon: number): Promise<string> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`Nominatim error: ${response.statusText}`);
    }

    const data = await response.json();
    const addr = data.address;
    
    if (addr) {
      const city = addr.city || addr.town || addr.village || addr.hamlet || addr.suburb || addr.county || '';
      const country = addr.country || '';
      
      if (city && country) return `${city}, ${country}`;
      if (city) return city;
      if (country) return country;
    }
    
    return data.display_name || `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  } catch (error) {
    console.error('Failed to reverse geocode coordinates:', error);
    return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  }
}
