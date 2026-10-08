import { Suspense, lazy, useRef, useState, type ReactNode } from 'react';
import type { StatsSummary } from '../api/types';
import { picturesFor } from '../lib/pictures';
import { RANGES, type RangeKey } from '../lib/ranges';
import type { MosquitoModelId, WingPose } from '../three/mosquito-models';
import { SPECIMENS } from '../three/speciesModels';
import type { MosquitoViewerHandle } from './MosquitoViewer';
import SpeciesBadge from './SpeciesBadge';

// Three.js is downloaded only when someone opens a species
const MosquitoViewer = lazy(() => import('./MosquitoViewer'));

function ViewerButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} className="rounded border border-gray-700 px-3 py-1 text-gray-300 hover:border-gray-500 hover:text-white">
      {children}
    </button>
  );
}

export function SpeciesDetailTitle({ id }: { id: MosquitoModelId }) {
  const specimen = SPECIMENS.find((s) => s.id === id)!;
  return (
    <div>
      <h2 className="text-xl font-semibold italic text-white">{specimen.label}</h2>
      <p className="text-sm text-gray-400">Transmits: {specimen.diseases}</p>
    </div>
  );
}

export default function SpeciesDetail({ id, onSelect, summary, range }: {
  id: MosquitoModelId;
  onSelect: (id: MosquitoModelId) => void;
  summary?: StatsSummary;
  range: RangeKey;
}) {
  const specimen = SPECIMENS.find((s) => s.id === id)!;
  const pictures = picturesFor(id);
  const photos = pictures.filter((p) => p.isPhoto);
  const [pose, setPose] = useState<WingPose>('flight');
  const [wingSpeed, setWingSpeed] = useState(1);
  const [paused, setPaused] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const viewer = useRef<MosquitoViewerHandle>(null);
  const detected = summary?.by_species_in_window[specimen.detectionClass] ?? 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
      <div className="lg:col-span-3 space-y-2">
        <div className="overflow-hidden rounded-lg border border-gray-800">
          <Suspense fallback={<div className="flex h-[50vh] min-h-72 items-center justify-center text-sm text-gray-400">Loading 3D viewer…</div>}>
            <MosquitoViewer
              ref={viewer}
              species={id}
              pose={pose}
              wingSpeed={wingSpeed}
              paused={paused}
              className="h-[50vh] min-h-72"
            />
          </Suspense>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <select
            value={pose}
            onChange={(e) => setPose(e.target.value as WingPose)}
            aria-label="Wing pose"
            className="rounded border border-gray-700 bg-background px-2 py-1 text-gray-200"
          >
            <option value="flight">Wings beating (slow motion)</option>
            <option value="rest">Wings folded</option>
          </select>
          <label className="flex items-center gap-2 text-gray-400">
            Speed
            <input
              type="range" min={0} max={2} step={0.1} value={wingSpeed}
              onChange={(e) => setWingSpeed(Number(e.target.value))}
              disabled={pose === 'rest'}
              className="w-24 accent-accent-primary"
            />
          </label>
          <div className="flex gap-2 sm:ml-auto">
            <ViewerButton onClick={() => setPaused((p) => !p)}>{paused ? 'Resume' : 'Pause'}</ViewerButton>
            <ViewerButton onClick={() => viewer.current?.setView('macro')}>Close-up</ViewerButton>
            <ViewerButton onClick={() => viewer.current?.setView('full')}>Whole body</ViewerButton>
          </div>
        </div>
        <p className="text-xs text-gray-500">Drag to rotate · scroll to zoom</p>
      </div>

      <div className="lg:col-span-2 space-y-4">
        {photos.length > 0 && (
          <figure>
            <img src={photos[photoIndex].src} alt={`${specimen.label} photo ${photoIndex + 1}`} className="w-full rounded-lg border border-gray-800 object-cover aspect-[3/2]" />
            {photos.length > 1 && (
              <div className="mt-2 flex gap-2 overflow-x-auto">
                {photos.map((p, i) => (
                  <button key={p.src} onClick={() => setPhotoIndex(i)} aria-label={`Show photo ${i + 1}`}>
                    <img src={p.src} alt="" className={`h-14 w-20 rounded object-cover border ${i === photoIndex ? 'border-accent-primary' : 'border-gray-800 opacity-70'}`} />
                  </button>
                ))}
              </div>
            )}
          </figure>
        )}

        <p className="text-sm text-gray-300 leading-relaxed">{specimen.note}</p>

        <div className="rounded-md bg-background/60 p-3 text-sm">
          <p className="text-gray-400">
            BuzzMap reports this group as <SpeciesBadge species={specimen.detectionClass} />
          </p>
          <p className="mt-1 text-white">
            <span className="font-mono text-2xl">{detected.toLocaleString()}</span>{' '}
            <span className="text-gray-400">detected across Chennai, {RANGES[range].label.toLowerCase()}</span>
          </p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Other species</p>
          <div className="flex flex-wrap gap-1.5">
            {SPECIMENS.filter((s) => s.id !== id).map((s) => (
              <button
                key={s.id}
                onClick={() => { setPhotoIndex(0); onSelect(s.id); }}
                className="rounded-full border border-gray-700 px-2.5 py-1 text-xs italic text-gray-300 hover:border-accent-primary hover:text-accent-primary"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <p className="text-xs text-gray-500">
          Artistic 3D reconstruction of a female mosquito, not a diagnostic specimen. The wings are slowed to about
          7 beats per second so you can see them; real wingbeats are hundreds per second, which is what BuzzMap's sensors hear.
        </p>
      </div>
    </div>
  );
}
