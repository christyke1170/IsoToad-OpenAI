const config = require('../config');
const logger = require('../utils/logger');

/**
 * FFLogs V1 Service
 * Lightweight public lookup integration for character parses/rankings.
 */
class FFLogsService {
  constructor() {
    this.apiKey = config.fflogs.apiKey;
    this.baseUrl = 'https://www.fflogs.com/v1';

    // Common shorthand mapping for encounter lookups
    this.encounterShorthandMap = {
      m12sp1: {
        label: 'Lindwurm I',
        aliases: ['m12sp1', 'm12s phase 1', 'lindwurm i', 'lindwurm 1'],
        encounterIds: [104],
        category: 'savage',
      },
      m12sp2: {
        label: 'Lindwurm II',
        aliases: ['m12sp2', 'm12s phase 2', 'lindwurm ii', 'lindwurm 2'],
        encounterIds: [105],
        category: 'savage',
      },
      m12s: {
        label: 'M12S',
        aliases: ['m12s', 'm12'],
        encounterIds: [104, 105],
        category: 'savage',
      },
      tea: {
        label: 'The Epic of Alexander',
        aliases: ['tea', 'the epic of alexander', 'epic of alexander'],
        category: 'ultimate',
      },
      dsr: {
        label: "Dragonsong's Reprise",
        aliases: ['dsr', "dragonsong's reprise", 'dragonsong reprise'],
        category: 'ultimate',
      },
      top: {
        label: 'The Omega Protocol',
        aliases: ['top', 'the omega protocol', 'omega protocol'],
        category: 'ultimate',
      },
      ucob: {
        label: 'The Unending Coil of Bahamut',
        aliases: ['ucob', 'the unending coil of bahamut', 'unending coil of bahamut'],
        category: 'ultimate',
      },
      uwu: {
        label: "The Weapon's Refrain (Ultimate)",
        aliases: ['uwu', "the weapon's refrain", 'weapons refrain'],
        category: 'ultimate',
      },
      fru: {
        label: "Futures Rewritten (Ultimate)",
        aliases: ['fru', 'futures rewritten', 'futures'],
        encounterIds: [101, 102, 103],
        category: 'ultimate',
      },
    };

    // Canonical encounter alias map for strict encounter resolution
    // NOTE: Keep this lightweight and maintainable; dynamic parse-name matching is still primary.
    this.encounterAliasDefinitions = [
      {
        canonical: 'lindwurm',
        aliases: ['lindwurm', 'm12', 'm12s', 'm12n'],
      },
      {
        canonical: 'lindwurm i',
        aliases: ['m12sp1', 'm12s phase 1', 'lindwurm i', 'lindwurm 1'],
      },
      {
        canonical: 'lindwurm ii',
        aliases: ['m12sp2', 'm12s phase 2', 'lindwurm ii', 'lindwurm 2'],
      },
      {
        canonical: 'red hot and deep blue',
        aliases: ['red hot and deep blue', 'red hot deep blue'],
      },
      {
        canonical: 'the epic of alexander',
        aliases: ['tea', 'the epic of alexander', 'epic of alexander'],
        defaultDifficulty: 'ultimate',
      },
      {
        canonical: "dragonsong's reprise",
        aliases: ['dsr', "dragonsong's reprise", 'dragonsong reprise'],
        defaultDifficulty: 'ultimate',
      },
      {
        canonical: 'the omega protocol',
        aliases: ['top', 'the omega protocol', 'omega protocol'],
        defaultDifficulty: 'ultimate',
      },
      {
        canonical: 'the unending coil of bahamut',
        aliases: ['ucob', 'the unending coil of bahamut', 'unending coil of bahamut'],
        defaultDifficulty: 'ultimate',
      },
      {
        canonical: "the weapon's refrain",
        aliases: ['uwu', "the weapon's refrain", 'weapons refrain'],
        defaultDifficulty: 'ultimate',
      },
    ];

    this.aliasToCanonicalMap = this.createAliasToCanonicalMap();
    this.encounterIdDifficultyMap = this.createEncounterIdDifficultyMap();

    this.worldRegionMap = this.createWorldRegionMap();

    if (!this.apiKey) {
      logger.warn('FFLogs API key missing - FFLogs lookups will return configuration message');
    } else {
      logger.info('FFLogs Service initialized for V1 API');
    }
  }

  createAliasToCanonicalMap() {
    const map = new Map();

    for (const def of this.encounterAliasDefinitions) {
      const canonical = this.normalizeEncounterText(def.canonical);
      map.set(canonical, canonical);
      for (const alias of def.aliases || []) {
        map.set(this.normalizeEncounterText(alias), canonical);
      }
    }

    return map;
  }

  createWorldRegionMap() {
    const map = {};
    const add = (region, worlds) => worlds.forEach((w) => {
      map[w.toLowerCase()] = region;
    });

    add('na', [
      'Adamantoise', 'Cactuar', 'Faerie', 'Gilgamesh', 'Jenova', 'Midgardsormr', 'Sargatanas', 'Siren',
      'Balmung', 'Brynhildr', 'Coeurl', 'Diabolos', 'Goblin', 'Malboro', 'Mateus', 'Zalera',
      'Behemoth', 'Excalibur', 'Exodus', 'Famfrit', 'Hyperion', 'Lamia', 'Leviathan', 'Ultros',
      'Aether', 'Primal', 'Crystal', 'Dynamis'
    ]);

    add('eu', [
      'Alpha', 'Lich', 'Odin', 'Phoenix', 'Raiden', 'Shiva', 'Twintania', 'Zodiark',
      'Cerberus', 'Louisoix', 'Moogle', 'Omega', 'Phantom', 'Ragnarok', 'Sagittarius', 'Spriggan',
      'Chaos', 'Light'
    ]);

    add('jp', [
      'Aegis', 'Atomos', 'Carbuncle', 'Garuda', 'Gungnir', 'Kujata', 'Ramuh', 'Tonberry', 'Typhon', 'Unicorn',
      'Anima', 'Asura', 'Belias', 'Chocobo', 'Hades', 'Ixion', 'Mandragora', 'Masamune', 'Pandaemonium', 'Titan',
      'Alexander', 'Bahamut', 'Durandal', 'Fenrir', 'Ifrit', 'Ridill', 'Tiamat', 'Ultima', 'Valefor', 'Yojimbo', 'Zeromus',
      'Elemental', 'Gaia', 'Mana', 'Meteor'
    ]);

    add('oc', ['Bismarck', 'Ravana', 'Sephirot', 'Sophia', 'Zurvan', 'Materia']);

    return map;
  }

  createEncounterIdDifficultyMap() {
    const map = new Map();
    for (const def of Object.values(this.encounterShorthandMap)) {
      const category = def?.category || null;
      for (const id of def?.encounterIds || []) {
        map.set(Number(id), category);
      }
    }
    return map;
  }

  isFFLogsQuery(message) {
    const text = (message || '').toLowerCase();
    const triggers = [
      'parse',
      'parses',
      'best parse',
      'best kill',
      'percentile',
      'rank',
      'clear time',
      'logs',
      'log',
      'report',
      'deaths',
      'uptime',
      'casts',
      'ultimate',
      'fflogs',
      'ff logs',
      'dps',
      'rdps',
      'adps',
      'ndps',
    ];
    return triggers.some((trigger) => text.includes(trigger));
  }

  parseQuestion(message) {
    const text = message || '';
    const lower = text.toLowerCase();

    const atWorld = this.extractAtWorldFormat(text);
    const metric = this.extractQueryType(lower);
    const requestedParseMetricRaw = this.extractRequestedParseMetric(lower);
    const requestedParseMetric = this.normalizeRequestedMetric(requestedParseMetricRaw);
    const encounter = this.extractEncounter(text);
    const requestedDifficulty = this.extractRequestedDifficulty(lower, encounter);
    const phase = this.extractPhase(text);
    const category = this.extractCategory(lower, encounter, requestedDifficulty);
    const server = atWorld.server || this.extractServer(text);
    const region = this.extractRegion(lower, server);
    const characterName = atWorld.characterName || this.extractCharacterName(text, server, region);

    logger.debug('FFLogs parsed request details', {
      rawMessage: text,
      requestedMetricRaw: requestedParseMetricRaw?.value || null,
      requestedMetric: requestedParseMetric?.value || null,
      requestedMetricExplicit: Boolean(requestedParseMetric?.explicit),
      requestedMetricAliasApplied: Boolean(requestedParseMetric?.aliasApplied),
      requestedMetricAliasReason: requestedParseMetric?.aliasReason || null,
      parsedQueryType: metric,
      parsedEncounterText: encounter?.query || encounter?.label || null,
      parsedRequestedDifficulty: requestedDifficulty?.value || null,
      parsedRequestedDifficultyExplicit: Boolean(requestedDifficulty?.explicit),
    });

    return {
      raw: text,
      metric,
      requestedParseMetricRaw: requestedParseMetricRaw?.value || null,
      requestedParseMetric: requestedParseMetric?.value || 'dps',
      requestedParseMetricExplicit: Boolean(requestedParseMetric?.explicit),
      requestedParseMetricAliasApplied: Boolean(requestedParseMetric?.aliasApplied),
      requestedParseMetricAliasReason: requestedParseMetric?.aliasReason || null,
      encounter,
      requestedDifficulty: requestedDifficulty?.value || null,
      requestedDifficultyExplicit: Boolean(requestedDifficulty?.explicit),
      phase,
      category,
      server,
      region,
      characterName,
    };
  }

  extractAtWorldFormat(text) {
    // Supports: "kek kristoff@midgardsormr" with optional possessive
    const match = text.match(/([a-zA-Z'\-]+\s+[a-zA-Z'\-]+)@([a-zA-Z\-]+)(?:'s)?/i);
    if (!match) {
      return { characterName: null, server: null };
    }

    return {
      characterName: `${this.capitalize(match[1].split(' ')[0])} ${this.capitalize(match[1].split(' ')[1])}`,
      server: this.normalizeServerName(match[2]),
    };
  }

  extractQueryType(lowerText) {
    if (lowerText.includes('best ultimate parses') || lowerText.includes('list my best ultimate parses')) return 'best_ultimate_parses';
    if (lowerText.includes('deaths')) return 'deaths';
    if (lowerText.includes('uptime')) return 'uptime';
    if (lowerText.includes('casts')) return 'casts';
    if (lowerText.includes('report')) return 'report';
    if (lowerText.includes('best kill')) return 'best_kill';
    if (lowerText.includes('best parse')) return 'best_parse';
    if (lowerText.includes('percentile')) return 'percentile';
    if (lowerText.includes('clear time')) return 'clear_time';
    if (lowerText.includes('rank')) return 'rank';
    if (lowerText.includes('parse') || lowerText.includes('parses')) return 'best_parse';
    if (lowerText.includes('logs') || lowerText.includes('fflogs') || lowerText.includes('ff logs')) return 'logs';
    return 'best_parse';
  }

  extractRequestedParseMetric(lowerText) {
    // Unified metric policy: FFLogs V1 character endpoint returns `total`;
    // we expose this as canonical `adps` regardless of user wording.
    return {
      value: 'adps',
      explicit: true,
    };
  }

  normalizeRequestedMetric(metricDetails) {
    return {
      value: 'adps',
      explicit: true,
      aliasApplied: false,
      aliasReason: 'fflogs_v1_total_is_labeled_as_adps',
    };
  }

  extractCategory(lowerText, encounter, requestedDifficulty) {
    if (encounter?.shorthand) {
      const def = this.encounterShorthandMap[encounter.shorthand];
      if (def?.category) return def.category;
    }

    if (requestedDifficulty?.value === 'ultimate') return 'ultimate';

    if (lowerText.includes('ultimate')) return 'ultimate';
    if (lowerText.includes('savage')) return 'savage';
    return null;
  }

  extractRequestedDifficulty(lowerText, encounter) {
    const explicitKeywords = [
      { value: 'normal', regex: /\bnormal\b/i },
      { value: 'savage', regex: /\bsavage\b/i },
      { value: 'ultimate', regex: /\bultimate\b/i },
      { value: 'extreme', regex: /\bextreme\b|\bex\b/i },
    ];

    const explicitMatches = explicitKeywords
      .map((entry) => ({
        value: entry.value,
        index: lowerText.search(entry.regex),
      }))
      .filter((match) => match.index >= 0)
      .sort((a, b) => b.index - a.index);

    if (explicitMatches.length > 0) {
      return { value: explicitMatches[0].value, explicit: true };
    }

    if (/\bm\d{1,2}n\b/i.test(lowerText)) {
      return { value: 'normal', explicit: true };
    }

    if (/\bm\d{1,2}s\b/i.test(lowerText)) {
      return { value: 'savage', explicit: false };
    }

    // Encounter-level defaults (only if user did not explicitly request difficulty)
    if (encounter?.shorthand) {
      const def = this.encounterShorthandMap[encounter.shorthand];
      if (def?.category === 'ultimate') {
        return { value: 'ultimate', explicit: false };
      }
      if (def?.category === 'savage') {
        return { value: 'savage', explicit: false };
      }
    }

    return { value: null, explicit: false };
  }

  extractEncounter(text) {
    const lower = text.toLowerCase();

    const knownAliasMatch = this.findEncounterAliasInText(lower);
    if (knownAliasMatch) {
      const normalized = this.normalizeEncounterText(knownAliasMatch);
      const canonical = this.aliasToCanonicalMap.get(normalized) || knownAliasMatch;
      return {
        shorthand: this.findEncounterShorthandForAlias(knownAliasMatch),
        label: canonical,
        query: knownAliasMatch,
        aliases: [knownAliasMatch],
        encounterIds: this.findEncounterIdsForAlias(knownAliasMatch),
      };
    }

    for (const [key, value] of Object.entries(this.encounterShorthandMap)) {
      const matched = value.aliases.find((alias) => lower.includes(alias));
      if (matched) {
        return {
          shorthand: key,
          label: value.label,
          query: matched,
          aliases: value.aliases,
          encounterIds: value.encounterIds || [],
        };
      }
    }

    const phrasePatterns = [
      /show\s+me\s+(.+?)\s+(?:parses?|logs?|ranks?|percentile|best\s+parse|best\s+kill)/i,
      /(?:parses?|logs?|ranks?|percentile|best\s+parse|best\s+kill)\s+(?:for|on|in)\s+(.+)$/i,
      /(?:for|on|in)\s+([a-z0-9'\-\s()]+)$/i,
    ];

    for (const pattern of phrasePatterns) {
      const match = text.match(pattern);
      if (match?.[1]) {
        const query = this.sanitizeEncounterQuery(match[1]);
        if (query) {
          return {
            shorthand: null,
            label: query,
            query,
            aliases: [query.toLowerCase()],
          };
        }
      }
    }

    const encounterPattern = /(?:for|on|in)\s+([a-z0-9'\-\s()]+)$/i;
    const encounterMatch = text.match(encounterPattern);
    if (encounterMatch && encounterMatch[1]) {
      const value = this.sanitizeEncounterQuery(encounterMatch[1]);
      if (value.split(' ').length <= 5) {
        return {
          shorthand: null,
          label: value,
          query: value,
          aliases: [value.toLowerCase()],
        };
      }
    }

    return null;
  }

  sanitizeEncounterQuery(value) {
    if (!value) return null;
    const cleaned = value
      .replace(/\b(savage|normal|ultimate|extreme|parses?|logs?|ranks?|percentile|best\s+parse|best\s+kill)\b/gi, ' ')
      .replace(/[?!.:,]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return cleaned || null;
  }

  findEncounterAliasInText(lowerText) {
    const candidates = [];
    for (const def of this.encounterAliasDefinitions) {
      for (const alias of def.aliases || []) {
        const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b${escaped}\\b`, 'i');
        if (regex.test(lowerText)) {
          candidates.push(alias);
        }
      }
    }

    if (candidates.length === 0) return null;
    return candidates.sort((a, b) => b.length - a.length)[0];
  }

  findEncounterShorthandForAlias(alias) {
    if (!alias) return null;
    const normalized = this.normalizeEncounterText(alias);
    for (const [key, def] of Object.entries(this.encounterShorthandMap)) {
      if ((def.aliases || []).some((item) => this.normalizeEncounterText(item) === normalized)) {
        return key;
      }
    }
    return null;
  }

  findEncounterIdsForAlias(alias) {
    if (!alias) return [];
    const shorthand = this.findEncounterShorthandForAlias(alias);
    if (!shorthand) return [];
    return this.encounterShorthandMap[shorthand]?.encounterIds || [];
  }

  normalizeEncounterText(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/\([^)]*\)/g, ' ')
      .replace(/\b(the|minstrel's ballad)\b/g, ' ')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  extractServer(text) {
    const match = text.match(/(?:on|server|world|at)\s+([a-zA-Z'\-]+)/i);
    if (!match) return null;
    return this.normalizeServerName(match[1]);
  }

  normalizeServerName(server) {
    if (!server) return server;
    return this.capitalize(server.replace(/'s$/i, '').trim());
  }

  extractPhase(text) {
    const match = text.match(/phase\s*(\d+)/i);
    return match ? Number(match[1]) : null;
  }

  extractRegion(lowerText, server) {
    const explicit = lowerText.match(/\b(na|eu|jp|oc|kr|cn)\b/i);
    if (explicit) return explicit[1].toLowerCase();

    if (server) {
      const inferred = this.worldRegionMap[server.toLowerCase()];
      if (inferred) return inferred;
    }

    return null;
  }

  extractCharacterName(text, server, region) {
    const cleaned = text
      .replace(/<@!?\d+>/g, '')
      .replace(/\b(best parse|best kill|percentile|rank|clear time|logs|fflogs|ff logs|for|on|in|of|character|server|world)\b/gi, ' ')
      .replace(/\b(na|eu|jp|oc|kr|cn)\b/gi, ' ')
      .replace(/[?!.:,]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleaned) return null;

    const words = cleaned
      .split(' ')
      .filter(Boolean)
      .filter((word) => {
        const lowered = word.toLowerCase();
        if (server && lowered === server.toLowerCase()) return false;
        if (region && lowered === region.toLowerCase()) return false;
        return true;
      });

    if (words.length >= 2) {
      return `${this.capitalize(words[0])} ${this.capitalize(words[1])}`;
    }

    if (words.length === 1) {
      return this.capitalize(words[0]);
    }

    return null;
  }

  capitalize(value) {
    if (!value) return value;
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  async handleQuery(message) {
    const parsed = this.parseQuestion(message);
    const resolvedEncounter = this.resolveEncounterDefinition(parsed.encounter);

    logger.info('FFLogs routing triggered', { parsed });
    logger.info('FFLogs encounter/category resolved', {
      shorthand: parsed.encounter?.shorthand || null,
      resolvedEncounterName: resolvedEncounter?.label || null,
      resolvedEncounterIds: resolvedEncounter?.encounterIds || [],
      category: parsed.category || null,
    });

    if (!this.apiKey) {
      return {
        ok: false,
        parsed,
        error: 'FFLOGS_API_KEY is not configured. Add it to your environment before using FFLogs lookups.',
      };
    }

    if (!parsed.characterName || !parsed.server || !parsed.region) {
      return {
        ok: false,
        parsed,
        error: 'i could not parse enough info for fflogs. include character name and world/server (region is inferred if possible).',
      };
    }

    try {
      const accessToken = await this.getFFLogsAccessToken();
      if (!accessToken) {
        return {
          ok: false,
          parsed,
          error: "i couldn't verify that on fflogs.",
        };
      }

      const lookup = await this.searchCharacterOrRankingData({
        name: parsed.characterName,
        server: parsed.server,
        region: parsed.region,
        category: parsed.category,
      });

      const parses = lookup?.parses || [];

      if (!Array.isArray(parses) || parses.length === 0) {
        logger.info('FFLogs API lookup succeeded with no data', { parsed });
        return {
          ok: true,
          parsed,
          metric: parsed.metric,
          hasData: false,
          data: null,
        };
      }

      const selection = this.selectParsesForRequest(parses, parsed, resolvedEncounter);

      logger.info('FFLogs encounter/difficulty selection', {
        requestedEncounterText: parsed.encounter?.query || parsed.encounter?.label || null,
        requestedDifficulty: parsed.requestedDifficulty || null,
        requestedDifficultyExplicit: Boolean(parsed.requestedDifficultyExplicit),
        selectedEncounter: selection.selectedEncounter || null,
        selectedDifficulty: selection.selectedDifficulty || null,
        fallbackDifficultyUsed: Boolean(selection.fallbackDifficultyUsed),
        selectionReason: selection.reason || null,
        candidatesConsidered: selection.candidatesConsidered || [],
      });

      if (!selection.ok) {
        return {
          ok: false,
          parsed,
          error: selection.error || "i couldn't confidently match that encounter on fflogs.",
        };
      }

      const selectedParses = selection.selectedParses || [];

      const metricResolution = this.resolveRequestedMetric(selectedParses, parsed.requestedParseMetric, {
        explicit: parsed.requestedParseMetricExplicit,
      });

      logger.info('FFLogs metric selection', {
        requestedMetricRaw: parsed.requestedParseMetricRaw || null,
        requestedMetric: parsed.requestedParseMetric || null,
        requestedMetricExplicit: Boolean(parsed.requestedParseMetricExplicit),
        requestedMetricAliasApplied: Boolean(parsed.requestedParseMetricAliasApplied),
        requestedMetricAliasReason: parsed.requestedParseMetricAliasReason || null,
        parsedMetric: parsed.metric,
        rawMetricFieldsPresent: metricResolution.rawMetricFieldsPresent,
        selectedMetricField: metricResolution.selectedMetricSourceField || null,
        selectedMetric: metricResolution.selectedMetric || null,
        fallbackOccurred: Boolean(metricResolution.fallbackUsed),
        fallbackReason: metricResolution.reason || null,
      });

      if (!metricResolution.available) {
        const requestedMetricText = parsed.requestedParseMetric || 'dps';
        const present = metricResolution.rawMetricFieldsPresent.length > 0
          ? metricResolution.rawMetricFieldsPresent.join(', ')
          : 'none';

        return {
          ok: false,
          parsed,
          error: `requested metric "${requestedMetricText}" is not available from the current fflogs endpoint/response. metrics present: ${present}.`,
        };
      }

      const data = this.resolveMetricData(
        selectedParses,
        parsed.metric,
        null,
        parsed.phase,
        parsed.category,
        metricResolution,
      );

      // Optional report analysis for report/deaths/uptime/casts style intents
      let reportAnalysis = null;
      const reportLikeMetrics = ['report', 'deaths', 'uptime', 'casts'];
      if (data && reportLikeMetrics.includes(parsed.metric)) {
        reportAnalysis = await this.analyzeReport(data);
      }

      logger.info('FFLogs API lookup succeeded', {
        parsed,
        category: parsed.category || null,
        resolvedEncounterName: resolvedEncounter?.label || null,
        resolvedEncounterIds: resolvedEncounter?.encounterIds || [],
        totalParses: parses.length,
        hasMetricData: Boolean(data),
      });

      return {
        ok: true,
        parsed,
        metric: parsed.metric,
        hasData: Boolean(data),
        data,
        selectedDifficulty: selection.selectedDifficulty || null,
        selectedEncounter: selection.selectedEncounter || null,
        selectionReason: selection.reason || null,
        requestedParseMetric: parsed.requestedParseMetric || 'adps',
        requestedParseMetricRaw: parsed.requestedParseMetricRaw || null,
        requestedParseMetricAliasApplied: Boolean(parsed.requestedParseMetricAliasApplied),
        requestedParseMetricAliasReason: parsed.requestedParseMetricAliasReason || null,
        metricUsed: metricResolution.selectedMetric || parsed.requestedParseMetric || 'adps',
        metricSourceField: metricResolution.selectedMetricSourceField || null,
        metricFallbackUsed: Boolean(metricResolution.fallbackUsed),
        metricFallbackReason: metricResolution.reason || null,
        rawMetricFieldsPresent: metricResolution.rawMetricFieldsPresent || [],
        selectedMetricValue: data
          ? this.getParseMetricValue(data, metricResolution.selectedMetric || parsed.requestedParseMetric || 'dps')
          : null,
        reportAnalysis,
        totalParses: selectedParses.length,
      };
    } catch (error) {
      logger.error('FFLogs API lookup failed', {
        error: error.message,
        parsed,
      });

      return {
        ok: false,
        parsed,
        error: `fflogs lookup failed: ${error.message}`,
      };
    }
  }

  selectParsesForRequest(parses, parsed, resolvedEncounter) {
    if (!Array.isArray(parses) || parses.length === 0) {
      return {
        ok: false,
        error: "i couldn't verify that on fflogs.",
      };
    }

    const encounterQuery = resolvedEncounter?.label || parsed.encounter?.query || parsed.encounter?.label || null;
    const candidateGroups = this.buildEncounterCandidates(parses);

    let encounterFilteredParses = parses;
    let selectedEncounter = null;
    let encounterReason = 'no encounter requested';
    let candidatesConsidered = [];

    if (encounterQuery) {
      const encounterResolution = this.resolveEncounterAgainstCandidates(encounterQuery, candidateGroups);
      candidatesConsidered = encounterResolution.candidatesConsidered || [];

      if (!encounterResolution.ok) {
        return {
          ok: false,
          error: "i couldn't confidently match that encounter on fflogs.",
          candidatesConsidered,
          reason: encounterResolution.reason,
        };
      }

      selectedEncounter = encounterResolution.selectedEncounter;
      encounterReason = encounterResolution.reason;

      encounterFilteredParses = parses.filter((parse) =>
        this.getEncounterBaseKey(parse?.encounterName || parse?.name || '') === selectedEncounter.baseKey,
      );
    }

    const difficultyResolution = this.resolveDifficultyForParses(encounterFilteredParses, {
      requestedDifficulty: parsed.requestedDifficulty,
      explicit: parsed.requestedDifficultyExplicit,
    });

    if (!difficultyResolution.ok) {
      return {
        ok: false,
        error: difficultyResolution.error,
        candidatesConsidered,
        reason: difficultyResolution.reason,
      };
    }

    return {
      ok: true,
      selectedParses: difficultyResolution.parses,
      selectedDifficulty: difficultyResolution.selectedDifficulty,
      selectedEncounter: selectedEncounter?.displayName || encounterQuery || null,
      fallbackDifficultyUsed: Boolean(difficultyResolution.fallbackUsed),
      reason: `${encounterReason}; ${difficultyResolution.reason}`,
      candidatesConsidered,
    };
  }

  buildEncounterCandidates(parses) {
    const map = new Map();

    for (const parse of parses) {
      const rawName = String(parse?.encounterName || parse?.name || '').trim();
      if (!rawName) continue;

      const baseKey = this.getEncounterBaseKey(rawName);
      if (!baseKey) continue;

      const entry = map.get(baseKey) || {
        baseKey,
        displayName: rawName,
        count: 0,
        parses: [],
        difficulties: new Set(),
      };

      entry.count += 1;
      entry.parses.push(parse);
      entry.difficulties.add(this.inferParseDifficulty(parse));

      if (rawName.length < entry.displayName.length) {
        entry.displayName = rawName;
      }

      map.set(baseKey, entry);
    }

    return Array.from(map.values());
  }

  resolveEncounterAgainstCandidates(encounterQuery, candidates) {
    const queryNormalized = this.normalizeEncounterText(encounterQuery);
    const canonicalQuery = this.aliasToCanonicalMap.get(queryNormalized) || queryNormalized;
    const queryBase = this.getEncounterBaseKey(canonicalQuery);

    const scored = candidates.map((candidate) => {
      const candidateKey = candidate.baseKey;
      let score = 0;
      let strategy = 'none';

      if (candidateKey === queryBase) {
        score = 1;
        strategy = canonicalQuery !== queryNormalized ? 'alias_match' : 'exact_canonical_match';
      } else {
        const normalizedContainment = this.calculateContainmentScore(queryBase, candidateKey);
        if (normalizedContainment >= 0.95) {
          score = normalizedContainment;
          strategy = 'normalized_match';
        } else {
          const fuzzy = this.calculateStringSimilarity(queryBase, candidateKey);
          score = fuzzy;
          strategy = 'fuzzy_match';
        }
      }

      return {
        encounter: candidate.displayName,
        baseKey: candidate.baseKey,
        score,
        strategy,
      };
    }).sort((a, b) => b.score - a.score);

    logger.info('FFLogs encounter candidates considered', {
      encounterQuery,
      queryBase,
      candidates: scored,
    });

    const top = scored[0];
    const second = scored[1];

    if (!top) {
      return {
        ok: false,
        reason: 'no candidates available',
        candidatesConsidered: scored,
      };
    }

    const highConfidenceFuzzy = top.strategy === 'fuzzy_match' && top.score >= 0.9 && (!second || top.score - second.score >= 0.1);
    const highConfidenceDirect = ['exact_canonical_match', 'alias_match', 'normalized_match'].includes(top.strategy) && top.score >= 0.95;

    if (!highConfidenceFuzzy && !highConfidenceDirect) {
      return {
        ok: false,
        reason: `low confidence (${top.strategy}:${top.score.toFixed(3)})`,
        candidatesConsidered: scored,
      };
    }

    const selected = candidates.find((c) => c.baseKey === top.baseKey);
    if (!selected) {
      return {
        ok: false,
        reason: 'selected candidate missing',
        candidatesConsidered: scored,
      };
    }

    return {
      ok: true,
      selectedEncounter: selected,
      reason: `${top.strategy} (${top.score.toFixed(3)})`,
      candidatesConsidered: scored,
    };
  }

  resolveDifficultyForParses(parses, options) {
    const requestedDifficulty = options?.requestedDifficulty || null;
    const explicit = Boolean(options?.explicit);

    const grouped = {
      savage: [],
      normal: [],
      ultimate: [],
      extreme: [],
      unknown: [],
    };

    for (const parse of parses) {
      const difficulty = this.inferParseDifficulty(parse);
      grouped[difficulty] = grouped[difficulty] || [];
      grouped[difficulty].push(parse);
    }

    const available = Object.entries(grouped)
      .filter(([, list]) => list.length > 0)
      .map(([key]) => key);

    logger.info('FFLogs difficulty candidates considered', {
      requestedDifficulty,
      explicit,
      availableDifficulties: available,
      candidateResults: parses.map((parse) => ({
        encounter: parse?.encounterName || parse?.name || 'unknown',
        difficulty: this.inferParseDifficulty(parse),
        encounterID: parse?.encounterID || null,
      })),
    });

    if (explicit) {
      const strict = grouped[requestedDifficulty] || [];
      if (strict.length === 0) {
        return {
          ok: false,
          error: `i couldn't find ${requestedDifficulty} data for that encounter on fflogs.`,
          reason: 'explicit difficulty requested with no matching parses',
        };
      }

      return {
        ok: true,
        parses: strict,
        selectedDifficulty: requestedDifficulty,
        fallbackUsed: false,
        reason: 'explicit difficulty applied',
      };
    }

    if (requestedDifficulty && grouped[requestedDifficulty]?.length > 0) {
      return {
        ok: true,
        parses: grouped[requestedDifficulty],
        selectedDifficulty: requestedDifficulty,
        fallbackUsed: false,
        reason: 'implicit encounter-linked difficulty applied',
      };
    }

    if (requestedDifficulty === 'savage') {
      if (grouped.normal.length > 0) {
        return {
          ok: true,
          parses: grouped.normal,
          selectedDifficulty: 'normal',
          fallbackUsed: true,
          reason: 'savage unavailable; fell back to normal',
        };
      }

      return {
        ok: false,
        error: "i couldn't find savage data for that encounter on fflogs.",
        reason: 'savage requested/defaulted but unavailable and normal fallback unavailable',
      };
    }

    if (grouped.savage.length > 0) {
      return {
        ok: true,
        parses: grouped.savage,
        selectedDifficulty: 'savage',
        fallbackUsed: false,
        reason: 'defaulted to savage because savage exists',
      };
    }

    if (grouped.normal.length > 0) {
      return {
        ok: true,
        parses: grouped.normal,
        selectedDifficulty: 'normal',
        fallbackUsed: true,
        reason: 'savage unavailable; fell back to normal',
      };
    }

    const fallbackOrder = ['ultimate', 'extreme', 'unknown'];
    const fallback = fallbackOrder.find((key) => grouped[key]?.length > 0);

    if (!fallback) {
      return {
        ok: false,
        error: "i couldn't verify that on fflogs.",
        reason: 'no parses available after difficulty resolution',
      };
    }

    return {
      ok: true,
      parses: grouped[fallback],
      selectedDifficulty: fallback,
      fallbackUsed: true,
      reason: `savage unavailable; fell back to ${fallback}`,
    };
  }

  resolveRequestedMetric(parses, requestedMetric, options = {}) {
    const explicit = true;
    const requested = 'adps';
    const rawMetricFieldsPresent = this.collectRawMetricFields(parses);
    const metricPreference = ['adps'];

    const requestedAvailable = this.isMetricAvailableInParses(parses, requested);
    if (requestedAvailable) {
      return {
        available: true,
        selectedMetric: requested,
        selectedMetricSourceField: this.getMetricSourceField(parses, requested),
        fallbackUsed: false,
        reason: 'requested metric available',
        rawMetricFieldsPresent,
      };
    }

    if (explicit) {
      return {
        available: false,
        selectedMetric: null,
        fallbackUsed: false,
        reason: 'explicit requested metric unavailable',
        rawMetricFieldsPresent,
      };
    }

    const fallbackMetric = metricPreference.find((metric) => this.isMetricAvailableInParses(parses, metric));
    if (fallbackMetric) {
      return {
        available: true,
        selectedMetric: fallbackMetric,
        selectedMetricSourceField: this.getMetricSourceField(parses, fallbackMetric),
        fallbackUsed: fallbackMetric !== requested,
        reason: fallbackMetric !== requested
          ? `default metric ${requested} unavailable; fell back to ${fallbackMetric}`
          : 'requested metric available via fallback scan',
        rawMetricFieldsPresent,
      };
    }

    return {
      available: false,
      selectedMetric: null,
      fallbackUsed: false,
      reason: 'no supported parse metrics available in response',
      rawMetricFieldsPresent,
    };
  }

  collectRawMetricFields(parses) {
    if (!Array.isArray(parses) || parses.length === 0) return [];

    const knownMetricFields = [
      'dps',
      'DPS',
      'total',
      'rdps',
      'rDPS',
      'adps',
      'aDPS',
      'ndps',
      'nDPS',
    ];

    const present = new Set();

    for (const parse of parses) {
      for (const field of knownMetricFields) {
        if (Object.prototype.hasOwnProperty.call(parse || {}, field)) {
          present.add(field);
        }
      }
    }

    return Array.from(present.values()).sort();
  }

  isMetricAvailableInParses(parses, metric) {
    if (!Array.isArray(parses) || parses.length === 0) return false;
    return parses.some((parse) => Number.isFinite(this.getParseMetricValue(parse, metric)));
  }

  getParseMetricValue(parse, metric) {
    if (!parse || !metric) return null;

    const metricFields = {
      adps: ['adps', 'aDPS', 'total'],
    };

    const fields = metricFields[metric] || [];
    for (const field of fields) {
      const value = Number(parse?.[field]);
      if (Number.isFinite(value)) {
        return value;
      }
    }

    return null;
  }

  getMetricSourceField(parses, metric) {
    if (!Array.isArray(parses) || parses.length === 0) return null;

    const metricFields = {
      adps: ['adps', 'aDPS', 'total'],
    };

    const fields = metricFields[metric] || [];

    for (const parse of parses) {
      for (const field of fields) {
        const value = Number(parse?.[field]);
        if (Number.isFinite(value)) {
          return field;
        }
      }
    }

    return null;
  }

  inferParseDifficulty(parse) {
    const encounterId = Number(parse?.encounterID);
    if (Number.isFinite(encounterId) && this.encounterIdDifficultyMap.has(encounterId)) {
      const byId = this.encounterIdDifficultyMap.get(encounterId);
      if (byId) return byId;
    }

    const raw = String(
      parse?.difficulty ||
      parse?.difficultyName ||
      parse?.encounterName ||
      parse?.name ||
      '',
    ).toLowerCase();

    if (raw.includes('ultimate')) return 'ultimate';
    if (raw.includes('savage')) return 'savage';
    if (raw.includes('extreme')) return 'extreme';
    if (raw.includes('normal')) return 'normal';

    return 'unknown';
  }

  getEncounterBaseKey(value) {
    const normalized = this.normalizeEncounterText(value)
      .replace(/\b(savage|normal|ultimate|extreme|unreal)\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const canonical = this.aliasToCanonicalMap.get(normalized) || normalized;
    return canonical;
  }

  calculateContainmentScore(a, b) {
    if (!a || !b) return 0;
    if (a === b) return 1;
    if (a.includes(b) || b.includes(a)) return 0.96;

    const aTokens = new Set(a.split(' ').filter(Boolean));
    const bTokens = new Set(b.split(' ').filter(Boolean));
    const intersection = [...aTokens].filter((token) => bTokens.has(token)).length;
    const maxSize = Math.max(aTokens.size, bTokens.size, 1);
    return intersection / maxSize;
  }

  calculateStringSimilarity(a, b) {
    if (!a || !b) return 0;
    if (a === b) return 1;

    const grams = (value) => {
      const padded = ` ${value} `;
      const list = [];
      for (let i = 0; i < padded.length - 1; i += 1) {
        list.push(padded.slice(i, i + 2));
      }
      return new Set(list);
    };

    const aSet = grams(a);
    const bSet = grams(b);
    const intersection = [...aSet].filter((g) => bSet.has(g)).length;
    const union = new Set([...aSet, ...bSet]).size || 1;
    return intersection / union;
  }

  async getCharacterParses(name, server, region) {
    const path = `/parses/character/${encodeURIComponent(name)}/${encodeURIComponent(server)}/${encodeURIComponent(region)}`;
    return this.executeFFLogsQuery({ path });
  }

  async getFFLogsAccessToken() {
    // V1 uses API key directly; this function standardizes service flow/logging.
    const token = this.apiKey || null;
    logger.info('FFLogs access token fetch', {
      success: Boolean(token),
      mode: 'v1_api_key',
    });
    return token;
  }

  async executeFFLogsQuery(query, variables = {}) {
    const path = query?.path;
    if (!path) {
      throw new Error('executeFFLogsQuery requires a path');
    }

    const url = new URL(`${this.baseUrl}${path}`);
    url.searchParams.set('api_key', this.apiKey);

    for (const [key, value] of Object.entries(variables)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }

    const response = await fetch(url.toString());
    logger.info('FFLogs query executed', {
      path,
      queryParams: variables,
      status: response.status,
      ok: response.ok,
    });

    if (!response.ok) {
      throw new Error(`FFLogs V1 HTTP ${response.status}`);
    }

    return response.json();
  }

  async searchCharacterOrRankingData({ name, server, region, category = null }) {
    const parses = await this.getCharacterParses(name, server, region);
    const filteredParses = this.filterByCategory(parses, category);

    logger.info('FFLogs category filtering', {
      category,
      totalParses: Array.isArray(parses) ? parses.length : 0,
      filteredParses: Array.isArray(filteredParses) ? filteredParses.length : 0,
    });

    return { parses: filteredParses };
  }

  resolveEncounterDefinition(encounter) {
    if (!encounter?.shorthand) return encounter;

    const def = this.encounterShorthandMap[encounter.shorthand];
    if (!def) return encounter;

    return {
      shorthand: encounter.shorthand,
      label: def.label,
      aliases: def.aliases || [],
      encounterIds: def.encounterIds || [],
      category: def.category || null,
    };
  }

  filterByCategory(parses, category) {
    if (!Array.isArray(parses)) return [];
    if (!category) return parses;

    if (category === 'ultimate') {
      const ultimateDefs = Object.values(this.encounterShorthandMap).filter((d) => d.category === 'ultimate');
      const ultimateIds = new Set(ultimateDefs.flatMap((d) => d.encounterIds || []).map((id) => Number(id)));
      const ultimateAliases = ultimateDefs.flatMap((d) => d.aliases || []).map((a) => a.toLowerCase());

      return parses.filter((parse) => {
        const encounterId = Number(parse.encounterID);
        if (ultimateIds.has(encounterId)) return true;

        const name = String(parse.encounterName || parse.name || '').toLowerCase();
        return ultimateAliases.some((alias) => name.includes(alias));
      });
    }

    return parses;
  }

  async getBestParse(name, server, region, encounter) {
    const parses = await this.getCharacterParses(name, server, region);
    return this.pickBestParse(parses, encounter);
  }

  async getBestKill(name, server, region, encounter) {
    const parses = await this.getCharacterParses(name, server, region);
    return this.getBestKillForEncounter(parses, encounter);
  }

  getBestKillForEncounter(parses, encounter, phase = null) {
    const bestKill = this.pickBestKill(parses, encounter);
    if (!bestKill) return null;

    if (phase !== null && phase !== undefined) {
      // V1 parse payload does not expose full phase breakdown in this endpoint.
      return {
        ...bestKill,
        requestedPhase: phase,
        phaseDataAvailable: false,
      };
    }

    return bestKill;
  }

  async analyzeReport(parse) {
    const reportId = parse?.reportID || parse?.reportId;
    if (!reportId) {
      return {
        available: false,
        reason: 'no report id on selected parse',
      };
    }

    try {
      const fights = await this.executeFFLogsQuery({ path: `/report/fights/${encodeURIComponent(reportId)}` });
      return {
        available: true,
        reportID: reportId,
        fightsCount: Array.isArray(fights?.fights) ? fights.fights.length : null,
      };
    } catch (error) {
      logger.warn('FFLogs report analysis failed', {
        reportId,
        error: error.message,
      });
      return {
        available: false,
        reportID: reportId,
        reason: error.message,
      };
    }
  }

  resolveMetricData(parses, metric, encounter, phase = null, category = null, metricResolution = null) {
    if (!parses || parses.length === 0) return null;

    const selectedMetric = metricResolution?.selectedMetric || null;
    const parsesForMetric = selectedMetric
      ? parses.filter((parse) => Number.isFinite(this.getParseMetricValue(parse, selectedMetric)))
      : parses;
    const parsePool = parsesForMetric.length > 0 ? parsesForMetric : parses;

    switch (metric) {
      case 'best_ultimate_parses':
        return this.getBestUltimateParses(parses);
      case 'best_kill':
      case 'clear_time':
        return this.getBestKillForEncounter(parses, encounter, phase);
      case 'report':
      case 'deaths':
      case 'uptime':
      case 'casts':
        return this.pickBestParse(parsePool, encounter);
      case 'rank':
      case 'percentile':
      case 'logs':
      case 'best_parse':
      default:
        if (category === 'ultimate' && !encounter) {
          const bestList = this.getBestUltimateParses(parsePool);
          return bestList.length > 0 ? bestList[0].bestParse : null;
        }
        return this.pickBestParse(parsePool, encounter);
    }
  }

  getBestUltimateParses(parses) {
    const results = [];
    const ultimateDefs = Object.entries(this.encounterShorthandMap)
      .filter(([, def]) => def.category === 'ultimate');

    for (const [shorthand, def] of ultimateDefs) {
      const encounter = {
        shorthand,
        label: def.label,
        aliases: def.aliases || [],
        encounterIds: def.encounterIds || [],
        category: 'ultimate',
      };

      const bestParse = this.pickBestParse(parses, encounter);
      if (bestParse) {
        results.push({
          shorthand,
          label: def.label,
          category: 'ultimate',
          bestParse,
        });
      }
    }

    return results.sort((a, b) => Number(b.bestParse?.percentile || 0) - Number(a.bestParse?.percentile || 0));
  }

  filterByEncounter(parses, encounter) {
    if (!encounter) return parses;

    return parses.filter((parse) => {
      if (Array.isArray(encounter.encounterIds) && encounter.encounterIds.length > 0) {
        const encounterId = Number(parse.encounterID);
        if (encounter.encounterIds.includes(encounterId)) {
          return true;
        }
      }

      const name = (parse.encounterName || parse.name || '').toLowerCase();
      if (!name) return false;

      if (encounter.aliases?.some((alias) => name.includes(alias.toLowerCase()))) {
        return true;
      }

      return encounter.label ? name.includes(encounter.label.toLowerCase()) : false;
    });
  }

  pickBestParse(parses, encounter) {
    const filtered = this.filterByEncounter(parses, encounter);
    if (filtered.length === 0) return null;

    return filtered.reduce((best, current) => {
      const bestPercent = Number(best.percentile || 0);
      const currentPercent = Number(current.percentile || 0);
      return currentPercent > bestPercent ? current : best;
    });
  }

  pickBestKill(parses, encounter) {
    const filtered = this.filterByEncounter(parses, encounter);
    if (filtered.length === 0) return null;

    return filtered.reduce((best, current) => {
      const bestDuration = Number(best.duration || Number.MAX_SAFE_INTEGER);
      const currentDuration = Number(current.duration || Number.MAX_SAFE_INTEGER);
      return currentDuration < bestDuration ? current : best;
    });
  }
}

module.exports = new FFLogsService();