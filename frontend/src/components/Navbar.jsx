import React from 'react';
import { Link } from 'react-router-dom';

const Navbar = () => {
  return (
    <nav className="bg-gray-800 p-4">
      <Link to="/" className="text-white mr-4">Dashboard</Link>
      <Link to="/heatmap" className="text-white mr-4">Heatmap</Link>
      <Link to="/upload" className="text-white">Upload Photo</Link>
    </nav>
  );
};

export default Navbar;
