import { useState } from 'react';
import { 
  Hourglass, 
  TrendingUp, 
  TrendingDown, 
  Sun, 
  CloudRain, 
  Compass, 
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Flame,
  Award,
  Sparkles
} from 'lucide-react';
import { GlassCard } from '../components/GlassCard';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { fetchHistoricalData } from '../services/weatherService';
import { useWeatherStore } from '../store/useWeatherStore';
import { cn } from '../lib/utils';

export function TimeMachineView() {
  const selectedLocation = useWeatherStore((state) => state.selectedLocation);
  const tempUnit = useWeatherStore((state) => state.tempUnit);
  const [metricType, setMetricType] = useState<'temp' | 'precip'>('temp');

  // Query historical archive data using TanStack Query
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['historical', selectedLocation.lat, selectedLocation.lon],
    queryFn: () => fetchHistoricalData(selectedLocation.lat, selectedLocation.lon),
    staleTime: 24 * 60 * 60 * 1000, // Historical archive remains static; cache for 24 hours
    gcTime: 48 * 60 * 60 * 1000,
  });

  // Unit conversion helper
  const convertTemp = (c: number) => {
    if (tempUnit === 'F') {
      return Math.round((c * 9/5) + 32);
    }
    return c;
  };

  const getTempUnitStr = () => {
    return tempUnit === 'F' ? '°F' : '°C';
  };

  // Loading state matching HomeView
  if (isLoading) {
    return (
      <div className="pt-32 pb-32 px-4 md:px-10 max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[70vh] space-y-6">
        <div className="relative flex items-center justify-center w-24 h-24">
          <div className="absolute w-20 h-20 border-2 border-white/5 border-t-[#F27D26] rounded-full animate-spin"></div>
          <Hourglass className="w-8 h-8 text-[#F27D26]/40 animate-pulse" />
        </div>
        <p className="text-zinc-500 font-bold uppercase tracking-[0.2em] text-xs text-center">
          Accessing Climatology Archives (1950 - 2025)...
        </p>
      </div>
    );
  }

  // Error state matching HomeView
  if (isError || !data) {
    return (
      <div className="pt-32 pb-32 px-4 md:px-10 max-w-xl mx-auto flex flex-col items-center justify-center min-h-[75vh]">
        <GlassCard className="w-full text-center p-12 border-red-500/20 flex flex-col items-center gap-6">
          <div className="p-4 rounded-full bg-red-500/10 text-red-400">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-2xl font-bold uppercase tracking-wide text-white">Archive Query Failure</h3>
            <p className="text-sm text-zinc-500 mt-2 leading-relaxed font-light">
              We encountered a failure accessing Open-Meteo historical climate servers for this coordinate.
            </p>
          </div>
          <button 
            onClick={() => refetch()}
            className="px-8 py-3.5 bg-white text-black rounded-full text-[10px] font-black uppercase tracking-[0.2em] hover:scale-105 transition-all flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Retry Query
          </button>
        </GlassCard>
      </div>
    );
  }

  const { chartData, summary } = data;

  // Convert chartData temp values on the fly if user is using Fahrenheit
  const processedChartData = chartData.map((d) => ({
    dateLabel: d.dateLabel,
    '1950': metricType === 'temp' ? convertTemp(d.temp1950) : d.precip1950,
    '1975': metricType === 'temp' ? convertTemp(d.temp1975) : d.precip1975,
    '2000': metricType === 'temp' ? convertTemp(d.temp2000) : d.precip2000,
    '2025': metricType === 'temp' ? convertTemp(d.temp2025) : d.precip2025,
  }));

  const convertedTempRise = tempUnit === 'F' ? Math.round(summary.tempRise * 1.8 * 10) / 10 : summary.tempRise;

  // Define scientific climate stages per decade
  const decadalStages = [
    {
      year: 1950,
      classification: "Baseline Holocene Standard",
      color: "border-indigo-500/10 text-indigo-400 bg-indigo-500/5",
      desc: "Represents early post-war baseline temperature profiles prior to massive global urban industrialization cycles."
    },
    {
      year: 1975,
      classification: "Mid-Industrial Era Reference",
      color: "border-cyan-500/10 text-cyan-400 bg-cyan-500/5",
      desc: "Marks a stable climatological period showing early signs of carbon trace atmospheric shifts."
    },
    {
      year: 2000,
      classification: "Accelerated Greenhouse Phase",
      color: "border-amber-500/10 text-amber-400 bg-amber-500/5",
      desc: "A period marked by steep carbon curves, triggering notable global warming anomalies and seasonal drift."
    },
    {
      year: 2025,
      classification: "Anthropocene Thermal Peak",
      color: "border-orange-500/10 text-[#F27D26] bg-[#F27D26]/5",
      desc: "The current era exhibiting severe climate variations, extreme thermal spikes, and volatile seasonal baselines."
    }
  ] as const;

  return (
    <div className="pt-24 pb-32 px-4 md:px-10 max-w-7xl mx-auto space-y-12">
      
      {/* Title & Coordinate Overview */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 pt-16">
        <div>
          <div className="flex items-baseline gap-4 mb-2">
            <span className="meta-label text-[#F27D26] flex items-center gap-1.5">
              <Hourglass className="w-3.5 h-3.5 animate-pulse" />
              Climatology Time Machine
            </span>
            <div className="h-px w-24 bg-[#F27D26] opacity-30"></div>
          </div>
          <h1 className="text-4xl font-light tracking-[0.2em] uppercase mb-4 opacity-80">Decadal Shifts</h1>
          <p className="text-sm text-zinc-500 font-medium uppercase tracking-[0.1em]">
            Station: {selectedLocation.name} (GPS: {selectedLocation.lat.toFixed(4)}, {selectedLocation.lon.toFixed(4)})
          </p>
        </div>
        
        {/* Dynamic Climatology Header Indicator */}
        <div className="flex items-center gap-3 bg-white/5 border border-white/5 rounded-full px-5 py-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Archive Feed Active</span>
        </div>
      </section>

      {/* Paris Agreement Climatology Status Banner */}
      <section>
        {convertedTempRise >= 1.5 ? (
          <GlassCard className="border-red-500/20 bg-red-950/10 p-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-500/10 text-red-400 rounded-xl">
                <Flame className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h4 className="text-sm font-black uppercase text-red-400 tracking-wider">Critical Climate Anomaly Detected</h4>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed max-w-2xl font-light">
                  Warming at this station has reached <span className="font-bold text-white">+{convertedTempRise}{getTempUnitStr()}</span> since 1950, **exceeding the critical +1.5°C threshold** set in the Paris Climate Accords. Significant biosphere alterations are active.
                </p>
              </div>
            </div>
            <span className="text-[9px] font-black uppercase tracking-[0.2em] bg-red-950 border border-red-500/30 text-red-400 px-4 py-2 rounded-full">
              Threshold Breached
            </span>
          </GlassCard>
        ) : convertedTempRise > 0 ? (
          <GlassCard className="border-amber-500/20 bg-amber-950/10 p-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-black uppercase text-amber-400 tracking-wider">Climate Warming Warning</h4>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed max-w-2xl font-light">
                  Warming at this station is currently at <span className="font-bold text-white">+{convertedTempRise}{getTempUnitStr()}</span>. Although below the Paris Agreement limit of +1.5°C, steady thermal gains indicate active macro-climate variations.
                </p>
              </div>
            </div>
            <span className="text-[9px] font-black uppercase tracking-[0.2em] bg-amber-950 border border-amber-500/30 text-amber-400 px-4 py-2 rounded-full">
              Thermal Drift Active
            </span>
          </GlassCard>
        ) : (
          <GlassCard className="border-emerald-500/20 bg-emerald-950/10 p-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-black uppercase text-emerald-400 tracking-wider">Climate Baseline Stable</h4>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed max-w-2xl font-light">
                  Thermal anomaly rates show a stable or cooling deviation of <span className="font-bold text-white">{convertedTempRise}{getTempUnitStr()}</span>. Local atmospheric cooling vectors or moisture blocks are maintaining climate equilibrium.
                </p>
              </div>
            </div>
            <span className="text-[9px] font-black uppercase tracking-[0.2em] bg-emerald-950 border border-emerald-500/30 text-emerald-400 px-4 py-2 rounded-full">
              Holocene Stable
            </span>
          </GlassCard>
        )}
      </section>

      {/* Decadal Comparison Overlaid Charts */}
      <section className="animate-fade-in">
        <GlassCard className="overflow-hidden">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12 px-6">
            <div>
              <h3 className="text-2xl font-bold text-white tracking-tight uppercase">
                {metricType === 'temp' ? 'Decadal Temperature Overlays' : 'Decadal Rainfall Overlays'}
              </h3>
              <p className="meta-label text-zinc-500 mt-2">
                Comparing identical seasonal calendar weeks over 75 years (1950 - 2025)
              </p>
            </div>
            
            {/* Metric Switcher pills */}
            <div className="flex bg-white/5 rounded-full p-1 border border-white/5">
              <button 
                onClick={() => setMetricType('temp')}
                className={cn(
                  "nav-pill px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer",
                  metricType === 'temp' ? "bg-white text-black" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                Temp ({getTempUnitStr()})
              </button>
              <button 
                onClick={() => setMetricType('precip')}
                className={cn(
                  "nav-pill px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer",
                  metricType === 'precip' ? "bg-white text-black" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                Rain (mm)
              </button>
            </div>
          </div>

          {/* Overlaid lines charts */}
          <div className="h-80 w-full px-2">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <LineChart data={processedChartData}>
                <XAxis 
                  dataKey="dateLabel" 
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
                <Legend 
                  verticalAlign="top" 
                  height={36} 
                  iconType="circle"
                  wrapperStyle={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}
                />
                <Line type="monotone" name="1950 Baseline" dataKey="1950" stroke="#818cf8" strokeWidth={2} dot={false} />
                <Line type="monotone" name="1975 Cycle" dataKey="1975" stroke="#22d3ee" strokeWidth={2} dot={false} />
                <Line type="monotone" name="2000 Cycle" dataKey="2000" stroke="#fbbf24" strokeWidth={2} dot={false} />
                <Line type="monotone" name="2025 Current" dataKey="2025" stroke="#F27D26" strokeWidth={3} dot={true} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </section>

      {/* Historical Bento Summary Indicators */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Metric 1: Temperature Rise */}
        <div className="animate-fade-in">
          <GlassCard className="h-44 flex flex-col justify-between p-6">
            <div className="flex items-center justify-between text-zinc-500">
              <span className="text-[10px] font-bold uppercase tracking-widest">Temperature Shift</span>
              {convertedTempRise > 0 ? (
                <TrendingUp className="w-4 h-4 text-red-400" />
              ) : (
                <TrendingDown className="w-4 h-4 text-blue-400" />
              )}
            </div>
            <div>
              <div className="text-3xl font-black text-white italic tracking-tighter">
                {convertedTempRise > 0 ? `+${convertedTempRise}` : convertedTempRise}
                <span className="text-base font-bold text-zinc-500 uppercase not-italic ml-1">{getTempUnitStr()}</span>
              </div>
              <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider mt-2">
                Overall warming deviation since 1950
              </p>
            </div>
          </GlassCard>
        </div>

        {/* Metric 2: Precipitation Shift */}
        <div className="animate-fade-in">
          <GlassCard className="h-44 flex flex-col justify-between p-6">
            <div className="flex items-center justify-between text-zinc-500">
              <span className="text-[10px] font-bold uppercase tracking-widest">Precipitation Shift</span>
              {summary.precipShift >= 0 ? (
                <TrendingUp className="w-4 h-4 text-[#F27D26]" />
              ) : (
                <TrendingDown className="w-4 h-4 text-blue-400" />
              )}
            </div>
            <div>
              <div className="text-3xl font-black text-white italic tracking-tighter">
                {summary.precipShift >= 0 ? `+${summary.precipShift}` : summary.precipShift}%
              </div>
              <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider mt-2">
                Rainfall volume deviation since 1950
              </p>
            </div>
          </GlassCard>
        </div>

        {/* Metric 3: Warmest Year */}
        <div className="animate-fade-in">
          <GlassCard className="h-44 flex flex-col justify-between p-6">
            <div className="flex items-center gap-2 text-zinc-500">
              <Sun className="w-4 h-4 text-amber-400" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Thermal Peak</span>
            </div>
            <div>
              <div className="text-3xl font-black text-white tracking-widest italic">{summary.warmestYear}</div>
              <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider mt-2">
                Warmest average cycle among decades
              </p>
            </div>
          </GlassCard>
        </div>

        {/* Metric 4: Wettest Year */}
        <div className="animate-fade-in">
          <GlassCard className="h-44 flex flex-col justify-between p-6">
            <div className="flex items-center gap-2 text-zinc-500">
              <CloudRain className="w-4 h-4 text-blue-400" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Hydrological Peak</span>
            </div>
            <div>
              <div className="text-3xl font-black text-white tracking-widest italic">{summary.wettestYear}</div>
              <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider mt-2">
                Wettest average cycle among decades
              </p>
            </div>
          </GlassCard>
        </div>
      </section>

      {/* Deep Decadal Climate Analytics Section */}
      <section className="space-y-6">
        <div className="flex items-baseline gap-4">
          <h3 className="text-lg font-bold text-white uppercase tracking-wider">Decadal Climate Analytics</h3>
          <div className="h-px flex-1 bg-white/5"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {decadalStages.map((stage) => {
            const tempVal = summary.decadalAverages?.[stage.year]?.temp ?? 15;
            const precipVal = summary.decadalAverages?.[stage.year]?.precip ?? 0;
            
            return (
              <div key={stage.year}>
                <GlassCard className="p-6 h-full flex flex-col justify-between space-y-4 border-white/5 hover:border-white/15 transition-all">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-zinc-500 font-bold text-[9px] uppercase tracking-[0.2em]">Decadal Record</span>
                      <h4 className="text-2xl font-black text-white tracking-widest italic mt-1">{stage.year}</h4>
                    </div>
                    <span className={cn("text-[9px] font-black uppercase tracking-wider px-3 py-1.5 rounded-md border", stage.color)}>
                      {stage.classification}
                    </span>
                  </div>
                  
                  <p className="text-xs text-zinc-500 leading-relaxed font-light">
                    {stage.desc}
                  </p>

                  <div className="flex gap-6 pt-2 border-t border-white/5">
                    <div>
                      <div className="text-zinc-500 text-[8px] font-bold uppercase tracking-widest">Decade Average Temp</div>
                      <div className="text-base font-black text-white mt-0.5">
                        {convertTemp(tempVal)}{getTempUnitStr()}
                      </div>
                    </div>
                    <div>
                      <div className="text-zinc-500 text-[8px] font-bold uppercase tracking-widest">Average Daily Rain</div>
                      <div className="text-base font-black text-white mt-0.5">
                        {precipVal.toFixed(2)} mm
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </div>
            );
          })}
        </div>
      </section>

      {/* Climatology Science Explainer Panel */}
      <section className="animate-fade-in">
        <GlassCard className="p-8 border-white/5">
          <div className="flex items-start gap-6">
            <div className="p-4 rounded-[20px] bg-white/5 text-[#F27D26]">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-white uppercase tracking-tight">Decadal Climatology Science</h4>
              <p className="text-sm text-zinc-500 mt-2 leading-relaxed font-light">
                By comparing identical seasonal calendar cycles across 1950, 1975, 2000, and 2025, you can observe localized long-term shifts in weather baselines. These variations reflect global climatological trends, greenhouse trace concentration dynamics, and local terrain hydrologic changes. These calculations are fully derived by scraping satellite and weather archive stations covering the past 75 years.
              </p>
            </div>
          </div>
        </GlassCard>
      </section>
    </div>
  );
}
