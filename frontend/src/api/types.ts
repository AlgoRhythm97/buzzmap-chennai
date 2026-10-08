// Mirrors the backend Pydantic schemas (backend/app/schemas.py).
// Timestamps are UTC ISO strings without a timezone suffix; parse with parseApiDate().

export type SpeciesClass = 'AEDES' | 'CULEX' | 'ANOPHELES' | 'NON_MOSQUITO' | 'UNKNOWN';

export interface SensorNode {
  id: string;
  name: string;
  locality: string | null;
  latitude: number;
  longitude: number;
  is_active: boolean;
  created_at: string;
  last_seen_at: string | null;
}

export interface Detection {
  id: string;
  timestamp: string;
  node_id: string | null;
  latitude: number;
  longitude: number;
  rms: number;
  dominant_freq_hz: number;
  peak_magnitude: number;
  peak_to_peak: number | null;
  harmonic_ratio: number | null;
  spectral_energy: number | null;
  species_class: SpeciesClass;
  confidence: number | null;
}

export interface StatsSummary {
  window_hours: number;
  total_detections: number;
  detections_in_window: number;
  by_species_in_window: Partial<Record<SpeciesClass, number>>;
  total_nodes: number;
  active_nodes: number;
  online_nodes: number;
  online_minutes: number;
  last_detection_at: string | null;
}

export interface TimeseriesBucket {
  bucket_start: string;
  total: number;
  by_species: Partial<Record<SpeciesClass, number>>;
}
