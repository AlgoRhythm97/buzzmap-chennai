import { useRef, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import MosquitoViewer, { type MosquitoViewerHandle } from '../components/MosquitoViewer';
import SpeciesBadge from '../components/SpeciesBadge';
import type { WingPose } from '../three/mosquito-models';
import { SPECIMENS } from '../three/speciesModels';

function ViewerButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="rounded border border-gray-700 px-3 py-1 text-gray-300 hover:border-gray-500 hover:text-white"
    >
      {children}
    </button>
  );
}

export default function Species() {
  const [params, setParams] = useSearchParams();
  const specimen = SPECIMENS.find((s) => s.id === params.get('model')) ?? SPECIMENS[0];
  const [pose, setPose] = useState<WingPose>('flight');
  const [wingSpeed, setWingSpeed] = useState(1);
  const [paused, setPaused] = useState(false);
  const viewer = useRef<MosquitoViewerHandle>(null);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-accent-primary">Mosquito Species</h1>
        <p className="text-gray-400 text-sm">
          Interactive 3D reconstructions of the mosquito groups BuzzMap listens for. Drag to orbit, scroll to zoom.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <nav className="card-border p-2 lg:col-span-1 self-start" aria-label="Specimens">
          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-1">
            {SPECIMENS.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => setParams({ model: s.id }, { replace: true })}
                  aria-current={s.id === specimen.id}
                  className={`w-full text-left rounded-md px-3 py-2 text-sm transition-colors ${
                    s.id === specimen.id ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800/60 hover:text-gray-200'
                  }`}
                >
                  <span className="block italic">{s.label}</span>
                  <span className="block text-xs text-gray-500 not-italic">{s.diseases}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="lg:col-span-3 space-y-4">
          <div className="card-border overflow-hidden">
            <MosquitoViewer
              ref={viewer}
              species={specimen.id}
              pose={pose}
              wingSpeed={wingSpeed}
              paused={paused}
              className="h-[55vh] min-h-80"
            />
            <div className="flex flex-wrap items-center gap-3 border-t border-gray-800 p-3 text-sm">
              <label className="flex items-center gap-2 text-gray-400">
                Wings
                <select
                  value={pose}
                  onChange={(e) => setPose(e.target.value as WingPose)}
                  className="rounded border border-gray-700 bg-background px-2 py-1 text-gray-200"
                >
                  <option value="flight">Beating (slow motion)</option>
                  <option value="rest">Folded</option>
                </select>
              </label>
              <label className="flex items-center gap-2 text-gray-400">
                Speed
                <input
                  type="range" min={0} max={2} step={0.1} value={wingSpeed}
                  onChange={(e) => setWingSpeed(Number(e.target.value))}
                  className="w-28 accent-accent-primary"
                  disabled={pose === 'rest'}
                />
                <output className="w-8 font-mono text-gray-300">{wingSpeed.toFixed(1)}×</output>
              </label>
              <div className="flex gap-2 sm:ml-auto">
                <ViewerButton onClick={() => setPaused((p) => !p)}>{paused ? 'Resume' : 'Pause'}</ViewerButton>
                <ViewerButton onClick={() => viewer.current?.setView('macro')}>Macro view</ViewerButton>
                <ViewerButton onClick={() => viewer.current?.setView('full')}>Full specimen</ViewerButton>
              </div>
            </div>
          </div>

          <div className="card-border p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-xl font-semibold italic text-white">{specimen.label}</h2>
              <span className="text-xs text-gray-400">
                Reported by BuzzMap as <SpeciesBadge species={specimen.detectionClass} />
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-400">Transmits: {specimen.diseases}</p>
            <p className="mt-2 text-sm text-gray-300">{specimen.note}</p>
            <p className="mt-3 text-xs text-gray-500">
              Artistic procedural reconstructions of female mosquitoes, not diagnostic specimens. The wing animation is
              slowed to about 7 Hz for viewing; real wingbeats are hundreds of hertz, which is what BuzzMap's sensors measure.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
