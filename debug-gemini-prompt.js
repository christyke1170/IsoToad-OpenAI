require('dotenv').config();

async function debugGeminiPrompt() {
  const apiKey = process.env.LLM_API_KEY;
  const baseUrl = process.env.LLM_BASE_URL || 'https://generativelanguage.googleapis.com/v1';
  const model = process.env.LLM_MODEL || 'gemini-2.5-flash';
  
  // This is the exact prompt format your bot sends to Gemini
  const contents = [
    {
      role: 'user',
      parts: [{ text: `You are ${process.env.BOT_NAME || 'AI Assistant'}, a helpful and friendly AI assistant in a Discord server. 
You're conversational, polite, and concise. You respond to messages in the channel where you're mentioned.
Keep your responses friendly and engaging.` }]
    },
    {
      role: 'user',
      parts: [{ text: 'Hello' }]
    }
  ];
  
  const url = `${baseUrl}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  
  const payload = {
    contents: contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2000,
      topP: 1,
      topK: 32
    }
  };

  console.log('=== EXACT PROMPT SENT TO GEMINI ===\n');
  console.log('URL:', url.replace(apiKey, 'REDACTED'));
  console.log('\n--- Request Body ---');
  console.log(JSON.stringify(payload, null, 2));
  
  console.log('\n--- Simplified View ---');
  console.log('System Prompt:', contents[0].parts[0].text);
  console.log('User Message:', contents[1].parts[0].text);
  
  console.log('\n=== SENDING TO GEMINI ===');
  
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    console.log('\n=== GEMINI RESPONSE ===');
    console.log('Status:', res.status);
    
    if (data.error) {
      console.log('❌ Error:', data.error.message);
    } else if (data.candidates && data.candidates[0]) {
      const response = data.candidates[0].content.parts[0].text;
      console.log('✅ Response:', response);
    } else {
      console.log('❌ No response received');
      console.log('Full response:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('❌ Network Error:', error.message);
  }
}

debugGeminiPrompt();