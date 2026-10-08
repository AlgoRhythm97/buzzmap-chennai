import { CircleMarker, MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { ApiError, api, parseApiDate } from '../api/client';
import type { Detection, SensorNode } from '../api/types';
import { usePolling } from '../hooks/usePolling';
import { SPECIES } from '../lib/display';
import { picturesFor } from '../lib/pictures';
import type { MosquitoModelId } from '../three/mosquito-models';
import { MODEL_FOR_CLASS, SPECIMENS } from '../three/speciesModels';
import SpeciesBadge from './SpeciesBadge';

/** Plain-language reason for the classifier's answer. */
function classificationNote(d: Detection): string {
  if (d.species_class !== 'UNKNOWN') return 'Matched a trained species with enough confidence.';
  if (d.confidence === null) {
    return 'Not classified: the wingbeat is unlike anything the model was trained on (or no model is loaded), so the system declines to guess.';
  }
  return 'The model could not choose a species confidently enough, so the event is reported as Unknown rather than guessed.';
}

const FEATURES: { key: keyof Detection; label: string; format: (v: number) => string; hint: string }[] = [
  { key: 'dominant_freq_hz', label: 'Wingbeat frequency', format: (v) => `${v.toFixed(1)} Hz`, hint: 'Strongest frequency in the signal' },
  { key: 'harmonic_ratio', label: 'Harmonic ratio', format: (v) => v.toFixed(3), hint: '2nd harmonic ÷ fundamental' },
  { key: 'rms', label: 'RMS amplitude', format: (v) => v.toFixed(4), hint: 'Average modulation strength' },
  { key: 'peak_to_peak', label: 'Peak-to-peak', format: (v) => v.toFixed(4), hint: 'Largest swing in the waveform' },
  { key: 'peak_magnitude', label: 'Peak magnitude', format: (v) => v.toFixed(4), hint: 'FFT magnitude at the wingbeat frequency' },
  { key: 'spectral_energy', label: 'Spectral energy', format: (v) => v.toExponential(2), hint: 'Total energy across the spectrum' },
];

export default function DetectionDetail({ id, nodes, onOpenSpecies }: {
  id: string;
  nodes: SensorNode[];
  onOpenSpecies: (id: MosquitoModelId) => void;
}) {
  // A stored detection never changes, so refresh rarely
  const { data: d, error, loading } = usePolling((signal) => api.getDetection(id, signal), [id], 60000);

  if (!d) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <p className="text-gray-400">
        {loading ? 'Loading…' : notFound ? 'This detection no longer exists.' : `Could not load detection: ${error?.message}`}
      </p>
    );
  }

  const node = nodes.find((n) => n.id === d.node_id);
  const confidencePct = d.confidence === null ? null : Math.round(d.confidence * 100);
  const modelId = MODEL_FOR_CLASS[d.species_class];
  const specimen = SPECIMENS.find((s) => s.id === modelId);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <p className="text-3xl font-bold text-white"><SpeciesBadge species={d.species_class} /></p>
          <p className="mt-1 text-sm text-gray-400">
            {parseApiDate(d.timestamp).toLocaleString()} · {node?.name ?? 'Ad-hoc upload'}
          </p>
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-300">
              <span>Classifier confidence</span>
              <span className="font-mono">{confidencePct === null ? 'n/a' : `${confidencePct}%`}</span>
            </div>
            <div className="mt-1 h-2 rounded bg-gray-800">
              {confidencePct !== null && (
                <div className="h-2 rounded" style={{ width: `${confidencePct}%`, backgroundColor: SPECIES[d.species_class].color }} />
              )}
            </div>
            <p className="mt-2 text-xs text-gray-500">{classificationNote(d)}</p>
          </div>
        </div>

        {specimen ? (
          <button
            onClick={() => onOpenSpecies(specimen.id)}
            className="group relative overflow-hidden rounded-lg border border-gray-800 text-left"
          >
            <img src={picturesFor(specimen.id)[0]?.src} alt={specimen.label} className="aspect-[3/2] w-full object-cover transition-transform group-hover:scale-105" />
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-3 text-sm">
              <span className="block text-gray-300">Typical member: <span className="italic">{specimen.label}</span></span>
              <span className="text-accent-primary">See it in 3D →</span>
            </span>
          </button>
        ) : (
          <div className="flex items-center justify-center rounded-lg border border-gray-800 p-6 text-center text-sm text-gray-500">
            {d.species_class === 'NON_MOSQUITO'
              ? 'A non-mosquito insect (such as a fly) crossed the sensor.'
              : 'No species model: the classifier did not name a species.'}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <dl className="md:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-4">
          {FEATURES.map(({ key, label, format, hint }) => {
            const value = d[key] as number | null;
            return (
              <div key={key}>
                <dt className="text-xs uppercase tracking-wide text-gray-400" title={hint}>{label}</dt>
                <dd className="mt-0.5 text-lg font-mono text-white">{value === null ? '–' : format(value)}</dd>
              </div>
            );
          })}
        </dl>
        <div className="overflow-hidden rounded-lg border border-gray-800 relative z-0">
          <div className="h-36">
            <MapContainer
              center={[d.latitude, d.longitude]}
              zoom={13}
              className="h-full w-full"
              zoomControl={false}
              dragging={false}
              scrollWheelZoom={false}
              doubleClickZoom={false}
              attributionControl={false}
            >
              <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" className="map-tiles-dark" />
              <CircleMarker center={[d.latitude, d.longitude]} radius={9} pathOptions={{ color: SPECIES[d.species_class].color, fillOpacity: 0.5, weight: 2 }} />
            </MapContainer>
          </div>
          <p className="px-3 py-2 text-xs text-gray-500">
            {node?.locality ?? 'Location'} · {d.latitude.toFixed(4)}, {d.longitude.toFixed(4)} · © OpenStreetMap
          </p>
        </div>
      </div>
    </div>
  );
}
