const wpmSlider = document.getElementById('wpm');
const wpmValue = document.getElementById('wpm-value');
const varianceSlider = document.getElementById('variance');
const varianceValue = document.getElementById('variance-value');
const mistakeRateSlider = document.getElementById('mistake-rate');
const mistakeRateValue = document.getElementById('mistake-rate-value');
const thinkingPauseCheckbox = document.getElementById('thinking-pause');
const selfCorrectionCheckbox = document.getElementById('self-correction');
const humanPausesCheckbox = document.getElementById('human-pauses');
const inputText = document.getElementById('input-text');
const charCount = document.getElementById('char-count');
const startButton = document.getElementById('start-typing');
const stopButton = document.getElementById('stop-typing');
const resetButton = document.getElementById('reset-typing');
const statusText = document.getElementById('status-text');
const startBtnText = document.getElementById('start-btn-text');
const infoButton = document.getElementById('info-button');
const openDebugButton = document.getElementById('open-debug');

const apiKeyInput = document.getElementById('api-key');
const saveApiKeyButton = document.getElementById('save-api-key');
const clearApiKeyButton = document.getElementById('clear-api-key');
const apiStatus = document.getElementById('api-status');

const progressSection = document.getElementById('progress-section');
const progressFill = document.getElementById('progress-fill');
const progressPercentage = document.getElementById('progress-percentage');
const progressChars = document.getElementById('progress-chars');

const serverStatus = document.getElementById('server-status');
const downloadButton = document.getElementById('download-helper');
const pythonSection = document.getElementById('python-section');

let isTyping = false;
let isPaused = false;
let pythonBridge = null;

// Initialize Python Bridge
if (typeof PythonBridge !== 'undefined') {
  pythonBridge = new PythonBridge();
}

// Check Python server connection
async function checkPythonServer() {
  if (!pythonBridge) {
    serverStatus.innerHTML = '<p>❌ Python bridge not loaded</p>';
    serverStatus.className = 'server-status offline';
    return false;
  }
  
  const connected = await pythonBridge.checkConnection();
  
  if (connected) {
    serverStatus.innerHTML = '<p>✅ Server online and ready!</p>';
    serverStatus.className = 'server-status online';
    if (downloadButton) downloadButton.style.display = 'none';
  } else {
    serverStatus.innerHTML = '<p>❌ Server offline - Download helper app below</p>';
    serverStatus.className = 'server-status offline';
    if (downloadButton) downloadButton.style.display = 'block';
  }
  
  return connected;
}

// Download helper exe
if (downloadButton) {
  downloadButton.addEventListener('click', () => {
    // GitHub release URL - You'll update this after creating release
    const downloadUrl = 'https://github.com/Kloue/ai-human-typer/releases/download/v1.0.0/AI-Typer-Helper.exe';
    
    // Method 1: Try Chrome downloads API
    if (chrome.downloads) {
      chrome.downloads.download({
        url: downloadUrl,
        filename: 'AI-Typer-Helper.exe',
        saveAs: true
      }, (downloadId) => {
        if (downloadId) {
          statusText.textContent = '📥 Download started! Run the .exe after it finishes.';
          showNotification('📥 Downloading AI Typer Helper...', 3000);
        } else {
          statusText.textContent = '❌ Download failed. Opening GitHub release page...';
          window.open(downloadUrl, '_blank');
        }
      });
    } else {
      // Method 2: Fallback - open in new tab
      window.open(downloadUrl, '_blank');
      statusText.textContent = '📥 Opening download page in new tab...';
    }
  });
}

// Show info popup
infoButton.addEventListener('click', () => {
  showInfoPopup();
});

function showInfoPopup() {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    z-index: 99999;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.3s ease;
  `;
  
  const dialog = document.createElement('div');
  dialog.style.cssText = `
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 30px;
    border-radius: 16px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.5);
    max-width: 450px;
    text-align: center;
    color: white;
    animation: slideUp 0.4s ease;
  `;
  
  dialog.innerHTML = `
    <div style="font-size: 64px; margin-bottom: 20px;">🤖</div>
    <h1 style="margin: 0 0 10px 0; font-size: 28px; font-weight: 700;">
      AI Human-Like Typer
    </h1>
    <p style="font-size: 14px; opacity: 0.9; margin-bottom: 25px;">
      v1.0.0 | Made with ❤️ by <strong>Kloue</strong> | November 23, 2025
    </p>
    
    <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 12px; margin-bottom: 20px; text-align: left;">
      <h3 style="margin: 0 0 15px 0; font-size: 18px; text-align: center;">📝 Purpose</h3>
      <p style="font-size: 14px; line-height: 1.6; margin: 0;">
        This extension simulates <strong>human-like typing patterns</strong> using a local Python server
        to bypass AI detection systems like ZeroGPT. It creates realistic typing with mistakes, 
        corrections, pauses, and variable speed - perfect for Google Docs essays and assignments.
      </p>
    </div>
    
    <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 12px; margin-bottom: 20px; text-align: left;">
      <h3 style="margin: 0 0 15px 0; font-size: 18px; text-align: center;">✨ Features</h3>
      <ul style="margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.8;">
        <li>🎯 OS-level keyboard typing (undetectable!)</li>
        <li>🤖 AI-enhanced patterns with OpenAI</li>
        <li>⌨️ Realistic typos and corrections</li>
        <li>🧠 Natural thinking pauses</li>
        <li>📄 Optimized for Google Docs</li>
        <li>💾 Resume/Pause functionality</li>
        <li>🐍 Python bridge for real typing</li>
      </ul>
    </div>
    
    <div style="background: rgba(255,255,255,0.15); padding: 15px; border-radius: 12px; margin-bottom: 25px;">
      <p style="font-size: 13px; margin: 0; font-style: italic; opacity: 0.95;">
        "Making AI-written content feel authentically human, one keystroke at a time."
      </p>
    </div>
    
    <button id="close-info" style="
      background: white;
      color: #667eea;
      border: none;
      padding: 12px 30px;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.3s;
      box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    ">
      Got it! ✨
    </button>
  `;
  
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);
  
  const closeBtn = document.getElementById('close-info');
  closeBtn.addEventListener('click', () => {
    overlay.remove();
  });
  
  closeBtn.addEventListener('mouseenter', function() {
    this.style.transform = 'translateY(-3px)';
    this.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)';
  });
  
  closeBtn.addEventListener('mouseleave', function() {
    this.style.transform = 'translateY(0)';
    this.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
  });
  
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.remove();
    }
  });
}

function showNotification(message, duration = 3000) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 15px 20px;
    border-radius: 8px;
    font-size: 14px;
    z-index: 999999;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    animation: slideIn 0.3s ease;
  `;
  
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.transition = 'opacity 0.3s';
    notification.style.opacity = '0';
    setTimeout(() => notification.remove(), 300);
  }, duration);
}

// Character count update
inputText.addEventListener('input', () => {
  charCount.textContent = inputText.value.length;
});

// API Key management
chrome.storage.sync.get(['openaiApiKey'], (result) => {
  if (result.openaiApiKey) {
    apiKeyInput.value = result.openaiApiKey;
    apiStatus.textContent = '✅ API Key saved';
    apiStatus.style.color = '#28a745';
  }
});

saveApiKeyButton.addEventListener('click', () => {
  const apiKey = apiKeyInput.value.trim();
  
  if (!apiKey) {
    chrome.storage.sync.remove('openaiApiKey', () => {
      apiStatus.textContent = '🗑️ API Key removed';
      apiStatus.style.color = '#6c757d';
      apiKeyInput.value = '';
    });
    return;
  }
  
  if (!apiKey.startsWith('sk-')) {
    apiStatus.textContent = '❌ Invalid API key format';
    apiStatus.style.color = '#dc3545';
    return;
  }
  
  chrome.storage.sync.set({ openaiApiKey: apiKey }, () => {
    apiStatus.textContent = '✅ API Key saved successfully!';
    apiStatus.style.color = '#28a745';
  });
});

clearApiKeyButton.addEventListener('click', () => {
  chrome.storage.sync.remove('openaiApiKey', () => {
    apiKeyInput.value = '';
    apiStatus.textContent = '🗑️ API Key cleared';
    apiStatus.style.color = '#6c757d';
  });
});

// Slider updates
wpmSlider.addEventListener('input', (e) => {
  wpmValue.textContent = e.target.value;
});

varianceSlider.addEventListener('input', (e) => {
  varianceValue.textContent = e.target.value + '%';
});

mistakeRateSlider.addEventListener('input', (e) => {
  mistakeRateValue.textContent = e.target.value + '%';
});

// Load saved settings
chrome.storage.sync.get(['settings', 'lastText'], (result) => {
  if (result.settings) {
    const settings = result.settings;
    
    wpmSlider.value = settings.wpm || 60;
    wpmValue.textContent = settings.wpm || 60;
    
    varianceSlider.value = settings.variance || 20;
    varianceValue.textContent = (settings.variance || 20) + '%';
    
    mistakeRateSlider.value = settings.mistakeRate || 5;
    mistakeRateValue.textContent = (settings.mistakeRate || 5) + '%';
    
    thinkingPauseCheckbox.checked = settings.thinkingPause !== false;
    selfCorrectionCheckbox.checked = settings.selfCorrection !== false;
    
    if (humanPausesCheckbox) {
      humanPausesCheckbox.checked = settings.humanPauses !== false;
    }
  }
  
  if (result.lastText) {
    inputText.value = result.lastText;
    charCount.textContent = result.lastText.length;
  }
});

// Start typing button
startButton.addEventListener('click', async () => {
  const text = inputText.value.trim();
  
  if (!text) {
    statusText.textContent = '⚠️ Please enter some text first!';
    return;
  }
  
  // Check if Python server is running
  const connected = await checkPythonServer();
  if (!connected) {
    statusText.textContent = '❌ Python server not running! Download and run AI-Typer-Helper.exe first.';
    showNotification('❌ Server offline! Download the helper app below.', 5000);
    return;
  }
  
  const settings = {
    wpm: parseInt(wpmSlider.value),
    variance: parseInt(varianceSlider.value),
    mistakeRate: parseInt(mistakeRateSlider.value),
    thinkingPause: thinkingPauseCheckbox.checked,
    selfCorrection: selfCorrectionCheckbox.checked,
    humanPauses: humanPausesCheckbox ? humanPausesCheckbox.checked : true
  };
  
  // Save settings
  chrome.storage.sync.set({ settings, lastText: text });
  
  statusText.textContent = '🚀 Sending to Python server...';
  
  try {
    const result = await pythonBridge.startTyping(text, settings);
    
    if (result.success) {
      isTyping = true;
      updateButtonState();
      statusText.textContent = '⌨️ Typing in progress! (You have 3 seconds to focus on Google Docs)';
      showNotification('⌨️ Typing started! Focus on Google Docs NOW!', 3000);
      
      // Simulate progress (since we can't get real-time updates easily)
      simulateProgress(text.length, settings.wpm);
    } else {
      statusText.textContent = `❌ Error: ${result.error}`;
      showNotification(`❌ Error: ${result.error}`, 5000);
    }
  } catch (error) {
    statusText.textContent = `❌ Connection error: ${error.message}`;
    showNotification('❌ Could not connect to Python server!', 5000);
  }
});

// Simulate typing progress
function simulateProgress(textLength, wpm) {
  const charsPerMinute = wpm * 5; // 5 chars per word
  const charsPerSecond = charsPerMinute / 60;
  const totalSeconds = textLength / charsPerSecond;
  
  let elapsed = 0;
  const interval = setInterval(() => {
    elapsed += 0.5;
    const progress = Math.min(100, (elapsed / totalSeconds) * 100);
    const charsTyped = Math.floor((progress / 100) * textLength);
    
    progressFill.style.width = progress + '%';
    progressPercentage.textContent = Math.floor(progress) + '%';
    progressChars.textContent = `${charsTyped} / ${textLength}`;
    
    if (progress >= 99) {
      clearInterval(interval);
      setTimeout(() => {
        isTyping = false;
        updateButtonState();
        statusText.textContent = '✅ Typing completed!';
        showNotification('✅ Typing completed successfully!', 3000);
      }, 1000);
    }
  }, 500);
}

// Stop typing button
stopButton.addEventListener('click', async () => {
  if (!pythonBridge) return;
  
  try {
    const result = await pythonBridge.stopTyping();
    
    if (result.success) {
      isTyping = false;
      isPaused = false;
      updateButtonState();
      statusText.textContent = '⏹️ Typing stopped.';
      showNotification('⏹️ Typing stopped', 2000);
    }
  } catch (error) {
    statusText.textContent = '⚠️ Could not stop typing';
  }
});

// Reset button
resetButton.addEventListener('click', () => {
  showResetConfirmation();
});

function showResetConfirmation() {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    z-index: 99999;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.2s ease;
  `;
  
  const dialog = document.createElement('div');
  dialog.style.cssText = `
    background: white;
    padding: 25px;
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.3);
    max-width: 350px;
    text-align: center;
    animation: slideUp 0.3s ease;
  `;
  
  dialog.innerHTML = `
    <div style="font-size: 48px; margin-bottom: 15px;">⚠️</div>
    <h2 style="margin: 0 0 15px 0; color: #dc3545; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 20px;">
      Reset Everything?
    </h2>
    <p style="color: #666; margin: 0 0 10px 0; font-size: 14px;">
      This will clear:
    </p>
    <ul style="text-align: left; color: #666; font-size: 13px; margin: 0 0 20px 20px; padding: 0;">
      <li>📝 Text to type</li>
      <li>⚙️ All typing settings</li>
      <li>📊 Progress data</li>
    </ul>
    <p style="color: #28a745; margin: 0 0 20px 0; font-size: 13px; font-weight: bold;">
      ✅ Your API key will be kept safe!
    </p>
    <div style="display: flex; gap: 10px;">
      <button id="confirm-reset" style="
        flex: 1;
        padding: 10px 20px;
        background: #dc3545;
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: transform 0.2s;
      ">
        Yes, Reset
      </button>
      <button id="cancel-reset" style="
        flex: 1;
        padding: 10px 20px;
        background: #6c757d;
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: transform 0.2s;
      ">
        Cancel
      </button>
    </div>
  `;
  
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);
  
  document.getElementById('confirm-reset').addEventListener('click', () => {
    overlay.remove();
    performReset();
  });
  
  document.getElementById('cancel-reset').addEventListener('click', () => {
    overlay.remove();
  });
}

function performReset() {
  chrome.storage.sync.get(['openaiApiKey'], (result) => {
    const apiKey = result.openaiApiKey;
    
    chrome.storage.sync.clear(() => {
      chrome.storage.local.clear(() => {
        if (apiKey) {
          chrome.storage.sync.set({ openaiApiKey: apiKey });
        }
        
        inputText.value = '';
        charCount.textContent = '0';
        
        wpmSlider.value = 60;
        wpmValue.textContent = '60';
        
        varianceSlider.value = 20;
        varianceValue.textContent = '20%';
        
        mistakeRateSlider.value = 5;
        mistakeRateValue.textContent = '5%';
        
        thinkingPauseCheckbox.checked = true;
        selfCorrectionCheckbox.checked = true;
        if (humanPausesCheckbox) humanPausesCheckbox.checked = true;
        
        isTyping = false;
        isPaused = false;
        updateButtonState();
        
        progressSection.style.display = 'none';
        progressFill.style.width = '0%';
        progressPercentage.textContent = '0%';
        progressChars.textContent = '0 / 0';
        
        statusText.textContent = '🔄 Reset complete!';
        showNotification('🔄 All settings reset to default', 2000);
      });
    });
  });
}

function updateButtonState() {
  if (isTyping) {
    startBtnText.textContent = 'Typing...';
    startButton.disabled = true;
    stopButton.disabled = false;
    resetButton.disabled = true;
  } else {
    startBtnText.textContent = 'Start Typing';
    startButton.disabled = false;
    stopButton.disabled = true;
    resetButton.disabled = false;
  }
}

// Check server on load and periodically
checkPythonServer();
setInterval(checkPythonServer, 5000);  // Check every 5 seconds

updateButtonState();

console.log('🤖 AI Human Typer Panel Loaded!');
console.log('📅 Created by Kloue on November 23, 2025');