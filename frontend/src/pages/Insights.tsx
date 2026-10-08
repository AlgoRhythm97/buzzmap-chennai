import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api, parseApiDate } from '../api/client';
import type { SpeciesClass, StatsSummary, TimeseriesBucket } from '../api/types';
import RecentDetections from '../components/RecentDetections';
import { usePolling } from '../hooks/usePolling';
import { MOSQUITO_SPECIES, SPECIES, SPECIES_ORDER, formatRelative } from '../lib/display';

const RANGES = {
  '24h': { label: 'Last 24 hours', hours: 24, bucketMinutes: 60 },
  '7d': { label: 'Last 7 days', hours: 24 * 7, bucketMinutes: 360 },
} as const;
type RangeKey = keyof typeof RANGES;

const SURFACE = '#1a1a1a';
const GRID = '#2a2a2a';
const AXIS_TEXT = '#9ca3af';

type ChartRow = { start: Date; total: number } & Record<SpeciesClass, number>;

function toRows(buckets: TimeseriesBucket[]): ChartRow[] {
  return buckets.map((b) => {
    const row = { start: parseApiDate(b.bucket_start), total: b.total } as ChartRow;
    for (const s of SPECIES_ORDER) row[s] = b.by_species[s] ?? 0;
    return row;
  });
}

function formatBucket(start: Date, range: RangeKey): string {
  const time = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return range === '24h' ? time : `${start.toLocaleDateString([], { weekday: 'short' })} ${time}`;
}

/** Stacked segment with a 4px rounded top only on the highest non-empty segment of its bar. */
function stackedSegment(species: SpeciesClass) {
  return function Segment(props: unknown) {
    const { x = 0, y = 0, width = 0, height = 0, payload } = props as {
      x?: number; y?: number; width?: number; height?: number; payload: ChartRow;
    };
    if (height <= 0) return <g />;
    const topSpecies = [...SPECIES_ORDER].reverse().find((s) => payload[s] > 0);
    const r = topSpecies === species ? Math.min(4, height, width / 2) : 0;
    const d = `M${x},${y + height} V${y + r} Q${x},${y} ${x + r},${y} H${x + width - r} Q${x + width},${y} ${x + width},${y + r} V${y + height} Z`;
    // Surface-coloured stroke leaves a 2px gap between stacked segments
    return <path d={d} fill={SPECIES[species].color} stroke={SURFACE} strokeWidth={1} />;
  };
}

function ChartTooltip({ active, payload, range }: { active?: boolean; payload?: { payload: ChartRow }[]; range: RangeKey }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  const end = new Date(row.start.getTime() + RANGES[range].bucketMinutes * 60000);
  return (
    <div className="rounded-md border border-gray-700 bg-background/95 px-3 py-2 text-xs shadow-lg">
      <p className="text-gray-400 mb-1">{formatBucket(row.start, range)} – {formatBucket(end, range)}</p>
      {[...SPECIES_ORDER].reverse().filter((s) => row[s] > 0).map((s) => (
        <p key={s} className="flex items-center gap-2 text-gray-200">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: SPECIES[s].color }} />
          <span className="flex-1">{SPECIES[s].label}</span>
          <span className="font-mono">{row[s]}</span>
        </p>
      ))}
      <p className="mt-1 border-t border-gray-700 pt-1 flex justify-between text-white font-medium">
        <span>Total</span><span className="font-mono">{row.total}</span>
      </p>
    </div>
  );
}

function StatTile({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="card-border p-4">
      <p className="text-xs uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-white font-mono">{value}</p>
      {detail && <p className="mt-1 text-xs text-gray-500">{detail}</p>}
    </div>
  );
}

function SpeciesBreakdown({ summary }: { summary: StatsSummary }) {
  const total = summary.detections_in_window;
  const max = Math.max(1, ...SPECIES_ORDER.map((s) => summary.by_species_in_window[s] ?? 0));
  return (
    <div className="card-border p-4">
      <h2 className="text-sm font-semibold text-gray-200 mb-3">Species breakdown</h2>
      <ul className="space-y-2.5">
        {SPECIES_ORDER.map((s) => {
          const count = summary.by_species_in_window[s] ?? 0;
          return (
            <li key={s} className="text-sm" title={`${SPECIES[s].label}: ${count}`}>
              <div className="flex justify-between text-gray-300">
                <span>{SPECIES[s].label}</span>
                <span className="font-mono text-gray-400">
                  {count} <span className="text-gray-500">({total ? Math.round((count / total) * 100) : 0}%)</span>
                </span>
              </div>
              <div className="mt-1 h-2 rounded bg-gray-800">
                <div className="h-2 rounded" style={{ width: `${(count / max) * 100}%`, backgroundColor: SPECIES[s].color }} />
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-gray-500">
        Unknown = the classifier was not confident or the wingbeat was unlike any trained species.
      </p>
    </div>
  );
}

export default function Insights() {
  const [range, setRange] = useState<RangeKey>('24h');
  const { hours, bucketMinutes } = RANGES[range];

  const { data, error, lastUpdated } = usePolling(
    async (signal) => {
      const [summary, timeseries] = await Promise.all([
        api.getSummary({ window_hours: hours }, signal),
        api.getTimeseries({ hours, bucket_minutes: bucketMinutes }, signal),
      ]);
      return { summary, timeseries };
    },
    [hours, bucketMinutes],
  );

  const rows = useMemo(() => toRows(data?.timeseries ?? []), [data]);
  const summary = data?.summary;
  const mosquitoes = summary
    ? MOSQUITO_SPECIES.reduce((sum, s) => sum + (summary.by_species_in_window[s] ?? 0), 0)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-accent-primary">Surveillance Insights</h1>
          <p className="text-xs text-gray-500 font-mono mt-1">
            {error
              ? <span className="text-warning-red">Backend unreachable: {error.message}</span>
              : lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Loading…'}
          </p>
        </div>
        <div className="inline-flex rounded-md border border-gray-700 p-0.5" role="group" aria-label="Time range">
          {(Object.keys(RANGES) as RangeKey[]).map((key) => (
            <button
              key={key}
              onClick={() => setRange(key)}
              aria-pressed={range === key}
              className={`px-3 py-1 text-sm rounded ${range === key ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-200'}`}
            >
              {RANGES[key].label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile
          label="Detections"
          value={summary ? summary.detections_in_window.toLocaleString() : '–'}
          detail={summary ? `${summary.total_detections.toLocaleString()} all time` : undefined}
        />
        <StatTile
          label="Mosquitoes"
          value={summary ? mosquitoes.toLocaleString() : '–'}
          detail="Aedes, Culex and Anopheles"
        />
        <StatTile
          label="Nodes online"
          value={summary ? `${summary.online_nodes} / ${summary.active_nodes}` : '–'}
          detail={summary ? `Reported in the last ${summary.online_minutes} min` : undefined}
        />
        <StatTile
          label="Last detection"
          value={summary ? formatRelative(summary.last_detection_at) : '–'}
          detail={summary?.last_detection_at ? parseApiDate(summary.last_detection_at).toLocaleString() : undefined}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card-border p-4 lg:col-span-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
            <h2 className="text-sm font-semibold text-gray-200">
              Detections per {bucketMinutes === 60 ? 'hour' : `${bucketMinutes / 60} hours`}
            </h2>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400" aria-label="Legend">
              {SPECIES_ORDER.map((s) => (
                <li key={s} className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: SPECIES[s].color }} />
                  {SPECIES[s].label}
                </li>
              ))}
            </ul>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} barCategoryGap={2} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis
                  dataKey={(row: ChartRow) => formatBucket(row.start, range)}
                  tick={{ fill: AXIS_TEXT, fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: GRID }}
                  interval="preserveStartEnd"
                  minTickGap={24}
                />
                <YAxis allowDecimals={false} tick={{ fill: AXIS_TEXT, fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  content={(props) => <ChartTooltip {...(props as object)} range={range} />}
                />
                {SPECIES_ORDER.map((s) => (
                  <Bar key={s} dataKey={s} stackId="species" fill={SPECIES[s].color} shape={stackedSegment(s)} isAnimationActive={false} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <details className="mt-3 text-sm">
            <summary className="cursor-pointer text-gray-400 hover:text-gray-200">View as table</summary>
            <div className="mt-2 max-h-64 overflow-auto">
              <table className="w-full text-xs font-mono">
                <thead className="text-gray-400 sticky top-0 bg-charcoal">
                  <tr>
                    <th className="text-left py-1 pr-2 font-normal">From</th>
                    {SPECIES_ORDER.map((s) => <th key={s} className="text-right px-2 font-normal">{SPECIES[s].label}</th>)}
                    <th className="text-right pl-2 font-normal">Total</th>
                  </tr>
                </thead>
                <tbody className="text-gray-300">
                  {[...rows].reverse().map((row) => (
                    <tr key={row.start.toISOString()} className="border-t border-gray-800">
                      <td className="py-1 pr-2">{formatBucket(row.start, range)}</td>
                      {SPECIES_ORDER.map((s) => <td key={s} className="text-right px-2">{row[s]}</td>)}
                      <td className="text-right pl-2 text-white">{row.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>

        {summary && <SpeciesBreakdown summary={summary} />}
      </div>

      <RecentDetections />
    </div>
  );
}
