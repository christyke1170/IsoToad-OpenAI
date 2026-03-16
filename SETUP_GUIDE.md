# Discord AI Bot Setup Guide

This guide will help you set up your Discord AI chatbot with Gemini API integration.

## Prerequisites

- **Node.js 18+** - Download from [nodejs.org](https://nodejs.org/)
- **Discord Developer Account** - To create a bot
- **Gemini API Key** - From Google AI Studio

## Step 1: Create Your Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application"
3. Give your bot a name and click "Create"
4. In the left sidebar, click "Bot"
5. Click "Add Bot" and confirm
6. Copy the "Token" - this is your `DISCORD_BOT_TOKEN`

### Invite Your Bot to a Server

1. In the Developer Portal, go to "OAuth2" → "URL Generator"
2. Select these scopes:
   - `bot`
   - `applications.commands`
3. Select these permissions:
   - `Send Messages`
   - `Read Message History`
   - `Use Slash Commands` (under Text Permissions)
4. Copy the generated URL and open it in your browser
5. Select your server and authorize

## Step 2: Get Your Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account
3. Click on your profile → "Get API Key"
4. Copy the API key - this is your `LLM_API_KEY`

## Step 3: Configure Your Bot

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your credentials:
   ```env
   # Discord Bot Token
   DISCORD_BOT_TOKEN=your_discord_bot_token_here

   # Gemini API Configuration
   LLM_API_KEY=your_gemini_api_key_here
   LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta/
   LLM_MODEL=gemini-1.5-flash

   # Bot Settings
   BOT_PREFIX=!
   BOT_NAME=AI Assistant

   # Rate Limiting
   MAX_MESSAGES_PER_MINUTE=10
   MAX_TOKENS_PER_DAY=100000
   ```

## Step 4: Install Dependencies

```bash
npm install
```

## Step 5: Test Your Setup

1. Start the bot:
   ```bash
   npm start
   ```

2. Check the console for:
   - Bot login confirmation
   - LLM connection test success
   - Slash commands registered

3. In Discord, try:
   - `@YourBot Hello`
   - `/chat message:Hello`
   - `/ping`

## Troubleshooting

### Bot Won't Start

**Error: "DISCORD_BOT_TOKEN is required"**
- Check your `.env` file has a valid token
- Make sure the token isn't wrapped in quotes

**Error: "LLM_API_KEY is required"**
- Verify your Gemini API key is correct
- Check the API key hasn't expired

### Bot Online But Not Responding

**Check Bot Permissions:**
- Ensure the bot has "Send Messages" permission
- Check "Read Message History" is enabled
- Verify the bot role is above users it needs to respond to

**Check Logs:**
- Look in `logs/error.log` for detailed errors
- Check console output for connection issues

### Gemini API Errors

**401 Unauthorized:**
- Verify your API key is correct
- Check if your API key has usage limits

**429 Rate Limited:**
- Reduce `MAX_MESSAGES_PER_MINUTE` in `.env`
- The bot will automatically handle rate limits

**Model Not Found:**
- Ensure you're using a valid Gemini model name
- Check if the model is available in your region

## Cost Management

### Gemini API Costs

- **Gemini 1.5 Flash**: ~$0.00035 per 1K input tokens
- **Gemini 1.5 Pro**: ~$0.0045 per 1K input tokens

### Cost Control Features

1. **Daily Token Limit**: Set `MAX_TOKENS_PER_DAY` in `.env`
2. **Rate Limiting**: `MAX_MESSAGES_PER_MINUTE` prevents spam
3. **Memory Cleanup**: Old conversations are automatically cleared

### Monitoring Usage

Use the `/stats` command to check:
- Daily token usage
- Conversation memory status
- Bot latency

## Development Tips

### Testing Locally

```bash
# Development mode with auto-restart
npm run dev

# Debug mode (more verbose logging)
DEBUG=1 npm start
```

### Customizing Bot Behavior

Edit `src/services/llm.js` and modify the `systemPrompt`:

```javascript
this.systemPrompt = `You are ${config.discord.name}, a helpful AI assistant...
Your personality: [describe your bot's personality here]`;
```

### Adding New Commands

1. Add command to `registerCommands()` in `src/index.js`
2. Add handler in `handleSlashCommand()`
3. Test with `/your-command-name`

## Next Steps

1. **Deploy to Production** - See `DEPLOYMENT.md`
2. **Add Features** - Custom commands, moderation, etc.
3. **Monitor Usage** - Set up alerts for API usage
4. **Scale Up** - Handle multiple servers, advanced memory