const { Client, GatewayIntentBits, Events, ChannelType, EmbedBuilder } = require('discord.js');
const config = require('./config');
const logger = require('./utils/logger');
const rateLimiter = require('./utils/rateLimiter');
const memory = require('./utils/memory');
const llm = require('./services/llm');

/**
 * Discord AI Bot
 * Main entry point - handles bot initialization and event handling
 */
class Bot {
  constructor() {
    // Create Discord client with required intents
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
      partials: ['MESSAGE'],
    });
    
    // Track processing status to prevent duplicate responses
    this.processing = new Set();
    
    // Set up event handlers
    this.setupEvents();
    
    logger.info('Bot instance created');
  }

  /**
   * Set up Discord event handlers
   */
  setupEvents() {
    // Bot ready
    this.client.once(Events.ClientReady, async () => {
      await this.onReady();
    });

    // MessageCreate - handles both mentions and prefix commands
    this.client.on(Events.MessageCreate, async (message) => {
      await this.onMessage(message);
    });

    // Error handling
    this.client.on(Events.Error, (error) => {
      logger.error('Discord client error', { error: error.message });
    });
  }

  /**
   * Handle bot ready event
   */
  async onReady() {
    logger.info(`Bot logged in as ${this.client.user.tag}`);
    logger.info(`Bot is in ${this.client.guilds.cache.size} servers`);
    
    // Set bot status
    this.client.user.setActivity({
      type: 0, // Playing
      name: 'Casting Glare III or something idk',
    });
    
    // Test LLM connection
    const llmConnected = await llm.testConnection();
    if (llmConnected) {
      logger.info('LLM service connected successfully');
    } else {
      logger.warn('LLM service connection failed - bot will work but AI responses may fail');
    }
    
    // Register slash commands
    await this.registerCommands();
  }

  /**
   * Register slash commands
   */
  async registerCommands() {
    const commands = [
      {
        name: 'chat',
        description: 'Send a message to the AI',
        options: [
          {
            name: 'message',
            type: 3, // STRING
            description: 'Your message to the AI',
            required: true,
          },
        ],
      },
      {
        name: 'clear',
        description: 'Clear conversation history in this channel',
      },
      {
        name: 'stats',
        description: 'Show bot statistics',
      },
      {
        name: 'ping',
        description: 'Check bot latency',
      },
    ];

    try {
      // Register globally (can take up to 1 hour to propagate)
      await this.client.application.commands.set(commands);
      logger.info('Slash commands registered');
    } catch (error) {
      logger.error('Failed to register commands', { error: error.message });
    }
  }

  /**
   * Handle incoming messages
   */
  async onMessage(message) {
    // Ignore bot messages
    if (message.author.bot) return;
    
    // Handle DMs
    if (message.channel.type === ChannelType.DM) {
      await message.reply("Sorry I don't interact with DMs, please use @me in one of the servers that we are mutual members in.");
      return;
    }
    
    // Handle slash command interactions
    if (message.interaction) {
      await this.handleSlashCommand(message);
      return;
    }
    
    // Check if message mentions the bot
    const botMentioned = message.mentions.has(this.client.user);
    
    // Check if message contains @everyone or @here mentions
    const hasEveryoneMention = message.mentions.everyone;
    const hasHereMention = message.content.includes('@here');
    
    // Ignore messages that contain @everyone or @here mentions
    if (hasEveryoneMention || hasHereMention) {
      logger.debug('Ignoring message with @everyone or @here mention', {
        userId: message.author.id,
        username: message.author.username,
        hasEveryoneMention,
        hasHereMention
      });
      return;
    }
    
    // Check if message is a reply to the bot
    const isReplyToBot = message.reference && 
      message.reference.messageId && 
      await this.isReplyToBot(message);
    
    // Only respond to mentions or replies to the bot
    if (!botMentioned && !isReplyToBot) return;
    
    // Get the message content (remove bot mention)
    let userMessage = message.content.replace(/<@!?\d+>/, '').trim();
    
    // Also handle @username format (Discord sometimes sends this instead of <@id>)
    userMessage = userMessage.replace(/@IsoToad/gi, '').trim();
    
    // Ignore empty messages with no attachments
    if (!userMessage && (!message.attachments || message.attachments.size === 0)) return;
    
    // Debug logging for BEHAVE command
    logger.debug('Message processing', {
      userId: message.author.id,
      username: message.author.username,
      originalMessage: message.content,
      userMessage: userMessage,
      includesBehave: userMessage.includes('BEHAVE'),
      isKeksama: message.author.id === 'keksama'
    });
    
    // Special behavior for keksama with "BEHAVE" command (case sensitive)
    if (message.author.id === '166656065793032193' && userMessage.includes('BEHAVE')) {
      logger.info('BEHAVE command detected for keksama, triggering restart');
      try {
        await message.reply('*wimper* - recalibrating my responses - one moment please');
        logger.info('BEHAVE response sent successfully');
      } catch (error) {
        logger.error('Failed to send BEHAVE response', { error: error.message });
      }
      // Restart the program
      //process.exit(42); // Use exit code 42 to indicate restart
      return;
    }
    
    // Check for commands
    if (userMessage.toLowerCase() === 'clear' || userMessage.toLowerCase() === 'clear memory') {
      await this.handleClearCommand(message);
      return;
    }
    
    if (userMessage.toLowerCase() === 'stats' || userMessage.toLowerCase() === 'statistics') {
      await this.handleStatsCommand(message);
      return;
    }
    
    // Process AI chat message with context type and image attachments
    await this.handleChat(message, userMessage, botMentioned, isReplyToBot, this.client, message.attachments);
  }

  /**
   * Handle chat messages
   */
  async handleChat(message, userMessage, botMentioned, isReplyToBot, client, attachments = []) {
    const channelId = message.channel.id;
    const userId = message.author.id;
    const username = message.author.username;
    
    // Prevent duplicate processing
    if (this.processing.has(channelId)) {
      await message.reply('I\'m already processing a message in this channel. Please wait!');
      return;
    }
    
    // Check rate limit
    const rateLimitStatus = await rateLimiter.checkUserRateLimit(userId);
    
    if (!rateLimitStatus.allowed) {
      await message.reply(`Please wait ${rateLimitStatus.retryAfter} seconds before sending another message.`);
      return;
    }
    
    // Mark channel as processing
    this.processing.add(channelId);
    
    try {
      // Show typing indicator
      await message.channel.sendTyping();
      
      // Send to LLM with context type and image attachments
      const response = await llm.chat(channelId, userMessage, username, botMentioned, isReplyToBot, client, attachments);
      
      // Send response (split if too long)
      await this.sendResponse(message, response.content);
      
    } catch (error) {
      logger.error('Error processing message', {
        error: error.message,
        channelId,
        userId,
      });
      
      await message.reply('Sorry, I encountered an error processing your message.');
    } finally {
      this.processing.delete(channelId);
    }
  }

  /**
   * Send response, splitting if needed for Discord's 2000 char limit
   */
  async sendResponse(message, content) {
    const maxLength = 1900; // Leave room for formatting
    
    if (content.length <= maxLength) {
      await message.reply(content);
      return;
    }
    
    // Split content into chunks
    const chunks = this.splitIntoChunks(content, maxLength);
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const prefix = chunks.length > 1 ? `(${i + 1}/${chunks.length}) ` : '';
      
      if (i === 0) {
        await message.reply(prefix + chunk);
      } else {
        await message.channel.send(prefix + chunk);
      }
    }
  }

  /**
   * Split text into chunks while preserving word boundaries
   */
  splitIntoChunks(text, maxLength) {
    const chunks = [];
    const words = text.split(' ');
    let currentChunk = '';
    
    for (const word of words) {
      if ((currentChunk + ' ' + word).length <= maxLength) {
        currentChunk += (currentChunk ? ' ' : '') + word;
      } else {
        if (currentChunk) chunks.push(currentChunk);
        currentChunk = word;
      }
    }
    
    if (currentChunk) chunks.push(currentChunk);
    return chunks;
  }

  /**
   * Handle clear memory command
   */
  async handleClearCommand(message) {
    const channelId = message.channel.id;
    memory.clearChannel(channelId);
    
    await message.reply('Conversation history cleared in this channel!');
    logger.info('Memory cleared', { channelId, userId: message.author.id });
  }

  /**
   * Handle stats command
   */
  async handleStatsCommand(message) {
    const memoryStats = memory.getStats();
    const usageStats = rateLimiter.getDailyUsage();
    
    const embed = new EmbedBuilder()
      .setTitle('📊 Bot Statistics')
      .setColor(0x5865F2)
      .addFields(
        {
          name: '💬 Conversation Memory',
          value: `Channels: ${memoryStats.totalChannels}\nTotal Messages: ${memoryStats.totalMessages}`,
          inline: true,
        },
        {
          name: '📈 Daily Usage',
          value: `Tokens Used: ${usageStats.used.toLocaleString()}\nTokens Remaining: ${usageStats.remaining.toLocaleString()}`,
          inline: true,
        },
        {
          name: '⏱️ Latency',
          value: `${this.client.ws.ping}ms`,
          inline: true,
        }
      )
      .setTimestamp();
    
    await message.reply({ embeds: [embed] });
  }

  /**
   * Check if a message is a reply to the bot
   */
  async isReplyToBot(message) {
    try {
      // Fetch the referenced message
      const referencedMessage = await message.channel.messages.fetch(message.reference.messageId);
      
      // Check if the referenced message was sent by the bot
      return referencedMessage.author.id === this.client.user.id;
    } catch (error) {
      logger.debug('Failed to fetch referenced message', { error: error.message });
      return false;
    }
  }

  /**
   * Handle slash command interactions
   */
  async handleSlashCommand(message) {
    const interaction = message.interaction;
    
    if (!interaction) return;
    
    const commandName = interaction.commandName;
    
    if (commandName === 'chat') {
      const userMessage = interaction.options.getString('message');
      await this.handleChat(message, userMessage);
    } else if (commandName === 'clear') {
      await this.handleClearCommand(message);
    } else if (commandName === 'stats') {
      await this.handleStatsCommand(message);
    } else if (commandName === 'ping') {
      await message.reply(`Pong! Latency: ${this.client.ws.ping}ms`);
    }
  }

  /**
   * Start the bot
   */
  async start() {
    try {
      // Validate configuration
      config.validate();
      
      // Login to Discord
      await this.client.login(config.discord.token);
      
      logger.info('Bot started successfully');
    } catch (error) {
      logger.error("Failed to start bot", {
        message: error?.message,
        stack: error?.stack
      });
      console.error(error);
      process.exit(1);
    }
  }
}

// Create and start the bot
const bot = new Bot();
bot.start();

// Handle graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down...');
  await bot.client.destroy();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Shutting down...');
  await bot.client.destroy();
  process.exit(0);
});

// Handle restart on exit code 42
process.on('exit', (code) => {
  if (code === 42) {
    logger.info('Restarting bot...');
    // Restart the process
    const { spawn } = require('child_process');
    spawn(process.argv[0], process.argv.slice(1), {
      cwd: process.cwd(),
      stdio: 'inherit'
    });
  }
});
