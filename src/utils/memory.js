const config = require('../config');
const logger = require('./logger');

/**
 * Conversation Memory
 * Stores conversation history per channel for contextual responses
 */
class ConversationMemory {
  constructor() {
    // Map of channelId -> array of messages
    this.conversations = new Map();
    
    // Track when each conversation was last updated
    this.lastActivity = new Map();
    
    // Start cleanup interval
    this.startCleanupInterval();
    
    logger.info('Conversation memory initialized', {
      maxHistory: config.memory.maxHistory,
      cleanupIntervalHours: config.memory.cleanupIntervalHours,
    });
  }

  /**
   * Add a message to the conversation history
   * @param {string} channelId - Discord channel ID
   * @param {object} message - Message object { role, content }
   */
  addMessage(channelId, message) {
    if (!this.conversations.has(channelId)) {
      this.conversations.set(channelId, []);
    }
    
    const messages = this.conversations.get(channelId);
    
    // Add the new message
    messages.push({
      role: message.role,
      content: message.content,
      timestamp: Date.now(),
    });
    
    // Trim to max history size
    while (messages.length > config.memory.maxHistory) {
      messages.shift();
    }
    
    // Update last activity
    this.lastActivity.set(channelId, Date.now());
    
    logger.debug('Added message to conversation', {
      channelId,
      messageCount: messages.length,
    });
  }

  /**
   * Get conversation history for a channel
   * @param {string} channelId - Discord channel ID
   * @returns {array} - Array of messages in OpenAI format
   */
  getHistory(channelId) {
    const messages = this.conversations.get(channelId) || [];
    
    // Return messages in OpenAI format (without timestamp)
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));
  }

  /**
   * Clear conversation history for a channel
   * @param {string} channelId - Discord channel ID
   */
  clearChannel(channelId) {
    this.conversations.delete(channelId);
    this.lastActivity.delete(channelId);
    
    logger.info('Cleared conversation history', { channelId });
  }

  /**
   * Clear all conversations
   */
  clearAll() {
    this.conversations.clear();
    this.lastActivity.clear();
    
    logger.info('Cleared all conversation histories');
  }

  /**
   * Get memory statistics
   * @returns {object}
   */
  getStats() {
    let totalMessages = 0;
    const channelCounts = {};
    
    for (const [channelId, messages] of this.conversations.entries()) {
      channelCounts[channelId] = messages.length;
      totalMessages += messages.length;
    }
    
    return {
      totalChannels: this.conversations.size,
      totalMessages,
      channelCounts,
    };
  }

  /**
   * Start automatic cleanup of old conversations
   */
  startCleanupInterval() {
    const intervalMs = config.memory.cleanupIntervalHours * 60 * 60 * 1000;
    
    setInterval(() => {
      this.cleanup();
    }, intervalMs);
    
    logger.info('Started conversation cleanup interval', {
      intervalHours: config.memory.cleanupIntervalHours,
    });
  }

  /**
   * Clean up old conversations (based on last activity)
   */
  cleanup() {
    const now = Date.now();
    const maxAge = config.memory.cleanupIntervalHours * 60 * 60 * 1000;
    let cleaned = 0;
    
    for (const [channelId, lastTime] of this.lastActivity.entries()) {
      if (now - lastTime > maxAge) {
        this.conversations.delete(channelId);
        this.lastActivity.delete(channelId);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      logger.info('Cleaned up old conversations', {
        channelsRemoved: cleaned,
      });
    }
  }
}

module.exports = new ConversationMemory();
