/**
 * Converts a standard date string (YYYY-MM-DD) into a short day label
 * e.g., 'Today', 'Mon', 'Tue'
 */
export function getDayLabel(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  
  if (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  ) {
    return 'Today';
  }

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[date.getDay()];
}

/**
 * Extracts the hour representation (HH:MM) from a date-time string
 * e.g., '2026-05-18T14:00' -> '14:00'
 */
export function formatTime(dateTimeStr: string): string {
  try {
    const parts = dateTimeStr.split('T');
    if (parts.length === 2) {
      return parts[1].substring(0, 5);
    }
    const d = new Date(dateTimeStr);
    const hrs = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${hrs}:${mins}`;
  } catch {
    return '12:00';
  }
}

/**
 * Calculates the current sun position percentage (0 to 100) between sunrise and sunset.
 * Returns -1 if sun is set (night time).
 */
export function getSunPositionPercentage(sunriseStr: string, sunsetStr: string): {
  percent: number;
  remainingText: string;
} {
  try {
    const now = new Date();
    
    // Parse sunrise/sunset. They could be full ISO strings '2026-05-18T06:12' or '06:12'
    let rise = new Date(sunriseStr);
    let set = new Date(sunsetStr);
    
    // Fallback if just time string 'HH:MM'
    if (isNaN(rise.getTime())) {
      const todayStr = now.toISOString().split('T')[0];
      rise = new Date(`${todayStr}T${sunriseStr}`);
      set = new Date(`${todayStr}T${sunsetStr}`);
    }

    const totalDuration = set.getTime() - rise.getTime();
    const elapsed = now.getTime() - rise.getTime();
    
    if (now.getTime() < rise.getTime()) {
      // Before sunrise
      return { percent: 0, remainingText: 'Before Sunrise' };
    }
    
    if (now.getTime() > set.getTime()) {
      // After sunset
      return { percent: 100, remainingText: 'Sun has Set' };
    }

    const percent = Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100);
    
    // Calculate remaining time
    const remainingMs = set.getTime() - now.getTime();
    const remainingHrs = Math.floor(remainingMs / (1000 * 60 * 60));
    const remainingMins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return {
      percent,
      remainingText: `${remainingHrs}h ${remainingMins}m remaining`
    };
  } catch {
    return { percent: 50, remainingText: '4h 00m remaining' };
  }
}
