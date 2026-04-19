import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Heatmap from './pages/Heatmap';
import PhotoUpload from './pages/PhotoUpload';

const AppContent = () => {
  const location = useLocation();
  return (
    <div className="bg-slate-900 min-h-screen">
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/heatmap" element={<Heatmap />} />
        <Route path="/upload" element={<PhotoUpload />} />
      </Routes>
      {/* Hide the global bottom navbar when viewing the Landing Page */}
      {location.pathname !== '/' && <Navbar />}
    </div>
  );
};

const App = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

export default App;
