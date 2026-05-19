import { 
  Wind, 
  Sun, 
  Sunrise, 
  Sunset, 
  Eye, 
  Gauge, 
  Cloud,
  ThermometerSun,
  Droplets,
  Zap,
  Loader2,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { GlassCard } from '../components/GlassCard';
import { motion } from 'motion/react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useWeatherQuery } from '../hooks/useWeatherQuery';
import { useWeatherStore } from '../store/useWeatherStore';
import { getSunPositionPercentage } from '../utils/dateUtils';
import { useState } from 'react';
import { cn } from '../lib/utils';

export function SavedView() {
  const { data, isLoading, isError, refetch } = useWeatherQuery();
  const tempUnit = useWeatherStore((state) => state.tempUnit);
  const timeFormat = useWeatherStore((state) => state.timeFormat);
  const [chartType, setChartType] = useState<'rain' | 'temp'>('rain');

  // Loading indicator matching HomeView
  if (isLoading) {
    return (
      <div className="pt-32 pb-32 px-4 md:px-10 max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[70vh] space-y-6">
        <div className="relative flex items-center justify-center w-24 h-24">
          <div className="absolute w-20 h-20 border-2 border-white/5 border-t-[#F27D26] rounded-full animate-spin"></div>
          <Sun className="w-8 h-8 text-[#F27D26]/40 animate-pulse" />
        </div>
        <p className="text-zinc-500 font-bold uppercase tracking-[0.2em] text-xs">
          Compiling Atmospheric Analytics...
        </p>
      </div>
    );
  }

  // Error layout matching HomeView
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

  const { currentWeather, hourlyForecast, dailyForecast, solarData } = data;

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

  // 1. Dynamic Precipitation / Temperature Chart
  const chartData = hourlyForecast.slice(0, 7).map((hour) => {
    let value = hour.precipitation; // Default Rain in mm
    if (chartType === 'temp') {
      value = tempUnit === 'F' ? Math.round((hour.temp * 9/5) + 32) : hour.temp;
    }
    return {
      time: formatTimeUI(hour.time, timeFormat),
      value
    };
  });

  // Calculate cloud percentage estimation
  let cloudCoverPercent = 12; // fallback
  if (currentWeather.condition === 'Clear' || currentWeather.condition === 'Sunny') cloudCoverPercent = 5;
  else if (currentWeather.condition === 'Mostly Clear') cloudCoverPercent = 15;
  else if (currentWeather.condition === 'Partly Cloudy') cloudCoverPercent = 45;
  else if (currentWeather.condition === 'Cloudy') cloudCoverPercent = 85;
  else if (currentWeather.condition === 'Foggy') cloudCoverPercent = 90;
  else if (currentWeather.condition === 'Light Rain' || currentWeather.condition === 'Rainy' || currentWeather.condition === 'Snowy') cloudCoverPercent = 100;

  // 2. Dynamic Sun Cycle Curve Coordinates Calculation
  const sunriseTime = dailyForecast[0].sunrise;
  const sunsetTime = dailyForecast[0].sunset;
  const { percent, remainingText } = getSunPositionPercentage(sunriseTime, sunsetTime);

  // Bezier curve calculations for: P0 = (0, 40), P1 = (50, -10), P2 = (100, 40)
  // B(t) = (1-t)^2 * P0 + 2*(1-t)*t * P1 + t^2 * P2
  const t = percent / 100;
  const sunX = (1 - t) * (1 - t) * 0 + 2 * (1 - t) * t * 50 + t * t * 100;
  const sunY = (1 - t) * (1 - t) * 40 + 2 * (1 - t) * t * (-10) + t * t * 40;

  // Format the highlighted tracking arc path
  const highlightedPath = `M0,40 Q50,-10 ${sunX},${sunY}`;

  return (
    <div className="pt-24 pb-32 px-4 md:px-10 max-w-7xl mx-auto space-y-12">
      {/* Hero Section: Live Analytics */}
      <section className="grid grid-cols-1 md:grid-cols-12 gap-10 items-start pt-16">
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          className="md:col-span-8"
        >
          <div className="flex items-center gap-4 mb-6 text-[#F27D26]">
            <span className="meta-label text-[#F27D26]">Live Analytics</span>
            <div className="h-px w-32 bg-[#F27D26] opacity-30"></div>
          </div>
          <h3 className="giant-text flex flex-col gap-2">
            {currentWeather.humidity}
            <span className="text-4xl md:text-5xl font-light text-zinc-500 tracking-[0.2em] uppercase">
              {currentWeather.humidity < 40 ? 'Dry Index' : currentWeather.humidity < 70 ? 'Comfortable' : 'Humid Index'}
            </span>
          </h3>
          <p className="text-xl md:text-2xl text-zinc-400 max-w-2xl mt-12 leading-relaxed font-light">
            Atmospheric moisture sits at {currentWeather.humidity}% today. Weather patterns indicate stable ambient cooling with moderate particulate suspension.
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="md:col-span-4 h-full flex items-center"
        >
          <GlassCard className="w-full h-80 flex flex-col justify-between p-10">
            <div>
              <span className="meta-label">Primary Index</span>
              <div className="mt-8 flex items-end gap-3">
                <span className="text-6xl font-black text-white tracking-widest">UV</span>
                <span className="text-lg font-light text-zinc-500 pb-2 uppercase tracking-widest">Index</span>
              </div>
            </div>
            <div className="space-y-4">
              <div className="h-px w-full bg-white/10 relative overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((currentWeather.uvIndex / 12) * 100, 100)}%` }}
                  className="h-full bg-[#F27D26]" 
                />
              </div>
              <div className="flex justify-between font-bold text-[9px] text-zinc-700 uppercase tracking-[0.3em]">
                <span>Low</span>
                <span>Extreme</span>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </section>

      {/* Trend Chart Section */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <GlassCard className="overflow-hidden">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12 px-6">
            <div>
              <h3 className="text-2xl font-bold text-white tracking-tight uppercase">
                {chartType === 'rain' ? '24h Precipitation Trend' : '24h Temperature Curve'}
              </h3>
              <p className="meta-label text-zinc-500 mt-2">
                {chartType === 'rain' ? 'Precipitation volume over next cycle' : 'Estimated temperature fluctuations'}
              </p>
            </div>
            <div className="flex bg-white/5 rounded-full p-1 border border-white/5">
              <button 
                onClick={() => setChartType('rain')}
                className={cn(
                  "nav-pill px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer",
                  chartType === 'rain' ? "bg-white text-black" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                Rain (mm)
              </button>
              <button 
                onClick={() => setChartType('temp')}
                className={cn(
                  "nav-pill px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer",
                  chartType === 'temp' ? "bg-white text-black" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                Temp ({tempUnit === 'F' ? '°F' : '°C'})
              </button>
            </div>
          </div>
          
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F27D26" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#F27D26" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#F27D26" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#chartGradient)" 
                />
                <XAxis 
                  dataKey="time" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#3f3f46', fontSize: 10, fontWeight: 700 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#3f3f46', fontSize: 9, fontWeight: 700 }}
                  dx={-10}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff', fontSize: 12, fontWeight: 700 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </motion.section>

      {/* Detailed Breakdown Grid */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { 
            label: 'NASA Solar', 
            value: solarData ? solarData.radiation : '0.4', 
            unit: 'kW/m²', 
            desc: solarData ? `${solarData.radiation > 4.5 ? 'High' : 'Moderate'} Intensity` : 'Sensor Offline', 
            icon: ThermometerSun 
          },
          { 
            label: 'Pressure', 
            value: currentWeather.pressure, 
            unit: 'hPa', 
            desc: 'Stable', 
            icon: Gauge 
          },
          { 
            label: 'Visibility', 
            value: currentWeather.visibility, 
            unit: 'km', 
            desc: currentWeather.visibility >= 10 ? 'Perfect' : 'Slight Fog', 
            icon: Eye 
          },
          { 
            label: 'Clouds', 
            value: cloudCoverPercent, 
            unit: '%', 
            desc: currentWeather.condition, 
            icon: Cloud 
          },
        ].map((metric, i) => {
          const Icon = metric.icon;
          return (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 + i * 0.1 }}
            >
              <GlassCard className="h-44 flex flex-col justify-between">
                <div className="flex items-center gap-2 text-zinc-500">
                  <Icon className="w-4 h-4" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">{metric.label}</span>
                </div>
                <div>
                  <div className="text-2xl font-bold text-zinc-100 italic">
                    {metric.value} <span className="text-xs font-bold text-zinc-500 uppercase not-italic">{metric.unit}</span>
                  </div>
                  <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider mt-1">{metric.desc}</p>
                </div>
              </GlassCard>
            </motion.div>
          );
        })}
      </section>

      {/* Sunrise/Sunset Visual */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <GlassCard>
          <div className="flex justify-between items-end mb-16">
            <h3 className="text-2xl font-bold text-white tracking-tight">Sun Cycle</h3>
            <div className="text-right">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Daylight Stats</p>
              <p className="text-2xl font-bold text-blue-400 italic uppercase">{remainingText}</p>
            </div>
          </div>
          
          <div className="relative w-full h-32 flex items-end">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 100 40" preserveAspectRatio="none">
              {/* Entire path arc */}
              <path d="M0,40 Q50,-10 100,40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="4" />
              
              {/* Highlight tracking arc based on calculated sun position */}
              {percent > 0 && percent <= 100 && (
                <path d={highlightedPath} fill="none" stroke="#60a5fa" strokeWidth="2" />
              )}
              
              {/* Sun circle moving dynamically along Bezier curve */}
              {percent > 0 && percent < 100 && (
                <circle cx={sunX} cy={sunY} r="3" fill="#60a5fa" className="shadow-[0_0_12px_#60a5fa]" />
              )}
            </svg>
            
            <div className="absolute top-full pt-6 w-full flex justify-between">
              <div className="flex flex-col items-start gap-1">
                <Sunrise className="w-4 h-4 text-zinc-600" />
                <span className="text-xs font-bold text-white">{formatTimeUI(sunriseTime, timeFormat)}</span>
                <span className="text-[10px] font-bold text-zinc-600 uppercase">Sunrise</span>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Sunset className="w-4 h-4 text-zinc-600" />
                <span className="text-xs font-bold text-white">{formatTimeUI(sunsetTime, timeFormat)}</span>
                <span className="text-[10px] font-bold text-zinc-600 uppercase">Sunset</span>
              </div>
            </div>
          </div>
        </GlassCard>
      </motion.section>
    </div>
  );
}
