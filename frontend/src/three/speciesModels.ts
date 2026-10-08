import type { SpeciesClass } from '../api/types';
import type { MosquitoModelId } from './mosquito-models';

export type MosquitoGenus = Extract<SpeciesClass, 'AEDES' | 'CULEX' | 'ANOPHELES'>;

export interface SpecimenInfo {
  id: MosquitoModelId;
  label: string;
  /** Detection class (genus) this specimen belongs to in BuzzMap's classifier. */
  detectionClass: MosquitoGenus;
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

export interface Disease {
  name: string;
  /** What causes it. */
  cause: string;
  symptoms: string;
  note?: string;
}

export interface GenusInfo {
  label: string;
  bites: string;
  breeds: string;
  diseases: Disease[];
  prevention: string[];
}

// General public-health information, kept short; not medical advice.
export const GENUS_INFO: Record<MosquitoGenus, GenusInfo> = {
  AEDES: {
    label: 'Aedes',
    bites: 'During the day, especially early morning and late afternoon',
    breeds: 'Clean stored water: tanks, buckets, tyres, flower-pot trays and coconut shells',
    diseases: [
      {
        name: 'Dengue',
        cause: 'Virus',
        symptoms: 'High fever, severe headache, pain behind the eyes, joint and muscle pain, rash',
        note: 'Severe dengue can cause bleeding and shock. Cases in Chennai rise around the monsoon.',
      },
      {
        name: 'Chikungunya',
        cause: 'Virus',
        symptoms: 'Sudden fever and severe joint pain that can last for weeks or months',
      },
      {
        name: 'Zika',
        cause: 'Virus',
        symptoms: 'Usually mild: rash, fever, red eyes',
        note: 'Infection during pregnancy can cause birth defects.',
      },
    ],
    prevention: [
      'Empty, scrub or cover water containers at least once a week',
      'Use repellent and cover arms and legs in the daytime',
      'Fit screens on windows and doors',
    ],
  },
  CULEX: {
    label: 'Culex',
    bites: 'At night, indoors and outdoors',
    breeds: 'Dirty or polluted standing water: drains, canals, septic tanks and sewage',
    diseases: [
      {
        name: 'Lymphatic filariasis',
        cause: 'Parasitic worms',
        symptoms: 'Often silent for years, then painful swelling of the legs or other body parts (elephantiasis)',
        note: 'India runs yearly mass drug administration to eliminate it.',
      },
      {
        name: 'Japanese encephalitis',
        cause: 'Virus',
        symptoms: 'Fever, headache and vomiting; rarely brain inflammation with confusion or seizures',
        note: 'A vaccine is available. Spread mainly by rural Culex species near rice fields.',
      },
      {
        name: 'West Nile fever',
        cause: 'Virus',
        symptoms: 'Usually no symptoms or a mild fever; rarely affects the brain',
      },
    ],
    prevention: [
      'Sleep under a mosquito net, or use screens and repellent at night',
      'Keep drains flowing and report blocked drains and stagnant canals',
      'Cover septic-tank vents and overhead tanks',
    ],
  },
  ANOPHELES: {
    label: 'Anopheles',
    bites: 'From dusk to dawn, mostly late at night',
    breeds: 'Clean water: overhead tanks, wells, construction sites and rain pools',
    diseases: [
      {
        name: 'Malaria',
        cause: 'Plasmodium parasite',
        symptoms: 'Fever with chills and sweating that may come in cycles, headache, body ache',
        note: 'Can be fatal without treatment, but is curable if diagnosed early with a blood test.',
      },
    ],
    prevention: [
      'Sleep under an insecticide-treated mosquito net',
      'Cover overhead tanks and wells; drain rain pools',
      'Get a blood test quickly for any fever with chills',
    ],
  },
};
