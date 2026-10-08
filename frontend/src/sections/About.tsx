export default function About() {
  return (
    <footer id="about" className="scroll-mt-20 mt-6 border-t border-gray-800 py-10 text-sm text-gray-400">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <p className="text-lg font-bold text-accent-primary">BuzzMap Chennai</p>
          <p className="mt-2 leading-relaxed">
            A prototype low-cost optical mosquito sensing network that turns wingbeat signals into AI-assisted
            vector surveillance across Chennai.
          </p>
        </div>
        <div>
          <p className="font-semibold text-gray-200">Built with</p>
          <p className="mt-2 leading-relaxed">
            ESP32 sensors · Python, NumPy &amp; SciPy signal processing · scikit-learn · FastAPI &amp; SQLite ·
            React, Leaflet, Recharts &amp; Three.js
          </p>
        </div>
        <div>
          <p className="font-semibold text-gray-200">Please note</p>
          <p className="mt-2 leading-relaxed">
            This is a research prototype. Demo data is simulated, and the 3D mosquitoes are artistic
            reconstructions. Use official public-health sources for health decisions.
          </p>
        </div>
      </div>
      <p className="mt-8 text-xs text-gray-600">Map data © OpenStreetMap contributors.</p>
    </footer>
  );
}
