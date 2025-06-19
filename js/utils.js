// Utility functions
function calculateArea(points) {
  if (points.length < 3) return 0;
  
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].lat * points[j].lng;
    area -= points[j].lat * points[i].lng;
  }
  area = Math.abs(area) / 2;
  
  // Convert to square miles (rough approximation)
  const earthRadius = 3959; // miles
  const latRadians = points[0].lat * Math.PI / 180;
  const lngFactor = Math.cos(latRadians);
  const squareMiles = area * Math.pow((earthRadius * Math.PI / 180), 2) * lngFactor;
  
  return squareMiles;
}

function getTerritoryCentroid(points) {
  if (points.length === 0) return { lat: 0, lng: 0 };
  
  let lat = 0, lng = 0;
  points.forEach(point => {
    lat += point.lat;
    lng += point.lng;
  });
  
  return {
    lat: lat / points.length,
    lng: lng / points.length
  };
}

// Export utilities
if (typeof window !== 'undefined') {
  window.arcane = window.arcane || {};
  window.arcane.utils = {
    calculateArea: calculateArea,
    getTerritoryCentroid: getTerritoryCentroid,
    DEFAULT_LOCATION: { lat: 34.4588288, lng: -92.9660928 }
  };
}