import type { ReactNode } from 'react';

/** Page section with an anchor id (offset for the sticky header) and a consistent heading. */
export default function Section({ id, eyebrow, title, description, action, children }: {
  id: string;
  eyebrow: string;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 py-10 sm:py-14" aria-labelledby={`${id}-title`}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div className="max-w-2xl">
          <p className="text-xs font-mono uppercase tracking-[0.2em] text-accent-primary">{eyebrow}</p>
          <h2 id={`${id}-title`} className="mt-1 text-2xl sm:text-3xl font-bold text-white">{title}</h2>
          {description && <p className="mt-2 text-sm text-gray-400">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
