import { useMemo } from 'react';
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { api, toApiDate } from '../api/client';
import type { Detection, SensorNode, SpeciesClass } from '../api/types';
import { usePolling } from '../hooks/usePolling';
import { NODE_STATUS, SPECIES, SPECIES_ORDER, formatRelative, nodeStatus } from '../lib/display';

const CHENNAI_CENTER: [number, number] = [13.04, 80.22];
const WINDOW_HOURS = 24;

interface NodeActivity {
  total: number;
  bySpecies: Partial<Record<SpeciesClass, number>>;
}

async function fetchMapData(signal: AbortSignal) {
  const since = toApiDate(new Date(Date.now() - WINDOW_HOURS * 3600 * 1000));
  const [nodes, detections] = await Promise.all([
    api.getNodes(signal),
    api.getDetections({ since, limit: 1000 }, signal),
  ]);
  return { nodes, detections };
}

function activityByNode(detections: Detection[]): Map<string, NodeActivity> {
  const activity = new Map<string, NodeActivity>();
  for (const d of detections) {
    if (!d.node_id) continue;
    const entry = activity.get(d.node_id) ?? { total: 0, bySpecies: {} };
    entry.total += 1;
    entry.bySpecies[d.species_class] = (entry.bySpecies[d.species_class] ?? 0) + 1;
    activity.set(d.node_id, entry);
  }
  return activity;
}

/** Marker area grows with activity; sqrt keeps busy nodes from swamping the map. */
function markerRadius(total: number): number {
  return 8 + Math.sqrt(total) * 2.5;
}

function NodePopup({ node, activity }: { node: SensorNode; activity?: NodeActivity }) {
  const status = nodeStatus(node);
  return (
    <div className="text-sm min-w-48">
      <p className="font-semibold">{node.name}</p>
      <p className="text-gray-500 font-mono text-xs">{node.id}</p>
      <p className="mt-1">
        <span style={{ color: NODE_STATUS[status].color }}>●</span> {NODE_STATUS[status].label}
        {' · '}last report {formatRelative(node.last_seen_at)}
      </p>
      <p className="mt-1 font-medium">{activity?.total ?? 0} detections in {WINDOW_HOURS} h</p>
      <ul className="mt-1">
        {SPECIES_ORDER.filter((s) => activity?.bySpecies[s]).map((s) => (
          <li key={s}>
            <span style={{ color: SPECIES[s].color }}>■</span> {SPECIES[s].label}: {activity?.bySpecies[s]}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function MapPage() {
  const { data, error, loading, lastUpdated } = usePolling(fetchMapData);
  const activity = useMemo(() => activityByNode(data?.detections ?? []), [data]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-accent-primary">Chennai Surveillance Map</h1>
          <p className="text-gray-400 text-sm">
            Sensing nodes sized by detections in the last {WINDOW_HOURS} hours.
          </p>
        </div>
        <p className="text-xs text-gray-500 font-mono">
          {error
            ? <span className="text-warning-red">Backend unreachable: {error.message}</span>
            : lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : loading ? 'Loading…' : null}
        </p>
      </div>

      <div className="card-border overflow-hidden h-[65vh] min-h-96">
        <MapContainer center={CHENNAI_CENTER} zoom={11} className="h-full w-full" scrollWheelZoom>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          {data?.nodes.map((node) => {
            const nodeActivity = activity.get(node.id);
            const color = NODE_STATUS[nodeStatus(node)].color;
            return (
              <CircleMarker
                key={node.id}
                center={[node.latitude, node.longitude]}
                radius={markerRadius(nodeActivity?.total ?? 0)}
                pathOptions={{ color, fillColor: color, fillOpacity: 0.35, weight: 2 }}
              >
                <Popup>
                  <NodePopup node={node} activity={nodeActivity} />
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-gray-400">
        {Object.values(NODE_STATUS).map(({ label, color }) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
            {label}
          </span>
        ))}
        {data && data.nodes.length === 0 && (
          <span className="text-warning-amber">
            No nodes registered yet. Run <code className="font-mono">python -m scripts.seed_demo --reset</code> in backend/.
          </span>
        )}
      </div>
    </div>
  );
}
