import { Suspense } from 'react';
import { Outlet, Link } from 'react-router-dom';

export default function Layout() {
  return (
    <div className="min-h-screen bg-background text-gray-200 font-sans telemetry-grid">
      <header className="border-b border-gray-800 bg-charcoal/80 sticky top-0 z-50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex-shrink-0">
              <Link to="/" className="text-accent-primary font-bold text-xl tracking-tight">BuzzMap Chennai</Link>
            </div>
            <nav className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <Link to="/" className="hover:text-accent-primary px-3 py-2 rounded-md text-sm font-medium transition-colors">Home</Link>
                <Link to="/sense" className="hover:text-accent-primary px-3 py-2 rounded-md text-sm font-medium transition-colors">Sense</Link>
                <Link to="/map" className="hover:text-accent-primary px-3 py-2 rounded-md text-sm font-medium transition-colors">Map</Link>
                <Link to="/insights" className="hover:text-accent-primary px-3 py-2 rounded-md text-sm font-medium transition-colors">Insights</Link>
                <Link to="/science" className="hover:text-accent-primary px-3 py-2 rounded-md text-sm font-medium transition-colors">Science</Link>
                <Link to="/about" className="hover:text-accent-primary px-3 py-2 rounded-md text-sm font-medium transition-colors">About</Link>
              </div>
            </nav>
            <div className="md:hidden flex items-center">
              <button className="text-gray-400 hover:text-white p-2">
                <span className="sr-only">Open menu</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Lazy pages load here, so the header stays visible meanwhile */}
        <Suspense fallback={<p className="text-gray-400">Loading…</p>}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
