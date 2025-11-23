class OpenAIService {
  constructor() {
    this.apiKey = null;
    this.baseUrl = 'https://api.openai.com/v1/chat/completions';
  }

  async loadApiKey() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['openaiApiKey'], (result) => {
        this.apiKey = result.openaiApiKey || null;
        resolve(this.apiKey);
      });
    });
  }

  async analyzeText(text) {
    await this.loadApiKey();
    
    if (!this.apiKey) {
      console.log('No API key - skipping AI analysis');
      return null;
    }

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [{
            role: 'system',
            content: 'You are a typing pattern analyzer. Analyze the given text and identify where a human would naturally pause, hesitate, or slow down while typing. Return a JSON array of character positions where pauses should occur.'
          }, {
            role: 'user',
            content: text
          }],
          temperature: 0.7,
          max_tokens: 500
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const analysis = JSON.parse(data.choices[0].message.content);
      
      return analysis;
    } catch (error) {
      console.error('OpenAI analysis failed:', error);
      return null;
    }
  }
}

if (typeof window !== 'undefined') {
  window.OpenAIService = OpenAIService;
}

console.log('🤖 OpenAI Service loaded');