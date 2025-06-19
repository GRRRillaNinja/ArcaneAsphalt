// Main application initialization
function initializeApp(coords) {
  console.log('Initializing app with coords:', coords);
  
  try {
    // Initialize modules in correct order
    window.arcane.map.initMap(coords.lat, coords.lng);
    window.arcane.game.initGame(); // Changed from .init() to .initGame()
    
    if (window.arcane.territory) {
      window.arcane.territory.initTerritory();
    }
    
    console.log('App initialized successfully');
  } catch (error) {
    console.error('Failed to initialize app:', error);
  }
}

// Get user location and initialize
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const coords = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };
      localStorage.setItem('playerLocation', JSON.stringify(coords));
      initializeApp(coords);
    },
    (error) => {
      console.log('Geolocation failed, using default location');
      const defaultCoords = window.arcane.utils.DEFAULT_LOCATION;
      initializeApp(defaultCoords);
    }
  );
} else {
  console.log('Geolocation not supported, using default location');
  const defaultCoords = window.arcane.utils.DEFAULT_LOCATION;
  initializeApp(defaultCoords);
}

window.addEventListener('load', () => {
  console.log('Window loaded');
});