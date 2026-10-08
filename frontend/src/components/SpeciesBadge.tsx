import type { SpeciesClass } from '../api/types';
import { SPECIES } from '../lib/display';

/** Colour swatch plus text label, so species identity never relies on colour alone. */
export default function SpeciesBadge({ species }: { species: SpeciesClass }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: SPECIES[species].color }} />
      {SPECIES[species].label}
    </span>
  );
}
