// UI management
function switchTab(tabName) {
  console.log('Switching to tab:', tabName);
  
  // Hide all tab contents and remove active from buttons
  const tabs = document.querySelectorAll('.tab-content');
  const buttons = document.querySelectorAll('.tab-button');
  
  tabs.forEach(tab => tab.classList.remove('active'));
  buttons.forEach(button => button.classList.remove('active'));
  
  // Show selected tab
  const targetTab = document.getElementById(tabName);
  if (targetTab) {
    targetTab.classList.add('active');
    
    // Add active class to corresponding button
    const targetButton = Array.from(buttons).find(button => 
      button.textContent.toLowerCase() === tabName.toLowerCase()
    );
    if (targetButton) {
      targetButton.classList.add('active');
    }
    
    // If switching involves map, invalidate map size
    if (window.arcane && window.arcane.map && window.arcane.map.map()) {
      setTimeout(() => {
        window.arcane.map.map().invalidateSize();
        console.log('Map size invalidated after tab switch');
      }, 100);
    }
  }
}

// Export UI functions
if (typeof window !== 'undefined') {
  window.arcane = window.arcane || {};
  window.arcane.ui = {
    switchTab: switchTab
  };
}

window.ui = {
  switchTab: function(tabName) {
    // Hide all tab contents
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(tab => {
      tab.classList.remove('active');
    });
    
    // Remove active class from all tab buttons
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
      button.classList.remove('active');
    });
    
    // Show selected tab content
    const selectedTab = document.getElementById(`tab-${tabName}`);
    if (selectedTab) {
      selectedTab.classList.add('active');
    }
    
    // Add active class to selected tab button
    const selectedButton = event.target;
    if (selectedButton) {
      selectedButton.classList.add('active');
    }
    
    console.log('Switched to tab:', tabName);
  }
};