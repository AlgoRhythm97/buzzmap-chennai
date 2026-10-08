import { parseApiDate } from '../api/client';
import type { StatsSummary } from '../api/types';
import { MOSQUITO_SPECIES, formatRelative } from '../lib/display';
import { picturesFor } from '../lib/pictures';
import { RANGES, type RangeKey } from '../lib/ranges';

// Fade the picture into the page on the left and bottom edges
const HERO_MASK = 'linear-gradient(to right, transparent, black 40%), linear-gradient(to top, transparent, black 30%)';

function Kpi({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-lg border border-gray-800 bg-charcoal/70 p-3 backdrop-blur-sm">
      <p className="text-[11px] uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-0.5 text-2xl font-semibold font-mono text-white">{value}</p>
      {detail && <p className="text-[11px] text-gray-500 truncate">{detail}</p>}
    </div>
  );
}

export default function Hero({ summary, range, error }: { summary?: StatsSummary; range: RangeKey; error?: Error }) {
  const mosquitoes = summary
    ? MOSQUITO_SPECIES.reduce((sum, s) => sum + (summary.by_species_in_window[s] ?? 0), 0)
    : undefined;
  // Always the clean 3D render, so the hero looks consistent whatever photos are added
  const heroImage = picturesFor('aedes-aegypti').find((p) => !p.isPhoto)?.src;

  return (
    <section id="top" className="relative overflow-hidden pt-8 pb-10 sm:pt-14 sm:pb-16">
      {heroImage && (
        <img
          src={heroImage}
          alt=""
          aria-hidden
          className="pointer-events-none absolute right-0 top-6 hidden aspect-[3/2] w-[58%] max-w-3xl object-cover opacity-70 md:block"
          style={{ maskImage: HERO_MASK, WebkitMaskImage: HERO_MASK, maskComposite: 'intersect', WebkitMaskComposite: 'source-in' }}
        />
      )}
      <div className="relative max-w-2xl">
        <p className="inline-flex items-center gap-2 rounded-full border border-gray-700 bg-charcoal/70 px-3 py-1 text-xs text-gray-300">
          <span className={`h-2 w-2 rounded-full ${error ? 'bg-warning-red' : 'bg-accent-primary animate-pulse'}`} />
          {error ? 'Live data unavailable: is the backend running?' : 'Live sensor network'}
        </p>
        <h1 className="mt-4 text-4xl sm:text-6xl font-bold leading-tight tracking-tight text-white">
          Listening for mosquitoes across <span className="text-accent-primary">Chennai</span>
        </h1>
        <p className="mt-4 text-base sm:text-lg text-gray-300">
          Low-cost optical sensors hear each mosquito's wingbeat. AI tells Aedes, Culex and Anopheles apart, and
          every detection lands on a live city map, so you can see where dengue and malaria vectors are active.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a href="#map" className="rounded-md bg-accent-primary px-4 py-2 text-sm font-semibold text-black hover:bg-accent-primary/90">
            Explore the live map
          </a>
          <a href="#mosquitoes" className="rounded-md border border-gray-600 px-4 py-2 text-sm font-semibold text-gray-200 hover:border-gray-400">
            Meet the mosquitoes
          </a>
        </div>
      </div>

      <div className="relative mt-10 grid grid-cols-2 lg:grid-cols-4 gap-3 max-w-4xl">
        <Kpi label="Mosquitoes" value={mosquitoes?.toLocaleString() ?? '–'} detail={RANGES[range].label} />
        <Kpi
          label="Aedes (dengue)"
          value={summary ? (summary.by_species_in_window.AEDES ?? 0).toLocaleString() : '–'}
          detail={RANGES[range].label}
        />
        <Kpi
          label="Places online"
          value={summary ? `${summary.online_nodes} / ${summary.active_nodes}` : '–'}
          detail={summary ? `Reported in the last ${summary.online_minutes} min` : undefined}
        />
        <Kpi
          label="Last detection"
          value={summary ? formatRelative(summary.last_detection_at) : '–'}
          detail={summary?.last_detection_at ? parseApiDate(summary.last_detection_at).toLocaleTimeString() : undefined}
        />
      </div>
    </section>
  );
}
