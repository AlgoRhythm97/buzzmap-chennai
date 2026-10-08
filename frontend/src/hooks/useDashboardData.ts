import { api } from '../api/client';
import { RANGES, type RangeKey } from '../lib/ranges';
import { usePolling } from './usePolling';

/** Everything the single-page dashboard shows, refreshed together for the selected range. */
export function useDashboardData(range: RangeKey) {
  const { hours, bucketMinutes } = RANGES[range];
  return usePolling(
    async (signal) => {
      const [summary, timeseries, nodes, nodeActivity] = await Promise.all([
        api.getSummary({ window_hours: hours }, signal),
        api.getTimeseries({ hours, bucket_minutes: bucketMinutes }, signal),
        api.getNodes(signal),
        api.getNodeActivity({ window_hours: hours }, signal),
      ]);
      return { summary, timeseries, nodes, nodeActivity };
    },
    [hours, bucketMinutes],
  );
}

export type DashboardData = NonNullable<ReturnType<typeof useDashboardData>['data']>;
