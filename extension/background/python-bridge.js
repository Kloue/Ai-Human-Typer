/**
 * Python Bridge - talks to local server
 * 
 * handles all HTTP requests to localhost:8765
 * Kloue - 2025-11-23
 */

class PythonBridge {
  constructor() {
    this.serverUrl = 'http://localhost:8765';
    this.isConnected = false;
  }
  
  // check if server is running
  async checkConnection() {
    try {
      const response = await fetch(`${this.serverUrl}/status`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      
      if (!response.ok) {
        this.isConnected = false;
        return false;
      }
      
      const data = await response.json();
      this.isConnected = data.status === 'online';
      return this.isConnected;
    } catch (error) {
      console.error('Server connection error:', error);
      this.isConnected = false;
      return false;
    }
  }
  
  // start typing
  async startTyping(text, settings) {
    try {
      const response = await fetch(`${this.serverUrl}/type`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          text: text,
          settings: settings
        })
      });
      
      if (!response.ok) {
        return { success: false, error: `Server error ${response.status}` };
      }
      
      return await response.json();
    } catch (error) {
      console.error('Start typing error:', error);
      return { success: false, error: error.message };
    }
  }
  
  // stop typing
  async stopTyping() {
    try {
      const response = await fetch(`${this.serverUrl}/stop`, {
        method: 'POST',
        headers: { 'Accept': 'application/json' }
      });
      
      if (!response.ok) {
        return { success: false, error: `Server error ${response.status}` };
      }
      
      return await response.json();
    } catch (error) {
      console.error('Stop error:', error);
      return { success: false, error: error.message };
    }
  }
  
  // resume typing
  async resumeTyping() {
    try {
      const response = await fetch(`${this.serverUrl}/resume`, {
        method: 'POST',
        headers: { 'Accept': 'application/json' }
      });
      
      if (!response.ok) {
        return { success: false, error: `Server error ${response.status}` };
      }
      
      return await response.json();
    } catch (error) {
      console.error('Resume error:', error);
      return { success: false, error: error.message };
    }
  }
  
  // restart from beginning
  async restartTyping() {
    try {
      const response = await fetch(`${this.serverUrl}/restart`, {
        method: 'POST',
        headers: { 'Accept': 'application/json' }
      });
      
      if (!response.ok) {
        return { success: false, error: `Server error ${response.status}` };
      }
      
      return await response.json();
    } catch (error) {
      console.error('Restart error:', error);
      return { success: false, error: error.message };
    }
  }
  
  // update settings live
  async updateSettings(settings) {
    try {
      const response = await fetch(`${this.serverUrl}/update-settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(settings)
      });
      
      if (!response.ok) {
        return { success: false, error: `Server error ${response.status}` };
      }
      
      return await response.json();
    } catch (error) {
      console.error('Update settings error:', error);
      return { success: false, error: error.message };
    }
  }
  
  // get server status
  async getStatus() {
    try {
      const response = await fetch(`${this.serverUrl}/status`);
      if (!response.ok) {
        return { status: 'offline' };
      }
      return await response.json();
    } catch (error) {
      return { status: 'offline', error: error.message };
    }
  }
}

// make available globally
if (typeof window !== 'undefined') {
  window.PythonBridge = PythonBridge;
}

console.log('🐍 Python Bridge loaded - Server: http://localhost:8765');