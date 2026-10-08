import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Sense from './pages/Sense';
import MapPage from './pages/MapPage';
import Insights from './pages/Insights';
import Science from './pages/Science';
import About from './pages/About';
import Result from './pages/Result';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="sense" element={<Sense />} />
          <Route path="map" element={<MapPage />} />
          <Route path="insights" element={<Insights />} />
          <Route path="science" element={<Science />} />
          <Route path="about" element={<About />} />
          <Route path="result/:id" element={<Result />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
