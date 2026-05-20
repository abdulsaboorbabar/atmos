import { UnifiedWeather, HourlyForecastItem, DailyForecastItem, LocationCoordinates } from '../types';
import { mapWmoToCondition, getConditionDescription, getWindDirection } from '../utils/weatherUtils';
import { getDayLabel, formatTime } from '../utils/dateUtils';

/**
 * Open-Meteo API Service
 * Fetches and processes current weather, hourly metrics, and daily projections
 */

export async function fetchWeatherData(
  location: LocationCoordinates
): Promise<Omit<UnifiedWeather, 'solarData'>> {
  const { lat, lon } = location;
  
  // Custom query parameters extending Open-Meteo for our specific Bento metrics
  // Requesting 16 days forecast parameters to populate the daily horizontal scrolling timeline
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation,weather_code,apparent_temperature,visibility,pressure_msl,precipitation_probability,wind_direction_10m,wind_gusts_10m,uv_index,cloud_cover,dew_point_2m&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max,precipitation_sum,weather_code&timezone=auto&forecast_days=16`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Open-Meteo network error: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.current_weather || !data.hourly || !data.daily) {
      throw new Error('Incomplete data response from Open-Meteo');
    }

    const now = new Date();
    const currentISOString = now.toISOString().substring(0, 13) + ':00'; // Match hourly key
    
    // Find index of current hour in hourly forecast
    let currentHourIndex = data.hourly.time.findIndex((t: string) => t.startsWith(currentISOString.substring(0, 13)));
    if (currentHourIndex === -1) currentHourIndex = 0; // Fallback to index 0

    const currentTemp = data.current_weather.temperature;
    const currentWmoCode = data.current_weather.weathercode;
    const currentCondition = mapWmoToCondition(currentWmoCode);
    
    // Extracted hourly parameters
    const apparentTemp = data.hourly.apparent_temperature?.[currentHourIndex] ?? currentTemp;
    const humidity = data.hourly.relative_humidity_2m?.[currentHourIndex] ?? 50;
    const visibility = (data.hourly.visibility?.[currentHourIndex] ?? 10000) / 1000; // convert meters to kilometers
    const pressure = data.hourly.pressure_msl?.[currentHourIndex] ?? 1013;
    const uvIndex = data.daily.uv_index_max?.[0] ?? 1.0;

    // Build the processed current weather section
    const currentWeather = {
      temp: Math.round(currentTemp),
      condition: currentCondition,
      conditionText: getConditionDescription(currentCondition, currentTemp),
      high: Math.round(data.daily.temperature_2m_max[0]),
      low: Math.round(data.daily.temperature_2m_min[0]),
      feelsLike: Math.round(apparentTemp),
      humidity: Math.round(humidity),
      windSpeed: Math.round(data.current_weather.windspeed),
      windDirection: getWindDirection(data.current_weather.winddirection),
      windAngle: data.current_weather.winddirection,
      visibility: parseFloat(visibility.toFixed(1)),
      pressure: Math.round(pressure),
      uvIndex: parseFloat(uvIndex.toFixed(1))
    };

    // Format the Hourly Forecast (next 12 hours starting from now)
    const hourlyForecast: HourlyForecastItem[] = [];
    const startIndex = currentHourIndex;
    const endIndex = Math.min(startIndex + 12, data.hourly.time.length);
    
    for (let i = startIndex; i < endIndex; i++) {
      const cc = Math.round(data.hourly.cloud_cover[i] ?? 0);
      hourlyForecast.push({
        time: i === startIndex ? 'Now' : formatTime(data.hourly.time[i]),
        temp: Math.round(data.hourly.temperature_2m[i]),
        condition: mapWmoToCondition(data.hourly.weather_code[i]),
        humidity: Math.round(data.hourly.relative_humidity_2m[i]),
        windSpeed: Math.round(data.hourly.wind_speed_10m[i]),
        precipitation: parseFloat((data.hourly.precipitation[i] ?? 0).toFixed(1)),
        apparentTemp: Math.round(data.hourly.apparent_temperature[i] ?? data.hourly.temperature_2m[i]),
        precipProb: Math.round(data.hourly.precipitation_probability[i] ?? 0),
        windDirection: getWindDirection(data.hourly.wind_direction_10m[i] ?? 0),
        windAngle: data.hourly.wind_direction_10m[i] ?? 0,
        windGusts: Math.round(data.hourly.wind_gusts_10m[i] ?? 0),
        uvIndex: parseFloat((data.hourly.uv_index[i] ?? 0).toFixed(1)),
        cloudCover: cc,
        cloudCeiling: cc > 0 ? Math.round(9100 - (cc * 40)) : 0,
        dewPoint: Math.round(data.hourly.dew_point_2m[i] ?? 0),
        visibility: parseFloat(((data.hourly.visibility[i] ?? 10000) / 1000).toFixed(1)),
        pressure: Math.round(data.hourly.pressure_msl[i] ?? 1013)
      });
    }

    // Format the Daily Forecast (typically 7 days)
    const dailyForecast: DailyForecastItem[] = [];
    const dailyCount = data.daily.time.length;
    
    for (let i = 0; i < dailyCount; i++) {
      dailyForecast.push({
        day: getDayLabel(data.daily.time[i]),
        date: data.daily.time[i],
        condition: mapWmoToCondition(data.daily.weather_code[i]),
        low: Math.round(data.daily.temperature_2m_min[i]),
        high: Math.round(data.daily.temperature_2m_max[i]),
        sunrise: formatTime(data.daily.sunrise[i]),
        sunset: formatTime(data.daily.sunset[i]),
        uvIndex: parseFloat((data.daily.uv_index_max[i] ?? 1.0).toFixed(1)),
        precipProb: Math.round(data.daily.precipitation_probability_max[i] ?? 0),
        precipSum: parseFloat((data.daily.precipitation_sum[i] ?? 0).toFixed(1))
      });
    }

    return {
      location,
      currentWeather,
      hourlyForecast,
      dailyForecast,
      lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  } catch (error) {
    console.error('Failed to fetch Open-Meteo weather data:', error);
    throw error;
  }
}

export interface HistoricalDataPoint {
  dayOffset: number;
  dateLabel: string;
  temp1950: number;
  temp1975: number;
  temp2000: number;
  temp2025: number;
  precip1950: number;
  precip1975: number;
  precip2000: number;
  precip2025: number;
}

export async function fetchHistoricalData(
  lat: number,
  lon: number
): Promise<{
  chartData: HistoricalDataPoint[];
  summary: {
    tempRise: number;
    precipShift: number;
    warmestYear: number;
    wettestYear: number;
    decadalAverages: {
      [year: number]: {
        temp: number;
        precip: number;
      }
    };
  }
}> {
  const now = new Date();
  
  // Dynamic stable 10-day window (ending 5 days ago to ensure archive processing completes)
  const endRangeDate = new Date();
  endRangeDate.setDate(now.getDate() - 5);
  const startRangeDate = new Date();
  startRangeDate.setDate(now.getDate() - 14);

  const formatMonthDay = (d: Date) => {
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const r = String(d.getDate()).padStart(2, '0');
    return { m, r };
  };

  const startMD = formatMonthDay(startRangeDate);
  const endMD = formatMonthDay(endRangeDate);
  const years = [1950, 1975, 2000, 2025];
  
  try {
    const fetchPromises = years.map(async (year) => {
      const startStr = `${year}-${startMD.m}-${startMD.r}`;
      const endStr = `${year}-${endMD.m}-${endMD.r}`;
      const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${startStr}&end_date=${endStr}&daily=temperature_2m_mean,precipitation_sum&timezone=auto`;
      
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Archive fail for ${year}`);
      const rawData = await res.json();
      return { year, data: rawData };
    });

    const results = await Promise.all(fetchPromises);
    const chartData: HistoricalDataPoint[] = [];
    const dateLength = results[0]?.data?.daily?.time?.length ?? 0;

    let totalTemp1950 = 0;
    let totalTemp2025 = 0;
    let totalPrecip1950 = 0;
    let totalPrecip2025 = 0;

    const yearlyTemps: { [key: number]: number } = {};
    const yearlyPrecips: { [key: number]: number } = {};

    for (let i = 0; i < dateLength; i++) {
      const dateStr = results[0].data.daily.time[i];
      const dateParts = dateStr.split('-');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthName = monthNames[parseInt(dateParts[1]) - 1];
      const dateLabel = `${monthName} ${dateParts[2]}`;

      const t1950 = results.find(r => r.year === 1950)?.data.daily.temperature_2m_mean[i] ?? 15;
      const t1975 = results.find(r => r.year === 1975)?.data.daily.temperature_2m_mean[i] ?? 16;
      const t2000 = results.find(r => r.year === 2000)?.data.daily.temperature_2m_mean[i] ?? 16.5;
      const t2025 = results.find(r => r.year === 2025)?.data.daily.temperature_2m_mean[i] ?? 17.5;

      const p1950 = results.find(r => r.year === 1950)?.data.daily.precipitation_sum[i] ?? 0;
      const p1975 = results.find(r => r.year === 1975)?.data.daily.precipitation_sum[i] ?? 0;
      const p2000 = results.find(r => r.year === 2000)?.data.daily.precipitation_sum[i] ?? 0;
      const p2025 = results.find(r => r.year === 2025)?.data.daily.precipitation_sum[i] ?? 0;

      totalTemp1950 += t1950;
      totalTemp2025 += t2025;
      totalPrecip1950 += p1950;
      totalPrecip2025 += p2025;

      chartData.push({
        dayOffset: i,
        dateLabel,
        temp1950: Math.round(t1950 * 10) / 10,
        temp1975: Math.round(t1975 * 10) / 10,
        temp2000: Math.round(t2000 * 10) / 10,
        temp2025: Math.round(t2025 * 10) / 10,
        precip1950: Math.round(p1950 * 10) / 10,
        precip1975: Math.round(p1975 * 10) / 10,
        precip2000: Math.round(p2000 * 10) / 10,
        precip2025: Math.round(p2025 * 10) / 10,
      });
    }

    const avgTemp1950 = totalTemp1950 / (dateLength || 1);
    const avgTemp1975 = (results.find(r => r.year === 1975)?.data.daily.temperature_2m_mean.reduce((sum: number, v: number) => sum + (v ?? 0), 0) ?? 0) / (dateLength || 1);
    const avgTemp2000 = (results.find(r => r.year === 2000)?.data.daily.temperature_2m_mean.reduce((sum: number, v: number) => sum + (v ?? 0), 0) ?? 0) / (dateLength || 1);
    const avgTemp2025 = totalTemp2025 / (dateLength || 1);

    const totalP1950 = results.find(r => r.year === 1950)?.data.daily.precipitation_sum.reduce((sum: number, v: number) => sum + (v ?? 0), 0) ?? 0;
    const totalP1975 = results.find(r => r.year === 1975)?.data.daily.precipitation_sum.reduce((sum: number, v: number) => sum + (v ?? 0), 0) ?? 0;
    const totalP2000 = results.find(r => r.year === 2000)?.data.daily.precipitation_sum.reduce((sum: number, v: number) => sum + (v ?? 0), 0) ?? 0;
    const totalP2025 = results.find(r => r.year === 2025)?.data.daily.precipitation_sum.reduce((sum: number, v: number) => sum + (v ?? 0), 0) ?? 0;

    const tempRise = parseFloat((avgTemp2025 - avgTemp1950).toFixed(1));
    let precipShift = 0;
    if (totalP1950 > 0) {
      precipShift = Math.round(((totalP2025 - totalP1950) / totalP1950) * 100);
    }

    const decadalAverages = {
      1950: { temp: parseFloat(avgTemp1950.toFixed(1)), precip: parseFloat((totalP1950 / (dateLength || 1)).toFixed(1)) },
      1975: { temp: parseFloat(avgTemp1975.toFixed(1)), precip: parseFloat((totalP1975 / (dateLength || 1)).toFixed(1)) },
      2000: { temp: parseFloat(avgTemp2000.toFixed(1)), precip: parseFloat((totalP2000 / (dateLength || 1)).toFixed(1)) },
      2025: { temp: parseFloat(avgTemp2025.toFixed(1)), precip: parseFloat((totalP2025 / (dateLength || 1)).toFixed(1)) }
    };

    results.forEach(r => {
      const len = r.data.daily.temperature_2m_mean.length || 1;
      const avgT = r.data.daily.temperature_2m_mean.reduce((sum: number, v: number) => sum + (v ?? 0), 0) / len;
      const totalP = r.data.daily.precipitation_sum.reduce((sum: number, v: number) => sum + (v ?? 0), 0);
      yearlyTemps[r.year] = avgT;
      yearlyPrecips[r.year] = totalP;
    });

    const warmestYear = parseInt(Object.keys(yearlyTemps).reduce((a, b) => yearlyTemps[parseInt(a)] > yearlyTemps[parseInt(b)] ? a : b, "2025"));
    const wettestYear = parseInt(Object.keys(yearlyPrecips).reduce((a, b) => yearlyPrecips[parseInt(a)] > yearlyPrecips[parseInt(b)] ? a : b, "2025"));

    return {
      chartData,
      summary: {
        tempRise,
        precipShift,
        warmestYear,
        wettestYear,
        decadalAverages
      }
    };
  } catch (error) {
    console.error('Failed to fetch historical archive weather data:', error);
    throw error;
  }
}
