import { GENUS_INFO, type MosquitoGenus } from '../three/speciesModels';

function WarningIcon() {
  return (
    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />
    </svg>
  );
}

/** Diseases spread by a mosquito genus, with bite times and prevention. */
export default function DiseasePanel({ genus }: { genus: MosquitoGenus }) {
  const info = GENUS_INFO[genus];

  return (
    <section className="rounded-lg border border-warning-amber/40 bg-warning-amber/5 p-4" aria-labelledby="disease-title">
      <h3 id="disease-title" className="flex items-center gap-2 text-lg font-semibold text-white">
        <span className="text-warning-amber"><WarningIcon /></span>
        Diseases spread by {info.label} mosquitoes
      </h3>

      <ul className={`mt-3 grid grid-cols-1 gap-3 ${info.diseases.length > 1 ? 'md:grid-cols-3' : ''}`}>
        {info.diseases.map((d) => (
          <li key={d.name} className="rounded-md border border-gray-800 bg-charcoal p-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-xl font-bold text-warning-amber">{d.name}</p>
              <span className="rounded-full border border-gray-700 px-2 py-0.5 text-[11px] text-gray-400">{d.cause}</span>
            </div>
            <p className="mt-1 text-sm text-gray-300"><span className="text-gray-500">Symptoms: </span>{d.symptoms}</p>
            {d.note && <p className="mt-1 text-xs text-gray-400">{d.note}</p>}
          </li>
        ))}
      </ul>

      <div className="mt-3 grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
        <p><span className="block text-xs uppercase tracking-wide text-gray-500">Bites</span><span className="text-gray-200">{info.bites}</span></p>
        <p><span className="block text-xs uppercase tracking-wide text-gray-500">Breeds in</span><span className="text-gray-200">{info.breeds}</span></p>
        <div>
          <span className="block text-xs uppercase tracking-wide text-gray-500">Protect yourself</span>
          <ul className="list-disc pl-4 text-gray-200">
            {info.prevention.map((tip) => <li key={tip}>{tip}</li>)}
          </ul>
        </div>
      </div>

      <p className="mt-3 text-xs text-gray-500">General information, not medical advice. If you have a fever, see a doctor.</p>
    </section>
  );
}
