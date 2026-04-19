import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Heatmap from './pages/Heatmap';
import PhotoUpload from './pages/PhotoUpload';

const App = () => {
  return (
    <Router>
      <div className="bg-slate-900 min-h-screen">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/heatmap" element={<Heatmap />} />
          <Route path="/upload" element={<PhotoUpload />} />
        </Routes>
        <Navbar />
      </div>
    </Router>
  );
};

export default App;
