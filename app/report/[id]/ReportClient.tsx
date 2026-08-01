'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { SessionReport, PreviousSession, TimelinePoint } from '@/types/report';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  TooltipProps,
  ReferenceLine,
} from 'recharts';

interface Props {
  report: SessionReport;
  previousSessions: PreviousSession[];
  audioUrl: string | null;
}

type SeriesKey = 'focus' | 'stress' | 'calm' | 'cogLoad';

const SERIES: {
  key: SeriesKey;
  label: string;
  color: string;
  dashed?: boolean;
}[] = [
  { key: 'focus', label: 'Focus', color: '#10B981' },
  { key: 'stress', label: 'Stress', color: '#EF4444' },
  { key: 'calm', label: 'Calm', color: '#3B82F6' },
  { key: 'cogLoad', label: 'Cognitive Load', color: '#F59E0B', dashed: true },
];

const avg = (arr: number[]) =>
  arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

const formatDuration = (totalSeconds: number) => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  if (m > 0 && s > 0) return `${m}m ${s}s`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
};

const formatDateTime = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

const formatTime = (dateStr: string) =>
  new Date(dateStr).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

const brainBalanceLabel = (val: number) => {
  if (val < -0.25) return 'Left Hemispheric (Analytical)';
  if (val > 0.25) return 'Right Hemispheric (Creative)';
  return 'Balanced';
};

const scoreInterpretation = (value: number, metric: string) => {
  if (metric === 'Stress') {
    if (value < 30) return { label: 'Low', color: '#10B981' };
    if (value < 60) return { label: 'Moderate', color: '#F59E0B' };
    return { label: 'Elevated', color: '#EF4444' };
  }
  if (value < 30) return { label: 'Low', color: '#EF4444' };
  if (value < 60) return { label: 'Moderate', color: '#F59E0B' };
  return { label: 'High', color: '#10B981' };
};

function SummaryMetricCard({
  value,
  label,
  accentColor,
  interpretation,
}: {
  value: number;
  label: string;
  accentColor: string;
  interpretation: { label: string; color: string };
}) {
  return (
    <div className="rounded-2xl p-5 border border-white/10 bg-white/[0.04]">
      <div
        className="text-4xl font-bold mb-1 tabular-nums"
        style={{ color: accentColor }}
      >
        {value}
        <span className="text-lg font-medium text-white/25 ml-1">/100</span>
      </div>
      <div className="text-[10px] font-bold text-white/40 uppercase tracking-[1.5px] mb-2">
        {label}
      </div>
      <div
        className="text-xs font-semibold px-2 py-0.5 rounded-full inline-block"
        style={{
          background: interpretation.color + '22',
          color: interpretation.color,
        }}
      >
        {interpretation.label}
      </div>
    </div>
  );
}

function DeltaIndicator({
  label,
  baseline,
  final,
  higherIsBetter,
}: {
  label: string;
  baseline: number;
  final: number;
  higherIsBetter: boolean;
}) {
  const diff = Math.round(final - baseline);
  const isPositive = diff >= 0;
  const isGood = higherIsBetter ? isPositive : !isPositive;
  const absVal = Math.abs(diff);

  return (
    <div className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
      <span className="text-sm text-white/60 font-medium w-32">{label}</span>
      <div className="flex items-center gap-4 text-sm">
        <div className="text-center">
          <div className="text-[10px] text-white/35 mb-0.5 uppercase tracking-wide">
            Baseline
          </div>
          <div className="font-semibold text-white/40">{Math.round(baseline)}</div>
        </div>
        <div className="text-white/20">→</div>
        <div className="text-center">
          <div className="text-[10px] text-white/35 mb-0.5 uppercase tracking-wide">
            Final
          </div>
          <div className="font-semibold text-white">{Math.round(final)}</div>
        </div>
        <div
          className="text-xs font-bold px-2.5 py-1 rounded-full min-w-[52px] text-center"
          style={{
            background: isGood ? '#10B98122' : '#EF444422',
            color: isGood ? '#34D399' : '#F87171',
          }}
        >
          {isPositive ? '+' : '−'}
          {absVal}
        </div>
      </div>
    </div>
  );
}

function BrainBalanceBar({
  baseline,
  final,
}: {
  baseline: number;
  final: number;
}) {
  const toPercent = (v: number) => ((v + 1) / 2) * 100;
  const baselinePos = toPercent(baseline);
  const finalPos = toPercent(final);

  return (
    <div>
      <div className="flex justify-between text-xs text-white/40 mb-2.5 font-medium">
        <span>Left (Analytical)</span>
        <span>Balanced</span>
        <span>Right (Creative)</span>
      </div>
      <div className="relative h-7 bg-white/5 rounded-full overflow-hidden border border-white/10">
        <div
          className="absolute inset-0 rounded-full opacity-40"
          style={{
            background: 'linear-gradient(to right, #3B82F6, #ECEEF3, #A855F7)',
          }}
        />
        <div className="absolute left-1/2 top-0 w-px h-full bg-white/40 -translate-x-1/2" />
        <div
          className="absolute top-1.5 w-2 h-4 bg-white/40 rounded-full"
          style={{ left: `calc(${baselinePos}% - 4px)` }}
          title={`Baseline: ${brainBalanceLabel(baseline)}`}
        />
        <div
          className="absolute top-1 w-3.5 h-5 bg-neura-accent rounded-full shadow-glow"
          style={{ left: `calc(${finalPos}% - 7px)` }}
          title={`Session end: ${brainBalanceLabel(final)}`}
        />
      </div>
      <div className="flex justify-between mt-2 text-xs">
        <div className="flex items-center gap-1.5 text-white/40">
          <span className="w-2 h-2 rounded-full bg-white/40 inline-block" />
          Baseline:{' '}
          <span className="font-medium text-white/60">
            {brainBalanceLabel(baseline)}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-neura-accent">
          <span className="w-2 h-2 rounded-full bg-neura-accent inline-block" />
          Session End:{' '}
          <span className="font-medium">{brainBalanceLabel(final)}</span>
        </div>
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-[#0E1320] border border-white/10 rounded-xl shadow-xl p-3 text-xs min-w-[130px]">
      <p className="font-semibold text-white/40 mb-2 border-b border-white/10 pb-1.5">
        {label} min
      </p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-3 mb-1">
          <div className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: p.color }}
            />
            <span className="text-white/55">{p.name}</span>
          </div>
          <span className="font-bold text-white">{Math.round(p.value as number)}</span>
        </div>
      ))}
    </div>
  );
};

function SeriesFilter({
  visible,
  onToggle,
  onShowAll,
  onShowOnly,
}: {
  visible: Record<SeriesKey, boolean>;
  onToggle: (key: SeriesKey) => void;
  onShowAll: () => void;
  onShowOnly: (key: SeriesKey) => void;
}) {
  const activeCount = SERIES.filter((s) => visible[s.key]).length;

  return (
    <div className="mb-4 no-print">
      <div className="flex items-center justify-between mb-2.5">
        <p className="text-[10px] font-bold uppercase tracking-[1.5px] text-white/35">
          Show metrics
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onShowAll}
            className="text-[10px] font-semibold text-neura-accent hover:text-white transition-colors"
          >
            All
          </button>
          <span className="text-white/20">·</span>
          <button
            type="button"
            onClick={() => onShowOnly('focus')}
            className="text-[10px] font-semibold text-white/40 hover:text-white transition-colors"
          >
            Focus only
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Timeline metric filters">
        {SERIES.map((s) => {
          const on = visible[s.key];
          return (
            <button
              key={s.key}
              type="button"
              aria-pressed={on}
              onClick={() => {
                if (on && activeCount === 1) return;
                onToggle(s.key);
              }}
              className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all border"
              style={{
                background: on ? s.color + '22' : 'rgba(255,255,255,0.03)',
                borderColor: on ? s.color + '88' : 'rgba(255,255,255,0.1)',
                color: on ? s.color : 'rgba(255,255,255,0.35)',
              }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{
                  background: on ? s.color : 'rgba(255,255,255,0.2)',
                }}
              />
              {s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function ReportClient({ report, previousSessions, audioUrl }: Props) {
  const timeline: TimelinePoint[] = report.timeline ?? [];

  const [visible, setVisible] = useState<Record<SeriesKey, boolean>>({
    focus: true,
    stress: true,
    calm: true,
    cogLoad: true,
  });

  const toggleSeries = (key: SeriesKey) => {
    setVisible((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      if (!Object.values(next).some(Boolean)) return prev;
      return next;
    });
  };

  const chartData = useMemo(
    () =>
      timeline.map((p) => ({
        ...p,
        time: parseFloat((p.t / 60).toFixed(1)),
      })),
    [timeline]
  );

  const avgFocus = Math.round(avg(timeline.map((p) => p.focus)));
  const avgStress = Math.round(avg(timeline.map((p) => p.stress)));
  const avgCalm = Math.round(avg(timeline.map((p) => p.calm)));
  const avgCogLoad = Math.round(avg(timeline.map((p) => p.cogLoad)));

  const peakFocus =
    timeline.length > 0
      ? timeline.reduce((mx, p) => (p.focus > mx.focus ? p : mx), timeline[0])
      : null;
  const lowestStress =
    timeline.length > 0
      ? timeline.reduce((mn, p) => (p.stress < mn.stress ? p : mn), timeline[0])
      : null;
  const peakCalm =
    timeline.length > 0
      ? timeline.reduce((mx, p) => (p.calm > mx.calm ? p : mx), timeline[0])
      : null;

  const hasPrevious = previousSessions.length > 0;
  const prevAvgFocus = Math.round(
    avg(
      previousSessions
        .filter((s) => s.final_focus !== null)
        .map((s) => s.final_focus!)
    )
  );
  const prevAvgStress = Math.round(
    avg(
      previousSessions
        .filter((s) => s.final_stress !== null)
        .map((s) => s.final_stress!)
    )
  );
  const prevAvgCalm = Math.round(
    avg(
      previousSessions
        .filter((s) => s.final_calm !== null)
        .map((s) => s.final_calm!)
    )
  );

  const comparisonData = [
    { metric: 'Focus', Current: Math.round(report.final_focus ?? 0), 'Previous Avg': prevAvgFocus },
    { metric: 'Calm', Current: Math.round(report.final_calm ?? 0), 'Previous Avg': prevAvgCalm },
    { metric: 'Stress', Current: Math.round(report.final_stress ?? 0), 'Previous Avg': prevAvgStress },
  ];

  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTimeUpdate = () => setAudioCurrentTime(audio.currentTime);
    const onLoaded = () => setAudioDuration(audio.duration || 0);
    const onEnded = () => setIsPlaying(false);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('durationchange', onLoaded);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('durationchange', onLoaded);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const seekTo = (seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, seconds);
    setAudioCurrentTime(Math.max(0, seconds));
  };

  const formatAudioTime = (s: number) => {
    if (!isFinite(s) || isNaN(s) || s === 0) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const cursorMins = audioCurrentTime / 60;

  return (
    <div className="min-h-screen bg-neura-bg font-sans">
      <header
        style={{
          background:
            'linear-gradient(145deg, #07090F 0%, #0E1320 45%, #1a1040 100%)',
        }}
      >
        <div className="max-w-2xl mx-auto px-6 py-10 print:py-6 relative overflow-hidden">
          <div
            className="pointer-events-none absolute -top-20 right-0 w-72 h-72 rounded-full opacity-30 blur-3xl"
            style={{
              background: 'radial-gradient(circle, #6366F1 0%, transparent 70%)',
            }}
          />
          <div className="relative">
            <div className="flex items-center gap-2 mb-5">
              <span className="text-neura-accent text-xs font-bold uppercase tracking-[3px]">
                Neura
              </span>
              <span className="text-white/20 text-xs">·</span>
              <span className="text-white/40 text-xs font-semibold uppercase tracking-[2px]">
                Brain Performance Report
              </span>
            </div>

            <h1 className="text-white text-3xl font-bold leading-tight mb-1 tracking-tight">
              {report.session_name}
            </h1>
            <p className="text-white/55 text-sm font-medium mb-0.5">
              {report.first_name} {report.last_name}
            </p>
            <p className="text-white/35 text-xs">
              {formatDateTime(report.created_at)} &nbsp;·&nbsp;{' '}
              {formatTime(report.created_at)}
            </p>

            <div className="flex gap-3 mt-7 flex-wrap">
              <div className="bg-white/5 backdrop-blur rounded-2xl px-5 py-3 border border-white/10">
                <div className="text-white text-base font-bold">
                  {formatDuration(report.duration_seconds)}
                </div>
                <div className="text-white/40 text-xs mt-0.5">Session duration</div>
              </div>
              <div className="bg-white/5 backdrop-blur rounded-2xl px-5 py-3 border border-white/10">
                <div className="text-white text-base font-bold">{timeline.length}</div>
                <div className="text-white/40 text-xs mt-0.5">Data points</div>
              </div>
              {report.is_urgent && (
                <div className="bg-amber-500/10 rounded-2xl px-5 py-3 border border-amber-400/25">
                  <div className="text-amber-300 text-base font-bold">Early Stop</div>
                  <div className="text-amber-400/80 text-xs mt-0.5">Urgent session</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-8 space-y-8">
        <section>
          <SectionHeader
            title="Session Summary"
            subtitle="Average scores across the full recording period"
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryMetricCard
              value={avgFocus}
              label="Focus"
              accentColor="#10B981"
              interpretation={scoreInterpretation(avgFocus, 'Focus')}
            />
            <SummaryMetricCard
              value={avgStress}
              label="Stress"
              accentColor="#EF4444"
              interpretation={scoreInterpretation(avgStress, 'Stress')}
            />
            <SummaryMetricCard
              value={avgCalm}
              label="Calm"
              accentColor="#3B82F6"
              interpretation={scoreInterpretation(avgCalm, 'Calm')}
            />
            <SummaryMetricCard
              value={avgCogLoad}
              label="Cognitive Load"
              accentColor="#F59E0B"
              interpretation={scoreInterpretation(avgCogLoad, 'Cognitive Load')}
            />
          </div>
        </section>

        {chartData.length > 0 && (
          <section>
            <SectionHeader
              title="Performance Timeline"
              subtitle={
                audioUrl
                  ? 'Toggle metrics below · click the chart to jump in the recording'
                  : 'Toggle metrics to isolate Focus, Stress, Calm, or Cognitive Load'
              }
            />
            <div className="rounded-2xl p-5 border border-white/10 bg-white/[0.04]">
              <SeriesFilter
                visible={visible}
                onToggle={toggleSeries}
                onShowAll={() =>
                  setVisible({ focus: true, stress: true, calm: true, cogLoad: true })
                }
                onShowOnly={(key) =>
                  setVisible({
                    focus: key === 'focus',
                    stress: key === 'stress',
                    calm: key === 'calm',
                    cogLoad: key === 'cogLoad',
                  })
                }
              />

              <div style={{ cursor: audioUrl ? 'pointer' : 'default' }}>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart
                    data={chartData}
                    margin={{ top: 8, right: 8, bottom: 4, left: -20 }}
                    onClick={
                      audioUrl
                        ? (data: { activePayload?: { payload?: { time?: number } }[] }) => {
                            const t = data?.activePayload?.[0]?.payload?.time;
                            if (t != null) seekTo(t * 60);
                          }
                        : undefined
                    }
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis
                      type="number"
                      dataKey="time"
                      domain={['dataMin', 'dataMax']}
                      tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.35)' }}
                      tickFormatter={(v) => `${Math.round(v)}m`}
                      axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.35)' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    {SERIES.map(
                      (s) =>
                        visible[s.key] && (
                          <Line
                            key={s.key}
                            type="monotone"
                            dataKey={s.key}
                            stroke={s.color}
                            strokeWidth={s.dashed ? 1.5 : 2}
                            dot={false}
                            name={s.label}
                            strokeDasharray={s.dashed ? '4 3' : undefined}
                            isAnimationActive={false}
                          />
                        )
                    )}
                    {audioUrl && (
                      <ReferenceLine
                        x={cursorMins}
                        stroke="#6366F1"
                        strokeWidth={2}
                        strokeDasharray="4 3"
                        label={{
                          value: '▶',
                          fill: '#6366F1',
                          fontSize: 10,
                          position: 'insideTopRight',
                        }}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {audioUrl && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <audio ref={audioRef} src={audioUrl} preload="metadata" className="hidden" />
                  <div className="flex items-center gap-3">
                    <button
                      onClick={togglePlay}
                      className="w-9 h-9 rounded-full bg-neura-accent hover:bg-indigo-500 flex items-center justify-center shrink-0 transition-colors"
                      aria-label={isPlaying ? 'Pause' : 'Play'}
                    >
                      {isPlaying ? (
                        <svg width="11" height="11" viewBox="0 0 11 11" fill="white">
                          <rect x="1.5" y="1" width="3" height="9" rx="1" />
                          <rect x="6.5" y="1" width="3" height="9" rx="1" />
                        </svg>
                      ) : (
                        <svg width="11" height="11" viewBox="0 0 11 11" fill="white">
                          <path d="M2.5 1.5l7 4-7 4V1.5z" />
                        </svg>
                      )}
                    </button>
                    <div className="flex-1">
                      <input
                        type="range"
                        min={0}
                        max={audioDuration || 1}
                        step={0.5}
                        value={audioCurrentTime}
                        onChange={(e) => seekTo(Number(e.target.value))}
                        className="w-full accent-indigo-500 cursor-pointer"
                        style={{ height: '4px' }}
                      />
                    </div>
                    <span className="text-xs text-white/40 tabular-nums shrink-0">
                      {formatAudioTime(audioCurrentTime)} / {formatAudioTime(audioDuration)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        <section>
          <SectionHeader
            title="Baseline Comparison"
            subtitle="Resting state during calibration vs. values at session end"
          />
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-2">
            <DeltaIndicator
              label="Focus"
              baseline={report.baseline_focus}
              final={report.final_focus}
              higherIsBetter
            />
            <DeltaIndicator
              label="Stress"
              baseline={report.baseline_stress}
              final={report.final_stress}
              higherIsBetter={false}
            />
            <DeltaIndicator
              label="Calm"
              baseline={report.baseline_calm}
              final={report.final_calm}
              higherIsBetter
            />
            <DeltaIndicator
              label="Cognitive Load"
              baseline={report.baseline_cognitive_load}
              final={report.final_cognitive_load}
              higherIsBetter={false}
            />
          </div>
        </section>

        <section>
          <SectionHeader
            title="Hemispheric Balance"
            subtitle="Alpha-band asymmetry — left/right neural dominance"
          />
          <div className="rounded-2xl p-5 border border-white/10 bg-white/[0.04]">
            <BrainBalanceBar
              baseline={report.baseline_brain_balance}
              final={report.final_brain_balance}
            />
          </div>
        </section>

        {timeline.length > 0 && peakFocus && lowestStress && peakCalm && (
          <section>
            <SectionHeader
              title="Session Markers"
              subtitle="Notable points identified in the recording timeline"
            />
            <div className="space-y-3">
              <MarkerCard
                label="Peak Focus"
                time={formatDuration(peakFocus.t)}
                value={Math.round(peakFocus.focus)}
                metric="Focus"
                accentColor="#10B981"
                description={`Highest focus score of ${Math.round(peakFocus.focus)} at ${formatDuration(peakFocus.t)}.`}
              />
              <MarkerCard
                label="Lowest Stress"
                time={formatDuration(lowestStress.t)}
                value={Math.round(lowestStress.stress)}
                metric="Stress"
                accentColor="#EF4444"
                description={`Minimum stress of ${Math.round(lowestStress.stress)} at ${formatDuration(lowestStress.t)}.`}
              />
              <MarkerCard
                label="Peak Calm"
                time={formatDuration(peakCalm.t)}
                value={Math.round(peakCalm.calm)}
                metric="Calm"
                accentColor="#3B82F6"
                description={`Maximum calm of ${Math.round(peakCalm.calm)} at ${formatDuration(peakCalm.t)}.`}
              />
            </div>
          </section>
        )}

        {hasPrevious && (
          <section>
            <SectionHeader
              title="Cross-Session Comparison"
              subtitle={`Current vs. average of ${previousSessions.length} previous session${previousSessions.length > 1 ? 's' : ''}`}
            />
            <div className="rounded-2xl p-5 border border-white/10 bg-white/[0.04] mb-3">
              <ResponsiveContainer width="100%" height={190}>
                <BarChart
                  data={comparisonData}
                  margin={{ top: 4, right: 4, bottom: 4, left: -22 }}
                  barCategoryGap="35%"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis
                    dataKey="metric"
                    tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.4)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.35)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid rgba(255,255,255,0.1)',
                      background: '#0E1320',
                      color: '#ECEEF3',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="Current" fill="#6366F1" radius={[5, 5, 0, 0]} />
                  <Bar dataKey="Previous Avg" fill="rgba(255,255,255,0.15)" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2">
              {previousSessions.map((s) => (
                <div
                  key={s.id}
                  className="rounded-2xl px-4 py-3 flex justify-between items-center border border-white/10 bg-white/[0.04]"
                >
                  <div>
                    <div className="text-sm font-semibold text-white">{s.session_name}</div>
                    <div className="text-xs text-white/35 mt-0.5">
                      {formatDateTime(s.created_at)} · {formatDuration(s.duration_seconds)}
                    </div>
                  </div>
                  <div className="flex gap-2 text-xs shrink-0">
                    {s.final_focus !== null && (
                      <span className="bg-emerald-500/15 text-emerald-400 font-semibold px-2 py-0.5 rounded-full">
                        F {Math.round(s.final_focus)}
                      </span>
                    )}
                    {s.final_stress !== null && (
                      <span className="bg-red-500/15 text-red-400 font-semibold px-2 py-0.5 rounded-full">
                        S {Math.round(s.final_stress)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="no-print pb-4">
          <button
            onClick={() => window.print()}
            className="w-full text-white py-4 rounded-2xl font-semibold text-base transition-all"
            style={{
              background: 'linear-gradient(135deg, #6366F1, #A855F7)',
            }}
          >
            Download as PDF
          </button>
          <p className="text-center text-xs text-white/35 mt-2">
            Use your browser&apos;s print dialog and choose &quot;Save as PDF&quot;
          </p>
        </section>
      </main>

      <footer className="text-center py-6 text-xs text-white/30 border-t border-white/5 no-print">
        <span className="font-medium text-white/50">Neura</span> · EEG Brain Performance
        Analysis
      </footer>
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-bold text-white tracking-tight">{title}</h2>
      {subtitle && (
        <p className="text-xs text-white/40 mt-0.5 leading-relaxed">{subtitle}</p>
      )}
    </div>
  );
}

function MarkerCard({
  label,
  time,
  value,
  metric,
  accentColor,
  description,
}: {
  label: string;
  time: string;
  value: number;
  metric: string;
  accentColor: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded"
              style={{ background: accentColor + '22', color: accentColor }}
            >
              {label}
            </span>
            <span className="text-xs text-white/35">at {time}</span>
          </div>
          <p className="text-sm text-white/55 leading-relaxed">{description}</p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-2xl font-bold" style={{ color: accentColor }}>
            {value}
          </div>
          <div className="text-xs text-white/35">{metric}</div>
        </div>
      </div>
    </div>
  );
}
