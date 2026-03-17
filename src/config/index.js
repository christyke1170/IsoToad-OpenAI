require('dotenv').config();

/**
 * Bot Configuration
 * All settings are loaded from environment variables with sensible defaults
 */
const config = {
  // Discord Bot
  discord: {
    token: process.env.DISCORD_BOT_TOKEN,
    prefix: process.env.BOT_PREFIX || '!',
    name: process.env.BOT_NAME || 'AI Assistant',
  },

  // LLM API Configuration
  llm: {
    apiKey: process.env.LLM_API_KEY,
    baseUrl: process.env.LLM_BASE_URL || 'https://api.openai.com/v1',
    model: process.env.LLM_MODEL || 'gpt-4o-mini',
    maxTokens: parseInt(process.env.MAX_TOKENS || '2000'),
    temperature: 0.7,
  },

  // FFLogs V2 API Configuration
  fflogs: {
    clientId: process.env.FFLOGS_CLIENT_ID,
    clientSecret: process.env.FFLOGS_CLIENT_SECRET,
  },

  // Rate Limiting
  rateLimit: {
    maxMessagesPerMinute: parseInt(process.env.MAX_MESSAGES_PER_MINUTE || '10'),
    maxTokensPerDay: parseInt(process.env.MAX_TOKENS_PER_DAY || '100000'),
    windowMs: 60 * 1000, // 1 minute
  },

  // Memory Settings
  memory: {
    maxHistory: parseInt(process.env.MAX_CONVERSATION_HISTORY || '10'),
    cleanupIntervalHours: parseInt(process.env.MEMORY_CLEANUP_HOURS || '24'),
  },

  // Validation
  validate() {
    const errors = [];
    
    if (!this.discord.token || this.discord.token === 'your_bot_token_here') {
      errors.push('DISCORD_BOT_TOKEN is required in .env file');
    }
    
    if (!this.llm.apiKey || this.llm.apiKey === 'your_api_key_here') {
      errors.push('LLM_API_KEY is required in .env file');
    }
    
    if (errors.length > 0) {
      throw new Error(`Configuration errors:\n${errors.join('\n')}`);
    }
    
    return true;
  },
};

module.exports = config;
