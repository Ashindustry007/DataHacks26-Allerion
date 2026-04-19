import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import * as h3 from 'h3-js';
import { getPollenCount } from '../api/client';

const Heatmap = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    getPollenCount(32.71, -117.16).then(setData);
  }, []);

  const geojson = data.map(item => {
    const boundary = h3.h3ToGeoBoundary(item.h3_index);
    const closedBoundary = [...boundary, boundary[0]]; // Close the polygon for GeoJSON
    return {
      type: "Feature",
      geometry: {
        type: "Polygon",
        // h3-js returns [lat, lng], but GeoJSON needs [lng, lat], and the polygon must be closed
        coordinates: [closedBoundary.map(coord => [coord[1], coord[0]])],
      },
      properties: {
        style: {
          fillColor: 'red',
          fillOpacity: item.pollen_index / 10,
          color: 'black',
          weight: 1,
        }
      }
    };
  });

  return (
    <MapContainer center={[32.71, -117.16]} zoom={13} style={{ height: "100vh" }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <GeoJSON data={geojson} style={feature => feature.properties.style} />
    </MapContainer>
  );
};

export default Heatmap;
