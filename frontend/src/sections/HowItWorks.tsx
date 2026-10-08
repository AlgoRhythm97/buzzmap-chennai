const STEPS = [
  {
    title: 'Sense',
    text: 'An IR LED shines across a small tunnel onto a photodiode. A mosquito flying through flickers the light hundreds of times a second.',
    icon: 'M3 12h4l3-8 4 16 3-8h4',
  },
  {
    title: 'Detect',
    text: 'The signal is compared with the background noise. Only real flight events are kept, not hours of empty noise.',
    icon: 'M4 18V6m4 12V10m4 8V4m4 14v-6m4 6V8',
  },
  {
    title: 'Classify',
    text: 'Wingbeat frequency and harmonics go to a machine-learning model. When it isn\'t sure, it says Unknown instead of guessing.',
    icon: 'M12 3a6 6 0 016 6c0 2.5-1.5 4-3 5v3H9v-3c-1.5-1-3-2.5-3-5a6 6 0 016-6zm-3 18h6',
  },
  {
    title: 'Map',
    text: 'Every detection is stored with its place and time, then shown live on the city map and activity charts on this page.',
    icon: 'M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zm0 0v14m6-12v14',
  },
];

export default function HowItWorks() {
  return (
    <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {STEPS.map((step, i) => (
        <li key={step.title} className="card-border p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-accent-primary/10 text-accent-primary">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d={step.icon} />
              </svg>
            </span>
            <span className="font-mono text-xs text-gray-500">0{i + 1}</span>
          </div>
          <h3 className="mt-3 text-lg font-semibold text-white">{step.title}</h3>
          <p className="mt-1 text-sm text-gray-400 leading-relaxed">{step.text}</p>
        </li>
      ))}
    </ol>
  );
}
