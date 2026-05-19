import { SolarData } from '../types';

/**
 * NASA POWER API Service
 * Fetches solar radiation (ALLSKY_SFC_SW_DWN) and atmospheric parameters
 */

export async function fetchSolarData(lat: number, lon: number): Promise<SolarData | null> {
  const end = new Date();
  const start = new Date();
  
  // Query 30 days range to ensure at least one fully computed day is available
  // This compensates for the 3-7 day daily satellite processing lag in the NASA system
  start.setDate(end.getDate() - 30);

  const formatYYYYMMDD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const r = String(d.getDate()).padStart(2, '0');
    return `${y}${m}${r}`;
  };

  const startStr = formatYYYYMMDD(start);
  const endStr = formatYYYYMMDD(end);

  const url = `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=ALLSKY_SFC_SW_DWN,T2M,RH2M,WS2M&community=RE&longitude=${lon}&latitude=${lat}&start=${startStr}&end=${endStr}&format=JSON`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`NASA POWER network error: ${response.statusText}`);
    }

    const data = await response.json();
    const parameters = data.properties?.parameter;
    
    if (!parameters) {
      throw new Error('NASA POWER response missing parameter properties');
    }

    const solarRecords = parameters.ALLSKY_SFC_SW_DWN;
    if (!solarRecords) return null;

    // Grab all date keys in chronological order, then reverse to search newest first
    const dateKeys = Object.keys(solarRecords).sort().reverse();
    
    let targetDateKey: string | null = null;
    
    // Find the latest day with valid values (NASA uses -999 for missing/uncomputed data)
    for (const key of dateKeys) {
      const val = solarRecords[key];
      if (val !== undefined && val !== null && val > -900) {
        targetDateKey = key;
        break;
      }
    }

    if (!targetDateKey) {
      console.warn('NASA POWER returned no valid solar data for the queried dates.');
      return null;
    }

    const radiation = parameters.ALLSKY_SFC_SW_DWN[targetDateKey];
    const temp = parameters.T2M?.[targetDateKey] ?? 20;
    const humidity = parameters.RH2M?.[targetDateKey] ?? 50;
    const windSpeed = parameters.WS2M?.[targetDateKey] ?? 3;

    return {
      radiation: parseFloat(radiation.toFixed(2)),
      temperature: parseFloat(temp.toFixed(1)),
      humidity: parseFloat(humidity.toFixed(1)),
      windSpeed: parseFloat(windSpeed.toFixed(1))
    };
  } catch (error) {
    console.error('Failed to fetch NASA POWER solar data:', error);
    // Return null on failure instead of throwing so the app can load primary weather gracefully
    return null;
  }
}
