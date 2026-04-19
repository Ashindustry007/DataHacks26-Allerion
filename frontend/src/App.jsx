import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import ProfileSetup from './pages/ProfileSetup';
import Dashboard from './pages/Dashboard';
import Heatmap from './pages/Heatmap';
import Consultant from './pages/Consultant';
import PhotoUpload from './pages/PhotoUpload';

const AppContent = () => {
  return (
    <div className="bg-slate-900 min-h-screen">
      <Navbar />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/dashboard" element={<ProfileSetup />} />
        <Route path="/forecast" element={<Dashboard />} />
        <Route path="/heatmap" element={<Heatmap />} />
        <Route path="/photo" element={<PhotoUpload />} />
        <Route path="/consultant" element={<Consultant />} />
      </Routes>
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
