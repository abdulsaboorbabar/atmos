import { useState } from 'react';
import { 
  Thermometer, 
  Wind, 
  Sun, 
  CloudRain, 
  Cloud, 
  Droplets, 
  Eye, 
  Gauge, 
  Navigation, 
  ArrowDown,
  CloudSnow,
  CloudLightning,
  CloudDrizzle,
  CloudFog,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  Flame,
  ShieldCheck,
  Calendar,
  Sparkles,
  Info,
  X
} from 'lucide-react';
import { GlassCard } from '../components/GlassCard';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useWeatherQuery } from '../hooks/useWeatherQuery';
import { useWeatherStore } from '../store/useWeatherStore';
import { WeatherCondition, DailyForecastItem } from '../types';

// Helper to get standard weather icons based on conditions
export function getWeatherIcon(condition: WeatherCondition, className: string = "w-5 h-5") {
  switch (condition) {
    case 'Clear':
    case 'Mostly Clear':
    case 'Sunny':
      return <Sun className={cn(className, "text-[#F27D26]")} />;
    case 'Partly Cloudy':
    case 'Cloudy':
      return <Cloud className={cn(className, "text-zinc-400")} />;
    case 'Foggy':
      return <CloudFog className={cn(className, "text-zinc-500")} />;
    case 'Drizzle':
      return <CloudDrizzle className={cn(className, "text-blue-400")} />;
    case 'Light Rain':
    case 'Rainy':
      return <CloudRain className={cn(className, "text-blue-500")} />;
    case 'Snowy':
      return <CloudSnow className={cn(className, "text-blue-200")} />;
    case 'Thunderstorm':
      return <CloudLightning className={cn(className, "text-purple-400")} />;
    default:
      return <Cloud className={cn(className, "text-zinc-400")} />;
  }
}

export function HomeView() {
  const { data, isLoading, isError, refetch } = useWeatherQuery();
  const tempUnit = useWeatherStore((state) => state.tempUnit);
  const speedUnit = useWeatherStore((state) => state.speedUnit);
  const timeFormat = useWeatherStore((state) => state.timeFormat);
  
  // Modal popout state for clicking day tiles
  const [selectedDay, setSelectedDay] = useState<DailyForecastItem | null>(null);

  const formatTimeUI = (timeStr: string, format: '12h' | '24h'): string => {
    try {
      const parts = timeStr.split(':');
      if (parts.length < 2) return timeStr;
      const hrs = parseInt(parts[0]);
      const mins = parseInt(parts[1]);
      const minsStr = String(mins).padStart(2, '0');
      if (format === '12h') {
        const ampm = hrs >= 12 ? 'PM' : 'AM';
        let hrs12 = hrs % 12;
        hrs12 = hrs12 === 0 ? 12 : hrs12;
        return `${hrs12}:${minsStr} ${ampm}`;
      } else {
        const hrs24 = String(hrs).padStart(2, '0');
        return `${hrs24}:${minsStr}`;
      }
    } catch {
      return timeStr;
    }
  };

  // Unit conversion helpers
  const formatTemp = (c: number) => {
    if (tempUnit === 'F') {
      return `${Math.round((c * 9/5) + 32)}°F`;
    }
    return `${c}°C`;
  };

  const formatTempRaw = (c: number) => {
    if (tempUnit === 'F') {
      return Math.round((c * 9/5) + 32);
    }
    return c;
  };

  const formatSpeed = (kmh: number) => {
    if (speedUnit === 'mph') {
      return `${Math.round(kmh * 0.621371)} mph`;
    }
    return `${kmh} km/h`;
  };

  const formatSpeedRaw = (kmh: number) => {
    if (speedUnit === 'mph') {
      return Math.round(kmh * 0.621371);
    }
    return kmh;
  };

  // 1. Sleek Glassmorphic Loading View
  if (isLoading) {
    return (
      <div className="pt-32 pb-32 px-4 md:px-10 max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[70vh] space-y-6">
        <div className="relative flex items-center justify-center w-24 h-24">
          <div className="absolute w-20 h-20 border-2 border-white/5 border-t-[#F27D26] rounded-full animate-spin"></div>
          <Sun className="w-8 h-8 text-[#F27D26]/40 animate-pulse" />
        </div>
        <p className="text-zinc-500 font-bold uppercase tracking-[0.2em] text-xs">
          Querying Atmospheric Parameters...
        </p>
      </div>
    );
  }

  // 2. High-End Error Handling View
  if (isError || !data) {
    return (
      <div className="pt-32 pb-32 px-4 md:px-10 max-w-xl mx-auto flex flex-col items-center justify-center min-h-[75vh]">
        <GlassCard className="w-full text-center p-12 border-red-500/20 flex flex-col items-center gap-6">
          <div className="p-4 rounded-full bg-red-500/10 text-red-400">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-2xl font-bold uppercase tracking-wide text-white">Sensor Pipeline Error</h3>
            <p className="text-sm text-zinc-500 mt-2 leading-relaxed font-light">
              We encountered a network failure retrieving remote coordinates. Check your connection or retry manual queries.
            </p>
          </div>
          <button 
            onClick={() => refetch()}
            className="px-8 py-3.5 bg-white text-black rounded-full text-[10px] font-black uppercase tracking-[0.2em] hover:scale-105 transition-all flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Retry Connection
          </button>
        </GlassCard>
      </div>
    );
  }

  const { currentWeather, hourlyForecast, dailyForecast, location } = data;

  // UV index classification helper
  const getUvLevel = (uv: number) => {
    if (uv <= 2) return 'Low';
    if (uv <= 5) return 'Mod';
    if (uv <= 7) return 'High';
    if (uv <= 10) return 'Very High';
    return 'Extreme';
  };

  // Generate localized, detailed meteorological comments and safety precautions
  const getAtmosphericAdvisory = (
    condition: WeatherCondition,
    temp: number,
    visibility: number
  ) => {
    let title = "Standard Calibration Mode";
    let comment = "";
    let color = "text-[#F27D26]";
    let icon = <Info className="w-5 h-5 text-[#F27D26]" />;
    let precautions: string[] = [];

    if (condition === 'Rainy' || condition === 'Light Rain' || condition === 'Drizzle') {
      title = "Precipitation Warning";
      color = "text-blue-400";
      icon = <CloudRain className="w-5 h-5 text-blue-400" />;
      comment = `Active atmospheric low-pressure cloud clusters are triggering continuous rain events. Horizontal visual range is reduced to ${visibility} km.`;
      precautions = [
        "Equip waterproof outer layers or carry an umbrella.",
        "Expect low road traction; decrease transit driving speeds.",
        "Secure delicate outdoor electronics and sensor grids."
      ];
    } else if (condition === 'Snowy') {
      title = "Sub-Zero Freeze Alert";
      color = "text-cyan-400";
      icon = <CloudSnow className="w-5 h-5 text-cyan-400 animate-pulse" />;
      comment = "Polar jetstream coordinates are driving sub-freezing solid crystal snow precipitation. Surface structural ice risk is high.";
      precautions = [
        "Use high-friction insulated thermal boots.",
        "Be alert to transparent black ice on pedestrian pathways.",
        "Wear layered clothing to insulate body heat indices."
      ];
    } else if (condition === 'Thunderstorm') {
      title = "Electrical Convective Danger";
      color = "text-purple-400";
      icon = <CloudLightning className="w-5 h-5 text-purple-400 animate-bounce" />;
      comment = "Highly volatile convective storm systems are creating heavy cloud-to-ground lightning potentials and strong wind gusts.";
      precautions = [
        "Remain strictly within grounded indoor shelter hubs.",
        "Disconnect high-voltage server and desktop equipment.",
        "Avoid tall isolation trees or metallic objects."
      ];
    } else if (condition === 'Foggy') {
      title = "Visibility Obstruction Advisory";
      color = "text-zinc-400";
      icon = <CloudFog className="w-5 h-5 text-zinc-400" />;
      comment = `Ground level humidity condensation has formed dense fog layer, compressing visual range to a critical ${visibility} km limit.`;
      precautions = [
        "Activate front and rear fog lights during commutes.",
        "Increase standard vehicle buffer distance by 300%.",
        "Avoid non-essential transit in deep valley coordinates."
      ];
    } else if (temp > 29) {
      title = "Extreme Thermal Load Warning";
      color = "text-red-400";
      icon = <Flame className="w-5 h-5 text-red-400 animate-pulse" />;
      comment = `Severe atmospheric thermal envelope active. Current ambient temperature is high (${formatTemp(temp)}), challenging human biometrics.`;
      precautions = [
        "Increase fluid intake; keep dynamic electrolyte balance.",
        "Limit direct solar exposure during peak hours (11:00-15:00).",
        "Apply high spectrum SPF-50 blocking agents."
      ];
    } else if (temp < 4) {
      title = "Severe Cold Exposure Alert";
      color = "text-blue-300";
      icon = <AlertTriangle className="w-5 h-5 text-blue-300" />;
      comment = `High atmospheric pressure cold front has dropped temperature to ${formatTemp(temp)}. Risk of rapid core temperature drops.`;
      precautions = [
        "Wear wool/fleece thermal insulators and wind breakers.",
        "Cover fingers, ears, and nose to prevent frostbite indices.",
        "Monitor local thermodynamic pipeline heating loops."
      ];
    } else {
      title = "Atmospheric Clearance Stable";
      color = "text-emerald-400";
      icon = <ShieldCheck className="w-5 h-5 text-emerald-400" />;
      comment = "Excellent high-pressure clear air envelope is present. Safe ambient indicators and comfortable biological temperature indices.";
      precautions = [
        "Optimal conditions to enjoy outdoor workouts and transit.",
        "Run outdoor device solar recharges and sensor calibrations.",
        "No complex environmental protection precautions required."
      ];
    }

    return { title, comment, precautions, color, icon };
  };

  // Generate predictive alerts scanning the 16-day extended forecast
  const getUpcomingEvents = (forecast: DailyForecastItem[]) => {
    const events: { title: string; desc: string; date: string; icon: string; style: string }[] = [];

    // 1. Scan for the absolute warmest day
    const sortedHighs = [...forecast].sort((a, b) => b.high - a.high);
    if (sortedHighs[0] && sortedHighs[0].high > 25) {
      events.push({
        title: "Thermal Cycle Peak",
        desc: `High solar radiation will drive temps to a peak of ${formatTemp(sortedHighs[0].high)}.`,
        date: sortedHighs[0].day,
        icon: "🔥",
        style: "border-red-500/10 text-red-400 bg-red-500/5"
      });
    }

    // 2. Scan for wet days (precipitation sum > 2.0mm or probability > 50%)
    const rainyDays = forecast.filter(d => d.precipSum > 2.0 || d.precipProb > 50);
    if (rainyDays.length > 0) {
      events.push({
        title: "Precipitation Window",
        desc: `Rain clusters expected with a total accumulation of ${rainyDays[0].precipSum} mm.`,
        date: rainyDays.slice(0, 2).map(d => d.day).join(" & "),
        icon: "☔",
        style: "border-blue-500/10 text-blue-400 bg-blue-500/5"
      });
    }

    // 3. Scan for consecutive nice clear days (at least 2 consecutive clear/mostly clear)
    let clearStart = "";
    let clearEnd = "";
    let stretch = 0;
    for (let i = 0; i < forecast.length; i++) {
      const isClear = ['Clear', 'Mostly Clear', 'Sunny'].includes(forecast[i].condition);
      if (isClear) {
        if (stretch === 0) clearStart = forecast[i].day;
        clearEnd = forecast[i].day;
        stretch++;
      } else {
        if (stretch >= 2) break;
        stretch = 0;
      }
    }

    if (stretch >= 2) {
      events.push({
        title: "High Solar Clearance",
        desc: "Consecutive cloudless days suitable for sensor calibration and operations.",
        date: `${clearStart} - ${clearEnd}`,
        icon: "☀️",
        style: "border-emerald-500/10 text-emerald-400 bg-emerald-500/5"
      });
    }

    // 4. Extreme UV indices
    const highUvDays = forecast.filter(d => d.uvIndex > 6);
    if (highUvDays.length > 0) {
      events.push({
        title: "High UV Radiation Alert",
        desc: `Solar UV Index maxing out at ${highUvDays[0].uvIndex} (Highly active).`,
        date: highUvDays[0].day,
        icon: "🕶️",
        style: "border-amber-500/10 text-amber-400 bg-amber-500/5"
      });
    }

    // Safe fallback
    if (events.length === 0) {
      events.push({
        title: "Atmospheric Equilibrium",
        desc: "No extreme thermal anomalies or heavy rain fronts predicted.",
        date: "Next 16 Days",
        icon: "🛡️",
        style: "border-zinc-500/10 text-zinc-400 bg-zinc-500/5"
      });
    }

    return events;
  };

  const advisory = getAtmosphericAdvisory(
    currentWeather.condition,
    currentWeather.temp,
    currentWeather.visibility
  );

  const upcomingEvents = getUpcomingEvents(dailyForecast);

  return (
    <div className="pt-24 pb-32 px-4 md:px-10 max-w-7xl mx-auto space-y-12">
      {/* Hero Weather Section */}
      <motion.section 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-start pt-16"
      >
        <div className="flex items-baseline gap-4 mb-2">
          <span className="meta-label text-[#F27D26]">Selected Station</span>
          <div className="h-px w-24 bg-[#F27D26] opacity-30"></div>
        </div>
        <h1 className="text-4xl font-light tracking-[0.2em] uppercase mb-4 opacity-80">{location.name}</h1>
        <div className="flex flex-col">
          <span className="giant-text">
            {formatTempRaw(currentWeather.temp)}°
          </span>
          <div className="flex gap-6 sm:gap-20 mt-10">
            <div className="max-w-[300px]">
              <span className="meta-label">Condition</span>
              <p className="text-lg md:text-xl text-zinc-400 mt-2 font-light leading-relaxed">
                {currentWeather.conditionText}
              </p>
            </div>
            <div className="flex flex-col gap-6">
              <div className="flex flex-col">
                <span className="meta-label">High</span>
                <span className="text-3xl font-light">{formatTemp(currentWeather.high)}</span>
              </div>
              <div className="flex flex-col">
                <span className="meta-label">Low</span>
                <span className="text-3xl font-light text-[#F27D26]">{formatTemp(currentWeather.low)}</span>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Hourly Forecast */}
      <section>
        <div className="flex items-center gap-4 mb-6 px-1">
          <span className="meta-label">Hourly Intel</span>
          <div className="h-px flex-1 bg-white/5"></div>
        </div>
        <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2">
          {hourlyForecast.map((hour, index) => (
            <motion.div
              key={`${hour.time}-${index}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                "glass-card flex-shrink-0 w-24 py-8 flex flex-col items-center justify-between rounded-xl border-white/5",
                index === 0 && "ring-1 ring-[#F27D26]/40 bg-[#F27D26]/5"
              )}
            >
              <span className={cn("text-[10px] font-black uppercase tracking-widest", index === 0 ? "text-[#F27D26]" : "text-zinc-500")}>
                {hour.time === 'Now' ? 'Now' : formatTimeUI(hour.time, timeFormat)}
              </span>
              <div className="my-6">
                {getWeatherIcon(hour.condition, "w-5 h-5 opacity-60")}
              </div>
              <span className={cn("text-xl font-light", index === 0 ? "text-white" : "text-zinc-400")}>
                {formatTempRaw(hour.temp)}°
              </span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Scrollable 16-Day Forecast Timeline Bar */}
      <section>
        <div className="flex items-center gap-4 mb-6 px-1">
          <span className="meta-label flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#F27D26]" />
            16-Day Chronological Projections
          </span>
          <div className="h-px flex-1 bg-white/5"></div>
        </div>
        <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
          {dailyForecast.map((day, index) => (
            <motion.div
              key={day.date}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              onClick={() => setSelectedDay(day)}
              className="glass-card flex-shrink-0 w-28 p-5 flex flex-col items-center justify-between rounded-xl border-white/5 hover:border-white/20 hover:scale-[1.04] active:scale-[0.98] transition-all cursor-pointer"
            >
              {/* Day */}
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                {index === 0 ? 'Today' : index === 1 ? 'Tomorrow' : day.day}
              </span>
              
              {/* Condition Icon */}
              <div className="my-4">
                {getWeatherIcon(day.condition, "w-6 h-6")}
              </div>
              
              {/* High/Low Temperature */}
              <div className="flex items-baseline gap-1.5 text-xs">
                <span className="text-white font-bold">{formatTempRaw(day.high)}°</span>
                <span className="text-zinc-600 font-light">/</span>
                <span className="text-[#F27D26] font-light">{formatTempRaw(day.low)}°</span>
              </div>
              
              {/* Rain Chance and Rain Sum (mm) */}
              <div className="flex flex-col items-center gap-1 mt-3 opacity-60">
                <div className="flex items-center gap-1">
                  <Droplets className="w-3 h-3 text-blue-400" />
                  <span className="text-[9px] font-bold text-zinc-400">{day.precipProb}%</span>
                </div>
                {day.precipSum > 0 ? (
                  <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest">{day.precipSum} mm</span>
                ) : (
                  <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest">0 mm</span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Main Dashboard Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* 7-Day Forecast Column (acting as a dynamic synopsis) */}
        <motion.section 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          className="md:col-span-5"
        >
          <GlassCard className="h-full border-white/5 px-8 py-10">
            <div className="flex items-center justify-between mb-10">
              <span className="meta-label">7-Day Synopsis</span>
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
            </div>
            <div className="space-y-10">
              {dailyForecast.slice(0, 7).map((day) => (
                <div key={day.date} className="flex items-center justify-between">
                  <span className="w-16 text-sm font-black uppercase tracking-[0.1em] text-zinc-500">{day.day}</span>
                  <div className="flex-1 flex justify-center opacity-40">
                    {getWeatherIcon(day.condition, "w-4 h-4")}
                  </div>
                  <div className="flex items-center gap-6 w-40 justify-end">
                    <span className="text-zinc-600 font-light text-xs w-8 text-right tracking-widest">{formatTempRaw(day.low)}°</span>
                    <div className="flex-1 h-px bg-white/10 relative overflow-hidden min-w-[80px]">
                      <div className="absolute inset-y-0 left-1/4 right-1/4 bg-[#F27D26] opacity-40"></div>
                    </div>
                    <span className="text-white font-light text-xs w-8 text-right tracking-widest">{formatTempRaw(day.high)}°</span>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.section>

        {/* Metrics Bento Grid */}
        <motion.section 
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          className="md:col-span-7 grid grid-cols-2 gap-4"
        >
          {/* UV Index */}
          <GlassCard className="flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Sun className="w-4 h-4 text-zinc-500" />
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">UV Index</h3>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-white">{getUvLevel(currentWeather.uvIndex)}</p>
                <p className="text-base text-zinc-400">{currentWeather.uvIndex}</p>
              </div>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full mt-6 overflow-hidden">
              <div 
                className="h-full bg-blue-400 rounded-full shadow-[0_0_8px_#60a5fa]"
                style={{ width: `${Math.min((currentWeather.uvIndex / 12) * 100, 100)}%` }}
              ></div>
            </div>
          </GlassCard>

          {/* Wind */}
          <GlassCard className="flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Wind className="w-4 h-4 text-zinc-500" />
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Wind</h3>
              </div>
              <div className="flex items-baseline gap-1">
                <p className="text-2xl font-bold text-white">{formatSpeedRaw(currentWeather.windSpeed)}</p>
                <span className="text-xs font-bold text-zinc-500 uppercase">{speedUnit === 'mph' ? 'mph' : 'km/h'}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-6 text-zinc-400">
              <div className="p-1.5 rounded-full bg-white/5">
                <Navigation 
                  className="w-4 h-4 fill-zinc-400 transition-transform duration-500" 
                  style={{ transform: `rotate(${currentWeather.windAngle}deg)` }}
                />
              </div>
              <span className="text-sm font-semibold italic">{currentWeather.windDirection}</span>
            </div>
          </GlassCard>

          {/* Feels Like */}
          <GlassCard>
            <div className="flex items-center gap-2 mb-4">
              <Thermometer className="w-4 h-4 text-zinc-500" />
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Feels Like</h3>
            </div>
            <p className="text-2xl font-bold text-white">{formatTemp(currentWeather.feelsLike)}</p>
            <p className="text-sm text-zinc-400 mt-2 font-medium">
              {currentWeather.feelsLike === currentWeather.temp 
                ? 'Exactly like it should be.' 
                : currentWeather.feelsLike > currentWeather.temp 
                  ? 'Appears warmer than ambient temp.'
                  : 'Feels cooler due to wind chill.'
              }
            </p>
          </GlassCard>

          {/* Humidity */}
          <GlassCard>
            <div className="flex items-center gap-2 mb-4">
              <Droplets className="w-4 h-4 text-zinc-500" />
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Humidity</h3>
            </div>
            <p className="text-2xl font-bold text-white">{currentWeather.humidity}%</p>
            <p className="text-sm text-zinc-400 mt-2 font-medium">
              The dew point index is moderate.
            </p>
          </GlassCard>

          {/* Visibility */}
          <GlassCard>
            <div className="flex items-center gap-2 mb-4">
              <Eye className="w-4 h-4 text-zinc-500" />
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Visibility</h3>
            </div>
            <p className="text-2xl font-bold text-white">
              {currentWeather.visibility} <span className="text-sm text-zinc-500">km</span>
            </p>
            <p className="text-sm text-zinc-400 mt-2 font-medium">
              {currentWeather.visibility >= 10 ? 'Perfectly clear view.' : 'Slight ambient obstruction.'}
            </p>
          </GlassCard>

          {/* Pressure */}
          <GlassCard>
            <div className="flex items-center gap-2 mb-4">
              <Gauge className="w-4 h-4 text-zinc-500" />
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Pressure</h3>
            </div>
            <p className="text-2xl font-bold text-white">{currentWeather.pressure} <span className="text-sm text-zinc-500">hPa</span></p>
            <div className="flex items-center gap-1 text-blue-400 mt-2">
              <ArrowDown className="w-3 h-3 animate-bounce" />
              <span className="text-xs font-bold uppercase tracking-wider">Atmospheric baseline</span>
            </div>
          </GlassCard>
        </motion.section>
      </div>

      {/* Bottom Double Panel - Meteorological Advisory & Precautions + Predictive Atmospheric Events */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Panel 1: Advisory & Precautions */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:col-span-7"
        >
          <GlassCard className="p-8 border-white/5 flex flex-col justify-between h-full">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-white/5">
                    {advisory.icon}
                  </div>
                  <h4 className={cn("text-sm font-black uppercase tracking-wider", advisory.color)}>
                    {advisory.title}
                  </h4>
                </div>
                <span className="text-[8px] font-black uppercase tracking-[0.2em] bg-white/5 px-3 py-1 rounded-full text-zinc-400">
                  Telemetry Advisory
                </span>
              </div>

              <div className="space-y-3">
                <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">Biological Comment</span>
                <p className="text-xs text-zinc-300 leading-relaxed font-light">
                  {advisory.comment}
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">Scientific Safety Precautions</span>
                <ul className="space-y-2.5">
                  {advisory.precautions.map((prec, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-[11px] text-zinc-400 leading-relaxed">
                      <span className="text-[#F27D26] font-bold text-xs mt-0.5">•</span>
                      <span>{prec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-8 pt-4 border-t border-white/5 text-[9px] font-bold text-zinc-600 uppercase tracking-widest">
              <Sparkles className="w-3 h-3 text-[#F27D26]" />
              Ambient biometric protection active
            </div>
          </GlassCard>
        </motion.div>

        {/* Panel 2: Predictive Upcoming Weather Events */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:col-span-5"
        >
          <GlassCard className="p-8 border-white/5 h-full flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="meta-label">Predictive Forecast Events</span>
                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-[#F27D26] bg-[#F27D26]/10 px-3 py-1 rounded-full border border-[#F27D26]/20">
                  16d Horizon
                </span>
              </div>

              <div className="space-y-4">
                {upcomingEvents.map((evt, idx) => (
                  <div key={idx} className={cn("p-4 rounded-xl border flex gap-4 items-start", evt.style)}>
                    <span className="text-xl mt-0.5">{evt.icon}</span>
                    <div className="space-y-1">
                      <div className="flex justify-between items-baseline gap-2">
                        <h5 className="text-xs font-black uppercase tracking-wider text-white">{evt.title}</h5>
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 truncate max-w-[120px]">{evt.date}</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 leading-relaxed font-light">{evt.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-[8px] text-zinc-600 uppercase tracking-widest font-semibold mt-6 text-center">
              Predictive models refresh dynamically every 15m
            </p>
          </GlassCard>
        </motion.div>
      </div>

      {/* Enlarged Pill Pop-out Modal Details Panel */}
      <AnimatePresence>
        {selectedDay && (
          <>
            {/* Backdrop Blur Layer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDay(null)}
              className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-center justify-center p-4 cursor-pointer"
            />
            
            {/* Keyed Enlarged Pill Popup Card */}
            <motion.div
              initial={{ scale: 0.85, opacity: 0, x: '-50%', y: '-40%' }}
              animate={{ scale: 1, opacity: 1, x: '-50%', y: '-50%' }}
              exit={{ scale: 0.85, opacity: 0, x: '-50%', y: '-40%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="fixed top-1/2 left-1/2 w-[90%] max-w-sm bg-[#060606]/95 border border-white/10 rounded-[32px] p-8 z-[110] shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col items-center space-y-6 overflow-hidden backdrop-blur-3xl theme-pill-modal"
            >
              {/* Header */}
              <div className="w-full flex justify-between items-center pb-2 border-b border-white/5">
                <div className="flex flex-col">
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#F27D26] flex items-center gap-1">
                    <Sparkles className="w-3 h-3 animate-pulse" />
                    Daily Intelligence
                  </span>
                  <span className="text-sm font-bold uppercase text-white tracking-widest mt-0.5">{selectedDay.day} Forecast</span>
                </div>
                <button 
                  onClick={() => setSelectedDay(null)}
                  className="p-2 border border-white/10 rounded-full hover:bg-white hover:text-black transition-all cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Large weather icon */}
              <div className="relative my-4 flex items-center justify-center">
                <div className="absolute w-24 h-24 rounded-full bg-white/5 filter blur-xl animate-pulse" />
                {getWeatherIcon(selectedDay.condition, "w-16 h-16")}
              </div>

              {/* High/Low Temperature */}
              <div className="text-center">
                <div className="flex justify-center items-baseline gap-2">
                  <span className="text-4xl font-light text-white">{formatTempRaw(selectedDay.high)}°</span>
                  <span className="text-zinc-600 font-light text-xl">/</span>
                  <span className="text-[#F27D26] font-light text-2xl">{formatTempRaw(selectedDay.low)}°</span>
                </div>
                <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider mt-2">{selectedDay.condition}</p>
              </div>

              {/* Detailed metrics grid */}
              <div className="grid grid-cols-2 gap-3 w-full pt-4 border-t border-white/5">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-center">
                  <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest block">Rain Probability</span>
                  <span className="text-sm font-black text-white mt-1 block">{selectedDay.precipProb}%</span>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-center">
                  <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest block">Precipitation Sum</span>
                  <span className="text-sm font-black text-blue-400 mt-1 block">{selectedDay.precipSum} mm</span>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-center">
                  <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest block">UV Radiation Index</span>
                  <span className="text-sm font-black text-amber-400 mt-1 block">{selectedDay.uvIndex} ({getUvLevel(selectedDay.uvIndex)})</span>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-center">
                  <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest block">Solar Sunrise</span>
                  <span className="text-[10px] font-black text-white mt-1 block">{formatTimeUI(selectedDay.sunrise, timeFormat)}</span>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-center col-span-2">
                  <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest block">Solar Sunset</span>
                  <span className="text-[10px] font-black text-[#F27D26] mt-1 block">{formatTimeUI(selectedDay.sunset, timeFormat)}</span>
                </div>
              </div>

              {/* Bottom tag */}
              <div className="pt-4 border-t border-white/5 w-full text-center text-[8px] text-zinc-600 uppercase tracking-widest font-black flex items-center justify-center gap-1.5">
                <Sparkles className="w-3 h-3 text-[#F27D26]" />
                Atmos Intelligence Lab
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Footer Timestamp */}
      <footer className="text-center py-10">
        <p className="text-[10px] font-bold text-zinc-700 uppercase tracking-[0.2em]">
          Last updated: {data.lastUpdated} • Source: Atmos Intel Lab
        </p>
      </footer>
    </div>
  );
}
