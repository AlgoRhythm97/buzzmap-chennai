import { useMemo } from 'react';
import { api, parseApiDate } from '../api/client';
import type { SensorNode } from '../api/types';
import { usePolling } from '../hooks/usePolling';
import { formatRelative } from '../lib/display';
import SpeciesBadge from './SpeciesBadge';

export default function RecentDetections({ nodes, onOpen, limit = 12 }: {
  nodes: SensorNode[];
  onOpen: (id: string) => void;
  limit?: number;
}) {
  const { data: detections, error } = usePolling((signal) => api.getDetections({ limit }, signal), [limit]);
  const nodeNames = useMemo(() => new Map(nodes.map((n) => [n.id, n.locality ?? n.name])), [nodes]);

  return (
    <div className="card-border p-4">
      {error && !detections && <p className="text-sm text-warning-red">Could not load detections: {error.message}</p>}
      {detections && detections.length === 0 && <p className="text-sm text-gray-400">No detections yet.</p>}
      {detections && detections.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wide text-gray-400">
              <tr>
                <th className="text-left font-normal py-2 pr-4">When</th>
                <th className="text-left font-normal py-2 pr-4">Place</th>
                <th className="text-left font-normal py-2 pr-4">Species</th>
                <th className="text-right font-normal py-2 pr-4">Confidence</th>
                <th className="text-right font-normal py-2">Wingbeat</th>
              </tr>
            </thead>
            <tbody className="text-gray-300">
              {detections.map((d) => (
                <tr key={d.id} onClick={() => onOpen(d.id)} className="cursor-pointer border-t border-gray-800 hover:bg-white/5">
                  <td className="py-2 pr-4 whitespace-nowrap" title={parseApiDate(d.timestamp).toLocaleString()}>
                    {/* Real button so the row is reachable by keyboard */}
                    <button onClick={(e) => { e.stopPropagation(); onOpen(d.id); }} className="hover:text-accent-primary">
                      {formatRelative(d.timestamp)}
                    </button>
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
