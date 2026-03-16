const logger = require('../utils/logger');

/**
 * FFXIV Search Service
 * Searches external FFXIV sources and returns relevant snippets
 */
class FFXIVSearchService {
  constructor() {
    // FFXIV API endpoints and sources
    this.sources = {
      garlandTools: 'https://garlandtools.org/api/',
      ffxivCollect: 'https://api.ffxivcollect.com/api/v3/',
      ffxivApi: 'https://xivapi.com/',
      ffxivWiki: 'https://ffxiv.gamerescape.com/w/api.php',
      fflogs: 'https://www.fflogs.com/api/v2/client'
    };
    
    logger.info('FFXIV Search Service initialized');
  }

  /**
   * Main search function that searches multiple FFXIV sources
   * @param {string} query - The search query
   * @returns {string} - Formatted context with relevant snippets
   */
  async searchFFXIV(query) {
    try {
      logger.info('Searching FFXIV sources', { query });
      
      // Extract search terms from query
      const searchTerms = this.extractSearchTerms(query);
      const results = [];
      
      // Try external sources first, then fall back to internal knowledge base
      const searchPromises = [
        this.searchGarlandTools(searchTerms),
        this.searchFFXIVCollect(searchTerms),
        this.searchXIVAPI(searchTerms),
        this.searchWiki(searchTerms)
      ];
      
      const searchResults = await Promise.allSettled(searchPromises);
      
      // Collect successful results
      searchResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          results.push(...result.value);
        }
      });
      
      // If no external results, use internal knowledge base as fallback
      if (results.length === 0) {
        logger.info('No external results found, using internal knowledge base fallback');
        const internalResults = this.searchInternalKnowledgeBase(query);
        results.push(...internalResults);
      }
      
      // Format results into context
      const context = this.formatContext(results, query);
      
      logger.info('FFXIV search completed', {
        query,
        resultCount: results.length,
        contextLength: context.length
      });
      
      return context;
    } catch (error) {
      logger.error('FFXIV search failed', {
        error: error.message,
        query
      });
      return '';
    }
  }

  /**
   * Search internal knowledge base as fallback when external APIs fail
   */
  searchInternalKnowledgeBase(query) {
    const knowledgeBase = [
      {
        source: 'Internal FFXIV Knowledge',
        type: 'expansion',
        title: 'Final Fantasy XIV Expansions',
        content: 'Final Fantasy XIV has had several major expansions: A Realm Reborn (ARR), Heavensward (HW), Stormblood (SB), Shadowbringers (SHB), Endwalker (EW), and Dawntrail (DT). Each expansion adds new story content, areas to explore, jobs, and endgame content including raids and trials.'
      },
      {
        source: 'Internal FFXIV Knowledge',
        type: 'ultimate',
        title: 'Ultimate Raids',
        content: 'The ultimate fights currently released in Final Fantasy XIV are: The Unending Coil of Bahamut, The Weapon\'s Refrain, The Epic of Alexander, Dragonsong\'s Reprise, The Omega Protocol, and Futures Rewritten. These are the most challenging content in the game, requiring excellent coordination and knowledge of mechanics.'
      },
      {
        source: 'Internal FFXIV Knowledge',
        type: 'job',
        title: 'Job System',
        content: 'FFXIV features a flexible job system where you can play any job with a single character. Jobs are divided into tanks, healers, and damage dealers (DPS). Each job has unique abilities and mechanics. You can switch jobs by equipping different weapons and using the appropriate class/job action.'
      },
      {
        source: 'Internal FFXIV Knowledge',
        type: 'item',
        title: 'Gear and Equipment',
        content: 'Gear in FFXIV is categorized by item level (ilvl) and quality. Higher ilvl gear provides better stats. Gear can be obtained through dungeons, trials, raids, crafting, and various other activities. Relics are special weapon collections that require extensive grinding across multiple content types.'
      },
      {
        source: 'Internal FFXIV Knowledge',
        type: 'duty',
        title: 'Duties Overview',
        content: 'Duties in FFXIV include FATEs (Full Active Time Events), dungeons, trials, and raids. Dungeons are instanced content for parties of 4 players, trials are boss fights typically for 8 players, and raids are high-end content for 8 or 24 players. Each duty has specific mechanics and strategies.'
      }
    ];

    // Simple keyword matching for internal knowledge base
    const queryLower = query.toLowerCase();
    const matchedResults = [];
    
    for (const entry of knowledgeBase) {
      const score = this.calculateRelevanceScore(queryLower, entry);
      if (score > 0) {
        matchedResults.push({
          source: entry.source,
          type: entry.type,
          title: entry.title,
          content: entry.content
        });
      }
    }
    
    // Sort by relevance and return top results
    matchedResults.sort((a, b) => b.title.length - a.title.length);
    return matchedResults.slice(0, 3);
  }

  /**
   * Calculate relevance score for internal knowledge base entry
   */
  calculateRelevanceScore(query, entry) {
    let score = 0;
    const queryWords = query.split(/\s+/);
    
    // Check title relevance
    const titleLower = entry.title.toLowerCase();
    if (titleLower.includes(query)) {
      score += 10;
    } else {
      for (const word of queryWords) {
        if (titleLower.includes(word) && word.length > 3) {
          score += 3;
        }
      }
    }
    
    // Check content relevance
    const contentLower = entry.content.toLowerCase();
    if (contentLower.includes(query)) {
      score += 5;
    } else {
      for (const word of queryWords) {
        if (contentLower.includes(word) && word.length > 3) {
          score += 1;
        }
      }
    }
    
    return score;
  }

  /**
   * Extract relevant search terms from user query
   */
  extractSearchTerms(query) {
    const queryLower = query.toLowerCase();
    const terms = [];
    
    // Extract specific content types
    const contentPatterns = {
      ultimates: /ultimate|e6s|e7s|e8s|e9s|e10s|e11s|e12s|t1|t2|t3|t4|t5|t6|t7|t8|t9|t10|t11|t12/i,
      trials: /trial|t\d+/i,
      raids: /raid|r\d+/i,
      dungeons: /dungeon|d\d+/i,
      expansions: /expansion|arr|hw|sb|shb|ew|dt|realm reborn|heavensward|stormblood|shadowbringers|endwalker|dawntrail/i,
      jobs: /job|tank|healer|dps|melee|ranged|caster|warrior|paladin|dark knight|gunbreaker|whitemage|scholar|astrologian|sage|monk|dragoon|ninja|samurai|reaper|machinist|bard|dancer|blackmage|summoner|redmage|blu/i,
      items: /item|gear|weapon|armor|ilvl|item level/i,
      mechanics: /mechanic|rotation|combo|ability|skill|spell|status|flank|rear|positional/i
    };
    
    Object.entries(contentPatterns).forEach(([type, pattern]) => {
      if (pattern.test(queryLower)) {
        terms.push(type);
      }
    });
    
    // Extract specific names
    const namePatterns = [
      /thordan|hraesvelgr|alexander|bahamut|shinryu|zodiark|hydaelyn/i,
      /ul'dah|gridania|lalafell|midgardsormr|zenos|louisoix/i
    ];
    
    namePatterns.forEach(pattern => {
      const matches = queryLower.match(pattern);
      if (matches) {
        terms.push(...matches);
      }
    });
    
    // Add general terms if no specific ones found
    if (terms.length === 0) {
      const words = queryLower.split(/\s+/).filter(word => word.length > 3);
      terms.push(...words.slice(0, 3));
    }
    
    return [...new Set(terms)]; // Remove duplicates
  }

  /**
   * Search Garland Tools API
   */
  async searchGarlandTools(terms) {
    try {
      const results = [];
      
      for (const term of terms) {
        // Search for items, quests, etc.
        const itemResponse = await fetch(`${this.sources.garlandTools}item?text=${encodeURIComponent(term)}&lang=en`);
        if (itemResponse.ok) {
          const itemData = await itemResponse.json();
          if (itemData && itemData.items) {
            itemData.items.slice(0, 3).forEach(item => {
              results.push({
                source: 'Garland Tools',
                type: 'item',
                title: item.name_en || item.name,
                content: `Item: ${item.name_en || item.name} (Level ${item.level_item || 'Unknown'}) - ${item.description || 'No description available'}`
              });
            });
          }
        }
      }
      
      return results;
    } catch (error) {
      logger.warn('Garland Tools search failed', { error: error.message });
      return [];
    }
  }

  /**
   * Search FFXIV Collect API
   */
  async searchFFXIVCollect(terms) {
    try {
      const results = [];
      
      for (const term of terms) {
        // Search for collectables, minions, mounts, etc.
        const response = await fetch(`${this.sources.ffxivCollect}collectables?search=${encodeURIComponent(term)}&limit=5`);
        if (response.ok) {
          const data = await response.json();
          if (data && data.results) {
            data.results.forEach(item => {
              results.push({
                source: 'FFXIV Collect',
                type: item.type || 'collectable',
                title: item.name || item.id,
                content: `${item.type || 'Collectable'}: ${item.name || item.id} - ${item.description || 'No description available'}`
              });
            });
          }
        }
      }
      
      return results;
    } catch (error) {
      logger.warn('FFXIV Collect search failed', { error: error.message });
      return [];
    }
  }

  /**
   * Search XIVAPI
   */
  async searchXIVAPI(terms) {
    try {
      const results = [];
      
      for (const term of terms) {
        // Search for quests, items, etc.
        const response = await fetch(`${this.sources.ffxivApi}search?string=${encodeURIComponent(term)}&columns=Name,Description,LevelItem`);
        if (response.ok) {
          const data = await response.json();
          if (data && data.Results) {
            data.Results.slice(0, 3).forEach(item => {
              results.push({
                source: 'XIVAPI',
                type: item.ContentType || 'item',
                title: item.Name || item.ID,
                content: `${item.ContentType || 'Item'}: ${item.Name || item.ID} - ${item.Description || 'No description available'} (Level: ${item.LevelItem || 'Unknown'})`
              });
            });
          }
        }
      }
      
      return results;
    } catch (error) {
      logger.warn('XIVAPI search failed', { error: error.message });
      return [];
    }
  }

  /**
   * Search FFXIV Wiki
   */
  async searchWiki(terms) {
    try {
      const results = [];
      
      for (const term of terms) {
        const response = await fetch(`${this.sources.ffxivWiki}?action=query&list=search&srsearch=${encodeURIComponent(term)}&format=json&utf8=&srlimit=3`);
        if (response.ok) {
          const data = await response.json();
          if (data && data.query && data.query.search) {
            data.query.search.forEach(item => {
              results.push({
                source: 'FFXIV Wiki',
                type: 'wiki',
                title: item.title,
                content: `Wiki: ${item.title} - ${item.snippet || 'No snippet available'}`.replace(/<[^>]*>/g, '')
              });
            });
          }
        }
      }
      
      return results;
    } catch (error) {
      logger.warn('FFXIV Wiki search failed', { error: error.message });
      return [];
    }
  }

  /**
   * Format search results into context for LLM
   */
  formatContext(results, originalQuery) {
    if (!results || results.length === 0) {
      return '';
    }
    
    let context = '\n\nContext:\n';
    context += 'Relevant information from trusted FFXIV sources:\n\n';
    
    // Group results by source
    const groupedResults = this.groupBySource(results);
    
    Object.entries(groupedResults).forEach(([source, items]) => {
      context += `**${source}**:\n`;
      items.forEach((item, index) => {
        context += `${index + 1}. ${item.title}\n`;
        context += `   ${item.content}\n\n`;
      });
    });
    
    context += `\nUser question:\n${originalQuery}\n\n`;
    context += 'Instructions:\nAnswer using the context above. If the context does not contain the answer, say you cannot verify it.\n';
    return context;
  }

  /**
   * Group results by source
   */
  groupBySource(results) {
    return results.reduce((groups, item) => {
      const source = item.source || 'Unknown';
      if (!groups[source]) {
        groups[source] = [];
      }
      groups[source].push(item);
      return groups;
    }, {});
  }
}

module.exports = new FFXIVSearchService();