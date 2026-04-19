import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Heatmap from './pages/Heatmap';
import PhotoUpload from './pages/PhotoUpload';

const App = () => {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/heatmap" element={<Heatmap />} />
        <Route path="/upload" element={<PhotoUpload />} />
      </Routes>
    </Router>
  );
};

export default App;
