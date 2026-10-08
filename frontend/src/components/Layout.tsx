import { useState } from 'react';
import { Outlet } from 'react-router-dom';

const LINKS = [
  { href: '#map', label: 'Live map' },
  { href: '#activity', label: 'Activity' },
  { href: '#mosquitoes', label: 'Mosquitoes' },
  { href: '#detections', label: 'Detections' },
  { href: '#how', label: 'How it works' },
  { href: '#about', label: 'About' },
];

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-gray-200 font-sans telemetry-grid">
      <header className="border-b border-gray-800 bg-charcoal/80 sticky top-0 z-[1500] backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <a href="#top" className="text-accent-primary font-bold text-xl tracking-tight">BuzzMap Chennai</a>
            <nav className="hidden md:flex items-center gap-1" aria-label="Sections">
              {LINKS.map((link) => (
                <a key={link.href} href={link.href} className="hover:text-accent-primary px-3 py-2 rounded-md text-sm font-medium transition-colors">
                  {link.label}
                </a>
              ))}
            </nav>
            <button
              className="md:hidden text-gray-400 hover:text-white p-2"
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span className="sr-only">{menuOpen ? 'Close menu' : 'Open menu'}</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={menuOpen ? 'M6 6l12 12M18 6L6 18' : 'M4 6h16M4 12h16M4 18h16'} />
              </svg>
            </button>
          </div>
          {menuOpen && (
            <nav id="mobile-menu" className="md:hidden flex flex-col pb-3" aria-label="Sections">
              {LINKS.map((link) => (
                <a key={link.href} href={link.href} onClick={() => setMenuOpen(false)} className="px-2 py-2 text-sm hover:text-accent-primary">
                  {link.label}
                </a>
              ))}
            </nav>
          )}
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
