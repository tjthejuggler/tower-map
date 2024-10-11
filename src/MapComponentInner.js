import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, Circle, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import * as GeoTIFF from 'geotiff';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

function LocationMarker({ position, setPosition }) {
  const map = useMapEvents({
    click(e) {
      setPosition(e.latlng);
      map.flyTo(e.latlng, map.getZoom());
    },
  });

  return position === null ? null : (
    <Marker position={position} />
  );
}

function MapCenterAdjust({ center }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 10);
  }, [center, map]);
  return null;
}

const EARTH_RADIUS = 6371000; // Earth's radius in meters

function calculateDistance(lat1, lon1, lat2, lon2) {
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return EARTH_RADIUS * c;
}

function hasLineOfSight(elevation1, height1, elevation2, height2, distance) {
  const heightDifference = (elevation1 + height1) - (elevation2 + height2);
  const earthCurvature = (distance * distance) / (2 * EARTH_RADIUS);
  const sightLine = heightDifference - earthCurvature;
  return sightLine > 0;
}

const MapComponentInner = () => {
  const [position, setPosition] = useState(null);
  const [towerHeight, setTowerHeight] = useState(30); // Set a default tower height
  const [viewerHeight, setViewerHeight] = useState(1.7); // Default human height in meters
  const [elevationData, setElevationData] = useState(null);
  const [visibilityData, setVisibilityData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const mapRef = useRef(null);

  const handleTowerHeightChange = (e) => {
    setTowerHeight(Number(e.target.value));
  };

  const handleViewerHeightChange = (e) => {
    setViewerHeight(Number(e.target.value));
  };

  const fetchTopographicalData = useCallback(async (lat, lng) => {
    const API_KEY = process.env.REACT_APP_OPENTOPOGRAPHY_API_KEY;
    const AREA_SIZE = 0.5; // 0.5 degrees (about 55 km)
    const API_URL = `https://portal.opentopography.org/API/globaldem?demtype=SRTMGL3&south=${lat-AREA_SIZE}&north=${lat+AREA_SIZE}&west=${lng-AREA_SIZE}&east=${lng+AREA_SIZE}&outputFormat=GTiff&API_Key=${API_KEY}`;

    console.log('Fetching topographical data from:', API_URL);

    try {
      const response = await fetch(API_URL);
      console.log('API Response status:', response.status);

      if (!response.ok) {
        console.error('API response not OK:', response.status, response.statusText);
        const responseText = await response.text();
        console.error('Response text:', responseText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      console.log('Received array buffer of size:', arrayBuffer.byteLength);

      const tiff = await GeoTIFF.fromArrayBuffer(arrayBuffer);
      console.log('TIFF parsed successfully');

      const image = await tiff.getImage();
      console.log('Got image from TIFF:', image);

      const rasters = await image.readRasters();
      console.log('Read rasters from image:', rasters);

      const elevation = rasters[0];
      const [width, height] = [image.getWidth(), image.getHeight()];
      const [minX, minY, maxX, maxY] = image.getBoundingBox();

      console.log('Elevation data fetched successfully:', { width, height, bbox: [minX, minY, maxX, maxY] });
      return {
        elevation: elevation,
        width,
        height,
        bbox: [minX, minY, maxX, maxY],
      };
    } catch (error) {
      console.error('Error fetching elevation data:', error);
      throw error;
    }
  }, []);

  const handleCalculateVisibility = useCallback(async () => {
    if (!position) {
      setError('Please select a tower location on the map.');
      return;
    }

    setLoading(true);
    setError(null);
    setProgress(0);

    try {
      console.log('Calculating visibility for position:', position);
      const topographicalData = await fetchTopographicalData(position.lat, position.lng);
      setElevationData(topographicalData);

      const { elevation, width, height, bbox } = topographicalData;
      const [minX, minY, maxX, maxY] = bbox;
      const towerElevation = elevation[Math.floor(height/2) * width + Math.floor(width/2)];

      console.log('Tower elevation:', towerElevation);

      const visibility = new Array(height * width).fill(false);

      console.log('Starting visibility calculation...');
      const totalPoints = height * width;
      let calculatedPoints = 0;

      const startTime = Date.now();
      const timeout = 300000; // 5 minutes timeout

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const lat = maxY - (y / height) * (maxY - minY);
          const lng = minX + (x / width) * (maxX - minX);
          const distance = calculateDistance(position.lat, position.lng, lat, lng);
          const pointElevation = elevation[y * width + x];

          visibility[y * width + x] = hasLineOfSight(
            towerElevation,
            towerHeight,
            pointElevation,
            viewerHeight,
            distance
          );

          calculatedPoints++;
          if (calculatedPoints % 1000 === 0) {
            setProgress(Math.floor((calculatedPoints / totalPoints) * 100));
            console.log(`Calculated ${calculatedPoints}/${totalPoints} points`);

            // Check for timeout
            if (Date.now() - startTime > timeout) {
              throw new Error('Calculation timed out after 5 minutes');
            }
          }
        }
      }

      setVisibilityData({ visibility, bbox });
      console.log('Visibility calculated successfully');
    } catch (error) {
      console.error('Error in handleCalculateVisibility:', error);
      setError(`Failed to calculate visibility: ${error.message}`);
    } finally {
      setLoading(false);
      setProgress(100);
    }
  }, [position, towerHeight, viewerHeight, fetchTopographicalData]);

  useEffect(() => {
    // Retrieve the last position from localStorage
    const savedPosition = localStorage.getItem('lastPosition');
    if (savedPosition) {
      setPosition(JSON.parse(savedPosition));
    } else {
      // Set a default position (London) if no saved position
      setPosition({ lat: 51.5074, lng: -0.1278 });
    }
  }, []);

  useEffect(() => {
    if (position) {
      // Save the position to localStorage whenever it changes
      localStorage.setItem('lastPosition', JSON.stringify(position));
      handleCalculateVisibility();
    }
  }, [position, handleCalculateVisibility]);

  const visibilityOverlay = useMemo(() => {
    if (!visibilityData) return null;

    const { visibility, bbox } = visibilityData;
    const [minX, minY, maxX, maxY] = bbox;
    const width = Math.sqrt(visibility.length);
    const height = width;

    const visiblePoints = [];
    for (let y = 0; y < height; y += 4) {  // Reduce resolution for performance
      for (let x = 0; x < width; x += 4) {
        if (visibility[y * width + x]) {
          const lat = maxY - (y / height) * (maxY - minY);
          const lng = minX + (x / width) * (maxX - minX);
          visiblePoints.push([lat, lng]);
        }
      }
    }

    return visiblePoints.map((point, index) => (
      <Circle
        key={index}
        center={point}
        pathOptions={{ color: 'blue', fillColor: 'blue', fillOpacity: 0.2 }}
        radius={100} // Increased radius due to reduced resolution
      />
    ));
  }, [visibilityData]);

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1 style={{ textAlign: 'center', color: '#333' }}>Tower Visibility Calculator</h1>
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label>
          Tower Height (m):
          <input
            type="number"
            value={towerHeight}
            onChange={handleTowerHeightChange}
            min="0"
            step="0.1"
            style={{ marginLeft: '10px', padding: '5px' }}
          />
        </label>
        <label>
          Viewer Height (m):
          <input
            type="number"
            value={viewerHeight}
            onChange={handleViewerHeightChange}
            min="0"
            step="0.1"
            style={{ marginLeft: '10px', padding: '5px' }}
          />
        </label>
        <button 
          onClick={handleCalculateVisibility} 
          disabled={loading}
          style={{
            padding: '10px 20px',
            backgroundColor: loading ? '#ccc' : '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Calculating...' : 'Calculate Visibility'}
        </button>
      </div>
      {position && (
        <MapContainer center={position} zoom={10} style={{ height: '400px', width: '100%', marginBottom: '20px' }} ref={mapRef}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <LocationMarker position={position} setPosition={setPosition} />
          {visibilityOverlay}
          <MapCenterAdjust center={position} />
        </MapContainer>
      )}
      {position && (
        <div style={{ backgroundColor: '#f0f0f0', padding: '10px', borderRadius: '5px' }}>
          <p><strong>Tower Location:</strong> {position.lat.toFixed(4)}, {position.lng.toFixed(4)}</p>
          <p><strong>Tower Height:</strong> {towerHeight} m</p>
          <p><strong>Viewer Height:</strong> {viewerHeight} m</p>
          {elevationData && (
            <p><strong>Status:</strong> Elevation data fetched successfully</p>
          )}
          {visibilityData && (
            <p><strong>Status:</strong> Visibility calculated successfully</p>
          )}
        </div>
      )}
      {error && <p style={{ color: 'red', fontWeight: 'bold' }}>{error}</p>}
      {loading && (
        <div>
          <p style={{ textAlign: 'center', fontStyle: 'italic' }}>Calculating visibility... Please wait.</p>
          <progress value={progress} max="100" style={{ width: '100%' }}></progress>
          <p style={{ textAlign: 'center' }}>{progress}% complete</p>
        </div>
      )}
    </div>
  );
};

export default MapComponentInner;
