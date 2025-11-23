chrome.runtime.onInstalled.addListener(() => {
  console.log('Human-Like AI Typer extension installed');
  
  chrome.storage.sync.get(['settings'], (result) => {
    if (!result.settings) {
      chrome.storage.sync.set({
        settings: {
          wpm: 60,
          variance: 20,
          mistakeRate: 5,
          thinkingPause: true,
          selfCorrection: true,
          humanPauses: true
        }
      });
    }
  });
});

chrome.action.onClicked.addListener(async (tab) => {
  await chrome.sidePanel.open({ windowId: tab.windowId });
});

chrome.commands.onCommand.addListener(async (command) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (command === 'toggle-panel') {
    await chrome.sidePanel.open({ windowId: tab.windowId });
  }
  
  if (command === 'toggle-typing') {
    chrome.storage.local.get(['typingState', 'isCurrentlyTyping'], async (result) => {
      const isTyping = result.isCurrentlyTyping || false;
      const typingState = result.typingState;
      
      if (typingState && typingState.status === 'PAUSED') {
        chrome.tabs.sendMessage(tab.id, { action: 'resumeTyping', fromShortcut: true });
      } else if (isTyping) {
        chrome.tabs.sendMessage(tab.id, { action: 'pauseTyping', fromShortcut: true });
      } else {
        chrome.storage.sync.get(['settings', 'lastText', 'openaiApiKey'], async (result) => {
          const settings = result.settings || {
            wpm: 60,
            variance: 20,
            mistakeRate: 5,
            thinkingPause: true,
            selfCorrection: true,
            humanPauses: true
          };
          
          const text = result.lastText || '';
          const apiKey = result.openaiApiKey || null;
          
          if (!text) {
            chrome.tabs.sendMessage(tab.id, {
              action: 'showNotification',
              message: '⚠️ No text set! Open side panel to set text first.'
            });
            return;
          }
          
          chrome.tabs.sendMessage(tab.id, {
            action: 'startTyping',
            text: text,
            settings: settings,
            apiKey: apiKey,
            fromShortcut: true
          });
        });
      }
    });
  }
  
  if (command === 'stop-typing') {
    chrome.tabs.sendMessage(tab.id, { action: 'stopTyping', fromShortcut: true });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateStatus') {
    chrome.runtime.sendMessage(message).catch(() => {});
  }
  
  if (message.action === 'setTypingState') {
    chrome.storage.local.set({ isCurrentlyTyping: message.isTyping });
  }
  
  if (message.action === 'openSidePanel') {
    chrome.sidePanel.open({ windowId: sender.tab.windowId });
  }
}); 