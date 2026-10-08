import { RANGES, type RangeKey } from '../lib/ranges';

export default function RangeToggle({ value, onChange }: { value: RangeKey; onChange: (range: RangeKey) => void }) {
  return (
    <div className="inline-flex rounded-md border border-gray-700 p-0.5" role="group" aria-label="Time range">
      {(Object.keys(RANGES) as RangeKey[]).map((key) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          aria-pressed={value === key}
          className={`px-3 py-1 text-sm rounded ${value === key ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-200'}`}
        >
          {RANGES[key].label}
        </button>
      ))}
    </div>
  );
}
