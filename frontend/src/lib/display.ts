import { parseApiDate } from '../api/client';
import type { SensorNode, SpeciesClass } from '../api/types';

export const SPECIES: Record<SpeciesClass, { label: string; color: string }> = {
  AEDES: { label: 'Aedes', color: '#ffb300' },
  CULEX: { label: 'Culex', color: '#2979ff' },
  ANOPHELES: { label: 'Anopheles', color: '#7c4dff' },
  NON_MOSQUITO: { label: 'Non-mosquito', color: '#26a69a' },
  UNKNOWN: { label: 'Unknown', color: '#9e9e9e' },
};

export const SPECIES_ORDER: SpeciesClass[] = ['AEDES', 'CULEX', 'ANOPHELES', 'NON_MOSQUITO', 'UNKNOWN'];

export const ONLINE_MINUTES = 15;

export type NodeStatus = 'online' | 'quiet' | 'inactive';

export const NODE_STATUS: Record<NodeStatus, { label: string; color: string }> = {
  online: { label: 'Online', color: '#00e5ff' },
  quiet: { label: `No reports in ${ONLINE_MINUTES} min`, color: '#ffb300' },
  inactive: { label: 'Inactive', color: '#ff1744' },
};

export function nodeStatus(node: SensorNode, now: Date = new Date()): NodeStatus {
  if (!node.is_active) return 'inactive';
  if (!node.last_seen_at) return 'quiet';
  const ageMinutes = (now.getTime() - parseApiDate(node.last_seen_at).getTime()) / 60000;
  return ageMinutes <= ONLINE_MINUTES ? 'online' : 'quiet';
}

export function formatRelative(timestamp: string | null, now: Date = new Date()): string {
  if (!timestamp) return 'never';
  const seconds = Math.round((now.getTime() - parseApiDate(timestamp).getTime()) / 1000);
  if (seconds < 60) return `${Math.max(seconds, 0)}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h ago`;
  return `${Math.floor(seconds / 86400)} d ago`;
}
