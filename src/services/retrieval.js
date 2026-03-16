const logger = require('../utils/logger');

/**
 * Retrieval Service
 * Handles fetching and searching for FFXIV-related context before LLM calls
 */
class RetrievalService {
  constructor() {
    // FFXIV knowledge base - lightweight approach without vector database
    this.knowledgeBase = this.initializeKnowledgeBase();
    logger.info('Retrieval Service initialized with FFXIV knowledge base');
  }

  /**
   * Initialize the knowledge base with FFXIV information
   */
  initializeKnowledgeBase() {
    return [
      // Expansions and major content
      {
        id: 'expansions',
        category: 'expansion',
        title: 'Final Fantasy XIV Expansions',
        content: 'Final Fantasy XIV has had several major expansions: A Realm Reborn (ARR), Heavensward (HW), Stormblood (SB), Shadowbringers (SHB), Endwalker (EW), and Dawntrail (DT). Each expansion adds new story content, areas to explore, jobs, and endgame content including raids and trials.'
      },
      {
        id: 'duties',
        category: 'duty',
        title: 'Duties Overview',
        content: 'Duties in FFXIV include FATEs (Full Active Time Events), dungeons, trials, and raids. Dungeons are instanced content for parties of 4 players, trials are boss fights typically for 8 players, and raids are high-end content for 8 or 24 players. Each duty has specific mechanics and strategies.'
      },
      {
        id: 'ultimates',
        category: 'ultimate',
        title: 'Ultimate Raids',
        content: 'Ultimate raids are the most challenging content in FFXIV, requiring excellent coordination and knowledge of mechanics. Examples include The Minstrel\'s Ballad: Thordan\'s Reign (T1), The Minstrel\'s Ballad: Hraesvelgr\'s Reign (T2), and The Epic of Alexander (TEA). These raids have strict requirements and offer the best gear in the game.'
      },
      {
        id: 'jobs',
        category: 'job',
        title: 'Job System',
        content: 'FFXIV features a flexible job system where you can play any job with a single character. Jobs are divided into tanks, healers, and damage dealers (DPS). Each job has unique abilities and mechanics. You can switch jobs by equipping different weapons and using the appropriate class/job action.'
      },
      {
        id: 'gear',
        category: 'item',
        title: 'Gear and Equipment',
        content: 'Gear in FFXIV is categorized by item level (ilvl) and quality. Higher ilvl gear provides better stats. Gear can be obtained through dungeons, trials, raids, crafting, and various other activities. Relics are special weapon collections that require extensive grinding across multiple content types.'
      },
      {
        id: 'fates',
        category: 'fate',
        title: 'FATEs (Full Active Time Events)',
        content: 'FATEs are dynamic events that occur in open world areas. Players can participate in these events to earn experience, gil, and various rewards. FATEs range from simple trash mob clearances to challenging boss encounters. They are a great way to earn rewards while exploring the world.'
      },
      {
        id: 'raids',
        category: 'raid',
        title: 'Raid Content',
        content: 'Raids in FFXIV include both alliance raids (24 players) and normal raids (8 players). Alliance raids are typically story-driven and less mechanically demanding, while normal raids focus on challenging mechanics. Examples include The Binding Coil of Bahamut and The Unending Coil of Bahamut.'
      },
      {
        id: 'mechanics',
        category: 'mechanic',
        title: 'Game Mechanics',
        content: 'FFXIV features various mechanics including positional attacks (flank/rear), combo chains, resource management, and status effects. Understanding these mechanics is crucial for effective gameplay. Each job has specific mechanics that define its playstyle and rotation.'
      },
      {
        id: 'patching',
        category: 'patch',
        title: 'Patching and Updates',
        content: 'FFXIV receives regular patches that include bug fixes, balance changes, and new content. Major patches often coincide with new story content, while minor patches focus on quality of life improvements and balance adjustments. Patch notes are released before each update goes live.'
      },
      {
        id: 'endgame',
        category: 'endgame',
        title: 'Endgame Content',
        content: 'Endgame content in FFXIV includes Savage raids, Ultimate raids, high-level dungeons, and various challenging activities. This content is designed for players who have completed the main story and are looking for more challenging encounters and better gear.'
      }
    ];
  }

  /**
   * Detect if a question is asking for factual FFXIV information
   */
  isFactualQuestion(question) {
    const questionLower = question.toLowerCase();
    
    // Keywords that indicate factual FFXIV questions
    const factualKeywords = [
      // General FFXIV terms
      'ffxiv', 'final fantasy xiv', 'xiv', 'final fantasy 14',
      
      // Content types
      'duty', 'duties', 'raid', 'raids', 'trial', 'trials', 'fate', 'fates',
      'ultimate', 'savage', 'normal', 'alliance',
      
      // Game elements
      'expansion', 'expansions', 'job', 'jobs', 'class', 'classes', 'gear', 'equipment',
      'item', 'items', 'weapon', 'weapons', 'armor', 'armor pieces',
      
      // Specific content
      'thordan', 'hraesvelgr', 'alexander', 'bahamut', 'shinryu', 'zodiark', 'hydaelyn',
      'uldah', 'gridania', 'lalafell', 'midgardsormr', 'zenos', 'louisoix',
      
      // Mechanics and systems
      'rotation', 'rotations', 'mechanic', 'mechanics', 'combo', 'combos', 'ability', 'abilities',
      'skill', 'skills', 'spell', 'spells', 'status', 'statuses',
      
      // Questions that typically need factual answers
      'how do i', 'what is', 'when was', 'where is', 'who is', 'can you tell me about',
      'explain', 'describe', 'list', 'what are', 'what does'
    ];

    // Check if question contains factual keywords
    const hasFactualKeywords = factualKeywords.some(keyword => questionLower.includes(keyword));
    
    // Check for question patterns that typically seek factual information
    const questionPatterns = [
      /^what is/i,
      /^how do/i,
      /^when was/i,
      /^where is/i,
      /^who is/i,
      /^can you tell me about/i,
      /^explain/i,
      /^describe/i,
      /^list/i,
      /^what are/i,
      /^what does/i
    ];

    const matchesQuestionPattern = questionPatterns.some(pattern => pattern.test(question));
    
    // Additional check for specific FFXIV content references
    const ffxivSpecificTerms = [
      'e6s', 'e7s', 'e8s', 'e9s', 'e10s', 'e11s', 'e12s', // Ultimates
      's3s', 's4s', 's5s', 's6s', 's7s', 's8s', 's9s', 's10s', 's11s', 's12s', // Savages
      't1', 't2', 't3', 't4', 't5', 't6', 't7', 't8', 't9', 't10', 't11', 't12', // Trials
      'r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8', 'r9', 'r10', 'r11', 'r12', // Raids
      'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9', 'd10', 'd11', 'd12', // Dungeons
      'arr', 'hw', 'sb', 'shb', 'ew', 'dt', // Expansions
      'ilvl', 'item level', 'gear score', 'gearing', 'gearscore'
    ];

    const hasFFXIVSpecificTerms = ffxivSpecificTerms.some(term => questionLower.includes(term));
    
    return hasFactualKeywords || matchesQuestionPattern || hasFFXIVSpecificTerms;
  }

  /**
   * Search for relevant context in the knowledge base
   */
  searchContext(question, maxResults = 3) {
    const questionLower = question.toLowerCase();
    const results = [];
    
    // Simple keyword matching for now (can be enhanced later with more sophisticated search)
    for (const entry of this.knowledgeBase) {
      const score = this.calculateRelevanceScore(questionLower, entry);
      if (score > 0) {
        results.push({
          ...entry,
          score: score
        });
      }
    }
    
    // Sort by relevance score and return top results
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, maxResults);
  }

  /**
   * Calculate relevance score for a knowledge base entry
   */
  calculateRelevanceScore(question, entry) {
    let score = 0;
    const questionWords = question.split(/\s+/);
    
    // Check title relevance
    const titleLower = entry.title.toLowerCase();
    if (titleLower.includes(question)) {
      score += 10;
    } else {
      for (const word of questionWords) {
        if (titleLower.includes(word) && word.length > 3) {
          score += 3;
        }
      }
    }
    
    // Check content relevance
    const contentLower = entry.content.toLowerCase();
    if (contentLower.includes(question)) {
      score += 5;
    } else {
      for (const word of questionWords) {
        if (contentLower.includes(word) && word.length > 3) {
          score += 1;
        }
      }
    }
    
    // Check category relevance
    const categoryKeywords = this.getCategoryKeywords(entry.category);
    for (const keyword of categoryKeywords) {
      if (question.includes(keyword)) {
        score += 2;
      }
    }
    
    return score;
  }

  /**
   * Get keywords associated with a category
   */
  getCategoryKeywords(category) {
    const categoryMap = {
      'expansion': ['expansion', 'expansions', 'arr', 'hw', 'sb', 'shb', 'ew', 'dt', 'realm reborn', 'heavensward', 'stormblood', 'shadowbringers', 'endwalker', 'dawntrail'],
      'duty': ['duty', 'duties', 'fate', 'fates', 'trial', 'trials', 'raid', 'raids', 'content', 'instance'],
      'ultimate': ['ultimate', 'ultimates', 'e6s', 'e7s', 'e8s', 'e9s', 'e10s', 'e11s', 'e12s', 't1', 't2', 't3', 't4', 't5', 't6', 't7', 't8', 't9', 't10', 't11', 't12'],
      'job': ['job', 'jobs', 'class', 'classes', 'tank', 'healer', 'healing', 'dps', 'damage', 'melee', 'ranged', 'caster', 'role'],
      'item': ['item', 'items', 'gear', 'equipment', 'weapon', 'weapons', 'armor', 'ilvl', 'item level', 'relic', 'relics'],
      'fate': ['fate', 'fates', 'full active time event', 'full active time events', 'open world', 'world event'],
      'raid': ['raid', 'raids', 'alliance', 'normal', 'savage', 's3s', 's4s', 's5s', 's6s', 's7s', 's8s', 's9s', 's10s', 's11s', 's12s', 'r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8', 'r9', 'r10', 'r11', 'r12'],
      'mechanic': ['mechanic', 'mechanics', 'rotation', 'rotations', 'combo', 'combos', 'ability', 'abilities', 'skill', 'skills', 'spell', 'spells', 'status', 'statuses', 'flank', 'rear', 'positional'],
      'patch': ['patch', 'patches', 'update', 'updates', 'hotfix', 'hotfixes', 'balance', 'bug fix', 'bug fixes'],
      'endgame': ['endgame', 'end game', 'high level', 'high-level', 'challenging', 'difficult', 'hard mode']
    };
    
    return categoryMap[category] || [];
  }

  /**
   * Format retrieved context for LLM prompt
   */
  formatContextForPrompt(contextResults) {
    if (!contextResults || contextResults.length === 0) {
      return '';
    }
    
    let contextText = '\n\n--- FFXIV CONTEXT ---\n';
    contextText += 'Use this information to answer the user\'s question accurately:\n\n';
    
    contextResults.forEach((result, index) => {
      contextText += `${index + 1}. ${result.title} (${result.category}):\n`;
      contextText += `${result.content}\n\n`;
    });
    
    contextText += '--- END CONTEXT ---\n';
    return contextText;
  }

  /**
   * Main retrieval function - detects factual questions and fetches context
   */
  async retrieveContext(userMessage) {
    try {
      // Check if this is a factual FFXIV question
      if (!this.isFactualQuestion(userMessage)) {
        logger.debug('Question not identified as factual FFXIV question', { message: userMessage });
        return null;
      }
      
      logger.info('Detected factual FFXIV question, retrieving context', { message: userMessage });
      
      // Search for relevant context
      const contextResults = this.searchContext(userMessage);
      
      if (contextResults.length === 0) {
        logger.debug('No relevant context found for factual question', { message: userMessage });
        return null;
      }
      
      // Format context for LLM prompt
      const contextText = this.formatContextForPrompt(contextResults);
      
      logger.info('Context retrieved successfully', {
        message: userMessage,
        resultsCount: contextResults.length,
        contextLength: contextText.length
      });
      
      return contextText;
    } catch (error) {
      logger.error('Error during context retrieval', {
        error: error.message,
        message: userMessage
      });
      return null;
    }
  }
}

module.exports = new RetrievalService();