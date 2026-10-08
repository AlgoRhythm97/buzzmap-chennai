import type { StatsSummary } from '../api/types';
import SpeciesBadge from '../components/SpeciesBadge';
import { SPECIES } from '../lib/display';
import { picturesFor } from '../lib/pictures';
import type { MosquitoModelId } from '../three/mosquito-models';
import { SPECIMENS } from '../three/speciesModels';

export default function SpeciesGallery({ summary, onOpen }: { summary?: StatsSummary; onOpen: (id: MosquitoModelId) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {SPECIMENS.map((s) => {
        const picture = picturesFor(s.id)[0];
        const detected = summary?.by_species_in_window[s.detectionClass];
        return (
          <article key={s.id} className="card-border group overflow-hidden flex flex-col">
            <button onClick={() => onOpen(s.id)} className="relative block aspect-[3/2] overflow-hidden bg-background" aria-label={`Open ${s.label} in 3D`}>
              {picture && (
                <img
                  src={picture.src}
                  alt={picture.isPhoto ? `Photo of ${s.label}` : `3D render of ${s.label}`}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              )}
              <span className="absolute left-2 top-2 rounded bg-black/60 px-2 py-0.5 text-xs text-gray-200 backdrop-blur-sm">
                <SpeciesBadge species={s.detectionClass} />
              </span>
              {detected !== undefined && (
                <span className="absolute right-2 top-2 rounded bg-black/60 px-2 py-0.5 text-xs text-gray-200 backdrop-blur-sm">
                  {/* The sensor counts the whole genus, not the individual species */}
                  {detected} {SPECIES[s.detectionClass].label} detected
                </span>
              )}
            </button>
            <div className="flex flex-1 flex-col p-4">
              <h3 className="text-lg font-semibold italic text-white">{s.label}</h3>
              <p className="text-xs text-gray-400">Transmits: {s.diseases}</p>
              <p className="mt-2 flex-1 text-sm text-gray-400 line-clamp-3">{s.note}</p>
              <button
                onClick={() => onOpen(s.id)}
                className="mt-3 self-start rounded-md border border-accent-primary/60 px-3 py-1.5 text-sm text-accent-primary hover:bg-accent-primary/10"
              >
                Learn more in 3D →
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
