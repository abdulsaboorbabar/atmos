export type WeatherCondition = 
  | 'Sunny' 
  | 'Cloudy' 
  | 'Light Rain' 
  | 'Rainy' 
  | 'Mostly Clear' 
  | 'Partly Cloudy' 
  | 'Clear'
  | 'Snowy'
  | 'Thunderstorm'
  | 'Foggy'
  | 'Drizzle';

export interface WeatherData {
  city: string;
  country: string;
  temp: number;
  condition: WeatherCondition;
  high: number;
  low: number;
  time: string;
}

export interface Metric {
  label: string;
  value: string | number;
  unit?: string;
  desc?: string;
  icon: string;
}

export interface LocationCoordinates {
  lat: number;
  lon: number;
  name: string;
}

export interface NominatimResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  importance: number;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    hamlet?: string;
    suburb?: string;
    county?: string;
    state?: string;
    country?: string;
    country_code?: string;
  };
}

export interface HourlyForecastItem {
  time: string; // HH:MM
  temp: number;
  condition: WeatherCondition;
  humidity: number;
  windSpeed: number;
  precipitation: number;
}

export interface DailyForecastItem {
  day: string; // e.g. 'Mon' or 'Today'
  date: string; // YYYY-MM-DD
  condition: WeatherCondition;
  low: number;
  high: number;
  sunrise: string; // HH:MM
  sunset: string; // HH:MM
  uvIndex: number;
  precipProb: number; // percentage max
  precipSum: number; // sum in mm
}

export interface SolarData {
  radiation: number; // ALLSKY_SFC_SW_DWN (kW-hr/m^2/day)
  temperature: number; // T2M (°C)
  humidity: number; // RH2M (%)
  windSpeed: number; // WS2M (m/s)
}

export interface UnifiedWeather {
  location: LocationCoordinates;
  currentWeather: {
    temp: number;
    condition: WeatherCondition;
    conditionText: string;
    high: number;
    low: number;
    feelsLike: number;
    humidity: number;
    windSpeed: number;
    windDirection: string; // e.g., 'Northeast'
    windAngle: number; // degrees for needle
    visibility: number; // km
    pressure: number; // hPa
    uvIndex: number;
  };
  hourlyForecast: HourlyForecastItem[];
  dailyForecast: DailyForecastItem[];
  solarData: SolarData | null;
  lastUpdated: string; // Timestamp
}
