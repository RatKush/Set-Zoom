/* bg.js - Background script for managing zoom levels - FINAL OPTIMIZED */

// Listen for tab updates (e.g., when a page loads or reloads)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Only proceed when the page is fully loaded and has a valid URL
  if (changeInfo.status === "complete" && tab.url) {
    applyZoom(tabId, tab.url); 
  }
});

// Function to apply zoom based on stored settings
function applyZoom(tabId, url) {
  // 1. Skip restricted/non-web pages early for efficiency
  if (!url || url.startsWith('chrome://') || url.startsWith('about:') || url.startsWith('moz-extension://')) {
      return;
  }

  // Use default values for storage retrieval
  chrome.storage.sync.get({ zoomLevels: {}, allowedSites: [] }, ({ zoomLevels, allowedSites }) => {
    let domain;
    try {
      domain = new URL(url).origin; // Extracts the domain (origin) from URL
    } catch (error) {
      // 2. Catch true URL parsing errors
      console.error("SetZoom URL Parsing Error on:", url, error); 
      return;
    }

    if (allowedSites.includes(domain) && zoomLevels[domain]) {
      chrome.tabs.getZoom(tabId, (currentZoom) => { 
        const targetZoom = zoomLevels[domain] / 100; // Convert stored percentage to decimal
        
        // 3. Only apply if the stored zoom level is different from the current one
        if (currentZoom !== targetZoom) {
          chrome.tabs.setZoom(tabId, targetZoom, () => {
            if (chrome.runtime.lastError) {
              console.error("SetZoom API Error:", chrome.runtime.lastError);
            }
          });
        }
      });
    }
  });
}

// Note: The original chrome.runtime.onMessage.addListener was removed.
// The popup.js now handles all storage logic directly, making explicit messaging
// to the background script for storage updates redundant.