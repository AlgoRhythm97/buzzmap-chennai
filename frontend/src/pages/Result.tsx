import { useParams } from 'react-router-dom';

export default function Result() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="card-border p-8 mt-10">
      <h1 className="text-2xl font-bold text-accent-primary mb-4">Detection Result</h1>
      <p className="text-gray-300">Observation ID: <span className="font-mono text-white">{id}</span></p>
      <p className="text-gray-400 italic mt-4">Database functionality will be implemented in subsequent stages.</p>
    </div>
  );
}
