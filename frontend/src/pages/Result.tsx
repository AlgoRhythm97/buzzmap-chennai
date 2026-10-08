import { Suspense, lazy } from 'react';
import { CircleMarker, MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Link, useParams } from 'react-router-dom';
import { ApiError, api, parseApiDate } from '../api/client';
import type { Detection } from '../api/types';
import SpeciesBadge from '../components/SpeciesBadge';
import { usePolling } from '../hooks/usePolling';
import { SPECIES } from '../lib/display';
import { MODEL_FOR_CLASS, SPECIMENS } from '../three/speciesModels';

// Three.js is only downloaded when the detection is a mosquito with a 3D model
const MosquitoViewer = lazy(() => import('../components/MosquitoViewer'));

async function fetchResult(id: string, signal: AbortSignal) {
  const detection = await api.getDetection(id, signal);
  const node = detection.node_id ? await api.getNodes(signal).then((nodes) => nodes.find((n) => n.id === detection.node_id)) : undefined;
  return { detection, node };
}

/** Plain-language reason for the classifier's answer. */
function classificationNote(d: Detection): string {
  if (d.species_class !== 'UNKNOWN') {
    return 'Matched a trained species with enough confidence.';
  }
  if (d.confidence === null) {
    return 'Not classified: the wingbeat features fall outside anything the model was trained on (or no model is loaded), so the system declines to guess.';
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

export default function Result() {
  const { id = '' } = useParams<{ id: string }>();
  // A stored detection never changes, so refresh rarely
  const { data, error, loading } = usePolling((signal) => fetchResult(id, signal), [id], 60000);

  if (!data) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <div className="card-border p-8 mt-10">
        <h1 className="text-2xl font-bold text-accent-primary mb-4">Detection Result</h1>
        <p className="text-gray-400">
          {loading ? 'Loading…' : notFound ? `No detection with id ${id}.` : `Could not load detection: ${error?.message}`}
        </p>
        <Link to="/insights" className="inline-block mt-4 text-sm text-accent-primary hover:underline">← Back to insights</Link>
      </div>
    );
  }

  const { detection: d, node } = data;
  const confidencePct = d.confidence === null ? null : Math.round(d.confidence * 100);

  return (
    <div className="space-y-4">
      <Link to="/insights" className="text-sm text-gray-400 hover:text-accent-primary">← Back to insights</Link>

      <div className="card-border p-6">
        <p className="text-xs text-gray-500 font-mono">Observation {d.id}</p>
        <h1 className="mt-2 text-3xl font-bold text-white"><SpeciesBadge species={d.species_class} /></h1>
        <p className="mt-1 text-sm text-gray-400">{parseApiDate(d.timestamp).toLocaleString()}</p>

        <div className="mt-4 max-w-md">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card-border p-4 lg:col-span-2">
          <h2 className="text-sm font-semibold text-gray-200 mb-3">Extracted flight features</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        </div>

        <div className="card-border overflow-hidden">
          <div className="h-48">
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
              <CircleMarker
                center={[d.latitude, d.longitude]}
                radius={10}
                pathOptions={{ color: SPECIES[d.species_class].color, fillOpacity: 0.5, weight: 2 }}
              />
            </MapContainer>
          </div>
          <div className="p-4 text-sm">
            <p className="text-gray-200 font-medium">{node?.name ?? 'Ad-hoc upload'}</p>
            {node?.locality && <p className="text-gray-400">{node.locality}</p>}
            <p className="text-gray-500 font-mono text-xs mt-1">{d.latitude.toFixed(4)}, {d.longitude.toFixed(4)}</p>
            <p className="text-gray-600 text-xs mt-2">Map © OpenStreetMap contributors</p>
            <Link to="/map" className="inline-block mt-2 text-accent-primary hover:underline">Open surveillance map →</Link>
          </div>
        </div>
      </div>

      <SpecimenModel detection={d} />
    </div>
  );
}

/** Representative 3D specimen for mosquito classes; nothing for non-mosquito or unknown events. */
function SpecimenModel({ detection }: { detection: Detection }) {
  const modelId = MODEL_FOR_CLASS[detection.species_class];
  const specimen = SPECIMENS.find((s) => s.id === modelId);
  if (!specimen) return null;

  return (
    <div className="card-border overflow-hidden">
      <div className="flex flex-wrap items-baseline justify-between gap-2 p-4 pb-0">
        <div>
          <h2 className="text-sm font-semibold text-gray-200">
            Representative specimen: <span className="italic">{specimen.label}</span>
          </h2>
          <p className="text-xs text-gray-500">
            The sensor identifies the genus from its wingbeat; this model shows a typical member. Transmits: {specimen.diseases}.
          </p>
        </div>
        <Link to={`/species?model=${specimen.id}`} className="text-sm text-accent-primary hover:underline">
          Explore all species →
        </Link>
      </div>
      <Suspense fallback={<div className="h-80" />}>
        <MosquitoViewer species={specimen.id} quality="low" autoRotate className="h-80" />
      </Suspense>
    </div>
  );
}
