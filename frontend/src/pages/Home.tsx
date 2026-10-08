import { Suspense, lazy, useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Modal from '../components/Modal';
import RangeToggle from '../components/RangeToggle';
import RecentDetections from '../components/RecentDetections';
import Section from '../components/Section';
import SpeciesDetail, { SpeciesDetailTitle } from '../components/SpeciesDetail';
import { useDashboardData } from '../hooks/useDashboardData';
import type { RangeKey } from '../lib/ranges';
import About from '../sections/About';
import Hero from '../sections/Hero';
import HowItWorks from '../sections/HowItWorks';
import SpeciesGallery from '../sections/SpeciesGallery';
import type { MosquitoModelId } from '../three/mosquito-models';
import { SPECIMENS } from '../three/speciesModels';

// Map (Leaflet) and chart (Recharts) code loads after the hero so the page appears quickly
const LiveMap = lazy(() => import('../sections/LiveMap'));
const Activity = lazy(() => import('../sections/Activity'));
const DetectionDetail = lazy(() => import('../components/DetectionDetail'));

const placeholder = (height: string) => <div className={`card-border ${height} animate-pulse`} />;

/**
 * The whole site on one page. The selected place and any open pop-up live in the URL
 * (?place=, ?species=, ?detection=) so the browser Back button closes them and links can be shared.
 */
export default function Home() {
  const [range, setRange] = useState<RangeKey>('24h');
  const { data, error } = useDashboardData(range);
  const [params, setParams] = useSearchParams();

  const setParam = useCallback((key: string, value: string | null, push = false) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value === null) next.delete(key); else next.set(key, value);
      return next;
    }, { replace: !push, preventScrollReset: true });
  }, [setParams]);

  const speciesId = params.get('species') as MosquitoModelId | null;
  const openSpecies = SPECIMENS.some((s) => s.id === speciesId) ? speciesId : null;
  const detectionId = params.get('detection');
  const nodes = data?.nodes ?? [];

  const showSpecies = (id: MosquitoModelId) => setParams((prev) => {
    const next = new URLSearchParams(prev);
    next.delete('detection');
    next.set('species', id);
    return next;
  }, { preventScrollReset: true });
  const showDetection = (id: string) => setParam('detection', id, true);
  const closeSpecies = useCallback(() => setParam('species', null), [setParam]);
  const closeDetection = useCallback(() => setParam('detection', null), [setParam]);

  const rangeToggle = <RangeToggle value={range} onChange={setRange} />;

  return (
    <>
      <Hero summary={data?.summary} range={range} error={error} />

      <Section
        id="map"
        eyebrow="Live map"
        title="Where are the mosquitoes?"
        description="Each circle is a sensing node. Click a place to see how many mosquitoes it detected, and which kinds."
        action={rangeToggle}
      >
        <Suspense fallback={placeholder('h-[60vh] min-h-96 max-h-[640px]')}>
          <LiveMap
            nodes={nodes}
            activity={data?.nodeActivity ?? []}
            range={range}
            selectedNodeId={params.get('place')}
            onSelectNode={(id) => setParam('place', id)}
            onOpenSpecies={showSpecies}
            onOpenDetection={showDetection}
          />
        </Suspense>
      </Section>

      <Section
        id="activity"
        eyebrow="Activity"
        title="When are they active?"
        description="Detections over time across the whole city, split by species. Mosquitoes peak around dawn and dusk."
        action={rangeToggle}
      >
        <Suspense fallback={placeholder('h-96')}>
          <Activity summary={data?.summary} timeseries={data?.timeseries} range={range} />
        </Suspense>
      </Section>

      <Section
        id="mosquitoes"
        eyebrow="Species"
        title="Meet the mosquitoes"
        description="The mosquito groups BuzzMap listens for. Open any of them to explore an interactive 3D model."
      >
        <SpeciesGallery summary={data?.summary} onOpen={showSpecies} />
      </Section>

      <Section
        id="detections"
        eyebrow="Live feed"
        title="Latest detections"
        description="Every insect that crossed a sensor recently. Click one for its wingbeat details."
      >
        <RecentDetections nodes={nodes} onOpen={showDetection} />
      </Section>

      <Section id="how" eyebrow="How it works" title="From a wingbeat to the map">
        <HowItWorks />
      </Section>

      <About />

      {openSpecies && (
        <Modal title={<SpeciesDetailTitle id={openSpecies} />} label="Mosquito species in 3D" onClose={closeSpecies}>
          <SpeciesDetail id={openSpecies} onSelect={showSpecies} summary={data?.summary} range={range} />
        </Modal>
      )}
      {detectionId && !openSpecies && (
        <Modal
          title={(
            <div>
              <h2 className="text-lg font-semibold text-white">Detection details</h2>
              <p className="text-xs font-mono text-gray-500 truncate">{detectionId}</p>
            </div>
          )}
          label="Detection details"
          onClose={closeDetection}
        >
          <Suspense fallback={<p className="text-gray-400">Loading…</p>}>
            <DetectionDetail id={detectionId} nodes={nodes} onOpenSpecies={showSpecies} />
          </Suspense>
        </Modal>
      )}
    </>
  );
}
