const { RateLimiterMemory } = require('rate-limiter-flexible');
const config = require('../config');
const logger = require('./logger');

/**
 * Rate Limiter
 * Prevents spam and runaway API costs by limiting user requests
 */
class RateLimiter {
  constructor() {
    // Per-user rate limiter
    this.userLimiter = new RateLimiterMemory({
      points: config.rateLimit.maxMessagesPerMinute,
      duration: 60, // 1 minute
      blockDuration: 60, // Block for 1 minute if exceeded
    });

    // Global daily token usage tracker
    this.dailyTokens = {
      used: 0,
      resetDate: new Date().toDateString(),
    };

    // Per-user message tracking for this minute
    this.userMessageCounts = new Map();

    logger.info('Rate limiter initialized', { 
      maxPerMinute: config.rateLimit.maxMessagesPerMinute,
      maxTokensPerDay: config.rateLimit.maxTokensPerDay 
    });
  }

  /**
   * Check if a user is rate limited
   * @param {string} userId - Discord user ID
   * @returns {object} - { allowed: boolean, remaining: number, retryAfter: number }
   */
  async checkUserRateLimit(userId) {
    try {
      const result = await this.userLimiter.consume(userId);
      
      // Reset daily tokens if it's a new day
      this.checkDailyReset();
      
      return {
        allowed: true,
        remaining: result.remainingPoints,
        retryAfter: 0,
      };
    } catch (rejection) {
      logger.warn('User rate limited', { 
        userId, 
        retryAfter: rejection.msBeforeNext 
      });
      
      return {
        allowed: false,
        remaining: 0,
        retryAfter: Math.ceil(rejection.msBeforeNext / 1000),
      };
    }
  }

  /**
   * Check and consume daily token budget
   * @param {number} tokens - Number of tokens to consume
   * @returns {boolean} - Whether tokens are available
   */
  checkDailyTokens(tokens) {
    this.checkDailyReset();
    
    const remaining = config.rateLimit.maxTokensPerDay - this.dailyTokens.used;
    
    if (tokens > remaining) {
      logger.warn('Daily token budget exceeded', {
        requested: tokens,
        remaining,
        used: this.dailyTokens.used,
      });
      return false;
    }
    
    this.dailyTokens.used += tokens;
    return true;
  }

  /**
   * Get current daily token usage
   * @returns {object}
   */
  getDailyUsage() {
    this.checkDailyReset();
    return {
      used: this.dailyTokens.used,
      remaining: config.rateLimit.maxTokensPerDay - this.dailyTokens.used,
      limit: config.rateLimit.maxTokensPerDay,
    };
  }

  /**
   * Check if we need to reset daily counters
   */
  checkDailyReset() {
    const today = new Date().toDateString();
    if (this.dailyTokens.resetDate !== today) {
      logger.info('Resetting daily token counter', {
        previousDate: this.dailyTokens.resetDate,
        newDate: today,
        previousUsage: this.dailyTokens.used,
      });
      
      this.dailyTokens = {
        used: 0,
        resetDate: today,
      };
    }
  }

  /**
   * Get rate limit status for a user (without consuming)
   * @param {string} userId - Discord user ID
   * @returns {object}
   */
  async getUserStatus(userId) {
    try {
      const result = await this.userLimiter.get(userId);
      
      if (!result) {
        return {
          allowed: true,
          remaining: config.rateLimit.maxMessagesPerMinute,
          retryAfter: 0,
        };
      }
      
      return {
        allowed: result.remainingPoints > 0,
        remaining: result.remainingPoints,
        retryAfter: Math.ceil(result.msBeforeNext / 1000),
      };
    } catch {
      return {
        allowed: true,
        remaining: config.rateLimit.maxMessagesPerMinute,
        retryAfter: 0,
      };
    }
  }
}

module.exports = new RateLimiter();
