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

module.exports = {
  LEAGUES,
  getSportsGuideData
};
