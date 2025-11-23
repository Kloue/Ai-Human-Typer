/**
 * AI Human Typer - Side Panel Controller
 * 
 * main UI controller for the extension
 * handles all user interaction and communication with server
 * 
 * Kloue - 2025-11-23 14:01:26
 * v1.2.0
 * 
 * TODO: maybe refactor this later, getting a bit long
 */

class SidePanelController {
  constructor() {
    this.pythonBridge = new PythonBridge();
    this.siteDetector = null;
    this.isTyping = false;
    this.isPaused = false;
    this.usingPyAutoGUI = false;
    this.consentGiven = false;
    this.progressInterval = null;
    this.startTime = null;
    
    this.init();
  }
  
  async init() {
    console.log('🚀 Side Panel init...');
    
    // load saved settings
    await this.loadSettings();
    
    // check consent (for pyautogui cursor control)
    await this.checkConsent();
    
    // detect what site we're on
    await this.detectSiteType();
    
    // setup listeners
    this.setupEventListeners();
    
    // check python server if needed
    if (this.usingPyAutoGUI) {
      await this.checkServerStatus();
      this.startServerStatusPolling();
    }
    
    console.log('✅ Side Panel ready!');
  }
  
  async detectSiteType() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab) {
        this.showStatus('⚠️ No active tab', 'warning');
        return;
      }
      
      // inject detector and get info
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          if (typeof SiteDetector === 'undefined') {
            return { error: 'SiteDetector not loaded' };
          }
          const detector = new SiteDetector();
          return {
            needsPyAutoGUI: detector.needsPyAutoGUI(),
            siteType: detector.getSiteType(),
            siteName: detector.getSiteName()
          };
        }
      });
      
      if (results && results[0] && results[0].result) {
        const siteInfo = results[0].result;
        
        if (siteInfo.error) {
          console.error('Site detection error:', siteInfo.error);
          return;
        }
        
        this.usingPyAutoGUI = siteInfo.needsPyAutoGUI;
        
        // show site notice
        this.showSiteNotice(siteInfo);
        
        // show/hide python section
        if (this.usingPyAutoGUI) {
          document.getElementById('python-section').style.display = 'block';
        } else {
          document.getElementById('python-section').style.display = 'none';
        }
      }
    } catch (error) {
      console.error('Error detecting site:', error);
    }
  }
  
  showSiteNotice(siteInfo) {
    const notice = document.getElementById('site-notice');
    const title = document.getElementById('site-type-title');
    const message = document.getElementById('site-type-message');
    
    if (siteInfo.needsPyAutoGUI) {
      title.textContent = `⚠️ ${siteInfo.siteName} Detected`;
      message.textContent = 'This site needs Python server. Direct typing blocked.';
      notice.className = 'site-notice pyautogui-mode';
    } else {
      title.textContent = `✅ ${siteInfo.siteName}`;
      message.textContent = 'Direct typing mode. No Python server needed!';
      notice.className = 'site-notice direct-mode';
    }
    
    notice.style.display = 'block';
  }
  
  async checkConsent() {
    const result = await chrome.storage.local.get(['cursorControlConsent']);
    this.consentGiven = result.cursorControlConsent || false;
  }
  
  async saveConsent() {
    await chrome.storage.local.set({ cursorControlConsent: true });
    this.consentGiven = true;
  }
  
  setupEventListeners() {
    // text input
    const textInput = document.getElementById('input-text');
    textInput.addEventListener('input', () => this.updateCharCount());
    
    // settings sliders - live update
    document.getElementById('wpm').addEventListener('input', (e) => {
      document.getElementById('wpm-value').textContent = e.target.value;
      if (this.isTyping) {
        this.updateLiveSettings();
      }
    });
    
    document.getElementById('variance').addEventListener('input', (e) => {
      document.getElementById('variance-value').textContent = e.target.value + '%';
      if (this.isTyping) {
        this.updateLiveSettings();
      }
    });
    
    document.getElementById('mistake-rate').addEventListener('input', (e) => {
      document.getElementById('mistake-rate-value').textContent = e.target.value + '%';
      if (this.isTyping) {
        this.updateLiveSettings();
      }
    });
    
    // AI enhancement toggle
    document.getElementById('ai-enhanced').addEventListener('change', (e) => {
      const aiInfo = document.getElementById('ai-info');
      if (e.target.checked) {
        aiInfo.style.display = 'block';
        this.showStatus('🤖 AI Enhancement enabled (coming soon!)', 'info');
      } else {
        aiInfo.style.display = 'none';
      }
      
      if (this.isTyping) {
        this.updateLiveSettings();
      }
    });
    
    // control buttons
    document.getElementById('start-typing').addEventListener('click', () => this.startTyping());
    document.getElementById('pause-typing').addEventListener('click', () => this.pauseTyping());
    document.getElementById('resume-typing').addEventListener('click', () => this.resumeTyping());
    document.getElementById('stop-typing').addEventListener('click', () => this.stopTyping());
    document.getElementById('reset-typing').addEventListener('click', () => this.resetAll());
    
    // consent modal
    document.getElementById('consent-check').addEventListener('change', (e) => {
      document.getElementById('consent-accept').disabled = !e.target.checked;
    });
    document.getElementById('consent-accept').addEventListener('click', () => this.acceptConsent());
    document.getElementById('consent-cancel').addEventListener('click', () => this.cancelConsent());
    
    // recovery modal
    document.getElementById('resume-btn').addEventListener('click', () => this.resumeFromRecovery());
    document.getElementById('restart-btn').addEventListener('click', () => this.restartFromRecovery());
    document.getElementById('stop-recovery-btn').addEventListener('click', () => this.stopFromRecovery());
    
    // paragraph modal
    document.getElementById('para-continue-btn').addEventListener('click', () => this.continueParagraph());
    document.getElementById('para-stop-btn').addEventListener('click', () => this.stopFromParagraph());
    
    // messages from content script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sendResponse);
      return true;
    });
  }
  
  handleMessage(message, sendResponse) {
    switch (message.type) {
      case 'TYPING_PROGRESS':
        this.updateProgress(message.status);
        break;
        
      case 'TYPING_COMPLETE':
        this.onTypingComplete();
        break;
        
      case 'SHOW_RECOVERY_PROMPT':
        this.showRecoveryModal(message.state);
        break;
        
      case 'SHOW_PARAGRAPH_BREAK':
        this.showParagraphModal(message.current, message.total, message.progress);
        sendResponse({ continue: false });
        break;
        
      case 'SHOW_CORRECTION':
        this.showCorrectionNotice(message.error);
        break;
    }
  }
  
  async checkServerStatus() {
    const status = await this.pythonBridge.getStatus();
    const statusEl = document.getElementById('server-status');
    const downloadBtn = document.getElementById('download-helper');
    const instructions = document.getElementById('download-instructions');
    
    if (status.status === 'online') {
      statusEl.className = 'server-status online';
      statusEl.innerHTML = '<p>✅ Server online!</p>';
      downloadBtn.style.display = 'none';
      instructions.style.display = 'none';
    } else {
      statusEl.className = 'server-status offline';
      statusEl.innerHTML = '<p>❌ Server offline</p>';
      downloadBtn.style.display = 'block';
      instructions.style.display = 'block';
    }
  }
  
  startServerStatusPolling() {
    // poll every 3 seconds
    setInterval(() => {
      if (this.usingPyAutoGUI && !this.isTyping) {
        this.checkServerStatus();
      }
    }, 3000);
  }
  
  async loadSettings() {
    const result = await chrome.storage.sync.get([
      'wpm',
      'variance',
      'mistakeRate',
      'thinkingPause',
      'selfCorrection',
      'paragraphBreaks',
      'aiEnhanced'
    ]);
    
    // apply saved settings
    if (result.wpm) document.getElementById('wpm').value = result.wpm;
    if (result.variance) document.getElementById('variance').value = result.variance;
    if (result.mistakeRate) document.getElementById('mistake-rate').value = result.mistakeRate;
    if (result.thinkingPause !== undefined) document.getElementById('thinking-pause').checked = result.thinkingPause;
    if (result.selfCorrection !== undefined) document.getElementById('self-correction').checked = result.selfCorrection;
    if (result.paragraphBreaks) document.getElementById('paragraph-breaks').value = result.paragraphBreaks;
    if (result.aiEnhanced !== undefined) document.getElementById('ai-enhanced').checked = result.aiEnhanced;
    
    // update displays
    document.getElementById('wpm-value').textContent = document.getElementById('wpm').value;
    document.getElementById('variance-value').textContent = document.getElementById('variance').value + '%';
    document.getElementById('mistake-rate-value').textContent = document.getElementById('mistake-rate').value + '%';
    
    this.updateCharCount();
  }
  
  async saveSettings() {
    await chrome.storage.sync.set({
      wpm: parseInt(document.getElementById('wpm').value),
      variance: parseInt(document.getElementById('variance').value),
      mistakeRate: parseInt(document.getElementById('mistake-rate').value),
      thinkingPause: document.getElementById('thinking-pause').checked,
      selfCorrection: document.getElementById('self-correction').checked,
      paragraphBreaks: parseInt(document.getElementById('paragraph-breaks').value),
      aiEnhanced: document.getElementById('ai-enhanced').checked
    });
  }
  
  getSettings() {
    return {
      wpm: parseInt(document.getElementById('wpm').value),
      variance: parseInt(document.getElementById('variance').value),
      mistakeRate: parseInt(document.getElementById('mistake-rate').value),
      thinkingPause: document.getElementById('thinking-pause').checked,
      selfCorrection: document.getElementById('self-correction').checked,
      paragraphBreaks: parseInt(document.getElementById('paragraph-breaks').value),
      aiEnhanced: document.getElementById('ai-enhanced').checked
    };
  }
  
  async updateLiveSettings() {
    const settings = this.getSettings();
    
    // show live badges
    document.getElementById('wpm-live').style.display = 'inline';
    document.getElementById('variance-live').style.display = 'inline';
    document.getElementById('mistake-live').style.display = 'inline';
    document.getElementById('live-indicator').style.display = 'block';
    
    if (this.usingPyAutoGUI) {
      // send to python server
      await this.pythonBridge.updateSettings(settings);
    } else {
      // send to content script
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      chrome.tabs.sendMessage(tab.id, {
        type: 'UPDATE_SETTINGS',
        settings: settings
      });
    }
    
    console.log('⚙️ Live settings:', settings);
  }
  
  updateCharCount() {
    const text = document.getElementById('input-text').value;
    const charCount = text.length;
    const paragraphs = text.split('\n\n').filter(p => p.trim().length > 0);
    const paraCount = paragraphs.length;
    
    document.getElementById('char-count').textContent = charCount;
    document.getElementById('para-count').textContent = paraCount;
  }
  
  async startTyping() {
    const text = document.getElementById('input-text').value.trim();
    
    if (!text) {
      this.showStatus('⚠️ Enter some text first!', 'warning');
      return;
    }
    
    // check consent for pyautogui
    if (this.usingPyAutoGUI && !this.consentGiven) {
      this.showConsentModal();
      return;
    }
    
    // save settings
    await this.saveSettings();
    const settings = this.getSettings();
    
    this.lockTextInput();
    this.isTyping = true;
    this.isPaused = false;
    this.startTime = Date.now();
    
    // update UI
    document.getElementById('start-typing').disabled = true;
    document.getElementById('pause-typing').disabled = false;
    document.getElementById('pause-typing').style.display = 'inline-block';
    document.getElementById('stop-typing').disabled = false;
    document.getElementById('progress-section').style.display = 'block';
    
    this.showStatus('🚀 Starting...', 'info');
    
    if (this.usingPyAutoGUI) {
      // python server mode
      const result = await this.pythonBridge.startTyping(text, settings);
      
      if (!result.success) {
        this.showStatus(`❌ Error: ${result.error}`, 'error');
        this.stopTyping();
        return;
      }
      
      this.showStatus('⌨️ Typing with PyAutoGUI...', 'success');
      this.startProgressPolling();
    } else {
      // direct typing mode
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        chrome.tabs.sendMessage(tab.id, {
          type: 'START_TYPING',
          element: null,
          text: text,
          settings: settings
        }, (response) => {
          if (chrome.runtime.lastError) {
            this.showStatus('❌ Could not connect to page', 'error');
            this.stopTyping();
            return;
          }
          
          if (!response?.success) {
            this.showStatus(`❌ ${response?.error || 'Unknown error'}`, 'error');
            this.stopTyping();
            return;
          }
          
          this.showStatus('⌨️ Typing...', 'success');
        });
      } catch (error) {
        this.showStatus(`❌ ${error.message}`, 'error');
        this.stopTyping();
      }
    }
  }
  
  async pauseTyping() {
    this.isPaused = true;
    
    document.getElementById('pause-typing').style.display = 'none';
    document.getElementById('resume-typing').disabled = false;
    document.getElementById('resume-typing').style.display = 'inline-block';
    
    if (this.usingPyAutoGUI) {
      await this.pythonBridge.stopTyping();
    } else {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      chrome.tabs.sendMessage(tab.id, { type: 'PAUSE_TYPING' });
    }
    
    this.showStatus('⏸️ Paused', 'info');
  }
  
  async resumeTyping() {
    this.isPaused = false;
    
    document.getElementById('resume-typing').style.display = 'none';
    document.getElementById('pause-typing').disabled = false;
    document.getElementById('pause-typing').style.display = 'inline-block';
    
    if (this.usingPyAutoGUI) {
      const result = await this.pythonBridge.resumeTyping();
      
      console.log('Resume result:', result);
      
      if (!result.success) {
        this.showStatus('❌ Resume failed: ' + (result.error || 'Unknown'), 'error');
        return;
      }
      
      // restart polling if stopped
      if (!this.progressInterval) {
        this.startProgressPolling();
      }
    } else {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      chrome.tabs.sendMessage(tab.id, { type: 'RESUME_TYPING' });
    }
    
    this.showStatus('▶️ Resumed', 'success');
  }
  
  async stopTyping() {
    this.isTyping = false;
    this.isPaused = false;
    
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
    
    if (this.usingPyAutoGUI) {
      await this.pythonBridge.stopTyping();
    } else {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) {
        chrome.tabs.sendMessage(tab.id, { type: 'STOP_TYPING' });
      }
    }
    
    this.unlockTextInput();
    this.hideLiveBadges();
    
    // UI update
    document.getElementById('start-typing').disabled = false;
    document.getElementById('pause-typing').disabled = true;
    document.getElementById('pause-typing').style.display = 'none';
    document.getElementById('resume-typing').disabled = true;
    document.getElementById('resume-typing').style.display = 'none';
    document.getElementById('stop-typing').disabled = true;
    
    this.showStatus('⏹️ Stopped', 'info');
  }
  
  resetAll() {
    this.stopTyping();
    
    // reset progress
    document.getElementById('progress-fill').style.width = '0%';
    document.getElementById('progress-percentage').textContent = '0%';
    document.getElementById('progress-chars').textContent = '0 / 0';
    document.getElementById('progress-section').style.display = 'none';
    
    this.showStatus('🔄 Reset', 'info');
  }
  
  startProgressPolling() {
    this.progressInterval = setInterval(async () => {
      if (!this.isTyping) {
        clearInterval(this.progressInterval);
        this.progressInterval = null;
        return;
      }
      
      const status = await this.pythonBridge.getStatus();
      
      console.log('📊 Poll:', status);
      
      if (status.progress) {
        this.updateProgress({
          currentPosition: status.progress.current,
          totalLength: status.progress.total,
          percentage: status.progress.percentage
        });
      }
      
      // check if paused (focus lost)
      if (status.paused && status.pause_reason === 'focus_lost') {
        console.log('🔔 Server paused!');
        
        // stop polling
        clearInterval(this.progressInterval);
        this.progressInterval = null;
        
        // show modal
        this.showRecoveryModal({
          currentPosition: status.progress.current,
          totalLength: status.progress.total,
          percentage: status.progress.percentage,
          typedSoFar: status.progress.typed_so_far,
          remainingText: status.progress.remaining
        });
        
        this.isPaused = true;
      }
      
      // check completion
      if (!status.is_typing && status.progress && status.progress.percentage >= 100) {
        this.onTypingComplete();
        clearInterval(this.progressInterval);
        this.progressInterval = null;
      }
    }, 1000);
  }
  
  updateProgress(status) {
    const percentage = status.percentage || 0;
    const current = status.currentPosition || 0;
    const total = status.totalLength || 0;
    
    document.getElementById('progress-fill').style.width = percentage + '%';
    document.getElementById('progress-bar-text').textContent = Math.round(percentage) + '%';
    document.getElementById('progress-percentage').textContent = Math.round(percentage) + '%';
    document.getElementById('progress-chars').textContent = `${current} / ${total}`;
    
    if (status.currentParagraph !== undefined && status.totalParagraphs !== undefined) {
      document.getElementById('progress-paragraph').style.display = 'block';
      document.getElementById('progress-para').textContent = `${status.currentParagraph} / ${status.totalParagraphs}`;
    }
    
    // time estimate
    if (this.startTime && current > 0) {
      const elapsed = Date.now() - this.startTime;
      const charsPerMs = current / elapsed;
      const remaining = total - current;
      const estimatedMs = remaining / charsPerMs;
      const estimatedSec = Math.round(estimatedMs / 1000);
      
      document.getElementById('progress-time').style.display = 'block';
      document.getElementById('time-remaining').textContent = this.formatTime(estimatedSec);
    }
  }
  
  formatTime(seconds) {
    if (seconds < 60) {
      return `${seconds}s`;
    } else {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}m ${secs}s`;
    }
  }
  
  onTypingComplete() {
    this.isTyping = false;
    this.unlockTextInput();
    this.hideLiveBadges();
    
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
    
    // UI
    document.getElementById('progress-fill').style.width = '100%';
    document.getElementById('progress-percentage').textContent = '100%';
    document.getElementById('start-typing').disabled = false;
    document.getElementById('pause-typing').disabled = true;
    document.getElementById('pause-typing').style.display = 'none';
    document.getElementById('resume-typing').style.display = 'none';
    document.getElementById('stop-typing').disabled = true;
    
    this.showStatus('✅ Completed!', 'success');
    
    // sound
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZSA0PVq3n77BhGAg+mNr0x3AlBSuAzu7ajzkHGGS57OihUAwKTqXk8bllHAU2jtjwz38pBSd+zPDdkUELFF+16+upVRQKSKDh8r1tIgU0h9Py1YU0Bx9ywfDjm0kOD1iw6PC0YhgIPJrc9Mp4JwUue9Dt3I06CRxrw+vmnksOEFay6/G2ZRsGPZnb88p3JgYwhM/v3I46CRxqwuvlnUoNEVWx6+61ZBoHPZjb88p3JwYxhdDu3Yw5CRxpwerjnEkNEVWw6u60YxkHO5jb8sp2JgYwhM/u3Yw4CRxowermm0kMEFSw6u2yYhgHO5fb8sl2JgYvg9Du24w4CRxnwermm0kMEFSv6OyyYhgGOpbb8cl2JgUug9Hu24k3CBtnv+nhm0gLDlOu5+uxYRYEOZXY78l1JgUthNDt2og2Bxhnvunnm0gLDlOu5+uwYRYEOJTX78l0JgYthM/s2og2BxhmvunnmkgLDVKt5umwYBYEOJPX78l0JgYshc/s2Yk3Bxhmvujnmkg=');
      audio.play();
    } catch (e) {
      // ignore
    }
  }
  
  showConsentModal() {
    document.getElementById('consent-modal').style.display = 'flex';
  }
  
  hideConsentModal() {
    document.getElementById('consent-modal').style.display = 'none';
  }
  
  async acceptConsent() {
    await this.saveConsent();
    this.hideConsentModal();
    this.startTyping();
  }
  
  cancelConsent() {
    this.hideConsentModal();
    this.showStatus('❌ Consent required for PyAutoGUI', 'warning');
  }
  
  showRecoveryModal(state) {
    console.log('🔔 Recovery modal:', state);
    
    document.getElementById('recovery-position').textContent = state.currentPosition;
    document.getElementById('recovery-total').textContent = state.totalLength;
    document.getElementById('recovery-percentage').textContent = Math.round(state.percentage) + '%';
    document.getElementById('resume-pos').textContent = state.currentPosition;
    
    document.getElementById('typed-text').textContent = state.typedSoFar || '';
    document.getElementById('remaining-text').textContent = state.remainingText || '';
    
    // instructions
    const instructionsList = document.getElementById('recovery-instructions-list');
    if (this.usingPyAutoGUI) {
      instructionsList.innerHTML = `
        <li>Click in Google Docs</li>
        <li>Position cursor at end</li>
        <li>Don't touch after Resume</li>
        <li>Click Resume below</li>
      `;
    } else {
      instructionsList.innerHTML = `
        <li>Click in text field</li>
        <li>Make sure cursor at end</li>
        <li>Click Resume</li>
      `;
    }
    
    document.getElementById('recovery-modal').style.display = 'flex';
  }
  
  hideRecoveryModal() {
    document.getElementById('recovery-modal').style.display = 'none';
  }
  
  async resumeFromRecovery() {
    console.log('▶️ Resume from recovery');
    
    this.hideRecoveryModal();
    
    // resume
    const result = await this.pythonBridge.resumeTyping();
    
    console.log('Result:', result);
    
    if (result.success) {
      this.isPaused = false;
      
      // restart polling
      if (!this.progressInterval) {
        this.startProgressPolling();
      }
      
      this.showStatus('▶️ Resumed from ' + result.resume_position, 'success');
    } else {
      this.showStatus('❌ Failed: ' + (result.error || 'Unknown'), 'error');
    }
  }
  
  async restartFromRecovery() {
    this.hideRecoveryModal();
    
    if (this.usingPyAutoGUI) {
      await this.pythonBridge.restartTyping();
    } else {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      chrome.tabs.sendMessage(tab.id, { type: 'RESTART_TYPING' });
    }
    
    this.showStatus('🔄 Restarting...', 'info');
  }
  
  stopFromRecovery() {
    this.hideRecoveryModal();
    this.stopTyping();
  }
  
  showParagraphModal(current, total, progress) {
    document.getElementById('para-current').textContent = current;
    document.getElementById('para-total').textContent = total;
    document.getElementById('para-percentage').textContent = Math.round(progress) + '%';
    
    const text = document.getElementById('input-text').value;
    const currentPos = Math.round((progress / 100) * text.length);
    document.getElementById('para-chars').textContent = `${currentPos} / ${text.length}`;
    
    document.getElementById('paragraph-modal').style.display = 'flex';
  }
  
  hideParagraphModal() {
    document.getElementById('paragraph-modal').style.display = 'none';
  }
  
  async continueParagraph() {
    this.hideParagraphModal();
    
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.runtime.sendMessage({ type: 'PARAGRAPH_CONTINUE' });
    
    await this.resumeTyping();
  }
  
  stopFromParagraph() {
    this.hideParagraphModal();
    this.stopTyping();
  }
  
  showCorrectionNotice(error) {
    const notice = document.getElementById('correction-notice');
    const message = document.getElementById('correction-message');
    
    message.textContent = `Error at ${error.errorPosition}. Auto-correcting...`;
    notice.style.display = 'block';
    
    setTimeout(() => {
      notice.style.display = 'none';
    }, 3000);
  }
  
  lockTextInput() {
    const textInput = document.getElementById('input-text');
    textInput.disabled = true;
    textInput.style.backgroundColor = '#f0f0f0';
    textInput.style.cursor = 'not-allowed';
    document.getElementById('text-locked-warning').style.display = 'block';
  }
  
  unlockTextInput() {
    const textInput = document.getElementById('input-text');
    textInput.disabled = false;
    textInput.style.backgroundColor = 'white';
    textInput.style.cursor = 'text';
    document.getElementById('text-locked-warning').style.display = 'none';
  }
  
  hideLiveBadges() {
    document.getElementById('wpm-live').style.display = 'none';
    document.getElementById('variance-live').style.display = 'none';
    document.getElementById('mistake-live').style.display = 'none';
    document.getElementById('live-indicator').style.display = 'none';
  }
  
  showStatus(message, type = 'info') {
    const statusEl = document.getElementById('status-text');
    statusEl.textContent = message;
    statusEl.className = `status ${type}`;
    console.log(`[Status] ${message}`);
  }
}

// init on dom ready
document.addEventListener('DOMContentLoaded', () => {
  window.sidePanelController = new SidePanelController();
});

console.log('🎨 Side Panel loaded - v1.2.0 - Kloue - 2025-11-23 14:01:26');