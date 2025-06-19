// Define player object at module level
let player = {
  level: 1,
  car: 'Standard',
  carSpeed: 60,
  carHandling: 40,
  resources: 100,
  squareMiles: 0.050,
  availableOutposts: 4
};

window.arcane = window.arcane || {};
window.arcane.game = {
  player: player, // Reference to the player object
  
  initGame: function() {
    console.log('Initializing game...');
    this.updateStats();
  },

  upgradeCar: function() {
    if (player.resources >= 50) {
      player.resources -= 50;
      player.carSpeed += 10;
      player.carHandling += 5;
      this.updateStats();
      console.log('Car upgraded!');
      alert('Car upgraded!');
    } else {
      alert('Not enough resources to upgrade car.');
    }
  },

  autoRace: function() {
    console.log('Toggle auto-race');
    alert('Auto-race toggled!');
  },

  updateStats: function() {
    console.log('Updating stats...');
    
    // Update stats tab
    const carInfo = document.getElementById('carInfo');
    const carSpeed = document.getElementById('carSpeed');
    const carHandling = document.getElementById('carHandling');
    const resources = document.getElementById('resources');
    const statsSquareMiles = document.getElementById('statsSquareMiles');
    const statsAvailableOutposts = document.getElementById('statsAvailableOutposts');
    
    if (carInfo) carInfo.textContent = player.car;
    if (carSpeed) carSpeed.textContent = player.carSpeed;
    if (carHandling) carHandling.textContent = player.carHandling;
    if (resources) resources.textContent = player.resources;
    if (statsSquareMiles) statsSquareMiles.textContent = player.squareMiles.toFixed(3);
    if (statsAvailableOutposts) statsAvailableOutposts.textContent = player.availableOutposts;
    
    // Calculate territory stats
    let territories = [];
    let totalArea = 0;
    
    if (window.arcane && window.arcane.territory && window.arcane.territory.getTerritories) {
      territories = window.arcane.territory.getTerritories();
      totalArea = territories.reduce((sum, t) => sum + (t.area || 0), 0);
    }
    
    const availableArea = player.squareMiles - totalArea;
    
    const statsTerritoryCount = document.getElementById('statsTerritoryCount');
    const statsTerritoryArea = document.getElementById('statsTerritoryArea');
    
    if (statsTerritoryCount) statsTerritoryCount.textContent = territories.length;
    if (statsTerritoryArea) statsTerritoryArea.textContent = totalArea.toFixed(3);
    
    // Update territory tab
    const territoryAvailableOutposts = document.getElementById('territoryAvailableOutposts');
    const territorySquareMiles = document.getElementById('territorySquareMiles');
    const availableTerritory = document.getElementById('availableTerritory');
    const territoryCount = document.getElementById('territoryCount');
    const territoryArea = document.getElementById('territoryArea');
    
    if (territoryAvailableOutposts) territoryAvailableOutposts.textContent = player.availableOutposts;
    if (territorySquareMiles) territorySquareMiles.textContent = player.squareMiles.toFixed(3);
    if (availableTerritory) availableTerritory.textContent = Math.max(0, availableArea).toFixed(3);
    if (territoryCount) territoryCount.textContent = territories.length;
    if (territoryArea) territoryArea.textContent = totalArea.toFixed(3);
    
    // Update territory list
    const territoryList = document.getElementById('territoryList');
    if (territoryList) {
      const territoryNames = territories.map(t => t.name).join(', ') || 'None';
      territoryList.textContent = territoryNames;
    }
    
    console.log('Stats updated successfully');
  }
};