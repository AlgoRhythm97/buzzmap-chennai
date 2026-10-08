import type { SpeciesClass } from '../api/types';
import type { MosquitoModelId } from './mosquito-models';

export interface SpecimenInfo {
  id: MosquitoModelId;
  label: string;
  /** Detection class this specimen belongs to in BuzzMap's classifier. */
  detectionClass: SpeciesClass;
  diseases: string;
  note: string;
}

// Short public-health context; models are artistic reconstructions, not diagnostic specimens.
export const SPECIMENS: SpecimenInfo[] = [
  {
    id: 'aedes-aegypti', label: 'Aedes aegypti', detectionClass: 'AEDES',
    diseases: 'Dengue, chikungunya, Zika',
    note: 'Day-biting urban mosquito that breeds in clean stored water: tanks, tyres and flower pots. A major dengue vector in Chennai.',
  },
  {
    id: 'aedes-albopictus', label: 'Aedes albopictus', detectionClass: 'AEDES',
    diseases: 'Dengue, chikungunya',
    note: 'The "Asian tiger mosquito", recognisable by a single white stripe down the thorax. Common in gardens and peri-urban greenery.',
  },
  {
    id: 'culex-quinquefasciatus', label: 'Culex quinquefasciatus', detectionClass: 'CULEX',
    diseases: 'Lymphatic filariasis',
    note: 'The most common night-biting nuisance mosquito in Chennai, breeding in polluted drains and stagnant canals.',
  },
  {
    id: 'culex-pipiens', label: 'Culex pipiens', detectionClass: 'CULEX',
    diseases: 'West Nile virus',
    note: 'Temperate relative of Culex quinquefasciatus, included for comparison of the Culex body plan.',
  },
  {
    id: 'anopheles-gambiae', label: 'Anopheles gambiae', detectionClass: 'ANOPHELES',
    diseases: 'Malaria',
    note: 'African malaria vector. Note the long palps beside the proboscis, a hallmark of Anopheles. Chennai\'s urban malaria vector, An. stephensi, shares this body plan.',
  },
  {
    id: 'anopheles-arabiensis', label: 'Anopheles arabiensis', detectionClass: 'ANOPHELES',
    diseases: 'Malaria',
    note: 'Close relative of An. gambiae, adapted to drier habitats. Spotted wing-vein scales are visible in macro view.',
  },
];

/** Representative 3D model for each mosquito class the classifier can report. */
export const MODEL_FOR_CLASS: Partial<Record<SpeciesClass, MosquitoModelId>> = {
  AEDES: 'aedes-aegypti',
  CULEX: 'culex-quinquefasciatus',
  ANOPHELES: 'anopheles-gambiae',
};
