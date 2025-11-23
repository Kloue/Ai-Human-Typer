/**
 * Background Service Worker
 * handles extension lifecycle stuff
 * 
 * Kloue - 2025-11-23
 */

// side panel setup - open on icon click
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error('Side panel error:', error));

// installation handler
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('🎉 AI Human Typer installed!');
    console.log('📅 v1.2.0 - Kloue - 2025-11-23');
    
    // default settings
    chrome.storage.sync.set({
      wpm: 60,
      variance: 20,
      mistakeRate: 5,
      thinkingPause: true,
      selfCorrection: true,
      paragraphBreaks: 2,
      aiEnhanced: false  // not implemented yet
    });
  } else if (details.reason === 'update') {
    console.log('🔄 Updated to v1.2.0');
  }
});

// message forwarding between components
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 Message:', message.type);
  
  // forward to side panel
  switch (message.type) {
    case 'TYPING_PROGRESS':
    case 'TYPING_COMPLETE':
    case 'SHOW_RECOVERY_PROMPT':
    case 'SHOW_PARAGRAPH_BREAK':
    case 'SHOW_CORRECTION':
      forwardToSidePanel(message);
      break;
  }
  
  return true;
});

function forwardToSidePanel(message) {
  // send to panel (might not be open, that's ok)
  chrome.runtime.sendMessage(message).catch((error) => {
    // silent fail if panel closed
    // console.log('Panel not open:', error.message);
  });
}

console.log('🤖 Background service worker loaded - v1.2.0');
console.log('👤 Kloue - 2025-11-23 13:59:29');