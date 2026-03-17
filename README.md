# Discord AI Bot 🤖

A beginner-friendly Discord chatbot with **OpenAI API integration**, conversation memory, and rate limiting.

## Features

- **OpenAI API Integration**: Connect to OpenAI models
- **Conversation Memory**: Remembers context within each channel for natural conversations
- **Rate Limiting**: Prevents spam and runaway API costs
- **Slash Commands**: Modern Discord interactions
- **Logging**: Comprehensive logging for debugging
- **Cost Control**: Built-in daily token limits and usage monitoring

## Prerequisites

- Node.js 18+
- A Discord bot token
- An OpenAI API key

## Quick Start

### 1. Clone and Install

```bash
cd discord-ai-bot
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your values:

```env
# Discord Bot Token (get from https://discord.com/developers/applications)
DISCORD_BOT_TOKEN=your_discord_bot_token_here

# OpenAI API Configuration
LLM_API_KEY=sk-your_openai_api_key_here
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o-mini

# Bot Settings
BOT_PREFIX=!
BOT_NAME=AI Assistant

# Rate Limiting
MAX_MESSAGES_PER_MINUTE=10
MAX_TOKENS_PER_DAY=100000

# FFLogs V2 OAuth Credentials
FFLOGS_CLIENT_ID=your_fflogs_client_id_here
FFLOGS_CLIENT_SECRET=your_fflogs_client_secret_here
```

### 3. Run the Bot

```bash
npm start
```

### 4. Invite the Bot to Your Server

1. Go to Discord Developer Portal → Your Application → OAuth2
2. Generate an invite URL with `bot` and `application.commands` scopes
3. Select required permissions (Send Messages, Read Message History)
4. Use the generated URL to invite the bot

**Detailed setup guide:** [SETUP_GUIDE.md](./SETUP_GUIDE.md)

## Usage

### Mention the Bot

```
@YourBot Hello, how are you?
```

### Use Prefix Commands

```
!Hello, how are you?
```

### Slash Commands

- `/chat [message]` - Send a message to the AI
- `/clear` - Clear conversation history in the channel
- `/stats` - Show bot statistics
- `/ping` - Check bot latency

## Project Structure

```
discord-ai-bot/
├── src/
│   ├── index.js          # Main bot entry point
│   ├── config/
│   │   └── index.js      # Configuration management
│   ├── services/
│   │   └── llm.js        # LLM API integration
│   └── utils/
│       ├── logger.js     # Winston logging
│       ├── memory.js     # Conversation memory
│       └── rateLimiter.js # Rate limiting
├── .env                  # Your configuration
├── .env.example          # Example configuration
├── package.json
└── README.md
```

## API Options

### OpenAI

```env
LLM_API_KEY=sk-...
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o-mini
```

### Local Models (Free, Private)

Use [LM Studio](https://lmstudio.ai/) or [Ollama](https://ollama.ai/):

```env
LLM_API_KEY=not-needed
LLM_BASE_URL=http://localhost:1234/v1
LLM_MODEL=local-model
```

### Anthropic Claude

```env
LLM_API_KEY=sk-ant-...
LLM_BASE_URL=https://api.anthropic.com/v1
LLM_MODEL=claude-3-haiku-20240307
```

**Note:** This bot is configured for OpenAI by default. To use other APIs, you'll need to modify `src/services/llm.js` to use the appropriate API client.

## Rate Limiting & Cost Control

The bot includes several safeguards:

1. **Per-user rate limit**: Maximum messages per minute (default: 10)
2. **Daily token budget**: Maximum tokens per day (default: 100,000)
3. **Auto-cleanup**: Old conversations are cleaned up after 24 hours

Adjust in `.env`:

```env
MAX_MESSAGES_PER_MINUTE=10
MAX_TOKENS_PER_DAY=100000
MAX_CONVERSATION_HISTORY=10
MEMORY_CLEANUP_HOURS=24
```

## Deployment

**Complete deployment guide:** [DEPLOYMENT.md](./DEPLOYMENT.md)

### Option 1: VPS/Server (Recommended for 24/7)

1. Upload files to your server
2. Install Node.js 18+
3. Run `npm install`
4. Use a process manager like PM2:

```bash
npm install -g pm2
pm2 start src/index.js --name discord-ai-bot
pm2 save
pm2 startup
```

### Option 2: Raspberry Pi

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Run the bot
npm start
```

### Option 3: Cloud Services

- **Railway**: Easy deployment with environment variables
- **Render**: Free tier available
- **Fly.io**: Good for containers

## Troubleshooting

### Bot won't start

- Check your `.env` file has valid tokens
- Run `node src/index.js` for detailed error messages

### "Cannot read properties of undefined"

- Ensure dependencies are installed: `npm install`

### Bot not responding

- Check the bot has proper permissions
- Verify it's in the correct server
- Check logs in `logs/` folder

### Rate limited errors

- Increase `MAX_MESSAGES_PER_MINUTE` in `.env`
- The bot will automatically recover

## Customization

### Change Bot Personality

Edit `src/services/llm.js` and modify the `systemPrompt`:

```javascript
this.systemPrompt = `You are ${config.discord.name}, a helpful and friendly AI assistant...
Your personality: [describe your bot here]`;
```

### Add More Commands

Add new commands in `src/index.js` under `registerCommands()`:

```javascript
{
  name: 'help',
  description: 'Show help information',
},
```

## Best Practices

1. **Never commit `.env`** - Add it to `.gitignore`
2. **Use a separate API key** - Create a new key just for the bot
3. **Set budget alerts** - Monitor API usage in your provider's dashboard
4. **Regular restarts** - Use PM2 to auto-restart on crashes
5. **Log rotation** - Logs are automatically rotated (5MB max, 3 files)

## License

MIT
