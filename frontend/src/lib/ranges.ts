export const RANGES = {
  '24h': { label: 'Last 24 hours', short: '24 h', hours: 24, bucketMinutes: 60 },
  '7d': { label: 'Last 7 days', short: '7 days', hours: 24 * 7, bucketMinutes: 360 },
} as const;

export type RangeKey = keyof typeof RANGES;
