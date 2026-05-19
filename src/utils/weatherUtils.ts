import { WeatherCondition } from '../types';

/**
 * Maps Open-Meteo WMO weather codes to our unified WeatherCondition type
 * WMO Weather interpretation codes (WW)
 * See: https://open-meteo.com/en/docs
 */
export function mapWmoToCondition(code: number): WeatherCondition {
  switch (code) {
    case 0:
      return 'Clear';
    case 1:
      return 'Mostly Clear';
    case 2:
      return 'Partly Cloudy';
    case 3:
      return 'Cloudy';
    case 45:
    case 48:
      return 'Foggy';
    case 51:
    case 53:
    case 55:
    case 56:
    case 57:
      return 'Drizzle';
    case 61:
      return 'Light Rain';
    case 63:
    case 65:
    case 66:
    case 67:
      return 'Rainy';
    case 71:
    case 73:
    case 75:
    case 77:
    case 85:
    case 86:
      return 'Snowy';
    case 80:
    case 81:
    case 82:
      return 'Rainy';
    case 95:
    case 96:
    case 99:
      return 'Thunderstorm';
    default:
      return 'Cloudy';
  }
}

/**
 * Provides a highly atmospheric condition description based on weather condition
 */
export function getConditionDescription(condition: WeatherCondition, temp: number): string {
  switch (condition) {
    case 'Clear':
    case 'Mostly Clear':
      return temp > 25 
        ? 'Warm and clear skies. Excellent solar radiation levels, perfect for outdoor operations.'
        : 'Clear, crisp skies with excellent visibility. Comfortable atmospheric conditions.';
    case 'Partly Cloudy':
      return 'Intermittent cloud layers scattering the sunlight. Favorable visibility across all sectors.';
    case 'Cloudy':
      return 'Thick overcast sky with dense cloud layers. Diminished ambient light but stable pressure.';
    case 'Foggy':
      return 'Heavy humidity suspension close to surface level. Visibilities reduced below critical thresholds.';
    case 'Drizzle':
      return 'Light atmospheric misting with slight moisture drops. Mild breeze with damp surface layers.';
    case 'Light Rain':
      return 'Mild rainfall. Gentle moisture precipitation with moderate surface cooling.';
    case 'Rainy':
      return 'Continuous rainfall with significant water precipitation. Elevated humidity and lower visibility.';
    case 'Snowy':
      return 'Sub-zero temperatures causing crystalline water precipitation. Ground accumulation expected.';
    case 'Thunderstorm':
      return 'Severe atmospheric instability. Potential static discharge events, localized heavy wind shear.';
    default:
      return 'Atmospheric parameters operating within seasonal baseline standard levels.';
  }
}

/**
 * Translates wind direction degree (0-360) into a clean descriptive string
 */
export function getWindDirection(deg: number): string {
  const normalized = ((deg % 360) + 360) % 360;
  if (normalized >= 337.5 || normalized < 22.5) return 'North';
  if (normalized >= 22.5 && normalized < 67.5) return 'Northeast';
  if (normalized >= 67.5 && normalized < 112.5) return 'East';
  if (normalized >= 112.5 && normalized < 157.5) return 'Southeast';
  if (normalized >= 157.5 && normalized < 202.5) return 'South';
  if (normalized >= 202.5 && normalized < 247.5) return 'Southwest';
  if (normalized >= 247.5 && normalized < 292.5) return 'West';
  if (normalized >= 292.5 && normalized < 337.5) return 'Northwest';
  return 'Northeast'; // Default fallback
}
