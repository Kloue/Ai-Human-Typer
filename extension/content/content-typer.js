/**
 * Direct Content Typer
 * types directly into elements (for normal websites)
 * doesn't work on Google Docs (use PyAutoGUI for that)
 * 
 * Kloue - 2025-11-23
 * 
 * TODO: maybe add better error handling later
 */

class DirectTyper {
  constructor() {
    // state tracking
    this.state = {
      isTyping: false,
      paused: false,
      currentPosition: 0,
      totalLength: 0,
      text: '',
      typedSoFar: '',
      remainingText: '',
      targetElement: null,
      settings: {},
      paragraphCount: 0,
      currentParagraph: 0
    };
    
    this.verifier = new TextVerifier();
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    // detect focus loss
    document.addEventListener('blur', (e) => {
      if (this.state.isTyping && e.target === this.state.targetElement) {
        this.handleFocusLost();
      }
    }, true);
    
    // tab switch detection
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state.isTyping) {
        this.handleFocusLost();
      }
    });
    
    // messages from sidepanel
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sendResponse);
      return true;
    });
  }
  
  handleMessage(message, sendResponse) {
    switch (message.type) {
      case 'START_TYPING':
        this.startTyping(message.element, message.text, message.settings)
          .then(() => sendResponse({ success: true }))
          .catch(err => sendResponse({ success: false, error: err.message }));
        break;
        
      case 'STOP_TYPING':
        this.stop();
        sendResponse({ success: true });
        break;
        
      case 'PAUSE_TYPING':
        this.pause();
        sendResponse({ success: true });
        break;
        
      case 'RESUME_TYPING':
        this.resume();
        sendResponse({ success: true });
        break;
        
      case 'RESTART_TYPING':
        this.restart();
        sendResponse({ success: true });
        break;
        
      case 'UPDATE_SETTINGS':
        this.updateSettings(message.settings);
        sendResponse({ success: true });
        break;
        
      case 'GET_STATUS':
        sendResponse({ status: this.getStatus() });
        break;
        
      default:
        sendResponse({ success: false, error: 'Unknown message' });
    }
  }
  
  async startTyping(elementSelector, text, settings) {
    // find target element
    let element = null;
    
    if (elementSelector) {
      element = document.querySelector(elementSelector);
    } else {
      // try focused element
      element = document.activeElement;
      
      // fallback: find any input
      if (!this.isTypableElement(element)) {
        element = document.querySelector('textarea, input[type="text"], [contenteditable="true"]');
      }
    }
    
    if (!element) {
      throw new Error('No text field found. Click in a text field first.');
    }
    
    if (!this.isTypableElement(element)) {
      throw new Error('Element is not typable.');
    }
    
    // setup state
    this.state.targetElement = element;
    this.state.text = text;
    this.state.totalLength = text.length;
    this.state.currentPosition = 0;
    this.state.typedSoFar = '';
    this.state.remainingText = text;
    this.state.isTyping = true;
    this.state.paused = false;
    this.state.settings = settings;
    
    // count paragraphs
    const paragraphs = text.split('\n\n').filter(p => p.trim().length > 0);
    this.state.paragraphCount = paragraphs.length;
    this.state.currentParagraph = 0;
    
    console.log('🚀 Direct typing starting');
    console.log(`📝 ${text.length} chars, ${this.state.paragraphCount} paragraphs`);
    
    // focus
    element.focus();
    
    // clear existing
    this.clearElement(element);
    
    // start typing loop
    await this.typeLoop();
  }
  
  async typeLoop() {
    const { text, settings } = this.state;
    
    for (let i = this.state.currentPosition; i < text.length; i++) {
      // stopped?
      if (!this.state.isTyping) {
        console.log('⏹️ Stopped');
        break;
      }
      
      // wait if paused
      while (this.state.paused) {
        await this.sleep(100);
      }
      
      const char = text[i];
      
      // paragraph break check
      if (char === '\n' && text[i + 1] === '\n') {
        this.state.currentParagraph++;
        
        // pause between paragraphs?
        const breakInterval = settings.paragraphBreaks || 0;
        if (breakInterval > 0 && 
            this.state.currentParagraph % breakInterval === 0 &&
            this.state.currentParagraph < this.state.paragraphCount) {
          
          const shouldContinue = await this.showParagraphBreak();
          if (!shouldContinue) {
            this.stop();
            break;
          }
        }
      }
      
      // type char (with possible mistake)
      await this.typeCharacterWithMistake(char, settings);
      
      // update state
      this.state.currentPosition = i + 1;
      this.state.typedSoFar += char;
      this.state.remainingText = text.slice(i + 1);
      
      // send progress update
      if (i % 5 === 0) {
        this.sendProgress();
      }
      
      // delay
      const delay = this.calculateDelay(char, settings);
      await this.sleep(delay);
    }
    
    // done!
    if (this.state.isTyping) {
      console.log('✅ Typing done!');
      this.state.isTyping = false;
      this.sendComplete();
    }
  }
  
  async typeCharacterWithMistake(char, settings) {
    const { targetElement } = this.state;
    const mistakeRate = (settings.mistakeRate || 5) / 100;
    const selfCorrection = settings.selfCorrection !== false;
    
    // make a mistake?
    if (selfCorrection && Math.random() < mistakeRate && char !== '\n') {
      // wrong char
      const wrongChar = this.getWrongCharacter(char);
      await this.typeCharacter(targetElement, wrongChar);
      
      // pause
      await this.sleep(this.randomRange(100, 300));
      
      // fix it
      await this.backspace(targetElement);
      await this.sleep(this.randomRange(50, 150));
    }
    
    // correct char
    await this.typeCharacter(targetElement, char);
  }
  
  async typeCharacter(element, char) {
    if (char === '\n') {
      // newline
      if (element.tagName === 'TEXTAREA') {
        element.value += '\n';
      } else if (element.isContentEditable) {
        document.execCommand('insertLineBreak');
      }
    } else {
      // regular char
      if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
        element.value += char;
      } else if (element.isContentEditable) {
        // insert at cursor
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(char));
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
    
    // trigger input event
    element.dispatchEvent(new Event('input', { bubbles: true }));
  }
  
  async backspace(element) {
    if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
      element.value = element.value.slice(0, -1);
    } else if (element.isContentEditable) {
      document.execCommand('delete');
    }
    
    element.dispatchEvent(new Event('input', { bubbles: true }));
  }
  
  calculateDelay(char, settings) {
    const wpm = settings.wpm || 60;
    const variance = (settings.variance || 20) / 100;
    const thinkingPause = settings.thinkingPause !== false;
    
    // base delay from WPM
    const charsPerWord = 5;
    const charsPerMinute = wpm * charsPerWord;
    const baseDelay = (60 * 1000) / charsPerMinute;
    
    // add variance
    const min = baseDelay * (1 - variance);
    const max = baseDelay * (1 + variance);
    let delay = this.randomRange(min, max);
    
    // thinking pauses
    if (thinkingPause && '.!?,:;'.includes(char)) {
      delay += this.randomRange(500, 2000);
    }
    
    // longer at newlines
    if (char === '\n') {
      delay += this.randomRange(500, 1500);
    }
    
    return delay;
  }
  
  getWrongCharacter(correctChar) {
    // keyboard proximity
    const nearby = {
      'a': 'sqwz', 'b': 'vghn', 'c': 'xdfv', 'd': 'sfcxe', 'e': 'wdsr',
      'f': 'dgcvtr', 'g': 'fhbvty', 'h': 'gjbnyu', 'i': 'ujko', 'j': 'hknmu',
      'k': 'jlmi', 'l': 'kop', 'm': 'njk', 'n': 'bhjm', 'o': 'iklp',
      'p': 'ol', 'q': 'wa', 'r': 'etdf', 's': 'awdxz', 't': 'ryfg',
      'u': 'yihj', 'v': 'cfgb', 'w': 'qesa', 'x': 'zsdc', 'y': 'tugh',
      'z': 'asx'
    };
    
    const lower = correctChar.toLowerCase();
    const nearbyChars = nearby[lower] || 'qwertyuiopasdfghjklzxcvbnm';
    const wrongChar = nearbyChars[Math.floor(Math.random() * nearbyChars.length)];
    
    return correctChar === correctChar.toUpperCase() ? wrongChar.toUpperCase() : wrongChar;
  }
  
  async showParagraphBreak() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({
        type: 'SHOW_PARAGRAPH_BREAK',
        current: this.state.currentParagraph,
        total: this.state.paragraphCount,
        progress: Math.round((this.state.currentPosition / this.state.totalLength) * 100)
      }, (response) => {
        resolve(response?.continue || false);
      });
    });
  }
  
  handleFocusLost() {
    if (this.state.paused) return;
    
    console.log('⚠️ Focus lost');
    this.state.paused = true;
    
    chrome.runtime.sendMessage({
      type: 'SHOW_RECOVERY_PROMPT',
      state: this.getStatus()
    });
  }
  
  pause() {
    this.state.paused = true;
    console.log('⏸️ Paused');
  }
  
  resume() {
    console.log('▶️ Resume');
    this.state.paused = false;
    this.state.targetElement?.focus();
  }
  
  restart() {
    console.log('🔄 Restart');
    
    // clear
    this.clearElement(this.state.targetElement);
    
    // reset
    this.state.currentPosition = 0;
    this.state.typedSoFar = '';
    this.state.remainingText = this.state.text;
    this.state.paused = false;
    this.state.currentParagraph = 0;
  }
  
  stop() {
    console.log('⏹️ Stop');
    this.state.isTyping = false;
    this.state.paused = false;
  }
  
  updateSettings(settings) {
    this.state.settings = { ...this.state.settings, ...settings };
    console.log('⚙️ Settings updated:', settings);
  }
  
  clearElement(element) {
    if (!element) return;
    
    if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
      element.value = '';
    } else if (element.isContentEditable) {
      element.textContent = '';
    }
  }
  
  isTypableElement(element) {
    if (!element) return false;
    
    return element.tagName === 'TEXTAREA' ||
           (element.tagName === 'INPUT' && element.type === 'text') ||
           element.isContentEditable;
  }
  
  getStatus() {
    return {
      isTyping: this.state.isTyping,
      paused: this.state.paused,
      currentPosition: this.state.currentPosition,
      totalLength: this.state.totalLength,
      percentage: this.state.totalLength > 0 
        ? Math.round((this.state.currentPosition / this.state.totalLength) * 100)
        : 0,
      typedSoFar: this.state.typedSoFar.slice(-100),
      remainingText: this.state.remainingText.slice(0, 100),
      currentParagraph: this.state.currentParagraph,
      totalParagraphs: this.state.paragraphCount
    };
  }
  
  sendProgress() {
    chrome.runtime.sendMessage({
      type: 'TYPING_PROGRESS',
      status: this.getStatus()
    });
  }
  
  sendComplete() {
    chrome.runtime.sendMessage({
      type: 'TYPING_COMPLETE',
      status: this.getStatus()
    });
  }
  
  randomRange(min, max) {
    return Math.random() * (max - min) + min;
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// init
if (typeof window !== 'undefined') {
  window.directTyper = new DirectTyper();
}

console.log('⌨️ Direct Typer loaded - v1.2.0 - Kloue');