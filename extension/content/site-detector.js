/**
 * Site Detector
 * figures out if we need PyAutoGUI or can use direct typing
 * 
 * Kloue - 2025-11-23
 */

class SiteDetector {
  constructor() {
    this.url = window.location.href;
    this.hostname = window.location.hostname;
  }
  
  // does this site need PyAutoGUI?
  needsPyAutoGUI() {
    // google stuff blocks direct typing, need pyautogui
    const pyAutoGUISites = [
      'docs.google.com',
      'slides.google.com',
      'sheets.google.com'
    ];
    
    return pyAutoGUISites.some(site => this.hostname.includes(site));
  }
  
  // what type of site is this?
  getSiteType() {
    if (this.hostname.includes('docs.google.com')) {
      return 'google-docs';
    } else if (this.hostname.includes('slides.google.com')) {
      return 'google-slides';
    } else if (this.hostname.includes('sheets.google.com')) {
      return 'google-sheets';
    } else {
      return 'normal';
    }
  }
  
  // friendly name for UI
  getSiteName() {
    const siteNames = {
      'google-docs': 'Google Docs',
      'google-slides': 'Google Slides',
      'google-sheets': 'Google Sheets',
      'normal': 'Standard Website'
    };
    
    return siteNames[this.getSiteType()] || 'Unknown Site';
  }
  
  // can we use direct typing?
  canUseDirectTyping() {
    return !this.needsPyAutoGUI();
  }
}

// make available
if (typeof window !== 'undefined') {
  window.SiteDetector = SiteDetector;
}

console.log('🔍 Site Detector loaded');