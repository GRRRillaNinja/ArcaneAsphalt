console.log('territory.js is loading...');

// Global variables - declared only once
let territories = [];
let selectedTerritory = null;
let outpostMarkers = [];
let drawMode = false;
let editMode = false;
let territoryPolygon = null;
let territoryLabels = [];
let territoryPolygons = [];
let lastMovedMarker = null;

// Make territories accessible to other modules
window.arcane = window.arcane || {};
window.arcane.territory = {
  toggleDrawMode: function() {
    const map = window.arcane.map.map();
    if (!map) return;
    
    const button = document.getElementById('drawButton');
    
    if (drawMode) {
      // Finish drawing
      if (outpostMarkers.length >= 3) {
        const territoryName = prompt('Enter territory name:');
        if (territoryName) {
          this.saveCurrentTerritory(territoryName);
        }
      }
      drawMode = false;
      button.textContent = 'Create New Territory';
      // Don't remove the click handler - it's needed for deselection
      
      // Hide dynamic display and clear territory visuals
      this.hideDynamicAreaDisplay();
      this.clearCurrentTerritory();
    } else {
      // Start drawing - only check if player has outposts available
      if (window.arcane.game.player.availableOutposts <= 0) {
        alert('No outposts available!');
        return;
      }
      
      drawMode = true;
      button.textContent = 'Finish Territory';
      this.clearCurrentTerritory();
      // Click handler is already registered in initTerritory
    }
    
    this.updateTerritoryPolygon();
  },

  toggleEditMode: function() {
    if (!selectedTerritory) {
      alert('No territory selected to edit.');
      return;
    }
    
    editMode = !editMode;
    const button = document.getElementById('editTerritoryButton');
    
    if (editMode) {
      button.textContent = 'Stop Editing';
      this.loadTerritoryForEdit(selectedTerritory);
      document.getElementById('saveTerritoryButton').classList.remove('disabled');
      document.getElementById('cancelTerritoryButton').classList.remove('disabled');
    } else {
      button.textContent = 'Edit Territory';
      this.clearCurrentTerritory();
      this.hideDynamicAreaDisplay();
      document.getElementById('saveTerritoryButton').classList.add('disabled');
      document.getElementById('cancelTerritoryButton').classList.add('disabled');
      this.displayAllTerritories();
    }
    
    this.updateTerritoryPolygon();
  },

  saveTerritory: function() {
    if (editMode && selectedTerritory) {
      // Extract only the position data (no circular references)
      const updatedOutposts = outpostMarkers.map(m => {
        const pos = m.getLatLng();
        return { lat: pos.lat, lng: pos.lng };
      });
      
      const updatedArea = window.arcane.utils.calculateArea(updatedOutposts);
      
      // Check total territory area limit (excluding the current territory being edited)
      const otherTerritoriesArea = territories
        .filter(t => t.id !== selectedTerritory.id)
        .reduce((sum, t) => sum + (t.area || 0), 0);
      
      const totalWithUpdated = otherTerritoriesArea + updatedArea;
      const maxArea = window.arcane.game.player.squareMiles;
      
      if (totalWithUpdated > maxArea) {
        const excess = totalWithUpdated - maxArea;
        alert(`Cannot save territory changes: This would exceed your total territory limit by ${excess.toFixed(3)} sq mi!\n\nOther territories: ${otherTerritoriesArea.toFixed(3)} sq mi\nThis territory: ${updatedArea.toFixed(3)} sq mi\nYour limit: ${maxArea.toFixed(3)} sq mi\n\nReduce territory size or increase your level.`);
        return;
      }
      
      // Update existing territory
      selectedTerritory.outposts = updatedOutposts;
      selectedTerritory.area = updatedArea;
      selectedTerritory.modified = new Date().toISOString();
      
      this.saveTerritoriesToStorage();
      alert(`Territory "${selectedTerritory.name}" updated!`);
      
      editMode = false;
      document.getElementById('editTerritoryButton').textContent = 'Edit Territory';
      document.getElementById('saveTerritoryButton').classList.add('disabled');
      document.getElementById('cancelTerritoryButton').classList.add('disabled');
      
      this.clearCurrentTerritory();
      this.hideDynamicAreaDisplay();
      this.displayAllTerritories();
      window.arcane.game.updateStats();
    }
  },

  cancelTerritory: function() {
    if (drawMode) {
      // Return outposts to player
      window.arcane.game.player.availableOutposts += outpostMarkers.length;
      drawMode = false;
      document.getElementById('drawButton').textContent = 'Create New Territory';
    } else if (editMode) {
      editMode = false;
      document.getElementById('editTerritoryButton').textContent = 'Edit Territory';
      document.getElementById('saveTerritoryButton').classList.add('disabled');
      document.getElementById('cancelTerritoryButton').classList.add('disabled');
      this.displayAllTerritories();
    }
    
    this.clearCurrentTerritory();
    this.hideDynamicAreaDisplay();
    window.arcane.game.updateStats();
  },

  deleteTerritory: function() {
    if (!selectedTerritory) {
      alert('No territory selected to delete.');
      return;
    }
    
    const territoryName = selectedTerritory.name;
    const outpostCount = selectedTerritory.outposts ? selectedTerritory.outposts.length : 0;
    
    if (confirm(`Delete territory "${territoryName}"? This will return ${outpostCount} outposts.`)) {
      // Credit outposts back to player
      window.arcane.game.player.availableOutposts += outpostCount;
      
      // Remove from territories array
      const index = territories.findIndex(t => t.id === selectedTerritory.id);
      if (index > -1) {
        territories.splice(index, 1);
      }
      
      this.saveTerritoriesToStorage();
      this.deselectTerritory();
      this.displayAllTerritories();
      window.arcane.game.updateStats();
      
      alert(`Territory "${territoryName}" deleted. ${outpostCount} outposts returned.`);
    }
  },

  addOutpost: function() {
    if (window.arcane.game.player.availableOutposts <= 0) {
      alert('No outposts available!');
      return;
    }
    
    alert('Click on the map to place an outpost.');
  },

  deleteOutpost: function() {
    if (outpostMarkers.length === 0) {
      alert('No outposts to delete.');
      return;
    }
    
    // Remove last outpost marker
    const marker = outpostMarkers.pop();
    const map = window.arcane.map.map();
    map.removeLayer(marker);
    
    // Return outpost to player
    window.arcane.game.player.availableOutposts++;
    window.arcane.game.updateStats();
    
    this.updateTerritoryPolygon();
  },

  debugAddOutposts: function() {
    window.arcane.game.player.availableOutposts += 10;
    window.arcane.game.updateStats();
    console.log('Added 10 outposts. Total:', window.arcane.game.player.availableOutposts);
  },

  debugAddSquareMile: function() {
    window.arcane.game.player.squareMiles += 1.0;
    window.arcane.game.updateStats();
    console.log('Added 1 square mile. Total:', window.arcane.game.player.squareMiles);
  },

  checkTotalTerritoryArea: function() {
    const totalArea = territories.reduce((sum, territory) => sum + (territory.area || 0), 0);
    const maxArea = window.arcane.game.player.squareMiles;
    
    console.log('Total territory area:', totalArea.toFixed(3), 'Max allowed:', maxArea.toFixed(3));
    
    return {
      totalArea: totalArea,
      maxArea: maxArea,
      isValid: totalArea <= maxArea,
      remaining: Math.max(0, maxArea - totalArea)
    };
  },

  autoAdjustBoundaries: function(points, maxArea, playerLocation) {
    console.log('Auto-adjusting boundaries - only moving last moved pin');
    
    if (!lastMovedMarker) {
      console.log('No last moved marker found, cannot auto-adjust');
      return;
    }
    
    const currentArea = window.arcane.utils.calculateArea(outpostMarkers.map(m => m.getLatLng()));
    if (currentArea <= maxArea) {
      console.log('Area already within limits');
      return;
    }
    
    console.log('Current area exceeds limit:', currentArea.toFixed(3), '>', maxArea.toFixed(3));
    console.log('Moving last moved marker to fit within limits');
    
    // Calculate centroid of all OTHER markers (excluding the one we're going to move)
    const otherMarkers = outpostMarkers.filter(m => m !== lastMovedMarker);
    const otherPoints = otherMarkers.map(m => m.getLatLng());
    const centroid = window.arcane.utils.getTerritoryCentroid(otherPoints);
    
    console.log('Centroid of other markers:', centroid);
    console.log('Moving marker from:', lastMovedMarker.getLatLng());
    
    // Store original position in case we need to revert
    const originalPos = lastMovedMarker.getLatLng();
    
    let attempts = 0;
    const maxAttempts = 50;
    let moveFactor = 0.05; // Start by moving 5% toward centroid each attempt
    
    while (attempts < maxAttempts) {
      const testArea = window.arcane.utils.calculateArea(outpostMarkers.map(m => m.getLatLng()));
      console.log('Attempt', attempts + 1, '- Current area:', testArea.toFixed(3), 'Target: <', maxArea.toFixed(3));
      
      // Success condition: area is safely under the limit
      if (testArea < maxArea * 0.98) {
        console.log('Area now within limits after', attempts, 'adjustments');
        
        // Update polygon
        if (territoryPolygon) {
          territoryPolygon.setLatLngs(outpostMarkers.map(m => m.getLatLng()));
        }
        
        alert(`Territory adjusted: moved boundary pin to fit within ${maxArea.toFixed(3)} sq mi limit. New area: ${testArea.toFixed(3)} sq mi`);
        break;
      }
      
      // Move the last moved marker toward the centroid of other markers
      const currentPos = lastMovedMarker.getLatLng();
      const newLat = currentPos.lat + (centroid.lat - currentPos.lat) * moveFactor;
      const newLng = currentPos.lng + (centroid.lng - currentPos.lng) * moveFactor;
      
      lastMovedMarker.setLatLng([newLat, newLng]);
      
      // Update polygon to see the change
      if (territoryPolygon) {
        territoryPolygon.setLatLngs(outpostMarkers.map(m => m.getLatLng()));
      }
      
      attempts++;
    }
    
    const finalArea = window.arcane.utils.calculateArea(outpostMarkers.map(m => m.getLatLng()));
    
    if (finalArea >= maxArea) {
      console.log('Could not adjust territory within limits after', maxAttempts, 'attempts');
      alert(`Unable to automatically adjust territory. The boundary pin has been moved as close as possible, but you may need to manually adjust further.`);
    }
    
    console.log('Final marker position:', lastMovedMarker.getLatLng());
    console.log('Final area:', finalArea.toFixed(3));
    
    this.showDynamicAreaDisplay(finalArea);
  },

  validateTerritoryPolygon: function() {
    if (outpostMarkers.length < 3) return;
    
    const newPoints = outpostMarkers.map(m => m.getLatLng());
    const area = window.arcane.utils.calculateArea(newPoints);
    const maxArea = window.arcane.game.player.squareMiles;
    
    console.log('Validating territory:', area.toFixed(3), 'vs max:', maxArea.toFixed(3));
    
    if (area > maxArea && (editMode || drawMode)) {
      console.log('Area exceeds limit, triggering auto-adjustment');
      const playerLocation = JSON.parse(localStorage.getItem('playerLocation')) || window.arcane.utils.DEFAULT_LOCATION;
      this.autoAdjustBoundaries(newPoints, maxArea, playerLocation);
    } else {
      console.log('Area within limits');
    }
  },

  handleMapClick: function(e) {
    if (!drawMode) {
      // Check if clicking on empty map area while having a selected territory
      if (selectedTerritory) {
        this.deselectTerritory();
        this.updateTerritoryLabels();
      }
      return;
    }
    
    if (window.arcane.game.player.availableOutposts <= 0) {
      alert('No outposts available!');
      return;
    }
    
    const map = window.arcane.map.map();
    const marker = L.marker(e.latlng, {
      draggable: true,
      icon: L.divIcon({
        className: 'outpost-marker',
        html: '<div class="outpost-icon">⚪</div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      })
    }).addTo(map);
    
    // Track this as the last moved marker (since it was just placed)
    lastMovedMarker = marker;
    
    // Update polygon and area display when dragging
    marker.on('drag', () => {
      lastMovedMarker = marker;
      this.updateTerritoryPolygon();
    });
    
    marker.on('dragend', () => {
      lastMovedMarker = marker;
      this.validateTerritoryPolygon();
    });
    
    outpostMarkers.push(marker);
    window.arcane.game.player.availableOutposts--;
    window.arcane.game.updateStats();
    
    this.updateTerritoryPolygon();
    this.validateTerritoryPolygon();
  },

  updateTerritoryPolygon: function() {
    const map = window.arcane.map.map();
    if (!map) return;
    
    // Remove existing polygon
    if (territoryPolygon && map.hasLayer(territoryPolygon)) {
      map.removeLayer(territoryPolygon);
      territoryPolygon = null;
    }
    
    // Only show polygon during draw mode or edit mode
    if (outpostMarkers.length >= 3 && (drawMode || editMode)) {
      const positions = outpostMarkers.map(marker => marker.getLatLng());
      
      const polygonStyle = drawMode ? {
        color: '#4CAF50',
        weight: 3,
        opacity: 0.8,
        fillColor: '#4CAF50',
        fillOpacity: 0.2
      } : {
        color: '#2196F3',
        weight: 3,
        opacity: 0.8,
        fillColor: '#2196F3',
        fillOpacity: 0.2
      };
      
      territoryPolygon = L.polygon(positions, polygonStyle).addTo(map);
      
      // Show dynamic square mileage display
      const area = window.arcane.utils.calculateArea(positions);
      this.showDynamicAreaDisplay(area);
    } else {
      // Hide dynamic display when not in creation/edit mode
      this.hideDynamicAreaDisplay();
    }
  },

  saveCurrentTerritory: function(name) {
    if (outpostMarkers.length < 3) {
      alert('Need at least 3 outposts to create a territory.');
      return;
    }
    
    const outposts = outpostMarkers.map(m => {
      const pos = m.getLatLng();
      return { lat: pos.lat, lng: pos.lng };
    });
    
    const newTerritoryArea = window.arcane.utils.calculateArea(outposts);
    
    // Check total territory area limit
    const areaCheck = this.checkTotalTerritoryArea();
    const totalWithNew = areaCheck.totalArea + newTerritoryArea;
    
    if (totalWithNew > areaCheck.maxArea) {
      const excess = totalWithNew - areaCheck.maxArea;
      alert(`Cannot create territory: This would exceed your total territory limit by ${excess.toFixed(3)} sq mi!\n\nCurrent total: ${areaCheck.totalArea.toFixed(3)} sq mi\nNew territory: ${newTerritoryArea.toFixed(3)} sq mi\nTotal would be: ${totalWithNew.toFixed(3)} sq mi\nYour limit: ${areaCheck.maxArea.toFixed(3)} sq mi\n\nIncrease your level or delete existing territories first.`);
      return;
    }
    
    // Also check individual territory size limit
    if (newTerritoryArea > window.arcane.game.player.squareMiles) {
      alert(`Territory is too large! Individual territories cannot exceed ${window.arcane.game.player.squareMiles.toFixed(3)} sq mi.`);
      return;
    }
    
    const newTerritory = {
      id: Date.now(),
      name: name,
      outposts: outposts,
      area: newTerritoryArea,
      created: new Date().toISOString()
    };
    
    territories.push(newTerritory);
    this.saveTerritoriesToStorage();
    this.selectTerritory(newTerritory);
    this.displayAllTerritories();
    
    const updatedAreaCheck = this.checkTotalTerritoryArea();
    console.log('New territory created:', name);
    alert(`Territory "${name}" created and saved!\nArea: ${newTerritoryArea.toFixed(3)} sq mi\nOutposts used: ${outposts.length}\nTotal territories: ${updatedAreaCheck.totalArea.toFixed(3)} / ${updatedAreaCheck.maxArea.toFixed(3)} sq mi`);
    
    window.arcane.game.updateStats();
  },

  clearCurrentTerritory: function() {
    const map = window.arcane.map.map();
    if (!map) return;
    
    // Remove all outpost markers
    outpostMarkers.forEach(marker => {
      map.removeLayer(marker);
    });
    outpostMarkers = [];
    lastMovedMarker = null;
    
    // Remove polygon
    if (territoryPolygon && map.hasLayer(territoryPolygon)) {
      map.removeLayer(territoryPolygon);
      territoryPolygon = null;
    }
  },

  loadTerritoryForEdit: function(territory) {
    this.clearCurrentTerritory();
    
    const map = window.arcane.map.map();
    if (!map || !territory.outposts) return;
    
    territory.outposts.forEach(outpost => {
      const marker = L.marker([outpost.lat, outpost.lng], {
        draggable: true,
        icon: L.divIcon({
          className: 'outpost-marker',
          html: '<div class="outpost-icon">⚪</div>',
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        })
      }).addTo(map);
      
      marker.on('drag', () => {
        lastMovedMarker = marker;
        this.updateTerritoryPolygon();
      });
      
      marker.on('dragend', () => {
        lastMovedMarker = marker;
        this.validateTerritoryPolygon();
      });
      
      outpostMarkers.push(marker);
    });
  },

  selectTerritory: function(territory) {
    selectedTerritory = territory;
    document.getElementById('editTerritoryButton').classList.remove('disabled');
    document.getElementById('deleteTerritoryButton').classList.remove('disabled');
    this.updateTerritoryLabels();
  },

  deselectTerritory: function() {
    selectedTerritory = null;
    document.getElementById('editTerritoryButton').classList.add('disabled');
    document.getElementById('deleteTerritoryButton').classList.add('disabled');
    document.getElementById('saveTerritoryButton').classList.add('disabled');
    document.getElementById('cancelTerritoryButton').classList.add('disabled');
    this.updateTerritoryLabels();
  },

  saveTerritoriesToStorage: function() {
    const cleanTerritories = territories.map(t => ({
      id: t.id,
      name: t.name,
      outposts: t.outposts,
      area: t.area,
      created: t.created,
      modified: t.modified
    }));
    localStorage.setItem('savedTerritories', JSON.stringify(cleanTerritories));
  },

  loadTerritories: function() {
    const saved = localStorage.getItem('savedTerritories');
    if (saved) {
      try {
        territories = JSON.parse(saved);
        this.displayAllTerritories();
      } catch (e) {
        console.error('Failed to load territories:', e);
      }
    }
  },

  getTerritories: function() {
    return territories;
  },

  displayAllTerritories: function() {
    const map = window.arcane.map.map();
    if (!map) return;
    
    // Clear existing territory polygons
    territoryPolygons.forEach(polygon => {
      map.removeLayer(polygon);
    });
    territoryPolygons = [];
    
    // Clear existing territory labels
    this.clearTerritoryLabels();
    
    territories.forEach(territory => {
      if (territory.outposts && territory.outposts.length >= 3) {
        const positions = territory.outposts.map(outpost => [outpost.lat, outpost.lng]);
        
        const polygon = L.polygon(positions, {
          color: '#FF5722',
          weight: 2,
          opacity: 0.7,
          fillColor: '#FF5722',
          fillOpacity: 0.1,
          territoryId: territory.id
        }).addTo(map);
        
        // Add click handler to select territory
        polygon.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          this.selectTerritory(territory);
        });
        
        territoryPolygons.push(polygon);
        
        // Create territory label
        this.createTerritoryLabel(territory);
      }
    });
    
    // Update edge markers
    this.updateEdgeMarkers();
  },

  createTerritoryLabel: function(territory) {
    const map = window.arcane.map.map();
    if (!map || !territory.outposts || territory.outposts.length < 3) return;
    
    const centroid = window.arcane.utils.getTerritoryCentroid(territory.outposts);
    const isSelected = selectedTerritory && selectedTerritory.id === territory.id;
    
    // Calculate approximate label dimensions
    const estimatedWidth = territory.name.length * 8; // Rough estimate: 8px per character
    const estimatedHeight = 20; // Rough estimate for label height
    
    const label = L.marker([centroid.lat, centroid.lng], {
      territoryId: territory.id,
      markerType: 'territory-label',
      icon: L.divIcon({
        className: `territory-label ${isSelected ? 'selected' : ''}`,
        html: editMode && isSelected ? 
          `<input type="text" value="${territory.name}" class="territory-name-input" onblur="window.arcane.territory.updateTerritoryName(${territory.id}, this.value)" onkeypress="if(event.key==='Enter') this.blur()">` :
          `<div class="territory-name-display">${territory.name}</div>`,
        iconSize: [estimatedWidth, estimatedHeight],
        iconAnchor: [estimatedWidth/2, estimatedHeight/2] // Center the label
      })
    }).addTo(map);
    
    // Add click handler for label selection (only if not in edit mode)
    if (!editMode || !isSelected) {
      label.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        this.selectTerritory(territory);
      });
    }
    
    territoryLabels.push(label);
  },

  updateTerritoryName: function(territoryId, newName) {
    if (!newName || newName.trim() === '') return;
    
    const territory = territories.find(t => t.id === territoryId);
    if (territory) {
      territory.name = newName.trim();
      territory.modified = new Date().toISOString();
      this.saveTerritoriesToStorage();
      this.updateTerritoryLabels();
    }
  },

  clearTerritoryLabels: function() {
    const map = window.arcane.map.map();
    if (!map) return;
    
    territoryLabels.forEach(label => {
      map.removeLayer(label);
    });
    territoryLabels = [];
  },

  updateTerritoryLabels: function() {
    this.clearTerritoryLabels();
    
    territories.forEach(territory => {
      if (territory.outposts && territory.outposts.length >= 3) {
        this.createTerritoryLabel(territory);
      }
    });
    
    this.updateEdgeMarkers();
  },

  updateEdgeMarkers: function() {
  console.log('updateEdgeMarkers called');
  console.log('window.arcane.mapModule:', window.arcane.mapModule);
  console.log('window.arcane.mapModule.edgeMarker:', window.arcane.mapModule?.edgeMarker);
  
  if (!window.arcane.mapModule || !window.arcane.mapModule.edgeMarker) {
    console.log('Edge marker module not available');
    return;
  }
  
  console.log('territoryLabels:', territoryLabels);
  console.log('territories:', territories);
  
  const markers = territoryLabels.filter(label => {
    const territoryId = label.options.territoryId;
    const territory = territories.find(t => t.id === territoryId);
    console.log('Checking label:', territoryId, 'territory found:', territory);
    return territory && territory.outposts && territory.outposts.length >= 3;
  });
  
  console.log('Filtered markers for edge tracking:', markers);
  console.log('Calling updateEdgeMarkers with', markers.length, 'markers');
  
  window.arcane.mapModule.edgeMarker.updateEdgeMarkers(markers);
},

  showDynamicAreaDisplay: function(area) {
    // Remove existing display if it exists
    this.hideDynamicAreaDisplay();
    
    // Find the map container
    const mapContainer = document.getElementById('map');
    if (!mapContainer) return;
    
    // Create floating display element
    const display = document.createElement('div');
    display.id = 'dynamicAreaDisplay';
    display.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 10px 15px;
      border-radius: 5px;
      font-size: 16px;
      font-weight: bold;
      z-index: 1000;
      pointer-events: none;
    `;
    display.textContent = `Territory Size: ${area.toFixed(3)} sq mi`;
    
    // Add to map container instead of body
    mapContainer.style.position = 'relative';
    mapContainer.appendChild(display);
  },

  hideDynamicAreaDisplay: function() {
    const display = document.getElementById('dynamicAreaDisplay');
    if (display) {
      display.remove();
    }
  },

  // Add setDrawMode function for compatibility with race.js
  setDrawMode: function(value) {
    if (value === false && drawMode) {
      this.cancelTerritory();
    }
  },

  // Initialize territory system
  initTerritory: function() {
    console.log('Initializing territory system');
    this.loadTerritories();
    
    // Register map click handler for deselection
    const map = window.arcane.map.map();
    if (map) {
      map.on('click', this.handleMapClick.bind(this));
    }
  }
};

console.log('territory.js loaded successfully');
console.log('window.arcane.territory:', window.arcane.territory);