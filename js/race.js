let racePolygon, checkpointMarkers = [], tempCheckpointMarkers = [], races = [],
    raceEditMode = false, selectedCheckpointIndex = null, raceLabel = null, selectedRace = null,
    tempPolyLine = null;

function loadSavedRaces() {
  const savedRaces = localStorage.getItem('races');
  if (!savedRaces) {
    console.log('No saved races found');
    return;
  }
  try {
    const data = JSON.parse(savedRaces);
    if (!data.name || !Array.isArray(data.checkpoints)) throw new Error('Invalid structure');
    const validCoords = data.checkpoints.filter(coord => coord && typeof coord.lat === 'number' && typeof coord.lng === 'number');
    if (validCoords.length !== data.checkpoints.length) throw new Error('Invalid coordinates');
    races = [data.name];
    checkpointMarkers = validCoords.map(coord => createDraggableCheckpoint(coord.lat, coord.lng));
    if (checkpointMarkers.length >= 2) {
      racePolygon = L.polyline(checkpointMarkers.map(m => m.getLatLng()), { color: window.arcane.utils.markerColors.race })
        .addTo(window.arcane.mapModule.layers.race());
      updateRaceLabel(data.name);
    }
    updateRaces();
  } catch (e) {
    console.error('Failed to load races:', e);
    localStorage.removeItem('races');
    alert('Corrupted race data cleared');
  }
}

function createDraggableCheckpoint(lat, lng) {
  const marker = L.marker([lat, lng], {
    draggable: raceEditMode,
    opacity: raceEditMode ? 0.7 : 0,
    markerType: 'race',
    icon: L.divIcon({
      className: 'race-marker',
      html: `<i class="fas fa-map-pin" style="font-size: 24px; color: ${window.arcane.utils.markerColors.race};"></i>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    })
  }).addTo(window.arcane.mapModule.layers.race());
  marker.on('drag', updateRacePolygon);
  marker.on('dragend', validateRacePolygon);
  marker.on('click', () => selectCheckpoint(checkpointMarkers.indexOf(marker)));
  return marker;
}

function selectCheckpoint(index) {
  if (raceEditMode) {
    selectedCheckpointIndex = index;
    document.getElementById('deleteCheckpointButton').classList.remove('disabled');
  }
}

function selectRace(name) {
  if (races.includes(name)) {
    selectedRace = name;
    console.log('Selected race:', name);
    updateRaceLabel(name);
    updateRaceButtons();
  }
}

function deselectRace() {
  selectedRace = null;
  console.log('Deselected race');
  updateRaceLabel(races[0] || 'Race');
  updateRaceButtons();
}

function toggleRaceEditMode(forceOff = null) {
  const shouldEnable = forceOff === null ? !raceEditMode : !forceOff;
  raceEditMode = shouldEnable;
  console.log('Race Edit Mode:', raceEditMode);
  if (raceEditMode) {
  drawMode = false;
  // Don't call toggleDrawMode here - it will cause infinite recursion
  // Instead, just directly disable draw mode
  if (window.arcane.territory) {
    window.arcane.territory.setDrawMode(false);
  }
    if (window.arcane.territory && typeof window.arcane.territory.toggleEditMode === 'function') {
      window.arcane.territory.toggleEditMode(false);
    }
    tempCheckpointMarkers.forEach(m => m.remove());
    tempCheckpointMarkers = [];
    if (tempPolyLine) {
      tempPolyLine.remove();
      tempPolyLine = null;
    }
    if (raceLabel) {
      raceLabel.remove();
      raceLabel = null;
    }
    checkpointMarkers.forEach(marker => marker.setOpacity(0.7).setDraggable(true));
    document.getElementById('createRaceButton').textContent = 'Creating Race...';
document.getElementById('addCheckpointButton').classList.remove('disabled');
document.getElementById('saveRaceButton').classList.remove('disabled');
document.getElementById('cancelRaceButton').classList.remove('disabled');
document.getElementById('editRaceButton').classList.add('disabled');
document.getElementById('renameRaceButton').classList.add('disabled');
document.getElementById('deleteRaceButton').classList.add('disabled');
    console.log('Entered Race Edit Mode');
    alert('Race Edit Mode ON: Click map to add checkpoints (min 2). Save or Cancel.');
  } else {
    checkpointMarkers.forEach(marker => marker.setOpacity(0).setDraggable(false));
    tempCheckpointMarkers.forEach(m => m.remove());
    tempCheckpointMarkers = [];
    if (tempPolyLine) {
      tempPolyLine.remove();
      tempPolyLine = null;
    }
    document.getElementById('createRaceButton').textContent = 'Create New Race';
document.getElementById('addCheckpointButton').classList.add('disabled');
document.getElementById('saveRaceButton').classList.add('disabled');
document.getElementById('cancelRaceButton').classList.add('disabled');
document.getElementById('editRaceButton').classList.add('disabled');
document.getElementById('renameRaceButton').classList.add('disabled');
document.getElementById('deleteRaceButton').classList.add('disabled');
    console.log('Exited Race Edit Mode');
    alert('Race Edit Mode OFF');
  }
  updateRaceButtons();
}

function handleRaceClick(e) {
  if (!raceEditMode) return;
  const point = e.latlng;
  const marker = L.marker(point, {
    draggable: true,
    opacity: 0.7,
    markerType: 'temp',
    icon: L.divIcon({
      className: 'temp-marker',
      html: `<i class="fas fa-map-pin" style="font-size: 24px; color: ${window.arcane.utils.markerColors.temp};"></i>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    })
  }).addTo(window.arcane.mapModule.layers.temp());
  marker.on('drag', updateTempRacePolygon);
  marker.on('dragend', validateTempRacePolygon);
  marker.on('click', () => selectCheckpoint(tempCheckpointMarkers.indexOf(marker)));
  tempCheckpointMarkers.push(marker);
  updateTempRacePolygon();
}

function saveRace() {
  if (!raceEditMode) {
    alert('Not in Race Edit Mode');
    return;
  }
  if (tempCheckpointMarkers.length < 2) {
    alert('Need at least 2 checkpoints');
    return;
  }
  const name = prompt('Enter race name:', 'Race');
  if (!name || name.trim() === '') {
    alert('Name cannot be empty');
    return;
  }
  checkpointMarkers = tempCheckpointMarkers.map(m => {
    const latlng = m.getLatLng();
    m.remove();
    return createDraggableCheckpoint(latlng.lat, latlng.lng);
  });
  tempCheckpointMarkers = [];
  if (tempPolyLine) {
    tempPolyLine.remove();
    tempPolyLine = null;
  }
  races = [name.trim()];
  selectedRace = name.trim();
  racePolygon = L.polyline(checkpointMarkers.map(m => m.getLatLng()), { color: window.arcane.utils.markerColors.race })
    .addTo(window.arcane.mapModule.layers.race());
  raceEditMode = false;
  document.getElementById('createRaceButton').textContent = 'Create New Race';
  document.getElementById('addCheckpointButton').classList.add('disabled');
  document.getElementById('editRaceButton').classList.remove('disabled');
  document.getElementById('renameRaceButton').classList.remove('disabled');
  document.getElementById('deleteRaceButton').classList.remove('disabled');
  updateRaceLabel(name.trim());
  updateRaces();
  localStorage.setItem('races', JSON.stringify({ name: name.trim(), checkpoints: checkpointMarkers.map(m => m.getLatLng()) }));
  console.log('Race saved');
  alert('Race saved');
}

function cancelRace() {
  if (!raceEditMode) {
    alert('Not in Race Edit Mode');
    return;
  }
  raceEditMode = false;
  tempCheckpointMarkers.forEach(m => m.remove());
  tempCheckpointMarkers = [];
  if (tempPolyLine) {
    tempPolyLine.remove();
    tempPolyLine = null;
  }
  document.getElementById('createRaceButton').textContent = 'Create New Race';
  document.getElementById('addCheckpointButton').classList.add('disabled');
  document.getElementById('editRaceButton').classList.add('disabled');
  document.getElementById('renameRaceButton').classList.add('disabled');
  document.getElementById('deleteRaceButton').classList.add('disabled');
  console.log('Race canceled');
  alert('Race canceled');
}

function editRace() {
  if (!selectedRace || !races.includes(selectedRace)) {
    alert('Select a race to edit');
    return;
  }
  raceEditMode = true;
  console.log('Race Edit Mode:', raceEditMode);
  if (window.arcane.territory && typeof window.arcane.territory.toggleDrawMode === 'function') {
    window.arcane.territory.toggleDrawMode(false);
  }
  if (window.arcane.territory && typeof window.arcane.territory.toggleEditMode === 'function') {
    window.arcane.territory.toggleEditMode(false);
  }
  tempCheckpointMarkers = checkpointMarkers.map(m => {
    const latlng = m.getLatLng();
    m.remove();
    return createDraggableCheckpoint(latlng.lat, latlng.lng);
  });
  checkpointMarkers = [];
  if (racePolygon) {
    racePolygon.remove();
    racePolygon = null;
  }
  if (raceLabel) {
    raceLabel.remove();
    raceLabel = null;
  }
  document.getElementById('createRaceButton').textContent = 'Creating Race...';
  document.getElementById('addCheckpointButton').classList.remove('disabled');
  document.getElementById('editRaceButton').classList.add('disabled');
  document.getElementById('renameRaceButton').classList.add('disabled');
  document.getElementById('deleteRaceButton').classList.add('disabled');
  console.log('Entered Race Edit Mode');
  alert('Race Edit Mode ON: Edit checkpoints.');
}

function renameRace() {
  if (!selectedRace || !races.includes(selectedRace)) {
    alert('Select a race to rename');
    return;
  }
  const newName = prompt('Enter new race name:', selectedRace);
  if (!newName || newName.trim() === '' || newName.trim() === selectedRace) {
    alert('Invalid or unchanged name');
    return;
  }
  const index = races.indexOf(selectedRace);
  races[index] = newName.trim();
  selectedRace = newName.trim();
  updateRaceLabel(newName.trim());
  updateRaces();
  localStorage.setItem('races', JSON.stringify({ name: newName.trim(), checkpoints: checkpointMarkers.map(m => m.getLatLng()) }));
  console.log('Race renamed to:', newName);
  alert('Race renamed');
}

function deleteRace() {
  if (!selectedRace || !races.includes(selectedRace)) {
    alert('Select a race to delete');
    return;
  }
  checkpointMarkers.forEach(marker => marker.remove());
  checkpointMarkers = [];
  if (racePolygon) {
    racePolygon.remove();
    racePolygon = null;
  }
  if (raceLabel) {
    raceLabel.remove();
    raceLabel = null;
  }
  races = races.filter(r => r !== selectedRace);
  selectedRace = null;
  updateRaces();
  localStorage.removeItem('races');
  console.log('Race deleted');
  alert('Race deleted');
}

function addCheckpoint() {
  if (!raceEditMode) {
    alert('Enter Race Edit Mode first');
    return;
  }
  handleRaceClick({ latlng: window.arcane.mapModule.marker().getLatLng() });
}

function deleteCheckpoint() {
  if (!raceEditMode || selectedCheckpointIndex === null) {
    alert('Select a checkpoint in Race Edit Mode');
    return;
  }
  const marker = tempCheckpointMarkers.splice(selectedCheckpointIndex, 1)[0];
  marker.remove();
  selectedCheckpointIndex = null;
  document.getElementById('deleteCheckpointButton').classList.add('disabled');
  updateTempRacePolygon();
  console.log('Checkpoint deleted');
}

function updateTempRacePolygon() {
  if (tempPolyLine) tempPolyLine.remove();
  if (tempCheckpointMarkers.length >= 2) {
    tempPolyLine = L.polyline(tempCheckpointMarkers.map(m => m.getLatLng()), {
      color: window.arcane.utils.markerColors.race,
      dashArray: '5,5'
    }).addTo(window.arcane.mapModule.layers.temp());
    const distance = tempCheckpointMarkers.reduce((sum, curr, i, arr) =>
      sum + (i > 0 ? curr.getLatLng().distanceTo(arr[i - 1].getLatLng()) : 0), 0) / 1609.34; // Convert meters to miles
    document.getElementById('raceDistance').textContent = distance.toFixed(2);
  }
}

function validateTempRacePolygon() {
  if (tempCheckpointMarkers.length < 2) return;
}

function updateRacePolygon() {
  if (racePolygon && checkpointMarkers.length >= 2) {
    racePolygon.setLatLngs(checkpointMarkers.map(m => m.getLatLng()));
    updateRaceLabel(selectedRace || races[0]);
  }
}

function validateRacePolygon() {
  if (checkpointMarkers.length < 2) {
    if (racePolygon) {
      racePolygon.remove();
      racePolygon = null;
    }
    if (raceLabel) {
      raceLabel.remove();
      raceLabel = null;
    }
    return;
  }
}

function updateRaceLabel(name) {
  if (raceLabel) {
    raceLabel.remove();
    raceLabel = null;
  }
  if (checkpointMarkers.length >= 2) {
    const centroid = window.arcane.utils.getTerritoryCentroid(checkpointMarkers.map(m => m.getLatLng()));
    raceLabel = L.marker([centroid.lat, centroid.lng], {
      markerType: 'race-label',
      icon: L.divIcon({
        className: `race-label ${selectedRace === name ? 'selected' : ''}`,
        html: `<div style="background: white; color: black; padding: 2px 5px; border-radius: 3px; max-width: 150px; white-space: normal;">${name}</div>`,
        iconSize: [null, null],
        iconAnchor: [0, 10]
      })
    }).addTo(window.arcane.mapModule.layers.race());
    raceLabel.on('click', () => selectRace(name));
    console.log('Added race label:', name);
  }
}

function updateRaces() {
  const raceList = document.getElementById('routeOptions');
  if (raceList) {
    raceList.innerHTML = races.length
      ? races.map(name => `<label><input type="radio" name="raceSelect" value="${name}" ${selectedRace === name ? 'checked' : ''} onchange="window.arcane.race.selectRace('${name}')">${name}</label><br>`).join('')
      : 'None';
  }
  updateRaceButtons();
}

function updateRaceButtons() {
  const editButton = document.getElementById('editRaceButton');
  const renameButton = document.getElementById('renameRaceButton');
  const deleteButton = document.getElementById('deleteRaceButton');
  const addButton = document.getElementById('addCheckpointButton');
  const deleteCheckpointButton = document.getElementById('deleteCheckpointButton');
  if (selectedRace && !raceEditMode) {
    editButton.classList.remove('disabled');
    renameButton.classList.remove('disabled');
    deleteButton.classList.remove('disabled');
  } else {
    editButton.classList.add('disabled');
    renameButton.classList.add('disabled');
    deleteButton.classList.add('disabled');
  }
  if (raceEditMode) {
    addButton.classList.remove('disabled');
    if (selectedCheckpointIndex !== null) {
      deleteCheckpointButton.classList.remove('disabled');
    } else {
      deleteCheckpointButton.classList.add('disabled');
    }
  } else {
    addButton.classList.add('disabled');
    deleteCheckpointButton.classList.add('disabled');
  }
}

function startRace() {
  if (!selectedRace || !races.includes(selectedRace)) {
    alert('Select a race to start');
    return;
  }
  console.log('Race started:', selectedRace);
  alert('Race started');
}

window.arcane = window.arcane || {};
window.arcane.race = {
  loadSavedRaces,
  handleRaceClick,
  toggleRaceEditMode,
  saveRace,
  cancelRace,
  editRace,
  renameRace,
  deleteRace,
  addCheckpoint,
  deleteCheckpoint,
  startRace,
  raceEditMode: () => raceEditMode,
  selectRace
};

function setRaceEditMode(value) {
  raceEditMode = value;
  // Update UI without triggering other mode toggles
  const createButton = document.getElementById('createRaceButton');
  if (raceEditMode) {
    createButton.textContent = 'Creating Race...';
  } else {
    createButton.textContent = 'Create New Race';
  }
}

window.arcane.race = {
  // ... existing exports
  setRaceEditMode,  // Add this line
  // ... rest of exports
};

window.arcane = window.arcane || {};
window.arcane.race = {
  toggleRaceEditMode: function() {
    console.log('Toggle race edit mode');
    // Race creation functionality
  },

  editRace: function() {
    console.log('Edit race');
  },

  renameRace: function() {
    const newName = document.getElementById('raceNameInput').value;
    if (newName) {
      console.log('Rename race to:', newName);
    }
  },

  deleteRace: function() {
    console.log('Delete race');
  },

  addCheckpoint: function() {
    console.log('Add checkpoint');
  },

  deleteCheckpoint: function() {
    console.log('Delete checkpoint');
  },

  startRace: function() {
    console.log('Start race');
  }
};