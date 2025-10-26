/* popup.js - Handles setting zoom levels for websites through the popup UI - ENHANCED */

document.addEventListener("DOMContentLoaded", () => {
    const zoomInput = document.getElementById("zoomLevel");
    const saveButton = document.getElementById("saveZoom");
    const urlDisplay = document.getElementById("currentUrl");
    const siteList = document.getElementById("siteList");
    let currentSiteOrigin = ""; // Variable to hold the current site's origin

    // --- Helper function to display temporary status ---
    function showStatus(message, isError = false) {
        // Temporarily change the currentUrl display to show status
        const originalText = urlDisplay.textContent;
        const originalBg = urlDisplay.style.backgroundColor;
        
        urlDisplay.textContent = message;
        urlDisplay.style.backgroundColor = isError ? '#FFDCDC' : '#DCF8D3'; // Soft error/success color
        urlDisplay.style.color = isError ? '#C82333' : '#343A40';
        urlDisplay.style.transition = 'none';

        setTimeout(() => {
            // Restore original display after 2 seconds
            urlDisplay.style.transition = 'all 0.3s ease';
            urlDisplay.textContent = originalText;
            urlDisplay.style.backgroundColor = originalBg;
            urlDisplay.style.color = 'var(--text-color)';
        }, 2000);
    }
    
    // --- Function to build and render the saved sites list ---
    function renderSiteList(zoomLevels = {}, allowedSites = []) {
        siteList.innerHTML = ""; // Clear list
        if (allowedSites.length === 0) {
            const emptyMsg = document.createElement("p");
            emptyMsg.textContent = "No saved sites yet! Save one above. 👆";
            emptyMsg.style.textAlign = 'center';
            emptyMsg.style.fontSize = '0.9em';
            emptyMsg.style.color = '#6C757D';
            siteList.appendChild(emptyMsg);
            return;
        }

        allowedSites.forEach(savedSite => {
            const li = document.createElement("li");
            const zoomPercent = zoomLevels[savedSite] || "100";
            
            // Site name and zoom info
            const span = document.createElement("span");
            // Only show the hostname, not the full origin, for brevity
            const hostname = new URL(savedSite).hostname.replace('www.', ''); 
            span.textContent = `${hostname} (${zoomPercent}%)`;
            
            // Remove button
            const deleteBtn = document.createElement("button");
            deleteBtn.textContent = "❌";
            deleteBtn.classList.add("remove-btn");
            // Pass the site and the list element to the remove function
            deleteBtn.onclick = () => removeSite(savedSite, li); 

            li.appendChild(span);
            li.appendChild(deleteBtn);
            siteList.appendChild(li);
        });
    }

    // --- Initial Load Logic ---
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs.length || !tabs[0].url.startsWith("http")) { 
             urlDisplay.textContent = "Site: Not a standard webpage.";
             saveButton.disabled = true; // Disable save on non-web pages
             return;
        }
        
        const url = new URL(tabs[0].url);
        currentSiteOrigin = url.origin; // Set the global variable
        urlDisplay.textContent = `Site: ${currentSiteOrigin.replace('http://', '').replace('https://', '')}`; 

        // Load stored data and render the list
        chrome.storage.sync.get(["zoomLevels", "allowedSites"], (data) => {
            const { zoomLevels = {}, allowedSites = [] } = data;
            
            // Pre-fill zoom level for the current site
            if (zoomLevels[currentSiteOrigin]) {
                zoomInput.value = zoomLevels[currentSiteOrigin]; 
            } else {
                 zoomInput.value = 100; // Default to 100 for better UX
            }
            
            renderSiteList(zoomLevels, allowedSites);
        });
    });

    // --- Save button handler ---
    saveButton.addEventListener("click", () => {
        const zoomValue = parseInt(zoomInput.value.trim()); 
        if (isNaN(zoomValue) || zoomValue < 50 || zoomValue > 200) {
            showStatus("🚫 Valid zoom: 50-200.", true); // Show error status
            return;
        }

        if (!currentSiteOrigin) return; // Safety check

        // Fetch current storage, update, and save back
        chrome.storage.sync.get(["zoomLevels", "allowedSites"], ({ zoomLevels = {}, allowedSites = [] }) => {
            zoomLevels[currentSiteOrigin] = zoomValue;

            if (!allowedSites.includes(currentSiteOrigin)) {
                allowedSites.push(currentSiteOrigin);
            }

            chrome.storage.sync.set({ zoomLevels, allowedSites }, () => {
                showStatus(`✅ Zoom set for this site! (${zoomValue}%)`);
                renderSiteList(zoomLevels, allowedSites); // Update list immediately
            });
        });
    });

    // --- Function to remove a saved site from storage ---
    function removeSite(site, listItem) {
        chrome.storage.sync.get(["zoomLevels", "allowedSites"], ({ zoomLevels = {}, allowedSites = [] }) => {
            delete zoomLevels[site]; 
            allowedSites = allowedSites.filter(s => s !== site); 

            chrome.storage.sync.set({ zoomLevels, allowedSites }, () => {
                showStatus(`🗑️ Site removed!`);
                listItem.style.opacity = '0'; // Add a fade-out effect
                setTimeout(() => {
                    listItem.remove(); 
                    // Re-render to handle the "No saved sites" message if needed
                    renderSiteList(zoomLevels, allowedSites); 
                }, 300);
            });
        });
    }
});