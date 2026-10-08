import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api, parseApiDate } from '../api/client';
import { usePolling } from '../hooks/usePolling';
import { formatRelative } from '../lib/display';
import SpeciesBadge from './SpeciesBadge';

async function fetchRecent(signal: AbortSignal, limit: number) {
  const [detections, nodes] = await Promise.all([api.getDetections({ limit }, signal), api.getNodes(signal)]);
  return { detections, nodes };
}

export default function RecentDetections({ limit = 15 }: { limit?: number }) {
  const { data, error } = usePolling((signal) => fetchRecent(signal, limit), [limit]);
  const nodeNames = useMemo(() => new Map(data?.nodes.map((n) => [n.id, n.name])), [data]);

  return (
    <div className="card-border p-4">
      <h2 className="text-sm font-semibold text-gray-200 mb-3">Latest detections</h2>
      {error && !data && <p className="text-sm text-warning-red">Could not load detections: {error.message}</p>}
      {data && data.detections.length === 0 && <p className="text-sm text-gray-400">No detections yet.</p>}
      {data && data.detections.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wide text-gray-400">
              <tr>
                <th className="text-left font-normal py-2 pr-4">When</th>
                <th className="text-left font-normal py-2 pr-4">Node</th>
                <th className="text-left font-normal py-2 pr-4">Species</th>
                <th className="text-right font-normal py-2 pr-4">Confidence</th>
                <th className="text-right font-normal py-2">Wingbeat</th>
              </tr>
            </thead>
            <tbody className="text-gray-300">
              {data.detections.map((d) => (
                <tr key={d.id} className="border-t border-gray-800 hover:bg-white/5">
                  <td className="py-2 pr-4 whitespace-nowrap" title={parseApiDate(d.timestamp).toLocaleString()}>
                    <Link to={`/result/${d.id}`} className="hover:text-accent-primary">{formatRelative(d.timestamp)}</Link>
                  </td>
                  <td className="py-2 pr-4 whitespace-nowrap">
                    {d.node_id ? nodeNames.get(d.node_id) ?? d.node_id : <span className="text-gray-500">Ad-hoc upload</span>}
                  </td>
                  <td className="py-2 pr-4 whitespace-nowrap"><SpeciesBadge species={d.species_class} /></td>
                  <td className="py-2 pr-4 text-right font-mono">
                    {d.confidence === null ? '–' : `${Math.round(d.confidence * 100)}%`}
                  </td>
                  <td className="py-2 text-right font-mono whitespace-nowrap">{d.dominant_freq_hz.toFixed(0)} Hz</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
