import type { MosquitoModelId } from '../three/mosquito-models';

// Photos dropped into the repository's pictures/ (or Pictures/) folder, matched to a species
// by file name: "aedes-aegypti.jpg", "Aedes aegypti 2.png" and "aedes_aegypti_closeup.webp"
// all belong to Aedes aegypti. Rendered snapshots of the 3D models are the fallback.
const photos = import.meta.glob<string>([
  '../../../pictures/*.{jpg,jpeg,png,webp,avif,JPG,JPEG,PNG,WEBP}',
  '../../../Pictures/*.{jpg,jpeg,png,webp,avif,JPG,JPEG,PNG,WEBP}',
], {
  eager: true,
  query: '?url',
  import: 'default',
});
const snapshots = import.meta.glob<string>('../assets/specimens/*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
});

function normalise(path: string): string {
  const file = path.split('/').pop() ?? '';
  return file.toLowerCase().replace(/\.[a-z]+$/, '').replace(/[\s_]+/g, '-');
}

export interface SpeciesPicture {
  src: string;
  /** True for a real photo from pictures/, false for a rendered 3D snapshot. */
  isPhoto: boolean;
}

/** All pictures for a species: user photos first (sorted by name), then the 3D snapshot. */
export function picturesFor(id: MosquitoModelId): SpeciesPicture[] {
  const own = Object.entries(photos)
    .filter(([path]) => normalise(path).startsWith(id))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, src]) => ({ src, isPhoto: true }));
  const snapshot = Object.entries(snapshots).find(([path]) => normalise(path) === id)?.[1];
  return snapshot ? [...own, { src: snapshot, isPhoto: false }] : own;
}
