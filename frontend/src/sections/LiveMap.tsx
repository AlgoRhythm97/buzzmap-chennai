import { useEffect, useMemo } from 'react';
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { api, parseApiDate } from '../api/client';
import type { NodeActivity, SensorNode, SpeciesClass } from '../api/types';
import SpeciesBadge from '../components/SpeciesBadge';
import { usePolling } from '../hooks/usePolling';
import { MOSQUITO_SPECIES, NODE_STATUS, SPECIES, SPECIES_ORDER, formatRelative, nodeStatus } from '../lib/display';
import { RANGES, type RangeKey } from '../lib/ranges';
import type { MosquitoModelId } from '../three/mosquito-models';
import { MODEL_FOR_CLASS } from '../three/speciesModels';

const CHENNAI_CENTER: [number, number] = [13.02, 80.21];
const EMPTY: NodeActivity = { node_id: '', total: 0, by_species: {}, last_detection_at: null };

const mosquitoCount = (a: NodeActivity) => MOSQUITO_SPECIES.reduce((sum, s) => sum + (a.by_species[s] ?? 0), 0);

/** Marker area grows with mosquito count; sqrt keeps busy places from swamping the map. */
const markerRadius = (mosquitoes: number) => 9 + Math.sqrt(mosquitoes) * 2.2;

interface LiveMapProps {
  nodes: SensorNode[];
  activity: NodeActivity[];
  range: RangeKey;
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
  onOpenSpecies: (id: MosquitoModelId) => void;
  onOpenDetection: (id: string) => void;
}

function FlyToSelected({ node }: { node?: SensorNode }) {
  const map = useMap();
  useEffect(() => {
    if (node) map.flyTo([node.latitude, node.longitude], Math.max(map.getZoom(), 12), { duration: 0.6 });
  }, [map, node]);
  return null;
}

function SpeciesRows({ activity, onOpenSpecies }: { activity: NodeActivity; onOpenSpecies: (id: MosquitoModelId) => void }) {
  const max = Math.max(1, ...SPECIES_ORDER.map((s) => activity.by_species[s] ?? 0));
  return (
    <ul className="space-y-2.5">
      {SPECIES_ORDER.map((s: SpeciesClass) => {
        const count = activity.by_species[s] ?? 0;
        const model = MODEL_FOR_CLASS[s];
        return (
          <li key={s} className="text-sm">
            <div className="flex items-center justify-between gap-2 text-gray-300">
              <SpeciesBadge species={s} />
              <span className="flex items-center gap-2">
                <span className="font-mono text-white">{count}</span>
                {model && (
                  <button
                    onClick={() => onOpenSpecies(model)}
                    className="rounded border border-gray-700 px-1.5 py-0.5 text-[11px] text-gray-400 hover:border-accent-primary hover:text-accent-primary"
                    title={`See a 3D ${SPECIES[s].label} mosquito`}
                  >
                    3D
                  </button>
                )}
              </span>
            </div>
            <div className="mt-1 h-1.5 rounded bg-gray-800">
              <div className="h-1.5 rounded" style={{ width: `${(count / max) * 100}%`, backgroundColor: SPECIES[s].color }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function PlacePanel({ node, activity, range, onClose, onOpenSpecies, onOpenDetection }: {
  node: SensorNode;
  activity: NodeActivity;
  range: RangeKey;
  onClose: () => void;
  onOpenSpecies: (id: MosquitoModelId) => void;
  onOpenDetection: (id: string) => void;
}) {
  const { data: latest } = usePolling((signal) => api.getDetections({ node_id: node.id, limit: 5 }, signal), [node.id]);
  const status = nodeStatus(node);
  const mosquitoes = mosquitoCount(activity);
  const aedes = activity.by_species.AEDES ?? 0;
  const anopheles = activity.by_species.ANOPHELES ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">{node.locality ?? 'Sensing node'}</p>
          <h3 className="text-lg font-semibold text-white">{node.name}</h3>
          <p className="text-xs text-gray-400">
            <span style={{ color: NODE_STATUS[status].color }}>●</span> {NODE_STATUS[status].label} · last report {formatRelative(node.last_seen_at)}
          </p>
        </div>
        <button onClick={onClose} className="text-xs text-gray-400 hover:text-white" aria-label="Back to all places">
          All places
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-md bg-background/60 p-3">
          <p className="text-xs text-gray-400">Mosquitoes</p>
          <p className="text-3xl font-semibold font-mono text-white">{mosquitoes}</p>
          <p className="text-[11px] text-gray-500">{RANGES[range].label.toLowerCase()}</p>
        </div>
        <div className="rounded-md bg-background/60 p-3">
          <p className="text-xs text-gray-400">All detections</p>
          <p className="text-3xl font-semibold font-mono text-gray-300">{activity.total}</p>
          <p className="text-[11px] text-gray-500">incl. other insects</p>
        </div>
      </div>

      {(aedes > 0 || anopheles > 0) && (
        <ul className="space-y-1 text-xs text-gray-300">
          {aedes > 0 && <li>⚠ <strong>Aedes</strong> present: carries dengue and chikungunya. Check for stored water nearby.</li>}
          {anopheles > 0 && <li>⚠ <strong>Anopheles</strong> present: the malaria vector group.</li>}
        </ul>
      )}

      <SpeciesRows activity={activity} onOpenSpecies={onOpenSpecies} />

      <div>
        <h4 className="text-xs uppercase tracking-wide text-gray-500 mb-1">Latest here</h4>
        <ul className="divide-y divide-gray-800 text-sm">
          {latest?.map((d) => (
            <li key={d.id}>
              <button
                onClick={() => onOpenDetection(d.id)}
                className="flex w-full items-center justify-between gap-2 py-1.5 text-left hover:text-accent-primary"
              >
                <SpeciesBadge species={d.species_class} />
                <span className="text-xs text-gray-500" title={parseApiDate(d.timestamp).toLocaleString()}>
                  {formatRelative(d.timestamp)}
                </span>
              </button>
            </li>
          ))}
          {latest?.length === 0 && <li className="py-1.5 text-gray-500">No detections yet.</li>}
        </ul>
      </div>
    </div>
  );
}

function Hotspots({ nodes, activity, range, onSelectNode }: {
  nodes: SensorNode[];
  activity: Map<string, NodeActivity>;
  range: RangeKey;
  onSelectNode: (id: string) => void;
}) {
  const ranked = nodes
    .map((n) => ({ node: n, mosquitoes: mosquitoCount(activity.get(n.id) ?? EMPTY) }))
    .sort((a, b) => b.mosquitoes - a.mosquitoes);
  const max = Math.max(1, ranked[0]?.mosquitoes ?? 0);

  return (
    <div>
      <h3 className="text-lg font-semibold text-white">Mosquito hotspots</h3>
      <p className="text-xs text-gray-400 mb-3">
        {RANGES[range].label}. <span className="text-gray-300">Click a place on the map</span> or in this list to see its mosquitoes.
      </p>
      <ol className="space-y-1">
        {ranked.map(({ node, mosquitoes }, i) => (
          <li key={node.id}>
            <button
              onClick={() => onSelectNode(node.id)}
              className="w-full rounded-md px-2 py-1.5 text-left hover:bg-gray-800/70"
            >
              <span className="flex items-center justify-between text-sm">
                <span className="text-gray-200"><span className="text-gray-500 font-mono mr-2">{i + 1}</span>{node.locality ?? node.name}</span>
                <span className="font-mono text-white">{mosquitoes}</span>
              </span>
              <span className="mt-1 block h-1 rounded bg-gray-800">
                <span className="block h-1 rounded bg-accent-primary/70" style={{ width: `${(mosquitoes / max) * 100}%` }} />
              </span>
            </button>
          </li>
        ))}
      </ol>
      {nodes.length === 0 && (
        <p className="text-sm text-warning-amber">
          No places yet. Run <code className="font-mono">python -m scripts.seed_demo --reset</code> in backend/.
        </p>
      )}
    </div>
  );
}

export default function LiveMap({ nodes, activity, range, selectedNodeId, onSelectNode, onOpenSpecies, onOpenDetection }: LiveMapProps) {
  const byNode = useMemo(() => new Map(activity.map((a) => [a.node_id, a])), [activity]);
  const selected = nodes.find((n) => n.id === selectedNodeId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-2">
        <div className="card-border overflow-hidden relative z-0 h-[60vh] min-h-96 max-h-[640px]">
          <MapContainer center={CHENNAI_CENTER} zoom={11} className="h-full w-full" scrollWheelZoom={false}>
            {/* Standard OSM tiles (no API key), darkened via the .map-tiles-dark CSS filter */}
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              className="map-tiles-dark"
            />
            <FlyToSelected node={selected} />
            {nodes.map((node) => {
              const nodeActivity = byNode.get(node.id) ?? EMPTY;
              const mosquitoes = mosquitoCount(nodeActivity);
              const color = NODE_STATUS[nodeStatus(node)].color;
              const isSelected = node.id === selectedNodeId;
              return (
                <CircleMarker
                  key={node.id}
                  center={[node.latitude, node.longitude]}
                  radius={markerRadius(mosquitoes)}
                  pathOptions={{
                    color: isSelected ? '#ffffff' : color,
                    fillColor: color,
                    fillOpacity: isSelected ? 0.55 : 0.3,
                    weight: isSelected ? 3 : 2,
                  }}
                  eventHandlers={{ click: () => onSelectNode(node.id) }}
                >
                  <Tooltip direction="top" offset={[0, -6]}>
                    <span className="font-medium">{node.locality ?? node.name}</span>: {mosquitoes} mosquitoes
                  </Tooltip>
                </CircleMarker>
              );
            })}
          </MapContainer>
        </div>
        <div className="flex flex-wrap gap-4 text-xs text-gray-400">
          <span>Circle size = mosquitoes detected.</span>
          {Object.values(NODE_STATUS).map(({ label, color }) => (
            <span key={label} className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
              {label}
            </span>
          ))}
        </div>
      </div>

      <aside className="card-border p-4 self-start lg:h-[60vh] lg:min-h-96 lg:max-h-[640px] overflow-y-auto" aria-live="polite">
        {selected ? (
          <PlacePanel
            node={selected}
            activity={byNode.get(selected.id) ?? EMPTY}
            range={range}
            onClose={() => onSelectNode(null)}
            onOpenSpecies={onOpenSpecies}
            onOpenDetection={onOpenDetection}
          />
        ) : (
          <Hotspots nodes={nodes} activity={byNode} range={range} onSelectNode={onSelectNode} />
        )}
      </aside>
    </div>
  );
}
