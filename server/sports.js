const { resolveAppsCatalog } = require('./roku');

const LEAGUES = [
  {
    id: 'nfl',
    name: 'NFL',
    shortName: 'NFL',
    sport: 'football',
    category: 'football',
    icon: '🏈',
    url: 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard'
  },
  {
    id: 'ncaaf',
    name: 'College Football',
    shortName: 'NCAAF',
    sport: 'football',
    category: 'football',
    icon: '🏈',
    url: 'https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard?groups=80&limit=100'
  },
  {
    id: 'epl',
    name: 'Premier League',
    shortName: 'EPL',
    sport: 'soccer',
    category: 'soccer',
    icon: '⚽',
    url: 'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard'
  },
  {
    id: 'ucl',
    name: 'Champions League',
    shortName: 'UCL',
    sport: 'soccer',
    category: 'soccer',
    icon: '⚽',
    url: 'https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.champions/scoreboard'
  },
  {
    id: 'mls',
    name: 'MLS',
    shortName: 'MLS',
    sport: 'soccer',
    category: 'soccer',
    icon: '⚽',
    url: 'https://site.api.espn.com/apis/site/v2/sports/soccer/usa.1/scoreboard'
  },
  {
    id: 'laliga',
    name: 'LaLiga',
    shortName: 'LaLiga',
    sport: 'soccer',
    category: 'soccer',
    icon: '⚽',
    url: 'https://site.api.espn.com/apis/site/v2/sports/soccer/esp.1/scoreboard'
  },
  {
    id: 'nba',
    name: 'NBA',
    shortName: 'NBA',
    sport: 'basketball',
    category: 'other',
    icon: '🏀',
    url: 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard'
  },
  {
    id: 'nhl',
    name: 'NHL',
    shortName: 'NHL',
    sport: 'hockey',
    category: 'other',
    icon: '🏒',
    url: 'https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard'
  },
  {
    id: 'ncaam',
    name: 'College Basketball',
    shortName: 'NCAAM',
    sport: 'basketball',
    category: 'other',
    icon: '🏀',
    url: 'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard?limit=60'
  },
  {
    id: 'mlb',
    name: 'MLB',
    shortName: 'MLB',
    sport: 'baseball',
    category: 'other',
    icon: '⚾',
    url: 'https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard'
  },
  {
    id: 'f1',
    name: 'Formula 1',
    shortName: 'F1',
    sport: 'racing',
    category: 'other',
    icon: '🏎️',
    url: 'https://site.api.espn.com/apis/site/v2/sports/racing/f1/scoreboard'
  },
  {
    id: 'pga',
    name: 'PGA Tour',
    shortName: 'PGA Golf',
    sport: 'golf',
    category: 'golf',
    icon: '⛳',
    url: 'https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard'
  }
];

// Normalization rules mapping raw broadcast strings from ESPN to canonical network names
const NETWORK_RULES = [
  { pattern: /\bparamount\+?\b/i, canonical: 'Paramount+', primaryAppKeys: ['paramount'] },
  { pattern: /\bcbs sports network\b|\bcbssn\b/i, canonical: 'CBSSN', primaryAppKeys: ['paramount', 'youtube_tv', 'fubo', 'hulu', 'directv'] },
  { pattern: /\bgolazo\b/i, canonical: 'CBS Sports Golazo', primaryAppKeys: ['paramount'] },
  { pattern: /\bcbs\b/i, canonical: 'CBS', primaryAppKeys: ['paramount', 'youtube_tv', 'fubo', 'hulu', 'directv', 'antenna_tv'] },

  { pattern: /\bpeacock\b/i, canonical: 'Peacock', primaryAppKeys: ['peacock'] },
  { pattern: /\bgolf chnl\b|\bgolf channel\b|\bgolf\b/i, canonical: 'Golf Channel', primaryAppKeys: ['peacock', 'nbc_sports', 'youtube_tv', 'fubo', 'hulu', 'sling', 'directv'] },
  { pattern: /\busa network\b|\busa\b/i, canonical: 'USA Network', primaryAppKeys: ['nbc_sports', 'peacock', 'youtube_tv', 'fubo', 'hulu', 'sling', 'directv'] },
  { pattern: /\btelemundo\b|\buniverso\b/i, canonical: 'Telemundo', primaryAppKeys: ['peacock', 'nbc_sports', 'fubo', 'youtube_tv'] },
  { pattern: /\bnbc\b/i, canonical: 'NBC', primaryAppKeys: ['peacock', 'nbc_sports', 'youtube_tv', 'fubo', 'hulu', 'directv', 'antenna_tv'] },
  { pattern: /\bcnbc\b/i, canonical: 'CNBC', primaryAppKeys: ['nbc_sports', 'peacock', 'youtube_tv', 'fubo', 'hulu'] },

  { pattern: /\bespn\+/i, canonical: 'ESPN+', primaryAppKeys: ['espn', 'hulu'] },
  { pattern: /\bespn2\b/i, canonical: 'ESPN2', primaryAppKeys: ['espn', 'youtube_tv', 'fubo', 'hulu', 'sling', 'directv'] },
  { pattern: /\bespnews\b/i, canonical: 'ESPNEWS', primaryAppKeys: ['espn', 'youtube_tv', 'fubo', 'hulu', 'sling'] },
  { pattern: /\bespnu\b/i, canonical: 'ESPNU', primaryAppKeys: ['espn', 'youtube_tv', 'fubo', 'hulu', 'sling'] },
  { pattern: /\bsec network\b|\bsecn\+?\b/i, canonical: 'SEC Network', primaryAppKeys: ['espn', 'youtube_tv', 'fubo', 'hulu', 'sling', 'directv'] },
  { pattern: /\bacc network\b|\baccn\b|\baccnx\b/i, canonical: 'ACC Network', primaryAppKeys: ['espn', 'youtube_tv', 'fubo', 'hulu', 'sling', 'directv'] },
  { pattern: /\bespn3\b|\bespn deportes\b|\bespn\b/i, canonical: 'ESPN', primaryAppKeys: ['espn', 'youtube_tv', 'fubo', 'hulu', 'sling', 'directv'] },
  { pattern: /\babc\b/i, canonical: 'ABC', primaryAppKeys: ['espn', 'youtube_tv', 'fubo', 'hulu', 'directv', 'antenna_tv'] },

  { pattern: /\bfs1\b|\bfox sports 1\b/i, canonical: 'FS1', primaryAppKeys: ['fox_sports', 'youtube_tv', 'fubo', 'hulu', 'sling', 'directv'] },
  { pattern: /\bfs2\b|\bfox sports 2\b/i, canonical: 'FS2', primaryAppKeys: ['fox_sports', 'youtube_tv', 'fubo', 'hulu', 'sling', 'directv'] },
  { pattern: /\bbig ten network\b|\bbtn\b/i, canonical: 'Big Ten Network', primaryAppKeys: ['fox_sports', 'youtube_tv', 'fubo', 'hulu', 'sling', 'directv'] },
  { pattern: /\bfox one\b|\bfox sports\b|\bfox deportes\b|\bfox\b/i, canonical: 'FOX', primaryAppKeys: ['fox_sports', 'youtube_tv', 'fubo', 'hulu', 'directv', 'antenna_tv'] },

  { pattern: /\bprime video\b|\bamazon\b/i, canonical: 'Prime Video', primaryAppKeys: ['prime_video'] },
  { pattern: /\bnetflix\b/i, canonical: 'Netflix', primaryAppKeys: ['netflix'] },
  { pattern: /\bapple tv\+?\b|\bmls season pass\b/i, canonical: 'Apple TV+', primaryAppKeys: ['apple_tv'] },

  { pattern: /\btnt\b|\btru ?tv\b|\btbs\b|\bmax\b|\bhbo max\b/i, canonical: 'TNT / Max', primaryAppKeys: ['max', 'youtube_tv', 'hulu', 'sling', 'directv'] },
  { pattern: /\bnfl network\b|\bnfl net\b|\bnfl\+\b|\bnfl redzone\b/i, canonical: 'NFL Network', primaryAppKeys: ['nfl', 'youtube_tv', 'fubo', 'hulu', 'sling', 'directv'] },
  { pattern: /\bnba tv\b|\bnba league pass\b/i, canonical: 'NBA TV', primaryAppKeys: ['nba', 'youtube_tv', 'fubo', 'sling', 'directv'] },
  { pattern: /\bmlb network\b|\bmlbn\b|\bmlb\.tv\b/i, canonical: 'MLB Network', primaryAppKeys: ['mlb', 'youtube_tv', 'fubo', 'sling', 'directv'] },
  { pattern: /\bf1 tv\b/i, canonical: 'F1 TV', primaryAppKeys: ['f1_tv', 'espn'] },
  { pattern: /\bcw\b|\bthe cw\b/i, canonical: 'The CW', primaryAppKeys: ['cw', 'youtube_tv', 'fubo', 'hulu', 'directv', 'antenna_tv'] },
  { pattern: /\bdazn\b/i, canonical: 'DAZN', primaryAppKeys: ['dazn'] }
];

// Default fallback networks by league if ESPN doesn't list a national broadcast (e.g., EPL on Peacock/USA, MLS on Apple TV+)
const LEAGUE_DEFAULT_NETWORKS = {
  epl: ['Peacock', 'USA Network'],
  ucl: ['Paramount+'],
  mls: ['Apple TV+'],
  laliga: ['ESPN+'],
  f1: ['ESPN', 'F1 TV'],
  pga: ['Golf Channel', 'ESPN+', 'NBC']
};

function extractRawBroadcasts(event, competition, leagueId) {
  const names = new Set();

  if (Array.isArray(competition?.broadcasts)) {
    for (const b of competition.broadcasts) {
      if (Array.isArray(b.names)) {
        b.names.forEach((n) => names.add(String(n).trim()));
      }
    }
  }

  if (Array.isArray(competition?.geoBroadcasts)) {
    for (const gb of competition.geoBroadcasts) {
      const shortName = gb?.media?.shortName;
      if (shortName) names.add(String(shortName).trim());
    }
  }

  if (event?.broadcast) {
    String(event.broadcast).split(/[/,]/).forEach((n) => {
      if (n.trim()) names.add(n.trim());
    });
  }

  if (names.size === 0 && LEAGUE_DEFAULT_NETWORKS[leagueId]) {
    LEAGUE_DEFAULT_NETWORKS[leagueId].forEach((n) => names.add(n));
  }

  return [...names];
}

function mapBroadcastsToRokuApps(rawBroadcasts, leagueId, appsCatalog) {
  const catalogByKey = new Map(appsCatalog.map((a) => [a.key, a]));
  const matchedAppKeys = new Set();
  const canonicalNetworks = new Set();

  const allTokens = [];
  for (const raw of rawBroadcasts) {
    // Split composite strings like "ABC/ESPN+" or "CBS/Paramount+"
    const parts = raw.split(/\s*[/|]\s*/);
    for (const p of parts) {
      if (p.trim()) allTokens.push(p.trim());
    }
  }

  for (const token of allTokens) {
    let matchedRule = false;
    for (const rule of NETWORK_RULES) {
      if (rule.pattern.test(token)) {
        canonicalNetworks.add(rule.canonical);
        for (const appKey of rule.primaryAppKeys) {
          matchedAppKeys.add(appKey);
        }
        matchedRule = true;
      }
    }
    if (!matchedRule && token) {
      canonicalNetworks.add(token);
    }
  }

  // Fallback for leagues with known streaming homes
  if (matchedAppKeys.size === 0) {
    if (leagueId === 'epl') {
      matchedAppKeys.add('peacock');
      matchedAppKeys.add('nbc_sports');
    } else if (leagueId === 'ucl') {
      matchedAppKeys.add('paramount');
    } else if (leagueId === 'mls') {
      matchedAppKeys.add('apple_tv');
    } else if (leagueId === 'laliga' || leagueId === 'ncaaf' || leagueId === 'ncaam') {
      matchedAppKeys.add('espn');
    } else if (leagueId === 'nfl') {
      matchedAppKeys.add('nfl');
      matchedAppKeys.add('paramount');
      matchedAppKeys.add('fox_sports');
    } else if (leagueId === 'nba') {
      matchedAppKeys.add('nba');
      matchedAppKeys.add('espn');
    } else if (leagueId === 'pga') {
      matchedAppKeys.add('peacock');
      matchedAppKeys.add('nbc_sports');
      matchedAppKeys.add('espn');
    }
  }

  const matchedApps = [...matchedAppKeys]
    .map((key) => catalogByKey.get(key))
    .filter(Boolean);

  // Sort apps:
  // 1. Direct streaming apps (Paramount+, ESPN, Peacock, NBC, FOX Sports, Prime Video, Max) that are installed/enabled first
  // 2. Installed on TV first
  // 3. Direct/League apps before Live TV aggregators
  matchedApps.sort((a, b) => {
    const aDirect = a.category === 'direct' || a.category === 'league' ? 1 : 0;
    const bDirect = b.category === 'direct' || b.category === 'league' ? 1 : 0;
    const aPri = (a.isInstalledOnTv ? 4 : 0) + (a.isEnabled ? 2 : 0) + aDirect;
    const bPri = (b.isInstalledOnTv ? 4 : 0) + (b.isEnabled ? 2 : 0) + bDirect;
    return bPri - aPri;
  });

  return {
    rawBroadcasts,
    networks: [...canonicalNetworks],
    rokuApps: matchedApps.map((app) => ({
      key: app.key,
      name: app.installedName || app.name,
      shortLabel: app.shortLabel,
      rokuId: app.rokuId,
      color: app.color,
      bgGradient: app.bgGradient,
      category: app.category,
      isInstalledOnTv: app.isInstalledOnTv,
      isEnabled: app.isEnabled
    }))
  };
}

function normalizeEvent(event, league, appsCatalog) {
  const competition = event.competitions?.[0] || {};
  const competitors = competition.competitors || [];
  const statusObj = competition.status || event.status || {};
  const state = statusObj?.type?.state || 'pre'; // 'in' | 'pre' | 'post'
  const completed = Boolean(statusObj?.type?.completed);
  const statusDetail = statusObj?.type?.shortDetail || statusObj?.type?.detail || '';

  const awayComp = competitors.find((c) => c.homeAway === 'away') || competitors[1] || competitors[0];
  const homeComp = competitors.find((c) => c.homeAway === 'home') || competitors[0];

  const formatTeam = (comp) => {
    if (!comp || !comp.team) {
      return {
        id: '',
        name: event.shortName || event.name || 'TBD',
        shortName: event.shortName || 'TBD',
        abbreviation: '',
        logo: '',
        score: null,
        rank: null,
        record: ''
      };
    }
    const rank = comp.curatedRank?.current;
    return {
      id: comp.team.id || '',
      name: comp.team.displayName || comp.team.name || '',
      shortName: comp.team.shortDisplayName || comp.team.name || '',
      abbreviation: comp.team.abbreviation || '',
      color: comp.team.color ? `#${comp.team.color}` : '#334155',
      logo: comp.team.logo || comp.team.logos?.[0]?.href || '',
      score: state !== 'pre' ? (comp.score ?? '0') : null,
      winner: Boolean(comp.winner),
      rank: rank && rank <= 25 ? rank : null,
      record: comp.records?.[0]?.summary || ''
    };
  };

  let awayTeam, homeTeam;
  if (league.sport === 'golf') {
    const leader1 = competitors[0] || {};
    const leader2 = competitors[1] || {};
    const athlete1 = leader1.athlete || {};
    const athlete2 = leader2.athlete || {};

    const score1 = leader1.score || leader1.statistics?.[0]?.displayValue || (leader1.status?.displayValue ?? null);
    const score2 = leader2.score || leader2.statistics?.[0]?.displayValue || (leader2.status?.displayValue ?? null);

    awayTeam = {
      id: athlete1.id || '1',
      name: athlete1.displayName || 'Leader',
      shortName: athlete1.shortName || athlete1.displayName || 'Leader',
      abbreviation: '1st',
      color: '#047857',
      logo: athlete1.headshot?.href || 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/leagues/500/pgatour.png',
      score: score1,
      rank: 1,
      record: leader1.status?.displayThru ? `Thru ${leader1.status.displayThru}` : ''
    };

    homeTeam = {
      id: athlete2.id || '2',
      name: athlete2.displayName || (competition.venue?.fullName || 'Field'),
      shortName: athlete2.shortName || athlete2.displayName || '2nd',
      abbreviation: competitors.length > 1 ? '2nd' : 'PGA',
      color: '#10b981',
      logo: athlete2.headshot?.href || 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/leagues/500/pgatour.png',
      score: score2,
      rank: 2,
      record: leader2.status?.displayThru ? `Thru ${leader2.status.displayThru}` : ''
    };
  } else {
    awayTeam = formatTeam(awayComp);
    homeTeam = formatTeam(homeComp);
  }

  const rawBroadcasts = extractRawBroadcasts(event, competition, league.id);
  const { networks, rokuApps } = mapBroadcastsToRokuApps(rawBroadcasts, league.id, appsCatalog);

  const startDate = new Date(event.date);
  const now = new Date();
  const diffMinutes = Math.round((startDate.getTime() - now.getTime()) / 60000);

  // Extract odds or headline if available
  const odds = competition.odds?.[0]?.details || '';
  const headline = competition.notes?.[0]?.headline || '';
  const venue = competition.venue?.fullName || '';

  return {
    id: `${league.id}-${event.id}`,
    espnId: event.id,
    leagueId: league.id,
    leagueName: league.name,
    leagueShort: league.shortName,
    sport: league.sport,
    category: league.category,
    icon: league.icon,
    title: event.name || `${awayTeam.shortName} vs ${homeTeam.shortName}`,
    shortTitle: event.shortName || `${awayTeam.abbreviation} @ ${homeTeam.abbreviation}`,
    date: event.date,
    startTimeMs: startDate.getTime(),
    minutesUntilStart: diffMinutes,
    state, // 'in' (live), 'pre' (upcoming), 'post' (final)
    isLive: state === 'in',
    isUpcoming: state === 'pre',
    isFinal: state === 'post' || completed,
    statusText: statusDetail,
    period: statusObj.period || 0,
    displayClock: statusObj.displayClock || '',
    awayTeam,
    homeTeam,
    venue,
    odds,
    headline,
    rawBroadcasts,
    networks,
    rokuApps,
    primaryApp: rokuApps[0] || null
  };
}

// Simple in-memory cache so repeated refreshes are instant
let sportsCache = {
  timestamp: 0,
  events: []
};

async function fetchLeagueEvents(league, appsCatalog) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);
    const res = await fetch(league.url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return [];
    const data = await res.json();
    const events = Array.isArray(data.events) ? data.events : [];
    return events.map((ev) => normalizeEvent(ev, league, appsCatalog));
  } catch (err) {
    console.error(`Failed fetching ${league.id}:`, err.message);
    return [];
  }
}

async function getSportsGuideData({ installedApps = [], enabledAppKeys = [], forceRefresh = false } = {}) {
  const appsCatalog = resolveAppsCatalog(installedApps, enabledAppKeys);
  const now = Date.now();

  if (!forceRefresh && sportsCache.events.length > 0 && now - sportsCache.timestamp < 45 * 1000) {
    // Re-map apps against current installed/enabled state
    return {
      updatedAt: new Date(sportsCache.timestamp).toISOString(),
      leagues: LEAGUES,
      appsCatalog,
      games: sportsCache.events.map((game) => {
        const { networks, rokuApps } = mapBroadcastsToRokuApps(game.rawBroadcasts, game.leagueId, appsCatalog);
        return {
          ...game,
          networks,
          rokuApps,
          primaryApp: rokuApps[0] || null
        };
      })
    };
  }

  let allGames = [];
  try {
    const results = await Promise.all(
      LEAGUES.map((league) => fetchLeagueEvents(league, appsCatalog))
    );
    allGames = results.flat();
  } catch (fetchErr) {
    console.warn('Network error fetching sports leagues:', fetchErr.message);
  }

  // If ESPN network calls failed or returned empty, reuse previous valid events
  if (allGames.length === 0 && sportsCache.events.length > 0) {
    allGames = sportsCache.events;
  }

  // Sort order:
  // 1. Live games ('in') first, sorted by marquee leagues (NFL, NCAAF, EPL, UCL, NBA, NHL, etc.)
  // 2. Upcoming games ('pre'), sorted chronologically by start time
  // 3. Recently completed games ('post'), sorted most recent first
  const leaguePriority = {
    nfl: 1,
    ncaaf: 2,
    epl: 3,
    ucl: 4,
    nba: 5,
    nhl: 6,
    ncaam: 7,
    mls: 8,
    pga: 8,
    laliga: 9,
    mlb: 10,
    f1: 11
  };

  allGames.sort((a, b) => {
    const stateOrder = { in: 0, pre: 1, post: 2 };
    const sA = stateOrder[a.state] ?? 1;
    const sB = stateOrder[b.state] ?? 1;
    if (sA !== sB) return sA - sB;

    if (a.state === 'in') {
      const pA = leaguePriority[a.leagueId] || 99;
      const pB = leaguePriority[b.leagueId] || 99;
      if (pA !== pB) return pA - pB;
      return a.startTimeMs - b.startTimeMs;
    }

    if (a.state === 'pre') {
      if (a.startTimeMs !== b.startTimeMs) return a.startTimeMs - b.startTimeMs;
      return (leaguePriority[a.leagueId] || 99) - (leaguePriority[b.leagueId] || 99);
    }

    return b.startTimeMs - a.startTimeMs;
  });

  sportsCache = {
    timestamp: now,
    events: allGames
  };

  return {
    updatedAt: new Date(now).toISOString(),
    leagues: LEAGUES,
    appsCatalog,
    games: allGames
  };
}

// Cache for ESPN event boxscores so repeated player questions are fast
const boxscoreCache = new Map();

async function fetchEventBoxscore(league, eventId) {
  const cacheKey = `${league.id}:${eventId}`;
  const now = Date.now();
  if (boxscoreCache.has(cacheKey)) {
    const cached = boxscoreCache.get(cacheKey);
    if (now - cached.timestamp < 30000) return cached.data;
  }

  try {
    // Convert scoreboard URL to summary URL
    const baseUrl = league.url.split('/scoreboard')[0];
    const summaryUrl = `${baseUrl}/summary?event=${encodeURIComponent(eventId)}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(summaryUrl, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    boxscoreCache.set(cacheKey, { timestamp: now, data });
    return data;
  } catch {
    return null;
  }
}

function parseAthleteFromBoxscore(summaryData, queryWords) {
  const playersGroups = summaryData?.boxscore?.players || [];
  let bestMatch = null;
  const nonNameLeadWords = new Set([
    'does', 'did', 'has', 'have', 'how', 'many', 'points', 'rebounds', 'assists',
    'yards', 'goals', 'stats', 'for', 'about', 'is', 'what', 'who', 'in', 'on', 'the', 'and'
  ]);

  for (const teamGroup of playersGroups) {
    const teamName = teamGroup.team?.displayName || teamGroup.team?.name || '';
    const statCategories = teamGroup.statistics || [];

    for (const cat of statCategories) {
      const labels = cat.labels || [];
      const catName = cat.name || '';
      const athletes = cat.athletes || [];

      for (const entry of athletes) {
        const ath = entry.athlete || {};
        const fullName = (ath.displayName || '').toLowerCase();
        if (!fullName) continue;

        const nameParts = fullName.split(/\s+/);
        const firstName = nameParts[0];
        const lastName = nameParts[nameParts.length - 1];

        const isFullMatch = queryWords.includes(fullName);
        let isLastMatch = false;
        if (!isFullMatch && lastName.length >= 4) {
          const lastRegex = new RegExp(`(?:^|\\s)([a-z0-9']+\\s+)?\\b${lastName}\\b`, 'i');
          const m = queryWords.match(lastRegex);
          if (m) {
            const precedingWord = (m[1] || '').trim().toLowerCase();
            // Only accept a last-name-only match if the preceding word is a question/filler word (e.g., "does Brunson have")
            if (!precedingWord || nonNameLeadWords.has(precedingWord) || precedingWord === firstName) {
              isLastMatch = true;
            }
          }
        }

        if (isFullMatch || isLastMatch) {
          const statsArr = entry.stats || [];
          const statPairs = [];
          for (let i = 0; i < labels.length && i < statsArr.length; i++) {
            statPairs.push({ label: labels[i], value: statsArr[i] });
          }
          bestMatch = {
            name: ath.displayName,
            team: teamName,
            position: ath.position?.abbreviation || '',
            didNotPlay: Boolean(entry.didNotPlay),
            reason: entry.reason || '',
            category: catName,
            statPairs
          };
          if (isFullMatch) return bestMatch;
        }
      }
    }
  }
  return bestMatch;
}

function formatAthleteStatAnswer(match, game) {
  const scoreSummary = `${game.awayTeam.shortName} ${game.awayTeam.score ?? 0}, ${game.homeTeam.shortName} ${game.homeTeam.score ?? 0} (${game.statusText})`;
  if (match.didNotPlay) {
    return `${match.name} (${match.team}) has not played (${match.reason || 'DNP'}). Score: ${scoreSummary}.`;
  }
  if (!match.statPairs || match.statPairs.length === 0) {
    return `${match.name} is active for the ${match.team}, but has no recorded stats yet. Score: ${scoreSummary}.`;
  }

  const statMap = {};
  for (const p of match.statPairs) {
    statMap[p.label.toUpperCase()] = p.value;
  }

  // Basketball formatting (PTS, REB, AST, FG, 3PT, MIN)
  if (statMap.PTS !== undefined) {
    const pts = statMap.PTS;
    const reb = statMap.REB ?? '0';
    const ast = statMap.AST ?? '0';
    const fg = statMap.FG ? ` (${statMap.FG} FG)` : '';
    const min = statMap.MIN ? ` in ${statMap.MIN} MIN` : '';
    return `🏀 ${match.name} (${match.team}) has ${pts} points, ${reb} rebounds, and ${ast} assists${fg}${min}. [${scoreSummary}]`;
  }

  // Football formatting (C/ATT, YDS, TD, INT, CAR)
  if (statMap['C/ATT'] !== undefined) {
    return `🏈 ${match.name} (${match.team}) is ${statMap['C/ATT']} for ${statMap.YDS || 0} passing yards, ${statMap.TD || 0} TD, ${statMap.INT || 0} INT. [${scoreSummary}]`;
  }
  if (statMap.CAR !== undefined) {
    return `🏈 ${match.name} (${match.team}) has ${statMap.CAR} carries for ${statMap.YDS || 0} rushing yards and ${statMap.TD || 0} TD. [${scoreSummary}]`;
  }
  if (statMap.REC !== undefined) {
    return `🏈 ${match.name} (${match.team}) has ${statMap.REC} catches for ${statMap.YDS || 0} receiving yards and ${statMap.TD || 0} TD. [${scoreSummary}]`;
  }

  // Generic stat summary
  const topStats = match.statPairs.slice(0, 5).map((s) => `${s.value} ${s.label}`).join(', ');
  return `📊 ${match.name} (${match.team}): ${topStats}. [${scoreSummary}]`;
}

async function answerSportsQuestion(rawQuery, installedApps = [], enabledAppKeys = []) {
  const q = String(rawQuery || '').trim();
  const lower = q.toLowerCase();

  const guide = await getSportsGuideData({ installedApps, enabledAppKeys, forceRefresh: false });
  const games = guide.games || [];

  // 1. Check if query mentions a specific team
  const teamMatchedGames = games.filter((g) => {
    const away = `${g.awayTeam.name} ${g.awayTeam.shortName} ${g.awayTeam.abbreviation}`.toLowerCase();
    const home = `${g.homeTeam.name} ${g.homeTeam.shortName} ${g.homeTeam.abbreviation}`.toLowerCase();
    const words = lower.replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter((w) => w.length >= 3);
    const stopWords = new Set(['the', 'and', 'for', 'has', 'have', 'any', 'how', 'many', 'points', 'score', 'game', 'what', 'who', 'winning', 'playing', 'channel', 'watch', 'does', 'did']);
    return words.some((w) => !stopWords.has(w) && (away.includes(w) || home.includes(w)));
  });

  // Candidate games to inspect boxscores for (prioritize team-matched games, then major pro live/final games)
  const seenIds = new Set();
  const candidateGames = [];
  const proLeagues = new Set(['nba', 'nfl', 'nhl', 'mlb']);
  const sortedActiveOrFinal = games
    .filter((x) => x.isLive || x.isFinal)
    .sort((a, b) => (proLeagues.has(b.leagueId) ? 1 : 0) - (proLeagues.has(a.leagueId) ? 1 : 0));

  for (const g of [...teamMatchedGames, ...sortedActiveOrFinal]) {
    if (!seenIds.has(g.id) && candidateGames.length < 18) {
      seenIds.add(g.id);
      candidateGames.push(g);
    }
  }

  // 2. If query asks about player stats / points / yards / rebounds / assists / goals / or "does [Name] have"
  const isPlayerStatQuestion = /\b(points|pts|rebounds|reb|assists|ast|yards|yds|touchdowns|tds|goals|stats|scoring|how many|does .* have|did .* score)\b/i.test(lower);

  if (isPlayerStatQuestion || candidateGames.length > 0) {
    const boxResults = await Promise.all(
      candidateGames.map(async (g) => {
        const leagueObj = LEAGUES.find((l) => l.id === g.leagueId);
        if (!leagueObj) return null;
        const summary = await fetchEventBoxscore(leagueObj, g.espnId || g.id);
        if (!summary) return null;
        const match = parseAthleteFromBoxscore(summary, lower);
        return match ? { match, game: g } : null;
      })
    );

    const foundPlayer = boxResults.find(Boolean);
    if (foundPlayer) {
      return {
        answer: formatAthleteStatAnswer(foundPlayer.match, foundPlayer.game),
        game: foundPlayer.game
      };
    }
  }

  // 3. If it matched a team's game, answer with the live score, clock, broadcast channel, or player unavailable note
  if (teamMatchedGames.length > 0) {
    const g = teamMatchedGames[0];
    const channelStr = g.networks?.length ? ` airing on ${g.networks.join(', ')}` : '';
    if (isPlayerStatQuestion) {
      const scoreInfo = g.isUpcoming
        ? `${g.awayTeam.shortName} vs ${g.homeTeam.shortName} starts at ${g.statusText}${channelStr}.`
        : `${g.awayTeam.shortName} ${g.awayTeam.score ?? 0}, ${g.homeTeam.shortName} ${g.homeTeam.score ?? 0} (${g.statusText})${channelStr}.`;
      return {
        answer: `I couldn't find that player in the ${g.awayTeam.shortName} vs ${g.homeTeam.shortName} boxscore. Current game status: ${scoreInfo}`,
        game: g
      };
    }

    if (g.isUpcoming) {
      return {
        answer: `${g.icon} ${g.awayTeam.name} at ${g.homeTeam.name} is scheduled for ${g.statusText}${channelStr}.`,
        game: g
      };
    }
    return {
      answer: `${g.icon} ${g.awayTeam.name} ${g.awayTeam.score ?? 0}, ${g.homeTeam.name} ${g.homeTeam.score ?? 0} (${g.statusText})${channelStr}.`,
      game: g
    };
  }

  // 4. General live games summary
  const liveGames = games.filter((g) => g.isLive);
  if (liveGames.length > 0) {
    const topLive = liveGames.slice(0, 3).map((g) => `${g.awayTeam.shortName} ${g.awayTeam.score}-${g.homeTeam.score} ${g.homeTeam.shortName}`).join(' • ');
    return {
      answer: `There are ${liveGames.length} live games right now: ${topLive}. Ask me about any team or player!`,
      game: null
    };
  }

  return {
    answer: `I couldn't find an active game matching "${q}". Try asking about a team on today's schedule or say "Watch ESPN".`,
    game: null
  };
}

module.exports = {
  LEAGUES,
  getSportsGuideData,
  answerSportsQuestion
};

