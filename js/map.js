console.log('map.js loaded');

let mapInstance = null;
let playerMarker = null;
let edgeMarkerInstance = null;

// EdgeMarker class for tracking off-screen markers
class EdgeMarker {
  constructor(map) {
    this.map = map;
    this.edgeMarkers = [];
    this.trackedMarkers = [];
    
    // Listen for map move events
    this.map.on('move', () => this.updateEdgeMarkers());
    this.map.on('zoom', () => this.updateEdgeMarkers());
    this.map.on('resize', () => this.updateEdgeMarkers());
  }
  
  updateEdgeMarkers(newMarkers = null) {
    console.log('updateEdgeMarkers called with:', newMarkers ? newMarkers.length : 'no new markers');
    
    if (newMarkers !== null) {
      this.trackedMarkers = newMarkers;
      console.log('Tracking', this.trackedMarkers.length, 'markers');
    }
    
    // Clear existing edge markers
    console.log('Clearing', this.edgeMarkers.length, 'existing edge markers');
    this.edgeMarkers.forEach(marker => this.map.removeLayer(marker));
    this.edgeMarkers = [];
    
    const bounds = this.map.getBounds();
    console.log('Map bounds:', bounds);
    
    this.trackedMarkers.forEach((marker, index) => {
      const pos = marker.getLatLng();
      console.log('Checking marker', index, 'at position:', pos);
      
      // Check if marker is outside viewport
      if (!bounds.contains(pos)) {
        console.log('Marker', index, 'is outside viewport, creating edge marker');
        const edgeMarker = this.createEdgeMarker(marker, pos, bounds);
        if (edgeMarker) {
          this.edgeMarkers.push(edgeMarker);
          edgeMarker.addTo(this.map);
          console.log('Edge marker added to map');
        }
      } else {
        console.log('Marker', index, 'is inside viewport, no edge marker needed');
      }
    });
    
    console.log('Total edge markers created:', this.edgeMarkers.length);
  }
  
  createEdgeMarker(originalMarker, originalPos, bounds) {
    console.log('Creating edge marker for:', originalMarker.options.territoryId);
    
    const mapCenter = this.map.getCenter();
    const mapBounds = this.map.getBounds();
    
    // Calculate direction from center to original position
    const dx = originalPos.lng - mapCenter.lng;
    const dy = originalPos.lat - mapCenter.lat;
    
    console.log('Direction from center to territory:', { dx, dy });
    
    // Normalize direction
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length === 0) {
      console.log('Zero length vector, skipping edge marker');
      return null;
    }
    
    // Calculate proper edge intersection - back to close to edge
const mapWidth = mapBounds.getEast() - mapBounds.getWest();
const mapHeight = mapBounds.getNorth() - mapBounds.getSouth();
const edgeMargin = 0.02; // Back to 2% margin from edge

// Define the viewport bounds with smaller margin
const viewportBounds = {
  north: mapBounds.getNorth() - mapHeight * edgeMargin,
  south: mapBounds.getSouth() + mapHeight * edgeMargin,
  east: mapBounds.getEast() - mapWidth * edgeMargin,
  west: mapBounds.getWest() + mapWidth * edgeMargin
};
    
    // Calculate intersection point using proper line-rectangle intersection
    let edgeLat, edgeLng;
    let intersectionFound = false;
    
    // Ray from center towards territory
    const rayDx = dx / length;
    const rayDy = dy / length;
    
    // Check intersection with each edge
    const intersections = [];
    
    // North edge intersection
    if (rayDy > 0) {
      const t = (viewportBounds.north - mapCenter.lat) / rayDy;
      const intersectLng = mapCenter.lng + rayDx * t;
      if (intersectLng >= viewportBounds.west && intersectLng <= viewportBounds.east) {
        intersections.push({ lat: viewportBounds.north, lng: intersectLng, distance: t });
      }
    }
    
    // South edge intersection
    if (rayDy < 0) {
      const t = (viewportBounds.south - mapCenter.lat) / rayDy;
      const intersectLng = mapCenter.lng + rayDx * t;
      if (intersectLng >= viewportBounds.west && intersectLng <= viewportBounds.east) {
        intersections.push({ lat: viewportBounds.south, lng: intersectLng, distance: t });
      }
    }
    
    // East edge intersection
    if (rayDx > 0) {
      const t = (viewportBounds.east - mapCenter.lng) / rayDx;
      const intersectLat = mapCenter.lat + rayDy * t;
      if (intersectLat >= viewportBounds.south && intersectLat <= viewportBounds.north) {
        intersections.push({ lat: intersectLat, lng: viewportBounds.east, distance: t });
      }
    }
    
    // West edge intersection
    if (rayDx < 0) {
      const t = (viewportBounds.west - mapCenter.lng) / rayDx;
      const intersectLat = mapCenter.lat + rayDy * t;
      if (intersectLat >= viewportBounds.south && intersectLat <= viewportBounds.north) {
        intersections.push({ lat: intersectLat, lng: viewportBounds.west, distance: t });
      }
    }
    
    // Use the closest valid intersection
    if (intersections.length > 0) {
      const closestIntersection = intersections.reduce((closest, current) => 
        current.distance < closest.distance ? current : closest
      );
      edgeLat = closestIntersection.lat;
      edgeLng = closestIntersection.lng;
      intersectionFound = true;
    }
    
    if (!intersectionFound) {
      console.log('No valid intersection found, falling back to corner');
      // Fallback: place at appropriate corner
      edgeLat = rayDy > 0 ? viewportBounds.north : viewportBounds.south;
      edgeLng = rayDx > 0 ? viewportBounds.east : viewportBounds.west;
    }
    
    console.log('Edge intersection:', { 
      edgeLat, 
      edgeLng, 
      intersectionFound, 
      intersectionCount: intersections.length 
    });
    
    // Get territory info from original marker
    const territoryId = originalMarker.options.territoryId;
    const territory = window.arcane.territory.getTerritories().find(t => t.id === territoryId);
    const territoryName = territory ? territory.name : 'Unknown';
    
    // Get territory color - territories use #FF5722 (red-orange)
    const territoryColor = '#FF5722';
    
    // Calculate SCREEN distance for zoom-independent scaling
    const mapCenterPoint = this.map.latLngToContainerPoint(mapCenter);
    const territoryPoint = this.map.latLngToContainerPoint(originalPos);
    const screenDistance = Math.sqrt(
      Math.pow(territoryPoint.x - mapCenterPoint.x, 2) + 
      Math.pow(territoryPoint.y - mapCenterPoint.y, 2)
    );
    
    // Calculate scale based on screen distance
    const minScreenDistance = 100;  // 100 pixels from center
    const maxScreenDistance = 800;  // 800 pixels from center
    const minScale = 0.6;           // Minimum scale (60%)
    const maxScale = 1.4;           // Maximum scale (140%)
    
    // Invert distance for scaling (closer = larger)
    const normalizedDistance = Math.max(0, Math.min(1, (screenDistance - minScreenDistance) / (maxScreenDistance - minScreenDistance)));
    const scale = maxScale - (normalizedDistance * (maxScale - minScale));
    
    // Calculate sizes based on scale
    const baseSize = 30;
    const scaledSize = Math.round(baseSize * scale);
    const iconSize = Math.round(16 * scale);
    
    console.log('Screen distance scaling:', {
      screenDistance: screenDistance.toFixed(1),
      scale: scale.toFixed(2),
      scaledSize: scaledSize
    });
    
    // Calculate rotation angle for the arrow to point toward the territory
// Fix: negate dx to correct horizontal inversion
const angle = Math.atan2(dy, -dx) * (180 / Math.PI);
const iconRotation = angle;

console.log('Arrow direction calculation:', {
  territoryDirection: { dx, dy },
  correctedDirection: { dx: -dx, dy },
  angleToTerritory: angle.toFixed(1),
  iconRotation: iconRotation.toFixed(1),
  territoryName: territoryName
});
    
    // Create edge marker with corrected arrow direction
    const edgeMarker = L.marker([edgeLat, edgeLng], {
      icon: L.divIcon({
        className: 'edge-marker territory-edge',
        html: '<div style="background: ' + territoryColor + '; width: ' + scaledSize + 'px; height: ' + scaledSize + 'px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.3); transition: all 0.3s ease;"><i class="fas fa-angle-left" style="color: white; font-size: ' + iconSize + 'px; transform: rotate(' + iconRotation + 'deg);"></i></div>',
        iconSize: [scaledSize, scaledSize],
        iconAnchor: [scaledSize/2, scaledSize/2]
      }),
      screenDistance: screenDistance,
      territoryName: territoryName
    });
    
    // Add click handler to zoom to original marker
    edgeMarker.on('click', () => {
      console.log('Edge marker clicked, zooming to:', originalPos);
      this.map.setView(originalPos, Math.max(this.map.getZoom(), 12));
    });
    
    console.log('Edge marker created successfully');
    return edgeMarker;
  }
}

// Initialize map
function initMap(lat, lng) {
  console.log('Initializing map with coords:', { lat, lng });
  
  mapInstance = L.map('map', {
    center: [lat, lng],
    zoom: 13,
    zoomControl: true
  });

  // Add tile layer
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 18
  }).addTo(mapInstance);

  // Create player marker
  playerMarker = L.marker([lat, lng], {
    icon: L.divIcon({
      className: 'player-marker',
      html: '<div class="player-icon">📍</div>',
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    })
  }).addTo(mapInstance);

  console.log('Map initialized successfully');
  
  // Invalidate size after a short delay to ensure proper rendering
  setTimeout(() => {
    mapInstance.invalidateSize();
    console.log('Map size invalidated');
  }, 100);
  
  // Initialize EdgeMarker
  edgeMarkerInstance = new EdgeMarker(mapInstance);
  console.log('EdgeMarker initialized');
  
  // Update the mapModule.edgeMarker after EdgeMarker is created
  mapModule.edgeMarker = edgeMarkerInstance;
  console.log('EdgeMarker assigned to mapModule:', mapModule.edgeMarker);
  
  return mapInstance;
}

function getMap() {
  return mapInstance;
}

function getPlayerMarker() {
  return playerMarker;
}

// Create layer groups for better organization
const layers = {
  territory: () => mapInstance,
  race: () => mapInstance,
  temp: () => mapInstance
};

// Export map module - initially with null edgeMarker
const mapModule = {
  initMap: initMap,
  map: getMap,
  marker: getPlayerMarker,
  layers: layers,
  edgeMarker: null
};

window.arcane = window.arcane || {};
window.arcane.mapModule = mapModule;
window.arcane.map = mapModule;

console.log('mapModule exported:', mapModule);