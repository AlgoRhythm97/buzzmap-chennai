import type { StatsSummary, TimeseriesBucket } from '../api/types';
import ActivityChart from '../components/ActivityChart';
import { SPECIES, SPECIES_ORDER } from '../lib/display';
import type { RangeKey } from '../lib/ranges';

function SpeciesBreakdown({ summary }: { summary: StatsSummary }) {
  const total = summary.detections_in_window;
  const max = Math.max(1, ...SPECIES_ORDER.map((s) => summary.by_species_in_window[s] ?? 0));
  return (
    <div className="card-border p-4">
      <h3 className="text-sm font-semibold text-gray-200 mb-3">Species breakdown</h3>
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
        {total.toLocaleString()} detections in total ({summary.total_detections.toLocaleString()} all time).
        Unknown means the classifier wasn't confident, or the wingbeat was unlike any trained species.
      </p>
    </div>
  );
}

export default function Activity({ summary, timeseries, range }: { summary?: StatsSummary; timeseries?: TimeseriesBucket[]; range: RangeKey }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2">
        {timeseries ? <ActivityChart timeseries={timeseries} range={range} /> : <div className="card-border h-80" />}
      </div>
      {summary ? <SpeciesBreakdown summary={summary} /> : <div className="card-border h-80" />}
    </div>
  );
}
