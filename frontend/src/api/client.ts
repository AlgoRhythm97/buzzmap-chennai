import type { Detection, SensorNode, StatsSummary, TimeseriesBucket } from './types';

export const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000').replace(/\/$/, '');

type QueryParams = Record<string, string | number | boolean | undefined>;

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function apiGet<T>(path: string, params: QueryParams = {}, signal?: AbortSignal): Promise<T> {
  const url = new URL(`${API_URL}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  const response = await fetch(url, { signal });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(response.status, body?.detail ?? `Request failed with ${response.status}`);
  }
  return response.json() as Promise<T>;
}

/** The backend stores naive UTC timestamps; mark them as UTC before parsing. */
export function parseApiDate(timestamp: string): Date {
  return new Date(/[zZ]|[+-]\d\d:\d\d$/.test(timestamp) ? timestamp : `${timestamp}Z`);
}

/** Formats a Date for query parameters in the backend's naive-UTC convention. */
export function toApiDate(date: Date): string {
  return date.toISOString().replace('Z', '');
}

export const api = {
  getNodes: (signal?: AbortSignal) => apiGet<SensorNode[]>('/api/nodes/', {}, signal),

  getDetections: (
    params: { node_id?: string; species?: string; since?: string; until?: string; skip?: number; limit?: number } = {},
    signal?: AbortSignal,
  ) => apiGet<Detection[]>('/api/detections/', params, signal),

  getDetection: (id: string, signal?: AbortSignal) =>
    apiGet<Detection>(`/api/detections/${encodeURIComponent(id)}`, {}, signal),

  getSummary: (params: { window_hours?: number; online_minutes?: number } = {}, signal?: AbortSignal) =>
    apiGet<StatsSummary>('/api/stats/summary', params, signal),

  getTimeseries: (
    params: { hours?: number; bucket_minutes?: number; node_id?: string } = {},
    signal?: AbortSignal,
  ) => apiGet<TimeseriesBucket[]>('/api/stats/timeseries', params, signal),
};
