class OpenAIService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://api.openai.com/v1/chat/completions';
  }
  
  async generateThinkingPatterns(text) {
    if (!this.apiKey) {
      console.error('❌ OpenAI API key not set');
      throw new Error('OpenAI API key not set');
    }
    
    console.log('🤖 OpenAI API Call: Generating thinking patterns...');
    console.log('📝 Text length:', text.length, 'characters');
    
    const prompt = `You are helping simulate realistic human typing. A person wants to type this text:

"${text}"

Generate 3-5 realistic "thinking patterns" where someone starts typing something, realizes it's wrong, and corrects it.

Format: Return ONLY a JSON array like this:
[
  {
    "position": 15,
    "wrongText": "gonna",
    "correctText": "going to"
  },
  {
    "position": 45,
    "wrongText": "wanna",
    "correctText": "want to"
  }
]

Rules:
- "position" is the character position in the original text where this happens
- Use casual language → formal corrections (gonna→going to, wanna→want to)
- Or start with wrong word choice → correct it (big→large, happy→excited)
- Make it feel natural, like someone thinking while typing
- Return ONLY valid JSON, no explanation`;

    try {
      console.log('🌐 Sending request to OpenAI API...');
      const startTime = Date.now();
      
      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that returns only valid JSON.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.8,
          max_tokens: 500
        })
      });
      
      const responseTime = Date.now() - startTime;
      console.log(`⏱️ API Response time: ${responseTime}ms`);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ OpenAI API Error:', response.status, errorData);
        throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }
      
      const data = await response.json();
      console.log('✅ OpenAI API Response received');
      console.log('💰 Tokens used:', data.usage);
      
      const content = data.choices[0].message.content.trim();
      console.log('📄 Raw response:', content);
      
      const patterns = JSON.parse(content);
      console.log('✨ Parsed patterns:', patterns);
      console.log(`✅ Successfully generated ${patterns.length} thinking patterns`);
      
      return patterns;
      
    } catch (error) {
      console.error('❌ OpenAI API Error:', error);
      console.error('❌ Error details:', error.message);
      throw error;
    }
  }
  
  async analyzeWordDifficulties(text) {
    if (!this.apiKey) {
      console.error('❌ OpenAI API key not set');
      throw new Error('OpenAI API key not set');
    }
    
    console.log('🤖 OpenAI API Call: Analyzing word difficulties...');
    
    const words = text.match(/\b\w+\b/g) || [];
    const uniqueWords = [...new Set(words)].slice(0, 100);
    
    console.log('📊 Analyzing', uniqueWords.length, 'unique words');
    
    const prompt = `Analyze these words and assign a typing difficulty multiplier (0.5 = very slow, 1.0 = normal, 1.5 = very fast).

Words: ${uniqueWords.join(', ')}

Consider:
- Common words (the, is, and) = faster (1.3-1.5)
- Long/complex words (photosynthesis, extraordinarily) = slower (0.5-0.7)
- Technical terms = slower (0.6-0.8)
- Medium words = normal (0.9-1.1)

Return ONLY JSON array:
[
  {"word": "the", "multiplier": 1.4},
  {"word": "photosynthesis", "multiplier": 0.6},
  {"word": "happy", "multiplier": 1.1}
]`;

    try {
      console.log('🌐 Sending word analysis request to OpenAI...');
      const startTime = Date.now();
      
      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: 'You return only valid JSON arrays.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
          max_tokens: 1000
        })
      });
      
      const responseTime = Date.now() - startTime;
      console.log(`⏱️ Word analysis response time: ${responseTime}ms`);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Word analysis API error:', response.status, errorData);
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('✅ Word analysis response received');
      console.log('💰 Tokens used:', data.usage);
      
      const content = data.choices[0].message.content.trim();
      console.log('📄 Raw word difficulties:', content);
      
      const difficulties = JSON.parse(content);
      console.log('✨ Parsed word difficulties:', difficulties);
      console.log(`✅ Successfully analyzed ${difficulties.length} word difficulties`);
      
      return difficulties;
      
    } catch (error) {
      console.error('❌ Word difficulty analysis error:', error);
      console.error('❌ Falling back to rule-based WPM');
      return [];
    }
  }
}

window.OpenAIService = OpenAIService;