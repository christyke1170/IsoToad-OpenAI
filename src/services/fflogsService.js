const config = require('../config');
const logger = require('../utils/logger');

class FFLogsTokenManager {
  constructor({ clientId, clientSecret }) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.tokenEndpoint = 'https://www.fflogs.com/oauth/token';
    this.cache = {
      accessToken: null,
      expiresAt: 0,
    };
  }

  hasValidToken() {
    return Boolean(this.cache.accessToken) && Date.now() < this.cache.expiresAt;
  }

  async getAccessToken() {
    if (this.hasValidToken()) {
      return this.cache.accessToken;
    }

    if (!this.clientId || !this.clientSecret) {
      throw new Error('FFLOGS_CLIENT_ID / FFLOGS_CLIENT_SECRET are not configured');
    }

    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });

    const response = await fetch(this.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      throw new Error(`FFLogs OAuth failed with status ${response.status}`);
    }

    const token = await response.json();
    const expiresInMs = Math.max(30, Number(token.expires_in || 0) - 30) * 1000;

    this.cache.accessToken = token.access_token;
    this.cache.expiresAt = Date.now() + expiresInMs;

    logger.info('FFLogs OAuth token refreshed', {
      expiresInSeconds: Math.floor(expiresInMs / 1000),
    });

    return this.cache.accessToken;
  }
}

class FFLogsService {
  constructor() {
    this.endpoint = 'https://www.fflogs.com/api/v2/client';
    this.tokenManager = new FFLogsTokenManager({
      clientId: config.fflogs.clientId,
      clientSecret: config.fflogs.clientSecret,
    });

    this.jobAliases = this.buildJobAliasMap();
    this.difficultyKeywords = ['savage', 'ultimate', 'normal', 'extreme'];
    this.metricKeywords = ['dps', 'rdps', 'ndps', 'cdps', 'wdps', 'adps'];
    this.zoneRankingMetricEnumType = 'CharacterPageRankingMetricType';
    // FFLogs GraphQL returns this enum set for character zoneRankings metric.
    // NOTE: adps is intentionally excluded because it is not accepted by this enum.
    this.zoneRankingMetricEnums = ['dps', 'rdps', 'ndps', 'cdps', 'wdps'];
    this.userMetricToZoneRankingEnum = {
      dps: 'dps',
      rdps: 'rdps',
      ndps: 'ndps',
      cdps: 'cdps',
      wdps: 'wdps',
    };

    const hasClientId = Boolean(config.fflogs.clientId);
    const hasClientSecret = Boolean(config.fflogs.clientSecret);

    logger.info('FFLogs env status', {
      hasClientId,
      hasClientSecret,
      expectedEnvVars: ['FFLOGS_CLIENT_ID', 'FFLOGS_CLIENT_SECRET'],
    });

    if (!this.hasCredentials()) {
      logger.warn('FFLogs V2 credentials missing; FFLogs requests are disabled until configured', {
        hasClientId,
        hasClientSecret,
      });
    } else {
      logger.info('FFLogs V2 service initialized');
    }
  }

  hasCredentials() {
    return Boolean(config.fflogs.clientId && config.fflogs.clientSecret);
  }

  buildJobAliasMap() {
    const jobs = {
      samurai: ['samurai', 'sam'],
      'black mage': ['black mage', 'blm', 'blackmage'],
      monk: ['monk', 'mnk'],
      dragoon: ['dragoon', 'drg'],
      ninja: ['ninja', 'nin'],
      reaper: ['reaper', 'rpr'],
      viper: ['viper', 'vpr'],
      bard: ['bard', 'brd'],
      machinist: ['machinist', 'mch'],
      dancer: ['dancer', 'dnc'],
      summoner: ['summoner', 'smn'],
      pictomancer: ['pictomancer', 'pct'],
      'red mage': ['red mage', 'rdm', 'redmage'],
      'white mage': ['white mage', 'whm', 'whitemage'],
      scholar: ['scholar', 'sch'],
      astrologian: ['astrologian', 'ast'],
      sage: ['sage', 'sge'],
      paladin: ['paladin', 'pld'],
      warrior: ['warrior', 'war'],
      'dark knight': ['dark knight', 'drk', 'darkknight'],
      gunbreaker: ['gunbreaker', 'gnb'],
      'blue mage': ['blue mage', 'blu', 'bluemage'],
    };

    const map = new Map();
    for (const [canonical, aliases] of Object.entries(jobs)) {
      for (const alias of aliases) {
        map.set(this.normalize(alias), canonical);
      }
      map.set(this.normalize(canonical), canonical);
    }
    return map;
  }

  normalize(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  isFFLogsQuery(message) {
    const lower = String(message || '').toLowerCase();
    return [
      'fflogs', 'ff logs', 'parse', 'best parse', 'highest dps', 'highest rdps', 'highest adps',
      'highest ndps', 'highest cdps', 'highest wdps',
      'rdps', 'adps', 'ndps', 'cdps', 'wdps', 'percentile', 'savage', 'ultimate', 'extreme', 'normal',
    ].some((trigger) => lower.includes(trigger));
  }

  parseRequest(message) {
    const raw = String(message || '').trim();
    const lower = raw.toLowerCase();

    const difficulty = this.difficultyKeywords.find((d) => new RegExp(`\\b${d}\\b`, 'i').test(lower)) || null;
    const rankingMethod = this.extractRankingMethod(lower);
    const requestedMetric = rankingMethod === 'best_parse' ? 'percentile' : rankingMethod;
    const requestedJob = this.extractRequestedJob(lower);
    const server = this.extractServer(raw);
    const characterName = this.extractCharacterName(raw);
    const encounter = this.extractEncounter(raw, { characterName, requestedJob, difficulty, server });

    const parsed = {
      raw,
      rankingMethod,
      requestedMetric,
      requestedDifficulty: difficulty,
      requestedDifficultyExplicit: Boolean(difficulty),
      requestedJob,
      characterName,
      server,
      encounter,
    };

    logger.info('FFLogs parsed request', parsed);
    return parsed;
  }

  extractRankingMethod(lower) {
    if (lower.includes('highest rdps')) return 'rdps';
    if (lower.includes('highest adps')) return 'adps';
    if (lower.includes('highest ndps')) return 'ndps';
    if (lower.includes('highest cdps')) return 'cdps';
    if (lower.includes('highest wdps')) return 'wdps';
    if (lower.includes('highest dps')) return 'dps';
    if (lower.includes('best parse')) return 'best_parse';
    if (lower.includes('highest')) {
      if (lower.includes('rdps')) return 'rdps';
      if (lower.includes('adps')) return 'adps';
      if (lower.includes('ndps')) return 'ndps';
      if (lower.includes('cdps')) return 'cdps';
      if (lower.includes('wdps')) return 'wdps';
      // Default damage metric is rDPS when user asks for "highest" without explicit metric.
      return 'rdps';
    }

    if (lower.match(/\bndps\b/)) return 'ndps';
    if (lower.match(/\bcdps\b/)) return 'cdps';
    if (lower.match(/\bwdps\b/)) return 'wdps';
    if (lower.match(/\brdps\b/)) return 'rdps';
    if (lower.match(/\badps\b/)) return 'adps';
    if (lower.match(/\bdps\b/)) return 'dps';

    return 'best_parse';
  }

  extractRequestedJob(lower) {
    const candidates = [];
    for (const [alias, canonical] of this.jobAliases.entries()) {
      const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
      const regex = new RegExp(`\\b${escaped}\\b`, 'i');
      const match = lower.match(regex);
      if (match && typeof match.index === 'number') {
        candidates.push({ canonical, index: match.index, len: match[0].length });
      }
    }

    if (candidates.length === 0) return null;
    candidates.sort((a, b) => b.len - a.len || a.index - b.index);
    return candidates[0].canonical;
  }

  extractServer(text) {
    const atMatch = text.match(/@([a-zA-Z\-']+)/);
    if (atMatch) return atMatch[1];

    const worldMatch = text.match(/(?:on|at|world|server)\s+([a-zA-Z\-']+)/i);
    return worldMatch ? worldMatch[1] : null;
  }

  extractCharacterName(text) {
    const atIndex = text.indexOf('@');
    if (atIndex > 0) {
      const beforeAt = text
        .slice(0, atIndex)
        .replace(/[^a-zA-Z'\-\s]/g, ' ')
        .trim();
      const words = beforeAt.split(/\s+/).filter(Boolean);
      if (words.length >= 2) {
        return this.titleCase(`${words[words.length - 2]} ${words[words.length - 1]}`);
      }
    }

    const words = text.trim().split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      return this.titleCase(`${words[0]} ${words[1]}`);
    }

    return null;
  }

  titleCase(value) {
    return String(value || '')
      .split(' ')
      .filter(Boolean)
      .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }

  extractEncounter(text, { characterName, requestedJob, difficulty, server }) {
    let cleaned = ` ${text.toLowerCase()} `;

    if (characterName) {
      cleaned = cleaned.replace(new RegExp(this.normalize(characterName).replace(/\s+/g, '\\s+'), 'i'), ' ');
    }
    if (requestedJob) {
      cleaned = cleaned.replace(new RegExp(this.normalize(requestedJob).replace(/\s+/g, '\\s+'), 'i'), ' ');
    }
    if (difficulty) {
      cleaned = cleaned.replace(new RegExp(`\\b${difficulty}\\b`, 'i'), ' ');
    }
    if (server) {
      cleaned = cleaned.replace(new RegExp(this.normalize(server).replace(/\s+/g, '\\s+'), 'i'), ' ');
    }

    cleaned = cleaned
      .replace(/\b(give|me|show|find|lookup|best|highest|parse|parses|percentile|dps|rdps|adps|fflogs|ff\s*logs|on|at|in|for|of|world|server)\b/gi, ' ')
      .replace(/[@#?!.:,]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleaned) return null;
    const words = cleaned.split(' ');
    return words.slice(Math.max(0, words.length - 4)).join(' ');
  }

  buildEncounterMatchVariants(value) {
    const normalized = this.normalize(value);
    const variants = new Set([normalized]);

    // Treat explicit "1"/"I" suffix as optional for first phase naming.
    if (/\s(1|i)$/.test(normalized)) {
      variants.add(normalized.replace(/\s(1|i)$/, '').trim());
    }

    return Array.from(variants).filter(Boolean);
  }

  normalizeEncounterComparison(value) {
    return this.normalize(value)
      .replace(/\bii\b/g, '2')
      .replace(/\biii\b/g, '3')
      .replace(/\biv\b/g, '4')
      .replace(/\bi\b/g, '1')
      .replace(/\s+/g, ' ')
      .trim();
  }

  hasEncounterPhaseSuffix(value) {
    return /\s\d+$/.test(this.normalizeEncounterComparison(value));
  }

  inferServerRegion(server) {
    const normalized = this.normalize(server);
    const map = {
      midgardsormr: 'NA',
      gilgamesh: 'NA',
      cactuar: 'NA',
      faerie: 'NA',
      adamantoise: 'NA',
      balmung: 'NA',
      behemoth: 'NA',
      sargatanas: 'NA',
      ultros: 'NA',
      odin: 'EU',
      shiva: 'EU',
      phoenix: 'EU',
      tonberry: 'JP',
      kujata: 'JP',
      asura: 'JP',
      ravana: 'OC',
      bismarck: 'OC',
    };
    return map[normalized] || 'NA';
  }

  async graphQLRequest(query, variables = {}) {
    const token = await this.tokenManager.getAccessToken();

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query, variables }),
    });

    const payload = await response.json();
    console.log('FFLOGS RAW RESPONSE:', JSON.stringify(payload.data, null, 2));

    if (!response.ok || (payload && payload.errors && payload.errors.length > 0)) {
      throw new Error(`FFLogs GraphQL request failed: ${response.status} ${(payload.errors || []).map((e) => e.message).join('; ')}`);
    }

    return payload.data;
  }

  extractRankingsFromGraphQLData(data) {
    const character = data?.characterData?.character || null;
    if (!character) {
      return {
        characterExists: false,
        rankings: [],
        parserFound: true,
        parserPath: null,
        parserError: null,
      };
    }

    const zoneRankingsRaw = character.zoneRankings;
    let zoneRankings = zoneRankingsRaw;
    let parserError = null;

    if (typeof zoneRankingsRaw === 'string') {
      try {
        zoneRankings = JSON.parse(zoneRankingsRaw);
      } catch (error) {
        parserError = error.message;
      }
    }

    const candidates = [
      {
        path: 'data.characterData.character.zoneRankings.rankings',
        value: zoneRankings?.rankings,
      },
      {
        path: 'data.characterData.character.zoneRankings.data.rankings',
        value: zoneRankings?.data?.rankings,
      },
      {
        path: 'data.characterData.character.zoneRankings',
        value: zoneRankings,
      },
    ];

    for (const candidate of candidates) {
      if (Array.isArray(candidate.value)) {
        return {
          characterExists: true,
          rankings: candidate.value,
          parserFound: true,
          parserPath: candidate.path,
          parserError,
        };
      }
    }

    return {
      characterExists: true,
      rankings: [],
      parserFound: false,
      parserPath: null,
      parserError,
    };
  }

  resolveZoneRankingMetric(userMetric) {
    const requested = this.normalize(userMetric);
    const mappedEnum = this.userMetricToZoneRankingEnum[requested] || null;

    logger.info('FFLogs metric mapping', {
      parsedUserMetric: requested || 'percentile',
      mappedGraphQLMetricEnum: mappedEnum,
      enumType: this.zoneRankingMetricEnumType,
      supportedGraphQLEnums: this.zoneRankingMetricEnums,
    });

    if (!mappedEnum) {
      return {
        ok: false,
        requested,
        mappedEnum: null,
      };
    }

    return {
      ok: true,
      requested,
      mappedEnum,
    };
  }

  async fetchRankingsByMetric({ characterName, server, region, metric }) {
    const serverSlug = this.normalize(server).replace(/\s+/g, '-');
    const mapped = this.resolveZoneRankingMetric(metric);
    if (!mapped.ok) {
      throw new Error(`Unsupported metric for zoneRankings: ${metric}`);
    }

    const query = `
      query CharacterZoneRankings($name: String!, $serverSlug: String!, $serverRegion: String!, $metric: ${this.zoneRankingMetricEnumType}!) {
        characterData {
          character(name: $name, serverSlug: $serverSlug, serverRegion: $serverRegion) {
            name
            server {
              name
            }
            zoneRankings(metric: $metric, partition: -1)
          }
        }
      }
    `;

    const variables = {
      name: characterName,
      serverSlug,
      serverRegion: String(region),
      metric: mapped.mappedEnum,
    };

    logger.info('FFLogs GraphQL metric routing', {
      parsedUserMetric: metric,
      mappedGraphQLMetricEnum: mapped.mappedEnum,
    });
    logger.info('FFLogs GraphQL query variables', { variables });
    logger.debug('FFLogs GraphQL request payload', { query, variables });

    const data = await this.graphQLRequest(query, variables);
    const parsed = this.extractRankingsFromGraphQLData(data);
    const rankings = parsed.rankings;
    const availableResponseFields = rankings[0] ? Object.keys(rankings[0]) : [];

    logger.info('FFLogs response metric shape', {
      requestedMetric: metric,
      parserPath: parsed.parserPath,
      parserFound: parsed.parserFound,
      parserError: parsed.parserError,
      characterExists: parsed.characterExists,
      rankingsReturned: rankings.length,
      availableResponseFields,
    });

    return {
      characterName: data?.characterData?.character?.name || characterName,
      server: data?.characterData?.character?.server?.name || server,
      characterExists: parsed.characterExists,
      parserFound: parsed.parserFound,
      parserError: parsed.parserError,
      rankings,
      availableResponseFields,
    };
  }

  normalizeDifficulty(raw) {
    if (raw === null || raw === undefined) return 'unknown';
    const n = Number(raw);
    if (Number.isFinite(n)) {
      if (n === 101) return 'savage';
      if (n === 100) return 'normal';
      if (n === 103) return 'ultimate';
      if (n === 102) return 'extreme';
    }

    const text = this.normalize(raw);
    if (text.includes('savage')) return 'savage';
    if (text.includes('ultimate')) return 'ultimate';
    if (text.includes('extreme')) return 'extreme';
    if (text.includes('normal')) return 'normal';
    return 'unknown';
  }

  normalizeJob(raw) {
    const normalized = this.normalize(raw);
    return this.jobAliases.get(normalized) || normalized || 'unknown';
  }

  normalizeRankings(mergedRankings, context) {
    const parseMaybeNumber = (value) => {
      if (value === null || value === undefined || value === '') return null;
      const n = Number(value);
      return Number.isFinite(n) ? n : null;
    };

    const pickFirstDefined = (...values) => values.find((v) => v !== undefined && v !== null && v !== '');

    const extractReportCode = (entry) => pickFirstDefined(
      entry.reportID,
      entry.reportId,
      entry.code,
      entry.bestRank?.reportID,
      entry.bestRank?.reportId,
      entry.bestRank?.reportCode,
      entry.bestRank?.code,
      entry.fastestKill?.reportID,
      entry.fastestKill?.reportId,
      entry.fastestKill?.reportCode,
      entry.fastestKill?.code,
    ) || null;

    const extractFightId = (entry) => parseMaybeNumber(pickFirstDefined(
      entry.fightID,
      entry.fightId,
      entry.fight,
      entry.bestRank?.fightID,
      entry.bestRank?.fightId,
      entry.bestRank?.fight,
      entry.fastestKill?.fightID,
      entry.fastestKill?.fightId,
      entry.fastestKill?.fight,
      entry.fastestKill?.id,
    ));

    const extractDurationMs = (entry) => parseMaybeNumber(pickFirstDefined(
      entry.duration,
      entry.fastestKill,
      entry.bestRank?.duration,
      entry.bestRank?.fightDuration,
      entry.bestRank?.durationMs,
      entry.fastestKillMs,
      entry.fastestKill?.duration,
      entry.fastestKill?.fightDuration,
      entry.fastestKill?.durationMs,
    ));

    return mergedRankings.map((entry) => {
      const encounterName = entry.encounterName || entry.name || entry.encounter?.name || 'unknown';
      const encounterId = Number(entry.encounterID || entry.encounterId || entry.encounter?.id || 0) || null;
      const difficulty = this.normalizeDifficulty(entry.difficulty || entry.difficultyName);
      const job = this.normalizeJob(entry.spec || entry.job || entry.className || entry.class);
      const reportCode = extractReportCode(entry);
      const fightId = extractFightId(entry);
      const duration = extractDurationMs(entry);

      return {
        encounterName,
        encounterId,
        difficulty,
        characterName: context.characterName,
        server: context.server,
        region: context.region,
        job,
        percentile: Number(entry.percentile ?? entry.rankPercent ?? 0),
        dps: parseMaybeNumber(entry.dps ?? entry.DPS ?? entry.bestAmount ?? entry.bestRank?.per_second_amount),
        rdps: parseMaybeNumber(entry.rdps ?? entry.rDPS ?? entry.bestRank?.rdps),
        ndps: parseMaybeNumber(entry.ndps ?? entry.nDPS ?? entry.bestRank?.ndps),
        cdps: parseMaybeNumber(entry.cdps ?? entry.cDPS ?? entry.bestRank?.cdps),
        wdps: parseMaybeNumber(entry.wdps ?? entry.wDPS ?? entry.bestRank?.wdps),
        adps: parseMaybeNumber(entry.adps ?? entry.aDPS ?? entry.bestRank?.adps),
        reportCode,
        fightId,
        duration,
        rank: entry.rank !== undefined
          ? Number(entry.rank)
          : (entry.allStars?.rank !== undefined ? Number(entry.allStars.rank) : null),
        regionRank: entry.regionRank !== undefined
          ? Number(entry.regionRank)
          : (entry.allStars?.regionRank !== undefined ? Number(entry.allStars.regionRank) : null),
        serverRank: entry.serverRank !== undefined
          ? Number(entry.serverRank)
          : (entry.allStars?.serverRank !== undefined ? Number(entry.allStars.serverRank) : null),
        raw: entry,
      };
    });
  }

  buildCharacterFallbackUrl({ characterName, server, region }) {
    if (!characterName || !server || !region) return 'unavailable';
    const regionSlug = String(region).toLowerCase();
    const serverSlug = this.normalize(server).replace(/\s+/g, '-');
    const characterSlug = encodeURIComponent(this.normalize(characterName).replace(/\s+/g, '-'));
    return `https://www.fflogs.com/character/${regionSlug}/${serverSlug}/${characterSlug}`;
  }

  mergeMetricRankings(metricResponses) {
    const map = new Map();

    for (const { metric, rankings } of metricResponses) {
      for (const row of rankings) {
        const key = [
          row.reportID || row.reportId || row.code || 'none',
          row.fightID || row.fightId || row.fight || 'none',
          row.encounterID || row.encounterId || row.encounter?.id || row.name || row.encounter?.name || 'none',
          row.spec || row.job || row.className || row.bestSpec || 'none',
        ].join('|');

        const current = map.get(key) || { ...row };
        const amount = Number(
          row.amount
          || row.total
          || row.dps
          || row.bestAmount
          || row.bestRank?.per_second_amount
          || 0
        );

        if (this.zoneRankingMetricEnums.includes(metric)) {
          current[metric] = amount;
        }

        if (metric === 'rdps') {
          if (row.rank !== undefined) current.rank = row.rank;
          if (row.regionRank !== undefined) current.regionRank = row.regionRank;
          if (row.serverRank !== undefined) current.serverRank = row.serverRank;
          if (row.allStars?.rank !== undefined) current.rank = row.allStars.rank;
          if (row.allStars?.regionRank !== undefined) current.regionRank = row.allStars.regionRank;
          if (row.allStars?.serverRank !== undefined) current.serverRank = row.allStars.serverRank;
        }

        if (current.percentile === undefined && row.percentile !== undefined) {
          current.percentile = row.percentile;
        }

        map.set(key, current);
      }
    }

    return Array.from(map.values());
  }

  matchesEncounter(candidate, requestedEncounter) {
    if (!requestedEncounter) return true;
    const candidateVariants = this.buildEncounterMatchVariants(candidate.encounterName);
    const requestedVariants = this.buildEncounterMatchVariants(requestedEncounter);

    for (const c of candidateVariants) {
      for (const r of requestedVariants) {
        const normalizedCandidate = this.normalizeEncounterComparison(c);
        const normalizedRequested = this.normalizeEncounterComparison(r);
        const eitherHasPhase = this.hasEncounterPhaseSuffix(normalizedCandidate) || this.hasEncounterPhaseSuffix(normalizedRequested);

        if (normalizedCandidate === normalizedRequested) {
          return true;
        }

        // Prevent "lindwurm" from matching "lindwurm 2" when user explicitly asked phase/numbered encounter.
        if (!eitherHasPhase && (
          normalizedCandidate.includes(normalizedRequested)
          || normalizedRequested.includes(normalizedCandidate)
        )) {
          return true;
        }
      }
    }

    return false;
  }

  validateCandidate(candidate, parsed) {
    const errors = [];

    if (!this.matchesEncounter(candidate, parsed.encounter)) {
      errors.push('encounter mismatch');
    }
    if (parsed.requestedDifficulty && candidate.difficulty !== parsed.requestedDifficulty) {
      errors.push('difficulty mismatch');
    }
    if (parsed.requestedJob && candidate.job !== parsed.requestedJob) {
      errors.push('job mismatch');
    }
    return errors;
  }

  applyFilters(candidates, parsed) {
    const encounterMatched = candidates.filter((c) => this.matchesEncounter(c, parsed.encounter));
    logger.info('FFLogs encounter match', {
      requestedEncounter: parsed.encounter,
      totalCandidates: candidates.length,
      matched: encounterMatched.length,
    });

    let final = encounterMatched;
    if (parsed.requestedJob) {
      const byJob = final.filter((c) => c.job === parsed.requestedJob);
      logger.info('FFLogs job match', {
        requestedJob: parsed.requestedJob,
        matched: byJob.length,
      });
      final = byJob;
    }

    return {
      ok: true,
      candidates: final,
      counts: {
        total: candidates.length,
        encounterMatched: encounterMatched.length,
        afterJob: final.length,
      },
    };
  }

  applyDifficultyRules(candidates, parsed) {
    if (parsed.requestedDifficulty) {
      const strict = candidates.filter((c) => c.difficulty === parsed.requestedDifficulty);
      logger.info('FFLogs difficulty match', {
        requestedDifficulty: parsed.requestedDifficulty,
        strict: true,
        matched: strict.length,
      });
      return strict;
    }

    const savage = candidates.filter((c) => c.difficulty === 'savage');
    const normal = candidates.filter((c) => c.difficulty === 'normal');

    if (savage.length > 0 && normal.length > 0) {
      logger.info('FFLogs difficulty match', {
        requestedDifficulty: null,
        strict: false,
        preferred: 'savage',
      });
      return savage;
    }

    return candidates;
  }

  rankCandidates(candidates, rankingMethod) {
    const sortField = rankingMethod === 'best_parse' ? 'percentile' : rankingMethod;

    const sorted = [...candidates].sort((a, b) => Number(b[sortField] || 0) - Number(a[sortField] || 0));

    logger.info('FFLogs ranking method', {
      rankingMethod,
      sortField,
      candidateResults: sorted.slice(0, 10).map((c) => ({
        encounterName: c.encounterName,
        difficulty: c.difficulty,
        job: c.job,
        percentile: c.percentile,
        dps: c.dps,
        rdps: c.rdps,
        ndps: c.ndps,
        cdps: c.cdps,
        wdps: c.wdps,
        adps: c.adps,
      })),
    });

    return sorted;
  }

  buildPlayerPageUrl(candidate) {
    return this.buildCharacterFallbackUrl(candidate);
  }

  async fetchFightInstanceDetails({ reportCode, fightId }) {
    if (!reportCode || !fightId) {
      return null;
    }

    const query = `
      query ReportFightDetails($code: String!, $fightIDs: [Int!]) {
        reportData {
          report(code: $code) {
            code
            fights(fightIDs: $fightIDs) {
              id
              encounterID
              name
              startTime
              endTime
              kill
            }
          }
        }
      }
    `;

    const variables = {
      code: String(reportCode),
      fightIDs: [Number(fightId)],
    };

    logger.info('FFLogs GraphQL fight-details query variables', { variables });
    logger.debug('FFLogs GraphQL fight-details payload', { query, variables });

    const data = await this.graphQLRequest(query, variables);
    const fights = data?.reportData?.report?.fights;
    if (!Array.isArray(fights) || fights.length === 0) {
      return null;
    }

    const selectedFight = fights.find((fight) => Number(fight?.id) === Number(fightId)) || fights[0];
    if (!selectedFight) {
      return null;
    }

    const startTime = Number(selectedFight.startTime);
    const endTime = Number(selectedFight.endTime);
    const computedDuration = Number.isFinite(startTime) && Number.isFinite(endTime) && endTime > startTime
      ? endTime - startTime
      : null;

    return {
      fightId: Number(selectedFight.id) || null,
      encounterId: Number(selectedFight.encounterID) || null,
      encounterName: selectedFight.name || null,
      duration: computedDuration,
      kill: selectedFight.kill,
      raw: selectedFight,
    };
  }

  async handleQuery(message) {
    const parsed = this.parseRequest(message);
    logger.info('FFLogs parsed selection inputs', {
      parsedCharacterName: parsed.characterName,
      parsedEncounter: parsed.encounter,
      parsedDifficulty: parsed.requestedDifficulty,
      parsedJob: parsed.requestedJob,
    });

    if (!this.hasCredentials()) {
      return {
        ok: false,
        parsed,
        error: 'fflogs is not configured: expected env vars FFLOGS_CLIENT_ID and FFLOGS_CLIENT_SECRET.',
      };
    }

    if (!parsed.characterName) {
      return {
        ok: false,
        parsed,
        error: 'i could not parse a character name for fflogs lookup.',
      };
    }

    if (!parsed.server) {
      return {
        ok: false,
        parsed,
        error: 'i could not parse a world/server. include it like `character@world` or `on world`.',
      };
    }

    try {
      const region = this.inferServerRegion(parsed.server);
      logger.info('FFLogs parsed metric intent', {
        parsedUserMetric: parsed.requestedMetric,
      });

      const requestedMetricIsPercentile = parsed.rankingMethod === 'best_parse';
      const mappedRequestedMetric = requestedMetricIsPercentile
        ? null
        : this.resolveZoneRankingMetric(parsed.requestedMetric);

      if (!requestedMetricIsPercentile && !mappedRequestedMetric.ok) {
        return {
          ok: false,
          parsed,
          error: `metric "${parsed.requestedMetric}" is not available from FFLogs V2 character zoneRankings (${this.zoneRankingMetricEnumType}). Supported metrics for this query path: ${this.zoneRankingMetricEnums.join(', ')}.`,
        };
      }

      const metrics = requestedMetricIsPercentile
        // Keep rdps first so default ranking context (rank / regionRank / serverRank)
        // is sourced from rdps by default.
        ? ['rdps', 'dps', 'ndps']
        : [mappedRequestedMetric.mappedEnum];
      const metricResponses = [];
      const responseMetricShape = new Set();

      for (const metric of metrics) {
        const res = await this.fetchRankingsByMetric({
          characterName: parsed.characterName,
          server: parsed.server,
          region,
          metric,
        });
        for (const field of res.availableResponseFields || []) {
          responseMetricShape.add(field);
        }
        metricResponses.push({
          metric,
          rankings: res.rankings,
          characterName: res.characterName,
          server: res.server,
          characterExists: res.characterExists,
          parserFound: res.parserFound,
          parserError: res.parserError,
        });
      }

      const parserFailures = metricResponses.filter((r) => !r.parserFound);
      if (parserFailures.length > 0) {
        throw new Error(`FFLogs parser could not locate rankings in GraphQL response${parserFailures[0].parserError ? ` (${parserFailures[0].parserError})` : ''}`);
      }

      const characterMissing = metricResponses.every((r) => !r.characterExists);
      if (characterMissing) {
        return {
          ok: true,
          parsed,
          hasData: false,
          data: null,
          noDataMessage: "i couldn't find that character on fflogs.",
        };
      }

      logger.info('FFLogs available metrics in response shape', {
        availableResponseFields: Array.from(responseMetricShape),
      });

      const merged = this.mergeMetricRankings(metricResponses);
      const normalized = this.normalizeRankings(merged, {
        characterName: metricResponses[0]?.characterName || parsed.characterName,
        server: metricResponses[0]?.server || parsed.server,
        region,
      });

      logger.info('FFLogs ranking counts', {
        parsedCharacterName: parsed.characterName,
        parsedEncounter: parsed.encounter,
        parsedDifficulty: parsed.requestedDifficulty,
        parsedJob: parsed.requestedJob,
        rankingsReturned: normalized.length,
      });

      if (normalized.length === 0) {
        return {
          ok: true,
          parsed,
          hasData: false,
          data: null,
          noDataMessage: "i couldn't find a parse for that job or fight.",
        };
      }

      const filterResult = this.applyFilters(normalized, parsed);
      if (!filterResult.ok || filterResult.candidates.length === 0) {
        return {
          ok: true,
          parsed,
          hasData: false,
          data: null,
          noDataMessage: "i couldn't find a parse for that job or fight.",
        };
      }

      logger.info('FFLogs ranking counts after filters', {
        parsedCharacterName: parsed.characterName,
        parsedEncounter: parsed.encounter,
        parsedDifficulty: parsed.requestedDifficulty,
        parsedJob: parsed.requestedJob,
        afterFilters: filterResult.candidates.length,
        ...filterResult.counts,
      });

      const difficultyScoped = this.applyDifficultyRules(filterResult.candidates, parsed);
      if (difficultyScoped.length === 0) {
        return {
          ok: true,
          parsed,
          hasData: false,
          data: null,
          noDataMessage: "i couldn't find a parse for that job or fight.",
        };
      }

      logger.info('FFLogs ranking counts after difficulty', {
        parsedCharacterName: parsed.characterName,
        parsedEncounter: parsed.encounter,
        parsedDifficulty: parsed.requestedDifficulty,
        parsedJob: parsed.requestedJob,
        afterDifficulty: difficultyScoped.length,
      });

      const validated = [];
      const candidateResults = [];
      for (const candidate of difficultyScoped) {
        const errors = this.validateCandidate(candidate, parsed);
        candidateResults.push({
          encounter: candidate.encounterName,
          difficulty: candidate.difficulty,
          job: candidate.job,
          reportCode: candidate.reportCode,
          fightId: candidate.fightId,
          valid: errors.length === 0,
          errors,
        });

        if (errors.length === 0) {
          validated.push(candidate);
        }
      }

      logger.info('FFLogs candidate results', { candidateResults });

      if (validated.length === 0) {
        return {
          ok: false,
          parsed,
          error: 'no candidates passed validation for encounter/difficulty/job/report link.',
        };
      }

      const ranked = this.rankCandidates(validated, parsed.rankingMethod);
      const selected = ranked[0];

      let fightInstanceDetails = null;
      if (selected.reportCode && selected.fightId) {
        try {
          fightInstanceDetails = await this.fetchFightInstanceDetails({
            reportCode: selected.reportCode,
            fightId: selected.fightId,
          });
        } catch (error) {
          logger.warn('FFLogs fight-details lookup failed; continuing with ranking payload fields', {
            reportCode: selected.reportCode,
            fightId: selected.fightId,
            error: error.message,
          });
        }
      }

      const resolvedEncounterName = fightInstanceDetails?.encounterName || selected.encounterName;
      const resolvedEncounterId = fightInstanceDetails?.encounterId || selected.encounterId;
      const resolvedFightId = fightInstanceDetails?.fightId || selected.fightId;
      const resolvedDuration = fightInstanceDetails?.duration || selected.duration || null;

      logger.info('FFLogs selected result', {
        encounterName: resolvedEncounterName,
        encounterId: resolvedEncounterId,
        reportCode: selected.reportCode,
        fightId: resolvedFightId,
        duration: resolvedDuration,
        difficulty: selected.difficulty,
        job: selected.job,
        percentile: selected.percentile,
        dps: selected.dps,
        rdps: selected.rdps,
        ndps: selected.ndps,
        cdps: selected.cdps,
        wdps: selected.wdps,
        adps: selected.adps,
        playerPage: this.buildPlayerPageUrl(selected),
      });

      return {
        ok: true,
        parsed,
        metric: parsed.rankingMethod,
        metricUsed: parsed.requestedMetric,
        hasData: true,
        selectedDifficulty: selected.difficulty,
        selectedJob: selected.job,
        selectedEncounter: resolvedEncounterName,
        data: {
          encounterName: resolvedEncounterName,
          encounterID: resolvedEncounterId,
          difficulty: selected.difficulty,
          characterName: selected.characterName,
          server: selected.server,
          spec: this.titleCase(selected.job),
          percentile: selected.percentile,
          dps: selected.dps,
          rdps: selected.rdps,
          ndps: selected.ndps,
          cdps: selected.cdps,
          wdps: selected.wdps,
          adps: selected.adps,
          reportID: selected.reportCode,
          fightID: resolvedFightId,
          duration: resolvedDuration,
          rank: selected.rank,
          overallRank: selected.rank,
          regionRank: selected.regionRank,
          serverRank: selected.serverRank,
          playerPage: this.buildPlayerPageUrl(selected),
          selectedRaw: selected.raw,
          fightDetailsRaw: fightInstanceDetails?.raw || null,
        },
      };
    } catch (error) {
      logger.error('FFLogs V2 query failed', {
        error: error.message,
        parsed,
      });
      return {
        ok: false,
        parsed,
        error: `fflogs v2 lookup failed: ${error.message}`,
      };
    }
  }
}

module.exports = new FFLogsService();
