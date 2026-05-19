import { WeatherData } from './types';

export const SUGGESTED_CITIES: WeatherData[] = [
  {
    city: 'Tokyo',
    country: 'Japan',
    temp: 24,
    condition: 'Cloudy',
    high: 26,
    low: 18,
    time: '10:24 PM',
  },
  {
    city: 'London',
    country: 'United Kingdom',
    temp: 18,
    condition: 'Light Rain',
    high: 20,
    low: 12,
    time: '1:24 PM',
  },
  {
    city: 'New York',
    country: 'United States',
    temp: 22,
    condition: 'Sunny',
    high: 25,
    low: 15,
    time: '8:24 AM',
  },
];

export const RECENT_SEARCHES = ['Paris', 'Reykjavik', 'Seoul'];

export const HOURLY_FORECAST = [
  { time: 'Now', temp: 22, condition: 'Mostly Clear' },
  { time: '14:00', temp: 23, condition: 'Mostly Clear' },
  { time: '15:00', temp: 24, condition: 'Partly Cloudy' },
  { time: '16:00', temp: 24, condition: 'Partly Cloudy' },
  { time: '17:00', temp: 22, condition: 'Cloudy' },
  { time: '18:00', temp: 20, condition: 'Rainy' },
  { time: '19:00', temp: 19, condition: 'Rainy' },
];

export const DAILY_FORECAST = [
  { day: 'Today', condition: 'Sunny', low: 16, high: 24 },
  { day: 'Tue', condition: 'Partly Cloudy', low: 15, high: 22 },
  { day: 'Wed', condition: 'Rainy', low: 14, high: 19 },
  { day: 'Thu', condition: 'Cloudy', low: 13, high: 20 },
  { day: 'Fri', condition: 'Sunny', low: 15, high: 23 },
];

export const PRECIPITATION_DATA = [
  { time: 'Now', value: 10 },
  { time: '3 PM', value: 15 },
  { time: '6 PM', value: 45 },
  { time: '9 PM', value: 70 },
  { time: '12 AM', value: 30 },
  { time: '3 AM', value: 10 },
  { time: '6 AM', value: 5 },
];
