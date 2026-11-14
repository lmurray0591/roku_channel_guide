const state = {
  tvConnected: false,
  activeTv: null,
  activeTvIp: null,
  savedTvs: [],
  discoveredTvs: [],
  device: null,
  activeApp: null,
  installedApps: [],
  appsCatalog: [],
  enabledAppKeys: [],
  games: [],
  timeFilters: ['all'],   // Multi-filter set: 'all' | 'live' | 'upcoming' | 'today'
  sportFilters: ['all'],  // Multi-filter set: 'all' | specific sport keys
  appFilters: ['all'],    // Multi-filter set: 'all' | specific app keys
  searchQuery: ''
};

const els = {
  toast: document.getElementById('toast'),
  tvStatusBtn: document.getElementById('tvStatusBtn'),
  tvStatusDot: document.getElementById('tvStatusDot'),
  tvStatusText: document.getElementById('tvStatusText'),
  tvPowerBtn: document.getElementById('tvPowerBtn'),
  tvPowerIcon: document.getElementById('tvPowerIcon'),
  tvPowerLabel: document.getElementById('tvPowerLabel'),
  voiceBtn: document.getElementById('voiceBtn'),
  modalWakeBtn: document.getElementById('modalWakeBtn'),
  activeTvCard: document.getElementById('activeTvCard'),
  activeTvDot: document.getElementById('activeTvDot'),
  activeTvName: document.getElementById('activeTvName'),
  activeTvBadge: document.getElementById('activeTvBadge'),
  activeTvMeta: document.getElementById('activeTvMeta'),
  savedTvsList: document.getElementById('savedTvsList'),
  discoverTvBtn: document.getElementById('discoverTvBtn'),
  discoveredTvsContainer: document.getElementById('discoveredTvsContainer'),
  discoveredTvsList: document.getElementById('discoveredTvsList'),
  manualIpInput: document.getElementById('manualIpInput'),
  manualNameInput: document.getElementById('manualNameInput'),
  connectIpBtn: document.getElementById('connectIpBtn'),
  searchInput: document.getElementById('searchInput'),
  clearSearchBtn: document.getElementById('clearSearchBtn'),
  myAppsBtn: document.getElementById('myAppsBtn'),
  refreshBtn: document.getElementById('refreshBtn'),
  timeFilterRail: document.getElementById('timeFilterRail'),
  sportsFilterBtn: document.getElementById('sportsFilterBtn'),
  sportsFilterLabel: document.getElementById('sportsFilterLabel'),
  sportsModal: document.getElementById('sportsModal'),
  sportsMultiList: document.getElementById('sportsMultiList'),
  sportsSelectAllBtn: document.getElementById('sportsSelectAllBtn'),
  sportsClearBtn: document.getElementById('sportsClearBtn'),
  appsFilterBtn: document.getElementById('appsFilterBtn'),
  appsFilterLabel: document.getElementById('appsFilterLabel'),
  appsModal: document.getElementById('appsModal'),
  appsMultiList: document.getElementById('appsMultiList'),
  appsSelectAllBtn: document.getElementById('appsSelectAllBtn'),
  appsClearBtn: document.getElementById('appsClearBtn'),
  liveCountBadge: document.getElementById('liveCountBadge'),
  gamesContainer: document.getElementById('gamesContainer'),
  quickAppStrip: document.getElementById('quickAppStrip'),
  openRemoteBtn: document.getElementById('openRemoteBtn'),
  setupModal: document.getElementById('setupModal'),
  remoteModal: document.getElementById('remoteModal'),
  voiceModal: document.getElementById('voiceModal'),
  voiceOrb: document.getElementById('voiceOrb'),
  voiceLiveStatus: document.getElementById('voiceLiveStatus'),
  voiceTranscriptPreview: document.getElementById('voiceTranscriptPreview'),
  appsChecklist: document.getElementById('appsChecklist'),
  remoteActiveAppLabel: document.getElementById('remoteActiveAppLabel')
};

let toastTimer = null;
function showToast(msg) {
  els.toast.textContent = msg;
  els.toast.classList.add('visible');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    els.toast.classList.remove('visible');
  }, 3200);
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatGameTime(isoDate, isLive, isFinal, statusText) {
  if (isLive) {
    return statusText || 'LIVE';
  }
  if (isFinal) {
    return statusText || 'FINAL';
  }
  const date = new Date(isoDate);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (isToday) return `Today • ${timeStr}`;
  if (isTomorrow) return `Tomorrow • ${timeStr}`;

  const dayStr = date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  return `${dayStr} • ${timeStr}`;
}

function isSameLocalDay(isoDate) {
  const d = new Date(isoDate);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

async function fetchStatus() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    state.tvConnected = data.connected;
    state.activeTvIp = data.activeTvIp || data.configuredIp;
    state.activeTv = data.activeTv;
    state.savedTvs = data.savedTvs || [];
    state.device = data.device;
    state.activeApp = data.activeApp;
    state.installedApps = data.installedApps || [];
    state.appsCatalog = data.appsCatalog || [];
    state.enabledAppKeys = data.enabledAppKeys || [];

    updateTvStatusUI();
    renderSavedTvs();
    renderQuickAppStrip();
    renderSetupModalApps();
  } catch (err) {
    console.error('Status fetch error:', err);
  }
}

async function fetchGuide(forceRefresh = false) {
  try {
    const url = forceRefresh ? '/api/guide?refresh=1' : '/api/guide';
    const res = await fetch(url);
    const data = await res.json();
    state.games = data.games || [];
    if (data.appsCatalog) {
      state.appsCatalog = data.appsCatalog;
    }
    updateLiveCount();
    updateFilterLabels();
    renderGames();
    renderQuickAppStrip();
  } catch (err) {
    console.error('Guide fetch error:', err);
    if (!state.games || state.games.length === 0) {
      els.gamesContainer.innerHTML = `<div class="empty-state">Unable to load sports schedule. Tap ↻ to retry.</div>`;
    } else {
      showToast('⚠️ Could not refresh live scores (showing cached schedule)');
    }
  }
}

function updateTvStatusUI() {
  const tvName = state.activeTv?.name || state.device?.name || 'Roku TV';
  const tvIp = state.activeTvIp || state.device?.ip || '';

  if (state.tvConnected && state.device) {
    els.tvStatusBtn.classList.add('connected');
    els.tvStatusDot.classList.add('online');
    const activeSuffix = state.activeApp && state.activeApp.name !== 'Roku'
      ? ` • ${state.activeApp.name}`
      : '';
    els.tvStatusText.textContent = `${tvName}${activeSuffix}`;

    els.activeTvDot.classList.add('online');
    els.activeTvName.textContent = tvName;
    els.activeTvBadge.textContent = 'Connected';
    els.activeTvBadge.className = 'tv-badge online';
    els.activeTvMeta.textContent = `${tvIp} • ${state.installedApps.length} Roku apps detected`;
    els.remoteActiveAppLabel.textContent = `${tvName} (${tvIp})`;

    if (els.tvPowerBtn) {
      els.tvPowerBtn.classList.add('tv-on');
      els.tvPowerBtn.title = 'TV is ON (tap to turn off)';
      els.tvPowerIcon.textContent = '🟢';
      els.tvPowerLabel.textContent = 'TV On';
    }
    if (els.modalWakeBtn) {
      els.modalWakeBtn.style.display = 'none';
    }
  } else if (state.activeTvIp) {
    els.tvStatusBtn.classList.remove('connected');
    els.tvStatusDot.classList.remove('online');
    els.tvStatusText.textContent = `${tvName} (Standby)`;

    els.activeTvDot.classList.remove('online');
    els.activeTvName.textContent = tvName;
    els.activeTvBadge.textContent = 'Standby / Off';
    els.activeTvBadge.className = 'tv-badge';
    els.activeTvMeta.textContent = `${tvIp} • TV is off or in standby`;
    els.remoteActiveAppLabel.textContent = `${tvName} (${tvIp})`;

    if (els.tvPowerBtn) {
      els.tvPowerBtn.classList.remove('tv-on');
      els.tvPowerBtn.title = 'TV is off / standby (tap to wake)';
      els.tvPowerIcon.textContent = '⚡';
      els.tvPowerLabel.textContent = 'Wake TV';
    }
    if (els.modalWakeBtn) {
      els.modalWakeBtn.style.display = 'inline-block';
    }
  } else {
    els.tvStatusBtn.classList.remove('connected');
    els.tvStatusDot.classList.remove('online');
    els.tvStatusText.textContent = 'Connect TV';

    els.activeTvDot.classList.remove('online');
    els.activeTvName.textContent = 'No TV Selected';
    els.activeTvBadge.textContent = 'Not Connected';
    els.activeTvBadge.className = 'tv-badge';
    els.activeTvMeta.textContent = 'Auto-scan your Wi-Fi below or enter a TV IP';
    els.remoteActiveAppLabel.textContent = 'Not connected';

    if (els.tvPowerBtn) {
      els.tvPowerBtn.classList.remove('tv-on');
      els.tvPowerBtn.title = 'Connect TV first';
      els.tvPowerIcon.textContent = '⚡';
      els.tvPowerLabel.textContent = 'TV Off';
    }
    if (els.modalWakeBtn) {
      els.modalWakeBtn.style.display = 'none';
    }
  }
}

function renderSavedTvs() {
  if (state.savedTvs.length === 0) {
    els.savedTvsList.innerHTML = `
      <div style="font-size: 0.8rem; color: var(--text-muted); padding: 8px 4px;">
        No saved TVs yet. Scan Wi-Fi or add your TV IP below.
      </div>
    `;
    return;
  }

  els.savedTvsList.innerHTML = state.savedTvs
    .map((tv) => {
      const isActive = (tv.ip === state.activeTvIp);
      return `
        <div class="saved-tv-item ${isActive ? 'active' : ''}" data-tv-ip="${escapeHtml(tv.ip)}">
          <div class="tv-item-info">
            <span class="status-dot ${isActive && state.tvConnected ? 'online' : ''}"></span>
            <div>
              <div class="tv-item-name">${escapeHtml(tv.name || 'Roku TV')} ${isActive ? '<span style="color: var(--accent-blue); font-size: 0.72rem;">(Active)</span>' : ''}</div>
              <div class="tv-item-ip">${escapeHtml(tv.ip)} ${tv.modelName ? `• ${escapeHtml(tv.modelName)}` : ''}</div>
            </div>
          </div>
          <div class="tv-item-actions">
            <button class="forget-tv-btn" title="Remove TV" data-forget-ip="${escapeHtml(tv.ip)}">✕</button>
          </div>
        </div>
      `;
    })
    .join('');

  els.savedTvsList.querySelectorAll('.saved-tv-item').forEach((item) => {
    item.addEventListener('click', (e) => {
      if (e.target.closest('.forget-tv-btn')) return;
      const ip = item.getAttribute('data-tv-ip');
      selectTv(ip);
    });
  });

  els.savedTvsList.querySelectorAll('.forget-tv-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const ip = btn.getAttribute('data-forget-ip');
      forgetTv(ip);
    });
  });
}

function renderDiscoveredTvs() {
  if (state.discoveredTvs.length === 0) {
    els.discoveredTvsContainer.style.display = 'none';
    return;
  }

  els.discoveredTvsContainer.style.display = 'block';
  els.discoveredTvsList.innerHTML = state.discoveredTvs
    .map((dev) => `
      <div class="saved-tv-item" style="border-style: dashed;">
        <div class="tv-item-info">
          <span class="status-dot online"></span>
          <div>
            <div class="tv-item-name">${escapeHtml(dev.name)}</div>
            <div class="tv-item-ip">${escapeHtml(dev.ip)} • ${escapeHtml(dev.modelName || 'Roku')}</div>
          </div>
        </div>
        <button class="primary-btn" style="padding: 6px 12px; font-size: 0.78rem;" data-add-ip="${escapeHtml(dev.ip)}" data-add-name="${escapeHtml(dev.name)}">
          + Connect
        </button>
      </div>
    `)
    .join('');

  els.discoveredTvsList.querySelectorAll('[data-add-ip]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const ip = btn.getAttribute('data-add-ip');
      const name = btn.getAttribute('data-add-name');
      selectTv(ip, name);
    });
  });
}

async function selectTv(ip, name = '') {
  showToast(`📺 Connecting to ${name || ip}...`);
  try {
    const res = await fetch('/api/roku/select-tv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip })
    });
    const data = await res.json();
    if (res.ok) {
      state.tvConnected = data.connected;
      state.activeTvIp = data.activeTvIp;
      state.activeTv = data.activeTv;
      state.device = data.device;
      state.savedTvs = data.savedTvs || [];
      state.installedApps = data.installedApps || [];
      state.appsCatalog = data.appsCatalog || [];
      updateTvStatusUI();
      renderSavedTvs();
      renderQuickAppStrip();
      renderGames();
      showToast(`✅ Active TV set to ${data.activeTv?.name || ip}!`);
    } else {
      showToast(`⚠️ ${data.error || 'Failed to switch TV'}`);
    }
  } catch (err) {
    showToast(`⚠️ Connection error: ${err.message}`);
  }
}

async function forgetTv(ip) {
  try {
    const res = await fetch('/api/roku/forget-tv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip })
    });
    const data = await res.json();
    if (res.ok) {
      showToast('🗑️ TV removed');
      await fetchStatus();
      await fetchGuide(false);
    }
  } catch (err) {
    showToast(`⚠️ Error: ${err.message}`);
  }
}

function updateLiveCount() {
  const liveCount = state.games.filter((g) => g.isLive).length;
  els.liveCountBadge.textContent = String(liveCount);
}

const SPORTS_LIST = [
  { key: 'nfl', name: 'NFL', icon: '🏈' },
  { key: 'ncaaf', name: 'College Football', icon: '🏈' },
  { key: 'nba', name: 'NBA', icon: '🏀' },
  { key: 'ncaam', name: 'College Basketball', icon: '🏀' },
  { key: 'soccer', name: 'Soccer (EPL/UCL/MLS)', icon: '⚽' },
  { key: 'nhl', name: 'NHL Hockey', icon: '🏒' },
  { key: 'mlb', name: 'MLB Baseball', icon: '⚾' },
  { key: 'pga', name: 'PGA Tour Golf', icon: '⛳' },
  { key: 'f1', name: 'Formula 1', icon: '🏎️' }
];

function updateFilterLabels() {
  // 1. Sports trigger button label
  if (state.sportFilters.includes('all') || state.sportFilters.length === 0) {
    els.sportsFilterLabel.textContent = 'All Sports';
    els.sportsFilterBtn.classList.remove('has-active-filters');
  } else if (state.sportFilters.length === 1) {
    const s = SPORTS_LIST.find((item) => item.key === state.sportFilters[0]);
    els.sportsFilterLabel.textContent = s ? `${s.icon} ${s.name}` : state.sportFilters[0].toUpperCase();
    els.sportsFilterBtn.classList.add('has-active-filters');
  } else {
    els.sportsFilterLabel.textContent = `${state.sportFilters.length} Sports`;
    els.sportsFilterBtn.classList.add('has-active-filters');
  }

  // 2. Apps trigger button label
  if (state.appFilters.includes('all') || state.appFilters.length === 0) {
    els.appsFilterLabel.textContent = 'All Apps';
    els.appsFilterBtn.classList.remove('has-active-filters');
  } else if (state.appFilters.length === 1) {
    const app = state.appsCatalog.find((a) => a.key === state.appFilters[0]);
    els.appsFilterLabel.textContent = app ? app.shortLabel : state.appFilters[0];
    els.appsFilterBtn.classList.add('has-active-filters');
  } else {
    els.appsFilterLabel.textContent = `${state.appFilters.length} Apps`;
    els.appsFilterBtn.classList.add('has-active-filters');
  }
}

function renderSportsModal() {
  els.sportsMultiList.innerHTML = SPORTS_LIST.map((sport) => {
    const isSelected = state.sportFilters.includes(sport.key);
    return `
      <div class="multi-select-item ${isSelected ? 'selected' : ''}" data-sport-key="${escapeHtml(sport.key)}">
        <div style="font-weight: 600; font-size: 0.84rem;">
          <span>${sport.icon}</span>
          <span>${escapeHtml(sport.name)}</span>
        </div>
        <span style="font-size: 0.88rem;">${isSelected ? '☑️' : '⬜'}</span>
      </div>
    `;
  }).join('');

  els.sportsMultiList.querySelectorAll('.multi-select-item').forEach((item) => {
    item.addEventListener('click', () => {
      const key = item.getAttribute('data-sport-key');
      let current = state.sportFilters.filter((f) => f !== 'all');
      if (current.includes(key)) {
        current = current.filter((f) => f !== key);
      } else {
        current.push(key);
      }
      state.sportFilters = current.length > 0 ? current : ['all'];
      renderSportsModal();
      updateFilterLabels();
      renderGames();
    });
  });
}

function renderAppsModal() {
  const countsByApp = new Map();
  for (const game of state.games) {
    if (game.isFinal) continue;
    for (const app of game.rokuApps || []) {
      countsByApp.set(app.key, (countsByApp.get(app.key) || 0) + 1);
    }
  }

  const directApps = state.appsCatalog.filter(
    (a) => a.isEnabled || a.isInstalledOnTv || (countsByApp.get(a.key) || 0) > 0
  );

  els.appsMultiList.innerHTML = directApps.map((app) => {
    const isSelected = state.appFilters.includes(app.key);
    const count = countsByApp.get(app.key) || 0;
    return `
      <div class="multi-select-item ${isSelected ? 'selected' : ''}" data-app-key="${escapeHtml(app.key)}">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="app-dot" style="background: ${escapeHtml(app.color)};"></span>
          <div>
            <div style="font-weight: 700; font-size: 0.84rem;">${escapeHtml(app.shortLabel)}</div>
            <div style="font-size: 0.68rem; color: var(--text-muted);">${count} games</div>
          </div>
        </div>
        <span style="font-size: 0.88rem;">${isSelected ? '☑️' : '⬜'}</span>
      </div>
    `;
  }).join('');

  els.appsMultiList.querySelectorAll('.multi-select-item').forEach((item) => {
    item.addEventListener('click', () => {
      const key = item.getAttribute('data-app-key');
      let current = state.appFilters.filter((f) => f !== 'all');
      if (current.includes(key)) {
        current = current.filter((f) => f !== key);
      } else {
        current.push(key);
      }
      state.appFilters = current.length > 0 ? current : ['all'];
      renderAppsModal();
      updateFilterLabels();
      renderGames();
    });
  });
}

function renderQuickAppStrip() {
  const directApps = state.appsCatalog.filter((a) => a.isEnabled || a.isInstalledOnTv).slice(0, 8);
  els.quickAppStrip.innerHTML = directApps
    .map(
      (app) => `
      <button
        class="quick-app-btn"
        style="background: ${escapeHtml(app.bgGradient)};"
        data-launch-id="${escapeHtml(app.rokuId)}"
        data-launch-name="${escapeHtml(app.shortLabel)}"
      >
        <span>▶</span>
        <span>${escapeHtml(app.shortLabel)}</span>
      </button>
    `
    )
    .join('');

  els.quickAppStrip.querySelectorAll('.quick-app-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const appId = btn.getAttribute('data-launch-id');
      const appName = btn.getAttribute('data-launch-name');
      launchAppOnTv(appId, appName);
    });
  });
}

function filterGamesList() {
  const q = state.searchQuery.trim().toLowerCase();
  const nowMs = Date.now();

  return state.games.filter((g) => {
    // 1. Search query match
    if (q) {
      const haystack = [
        g.title,
        g.shortTitle,
        g.leagueName,
        g.leagueShort,
        g.awayTeam?.name,
        g.awayTeam?.abbreviation,
        g.homeTeam?.name,
        g.homeTeam?.abbreviation,
        ...(g.networks || []),
        ...(g.rokuApps || []).map((a) => a.name),
        ...(g.rokuApps || []).map((a) => a.shortLabel)
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      if (!haystack.includes(q)) return false;
    }

    // 2. Time filters (multi-select: 'all', 'live', 'upcoming', 'today')
    if (!state.timeFilters.includes('all')) {
      const matchesTime = state.timeFilters.some((tf) => {
        const gameTimeMs = new Date(g.date).getTime();
        const diffMinutes = Math.round((gameTimeMs - nowMs) / 60000);

        if (tf === 'live') {
          // Live Now = currently live OR starting in the next 15 minutes
          return g.isLive || (diffMinutes >= 0 && diffMinutes <= 15);
        }
        if (tf === 'upcoming') {
          // Upcoming = everything starting in the next hour (0 to 60 minutes)
          return diffMinutes >= 0 && diffMinutes <= 60;
        }
        if (tf === 'today') {
          return g.isLive || isSameLocalDay(g.date);
        }
        return false;
      });
      if (!matchesTime) return false;
    }

    // 3. Sport filters (multi-select from Sports modal)
    if (!state.sportFilters.includes('all')) {
      const matchesSport = state.sportFilters.some((sf) => {
        if (sf === 'soccer') return g.category === 'soccer';
        if (sf === 'golf' || sf === 'pga') return g.category === 'golf' || g.leagueId === 'pga';
        return g.leagueId === sf || g.category === sf;
      });
      if (!matchesSport) return false;
    }

    // 4. App filters (multi-select from Apps modal)
    if (!state.appFilters.includes('all')) {
      const hasApp = (g.rokuApps || []).some((a) => state.appFilters.includes(a.key));
      if (!hasApp) return false;
    }

    return true;
  });
}

function renderGameCard(game) {
  const timeBadgeText = formatGameTime(game.date, game.isLive, game.isFinal, game.statusText);
  const networksHtml = (game.networks || [])
    .slice(0, 3)
    .map((net) => `<span class="tv-network-tag">${escapeHtml(net)}</span>`)
    .join('');

  // Choose best primary app (prefer enabled/installed apps)
  const apps = game.rokuApps || [];
  const primaryApp = apps.find((a) => a.isInstalledOnTv || a.isEnabled) || apps[0];
  const secondaryApps = apps.filter((a) => a !== primaryApp && (a.isEnabled || a.isInstalledOnTv || a.category === 'direct')).slice(0, 3);

  const renderTeamLogo = (team) => {
    if (team.logo) {
      return `<img class="team-logo" src="${escapeHtml(team.logo)}" alt="${escapeHtml(team.abbreviation)}" loading="lazy" />`;
    }
    return `<div class="team-logo-placeholder">${escapeHtml((team.abbreviation || '?').slice(0, 3))}</div>`;
  };

  const awayLeading = game.awayTeam.score !== null && game.homeTeam.score !== null && Number(game.awayTeam.score) > Number(game.homeTeam.score);
  const homeLeading = game.awayTeam.score !== null && game.homeTeam.score !== null && Number(game.homeTeam.score) > Number(game.awayTeam.score);

  const iconImgHtml = state.tvConnected && primaryApp
    ? `<img class="roku-app-thumb" src="/api/roku/icon/${encodeURIComponent(primaryApp.rokuId)}" onerror="this.style.display='none'" alt="" />`
    : '';

  const primaryButtonHtml = primaryApp
    ? `
      <button
        class="primary-launch-btn"
        style="background: ${escapeHtml(primaryApp.bgGradient)};"
        data-launch-id="${escapeHtml(primaryApp.rokuId)}"
        data-launch-name="${escapeHtml(primaryApp.shortLabel)}"
      >
        <span class="launch-btn-left">
          ${iconImgHtml}
          <span>▶ Open ${escapeHtml(primaryApp.shortLabel)}</span>
        </span>
        <span class="installed-check">${primaryApp.isInstalledOnTv ? '✓ On TV' : 'Launch TV'}</span>
      </button>
    `
    : '';

  const secondaryButtonsHtml = secondaryApps
    .map(
      (app) => `
      <button
        class="alt-launch-btn"
        data-launch-id="${escapeHtml(app.rokuId)}"
        data-launch-name="${escapeHtml(app.shortLabel)}"
      >
        <span class="app-dot" style="background: ${escapeHtml(app.color)};"></span>
        <span>Open ${escapeHtml(app.shortLabel)}</span>
      </button>
    `
    )
    .join('');

  return `
    <article class="game-card ${game.isLive ? 'is-live' : ''}">
      <div class="card-top-meta">
        <span class="league-badge">${escapeHtml(game.icon)} ${escapeHtml(game.leagueShort)}</span>
        <span class="status-badge ${game.isLive ? 'live' : ''}">
          ${game.isLive ? '<span class="pulse-dot"></span>' : ''}
          ${escapeHtml(timeBadgeText)}
        </span>
        <div class="network-badges">${networksHtml}</div>
      </div>

      <div class="matchup-rows">
        <!-- Away Team -->
        <div class="team-row">
          <div class="team-info">
            ${renderTeamLogo(game.awayTeam)}
            <div class="team-name-wrap">
              ${game.awayTeam.rank ? `<span class="team-rank">#${game.awayTeam.rank}</span>` : ''}
              <span class="team-name">${escapeHtml(game.awayTeam.name)}</span>
              ${game.awayTeam.record ? `<span class="team-record">(${escapeHtml(game.awayTeam.record)})</span>` : ''}
            </div>
          </div>
          ${game.awayTeam.score !== null ? `<span class="team-score ${homeLeading ? 'trailing' : ''}">${escapeHtml(game.awayTeam.score)}</span>` : ''}
        </div>

        <!-- Home Team -->
        <div class="team-row">
          <div class="team-info">
            ${renderTeamLogo(game.homeTeam)}
            <div class="team-name-wrap">
              ${game.homeTeam.rank ? `<span class="team-rank">#${game.homeTeam.rank}</span>` : ''}
              <span class="team-name">${escapeHtml(game.homeTeam.name)}</span>
              ${game.homeTeam.record ? `<span class="team-record">(${escapeHtml(game.homeTeam.record)})</span>` : ''}
            </div>
          </div>
          ${game.homeTeam.score !== null ? `<span class="team-score ${awayLeading ? 'trailing' : ''}">${escapeHtml(game.homeTeam.score)}</span>` : ''}
        </div>
      </div>

      <div class="watch-actions">
        ${primaryButtonHtml}
        ${secondaryButtonsHtml ? `<div class="alt-apps-list">${secondaryButtonsHtml}</div>` : ''}
      </div>
    </article>
  `;
}

function renderGames() {
  const filtered = filterGamesList();

  if (filtered.length === 0) {
    els.gamesContainer.innerHTML = `
      <div class="empty-state">
        <div style="font-size: 2rem; margin-bottom: 8px;">🏟️</div>
        <div style="font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">No matching games found</div>
        <div style="font-size: 0.84rem;">Try switching the filter to "All Upcoming & Live" or "Football Slate".</div>
      </div>
    `;
    return;
  }

  const liveGames = filtered.filter((g) => g.isLive);
  const todayUpcoming = filtered.filter((g) => g.isUpcoming && isSameLocalDay(g.date));
  const laterUpcoming = filtered.filter((g) => g.isUpcoming && !isSameLocalDay(g.date));
  const finalGames = filtered.filter((g) => g.isFinal);

  let html = '';

  if (liveGames.length > 0) {
    html += `
      <div class="section-header">
        <div class="section-title"><span class="pulse-dot"></span> Live Now (${liveGames.length})</div>
      </div>
      <div class="games-grid">
        ${liveGames.map(renderGameCard).join('')}
      </div>
    `;
  }

  if (todayUpcoming.length > 0) {
    html += `
      <div class="section-header">
        <div class="section-title">⚡ On Today (${todayUpcoming.length})</div>
      </div>
      <div class="games-grid">
        ${todayUpcoming.map(renderGameCard).join('')}
      </div>
    `;
  }

  if (laterUpcoming.length > 0) {
    html += `
      <div class="section-header">
        <div class="section-title">📅 Upcoming This Week (${laterUpcoming.length})</div>
      </div>
      <div class="games-grid">
        ${laterUpcoming.map(renderGameCard).join('')}
      </div>
    `;
  }

  if (finalGames.length > 0 && (state.searchQuery || liveGames.length + todayUpcoming.length + laterUpcoming.length < 15)) {
    html += `
      <div class="section-header">
        <div class="section-title">🏁 Recent Finals (${finalGames.length})</div>
      </div>
      <div class="games-grid">
        ${finalGames.slice(0, 12).map(renderGameCard).join('')}
      </div>
    `;
  }

  els.gamesContainer.innerHTML = html;

  // Bind direct 1-tap open buttons
  els.gamesContainer.querySelectorAll('[data-launch-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const appId = btn.getAttribute('data-launch-id');
      const appName = btn.getAttribute('data-launch-name');
      launchAppOnTv(appId, appName);
    });
  });
}

async function launchAppOnTv(appId, appName) {
  const tvName = state.activeTv?.name || state.device?.name || 'Roku TV';
  showToast(`🚀 Opening ${appName} on ${tvName}...`);

  // Immediately bring up the remote modal so the user has immediate control
  if (els.remoteModal) {
    els.voiceModal?.classList.remove('open');
    els.sportsModal?.classList.remove('open');
    els.appsModal?.classList.remove('open');
    els.setupModal?.classList.remove('open');
    if (els.remoteActiveAppLabel) {
      els.remoteActiveAppLabel.textContent = `Now Controlling: ${appName} • ${tvName}`;
    }
    els.remoteModal.classList.add('open');
  }

  // If running on Render (not localhost/LAN), automatically send command directly from iPhone to Roku!
  const isCloudHosted = !['localhost', '127.0.0.1'].includes(window.location.hostname) && !/^192\.168\./.test(window.location.hostname);
  
  if (isCloudHosted || localStorage.getItem('roku_direct_mode') === 'true') {
    showToast(`📱 Sending direct to Roku TV (192.168.1.8)...`);
    await sendDirectToRoku(`/launch/${encodeURIComponent(appId)}`);
    return;
  }

  try {
    const res = await fetch('/api/roku/launch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appId,
        tvIp: state.activeTvIp || null
      })
    });
    const data = await res.json();
    if (!res.ok) {
      if (res.status === 403 || (data.error && data.error.includes('403'))) {
        showToast(`📱 Switching to Direct iPhone Mode...`);
        localStorage.setItem('roku_direct_mode', 'true');
        await sendDirectToRoku(`/launch/${encodeURIComponent(appId)}`);
        return;
      }
      showToast(`⚠️ ${data.error || 'Connect your Roku TV first'}`);
      els.setupModal.classList.add('open');
      return;
    }
    if (data.alreadyOpen) {
      showToast(`📺 ${appName} is already open — returned to its home view!`);
    } else {
      showToast(`✅ Opened ${appName} on ${data.tvName || tvName}!`);
    }
    setTimeout(fetchStatus, 1200);
  } catch (err) {
    showToast(`⚠️ Could not reach Roku TV: ${err.message}`);
  }
}

async function sendRemoteKey(key) {
  const isCloudHosted = !['localhost', '127.0.0.1'].includes(window.location.hostname) && !/^192\.168\./.test(window.location.hostname);

  if (isCloudHosted || localStorage.getItem('roku_direct_mode') === 'true') {
    await sendDirectToRoku(`/keypress/${encodeURIComponent(key)}`);
    return;
  }

  try {
    const res = await fetch('/api/roku/keypress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key })
    });
    if (!res.ok) {
      const data = await res.json();
      if (res.status === 403) {
        localStorage.setItem('roku_direct_mode', 'true');
        await sendDirectToRoku(`/keypress/${encodeURIComponent(key)}`);
        return;
      }
      showToast(`⚠️ ${data.error || 'TV not connected'}`);
    }
  } catch (err) {
    showToast(`⚠️ Remote error: ${err.message}`);
  }
}

// Direct iPhone-to-Roku dispatch (Works over apartment Wi-Fi with MacBook 100% off)
async function sendDirectToRoku(endpoint) {
  const tvIp = localStorage.getItem('roku_direct_tv_ip') || state.activeTvIp || '192.168.1.8';
  const url = `http://${tvIp}:8060${endpoint}`;

  // Method 1: Fetch with mode 'no-cors' (Supported directly in mobile browsers to local IP)
  try {
    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      cache: 'no-store'
    });
    return true;
  } catch (fetchErr) {
    console.warn('Direct fetch attempt failed, using form-POST fallback:', fetchErr);
  }

  // Method 2: Standard form submission target iframe fallback (Bypasses CORS restrictions)
  try {
    let iframe = document.getElementById('rokuDirectFrame');
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'rokuDirectFrame';
      iframe.name = 'rokuDirectFrame';
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
    }
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = url;
    form.target = 'rokuDirectFrame';
    document.body.appendChild(form);
    form.submit();
    setTimeout(() => form.remove(), 1000);
    return true;
  } catch (e) {
    console.error('All direct iPhone-to-Roku methods failed:', e);
    return false;
  }
}

function renderSetupModalApps() {
  els.appsChecklist.innerHTML = state.appsCatalog
    .map((app) => {
      const isSelected = app.isEnabled || app.isInstalledOnTv;
      return `
        <div class="app-toggle-card ${isSelected ? 'selected' : ''}" data-toggle-key="${escapeHtml(app.key)}">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="app-dot" style="background: ${escapeHtml(app.color)};"></span>
            <div>
              <div style="font-size: 0.82rem; font-weight: 700;">${escapeHtml(app.shortLabel)}</div>
              <div style="font-size: 0.68rem; color: var(--text-muted);">
                ${app.isInstalledOnTv ? '✓ Installed on TV' : escapeHtml(app.networks.slice(0, 3).join(', '))}
              </div>
            </div>
          </div>
          <span style="font-size: 0.9rem;">${isSelected ? '☑️' : '⬜'}</span>
        </div>
      `;
    })
    .join('');

  els.appsChecklist.querySelectorAll('.app-toggle-card').forEach((card) => {
    card.addEventListener('click', async () => {
      const key = card.getAttribute('data-toggle-key');
      const set = new Set(state.enabledAppKeys);
      if (set.has(key)) {
        set.delete(key);
      } else {
        set.add(key);
      }
      state.enabledAppKeys = [...set];
      const res = await fetch('/api/config/apps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabledAppKeys: state.enabledAppKeys })
      });
      const data = await res.json();
      if (data.appsCatalog) state.appsCatalog = data.appsCatalog;
      renderSetupModalApps();
      updateFilterLabels();
      renderQuickAppStrip();
      fetchGuide(false);
    });
  });
}

// Event Listeners
els.searchInput.addEventListener('input', (e) => {
  state.searchQuery = e.target.value;
  els.clearSearchBtn.style.display = state.searchQuery ? 'block' : 'none';
  renderGames();
});

els.clearSearchBtn.addEventListener('click', () => {
  state.searchQuery = '';
  els.searchInput.value = '';
  els.clearSearchBtn.style.display = 'none';
  renderGames();
});

function updateFilterChipsUI() {
  els.timeFilterRail.querySelectorAll('.chip[data-time]').forEach((b) => {
    const val = b.getAttribute('data-time');
    if (state.timeFilters.includes(val)) {
      b.classList.add('active');
    } else {
      b.classList.remove('active');
    }
  });
  updateFilterLabels();
}

// Bind Single-Row Time Filter Chips ("All", "Live Now", "Upcoming", "Today")
els.timeFilterRail.querySelectorAll('.chip[data-time]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const val = btn.getAttribute('data-time');

    if (val === 'all') {
      state.timeFilters = ['all'];
    } else {
      let current = state.timeFilters.filter((f) => f !== 'all');
      if (current.includes(val)) {
        // Toggle OFF (unselect)
        current = current.filter((f) => f !== val);
      } else {
        // Toggle ON (multi-select)
        current.push(val);
      }
      // If user unselected all, default back to 'all'
      state.timeFilters = current.length > 0 ? current : ['all'];
    }

    updateFilterChipsUI();
    renderGames();
  });
});

// Bind Sports Filter Modal Trigger
els.sportsFilterBtn?.addEventListener('click', () => {
  renderSportsModal();
  els.sportsModal?.classList.add('open');
});

// Bind Apps Filter Modal Trigger
els.appsFilterBtn?.addEventListener('click', () => {
  renderAppsModal();
  els.appsModal?.classList.add('open');
});

// Sports Modal Actions
els.sportsSelectAllBtn?.addEventListener('click', () => {
  state.sportFilters = ['all'];
  renderSportsModal();
  updateFilterLabels();
  renderGames();
});

els.sportsClearBtn?.addEventListener('click', () => {
  state.sportFilters = ['all'];
  renderSportsModal();
  updateFilterLabels();
  renderGames();
});

// Apps Modal Actions
els.appsSelectAllBtn?.addEventListener('click', () => {
  state.appFilters = ['all'];
  renderAppsModal();
  updateFilterLabels();
  renderGames();
});

els.appsClearBtn?.addEventListener('click', () => {
  state.appFilters = ['all'];
  renderAppsModal();
  updateFilterLabels();
  renderGames();
});

els.refreshBtn.addEventListener('click', async () => {
  showToast('↻ Refreshing live scores & TV status...');
  await Promise.all([fetchStatus(), fetchGuide(true)]);
});

els.tvStatusBtn.addEventListener('click', () => {
  els.setupModal.classList.add('open');
});

els.myAppsBtn.addEventListener('click', () => {
  els.setupModal.classList.add('open');
});

els.openRemoteBtn.addEventListener('click', () => {
  els.remoteModal.classList.add('open');
});

document.querySelectorAll('[data-close]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const id = btn.getAttribute('data-close');
    document.getElementById(id)?.classList.remove('open');
  });
});

[els.setupModal, els.remoteModal, els.voiceModal, els.sportsModal, els.appsModal].forEach((modal) => {
  if (!modal) return;
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('open');
  });
});

els.discoverTvBtn.addEventListener('click', async () => {
  els.discoverTvBtn.textContent = '🔍 Scanning Wi-Fi for Roku TVs...';
  els.discoverTvBtn.disabled = true;
  try {
    const res = await fetch('/api/roku/discover', { method: 'POST' });
    const data = await res.json();
    state.discoveredTvs = data.devices || [];
    if (data.devices && data.devices.length > 0) {
      showToast(`📺 Found ${data.devices.length} Roku device${data.devices.length > 1 ? 's' : ''}!`);
      renderDiscoveredTvs();
      await fetchStatus();
      await fetchGuide(false);
    } else {
      showToast('⚠️ No Roku TVs responded to auto-scan. Enter IP below.');
    }
  } catch (err) {
    showToast(`⚠️ Scan error: ${err.message}`);
  } finally {
    els.discoverTvBtn.textContent = '🔍 Auto-Scan Wi-Fi for TVs';
    els.discoverTvBtn.disabled = false;
  }
});

els.connectIpBtn.addEventListener('click', async () => {
  const ip = els.manualIpInput.value.trim();
  const name = (els.manualNameInput ? els.manualNameInput.value.trim() : '');
  if (!ip) {
    showToast('⚠️ Please enter an IP address');
    return;
  }
  els.connectIpBtn.textContent = 'Connecting...';
  els.connectIpBtn.disabled = true;
  try {
    const res = await fetch('/api/roku/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip, name })
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(`⚠️ ${data.error}`);
    } else {
      showToast(`✅ Connected to ${data.device.name}!`);
      els.manualIpInput.value = '';
      if (els.manualNameInput) els.manualNameInput.value = '';
      await fetchStatus();
      await fetchGuide(false);
    }
  } catch (err) {
    showToast(`⚠️ Connection error: ${err.message}`);
  } finally {
    els.connectIpBtn.textContent = 'Connect';
    els.connectIpBtn.disabled = false;
  }
});

async function powerOnTv() {
  if (!state.activeTvIp) {
    showToast('⚠️ No TV configured yet. Scan or enter TV IP.');
    els.setupModal.classList.add('open');
    return;
  }
  const tvName = state.activeTv?.name || 'Roku TV';
  showToast(`⚡ Sending wake signal to ${tvName}...`);
  if (els.tvPowerLabel) els.tvPowerLabel.textContent = 'Waking...';
  if (els.modalWakeBtn) els.modalWakeBtn.textContent = '⚡ Waking...';

  try {
    const res = await fetch('/api/roku/power-on', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tvIp: state.activeTvIp })
    });
    const data = await res.json();
    if (data.ok || data.online) {
      showToast(`🟢 ${tvName} is now awake and ready!`);
      await fetchStatus();
      await fetchGuide(false);
    } else {
      showToast(`⚡ Wake packet sent! If TV doesn't wake, ensure "Fast TV Start" is enabled.`);
      setTimeout(fetchStatus, 2500);
    }
  } catch (err) {
    showToast(`⚠️ Wake error: ${err.message}`);
  } finally {
    if (els.modalWakeBtn) els.modalWakeBtn.textContent = '⚡ Power On';
  }
}

// ---------------- Voice Control ----------------
let speechRecognizer = null;
let isListening = false;
let speechSilenceTimer = null;
let currentSpeechTranscript = '';

function setVoiceListeningUI(listening, statusText = '') {
  isListening = listening;
  if (listening) {
    els.voiceBtn?.classList.add('listening');
    els.voiceOrb?.classList.add('pulsing');
    if (els.voiceLiveStatus) {
      els.voiceLiveStatus.textContent = statusText || 'Listening...';
      els.voiceLiveStatus.style.color = '#f87171';
    }
  } else {
    els.voiceBtn?.classList.remove('listening');
    els.voiceOrb?.classList.remove('pulsing');
    if (els.voiceLiveStatus) {
      els.voiceLiveStatus.textContent = statusText || 'Processing...';
      els.voiceLiveStatus.style.color = 'var(--accent-blue)';
    }
  }
}

function createSpeechRecognizer() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return null;

  try {
    const recognizer = new SpeechRecognition();
    recognizer.continuous = false;
    recognizer.interimResults = true;
    recognizer.lang = 'en-US';

    recognizer.onstart = () => {
      currentSpeechTranscript = '';
      setVoiceListeningUI(true, 'Listening... Speak now');
      if (els.voiceTranscriptPreview) {
        els.voiceTranscriptPreview.textContent = 'Listening to your voice...';
        els.voiceTranscriptPreview.style.color = 'var(--text-muted)';
      }
    };

    recognizer.onspeechend = () => {
      setVoiceListeningUI(false, 'Heard! Processing...');
      try { recognizer.stop(); } catch {}
    };

    recognizer.onend = () => {
      setVoiceListeningUI(false, 'Done');
      if (speechSilenceTimer) clearTimeout(speechSilenceTimer);

      const cmd = (currentSpeechTranscript || '').trim();
      currentSpeechTranscript = '';

      if (cmd) {
        if (els.voiceTranscriptPreview) {
          els.voiceTranscriptPreview.textContent = `"${cmd}"`;
          els.voiceTranscriptPreview.style.color = '#ffffff';
        }
        setTimeout(() => {
          els.voiceModal?.classList.remove('open');
          handleVoiceCommand(cmd);
        }, 400);
      } else {
        if (els.voiceTranscriptPreview) {
          els.voiceTranscriptPreview.textContent = 'No speech detected. Tap microphone to try again.';
          els.voiceTranscriptPreview.style.color = 'var(--text-muted)';
        }
      }
    };

    recognizer.onerror = (e) => {
      setVoiceListeningUI(false, 'Speech stopped');
      if (speechSilenceTimer) clearTimeout(speechSilenceTimer);

      if (e.error === 'not-allowed') {
        if (els.voiceTranscriptPreview) {
          els.voiceTranscriptPreview.innerHTML = '⚠️ Microphone access is blocked.<br><span style="font-size:0.75rem;color:var(--text-secondary);">Click the lock/settings icon in your Chrome address bar and set <strong>Microphone</strong> to <strong>Allow</strong>.</span>';
        }
        showToast('🎙️ Microphone access blocked by browser');
      } else if (e.error === 'network') {
        if (els.voiceTranscriptPreview) {
          els.voiceTranscriptPreview.innerHTML = '⚠️ Chrome Web Speech requires an internet connection or secure origin.<br><span style="font-size:0.75rem;color:var(--text-secondary);">If accessing via LAN IP on Chrome, Chrome restricts speech recognition to HTTPS or localhost. Try accessing via <strong>localhost:3000</strong> on this Mac or enable Chrome insecure origins flag.</span>';
        }
      } else if (e.error !== 'no-speech' && e.error !== 'aborted') {
        if (els.voiceTranscriptPreview) {
          els.voiceTranscriptPreview.textContent = `Recognition error: ${e.error}`;
        }
      }
    };

    recognizer.onresult = (event) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      const heard = (final || interim || '').trim();
      if (heard) {
        currentSpeechTranscript = heard;
        if (els.voiceTranscriptPreview) {
          els.voiceTranscriptPreview.textContent = `"${heard}"`;
          els.voiceTranscriptPreview.style.color = '#ffffff';
        }

        if (final) {
          if (speechSilenceTimer) clearTimeout(speechSilenceTimer);
          speechSilenceTimer = setTimeout(() => {
            try { recognizer.stop(); } catch {}
          }, 700);
        }
      }
    };

    return recognizer;
  } catch (err) {
    console.error('Failed to create SpeechRecognition:', err);
    return null;
  }
}

function initVoiceControl() {
  speechRecognizer = createSpeechRecognizer();

  // Voice button click handler: Immediately opens visual modal and starts recording
  if (els.voiceBtn) {
    els.voiceBtn.addEventListener('click', () => {
      currentSpeechTranscript = '';
      els.voiceModal?.classList.add('open');

      if (!speechRecognizer) {
        speechRecognizer = createSpeechRecognizer();
      }

      if (speechRecognizer) {
        if (els.voiceTranscriptPreview) {
          els.voiceTranscriptPreview.textContent = 'Listening... Say a command (e.g. "Turn TV on")';
          els.voiceTranscriptPreview.style.color = 'var(--text-muted)';
        }

        try {
          // CRITICAL FOR IOS SAFARI: Start synchronously within the user tap event!
          speechRecognizer.start();
        } catch (err) {
          console.warn('SpeechRecognition immediate start error:', err);
          try {
            speechRecognizer.abort();
            speechRecognizer.start();
          } catch (e2) {
            console.warn('SpeechRecognition retry error:', e2);
          }
        }
      } else {
        const ua = navigator.userAgent || '';
        const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        const isIOSChrome = isIOS && /CriOS/i.test(ua);

        const noticeEl = document.getElementById('iosChromeNotice');
        if (noticeEl) {
          noticeEl.style.display = isIOSChrome ? 'block' : 'none';
        }

        if (isIOSChrome) {
          els.voiceTranscriptPreview.innerHTML = '⚠️ Apple does not allow Chrome on iPhone to access speech recognition.<br><span style="font-size:0.8rem;color:var(--accent-blue);font-weight:600;">👉 Please open this address in Mobile Safari for voice control!</span>';
        } else if (!window.isSecureContext && window.location.hostname !== 'localhost') {
          els.voiceTranscriptPreview.innerHTML = '⚠️ Speech Recognition requires HTTPS or localhost.<br><span style="font-size:0.75rem;color:var(--text-secondary);">Open on this Mac at <code>http://localhost:3000</code> or open in Safari on iOS.</span>';
        } else {
          els.voiceTranscriptPreview.innerHTML = 'Speech recognition is not available in this browser. Please use Safari on iPhone or Chrome on Desktop.';
        }

        if (els.voiceLiveStatus) {
          els.voiceLiveStatus.textContent = isIOSChrome ? 'Open in Safari' : 'Unavailable';
        }
      }
    });
  }

  // Allow clicking on the pulsing orb to restart recording if stopped
  if (els.voiceOrb) {
    els.voiceOrb.addEventListener('click', () => {
      if (!speechRecognizer) speechRecognizer = createSpeechRecognizer();
      if (speechRecognizer) {
        try {
          speechRecognizer.abort();
        } catch {}
        setTimeout(() => {
          try { speechRecognizer.start(); } catch {}
        }, 100);
      }
    });
  }

  // Direct dictation input for Chrome on iOS
  const dictationInput = document.getElementById('voiceDictationInput');
  const dictationSubmitBtn = document.getElementById('voiceDictationSubmitBtn');

  const submitDictation = () => {
    if (!dictationInput) return;
    const val = dictationInput.value.trim();
    if (val) {
      els.voiceModal?.classList.remove('open');
      dictationInput.value = '';
      handleVoiceCommand(val);
    }
  };

  dictationSubmitBtn?.addEventListener('click', submitDictation);
  dictationInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitDictation();
  });
}

async function handleVoiceCommand(rawTranscript) {
  const text = rawTranscript.trim();
  const lower = text.toLowerCase();
  showToast(`🎙️ "${text}"`);

  // 1. Power On / Wake Commands
  if (/\b(turn\s+on|power\s+on|wake|switch\s+on)\b/i.test(lower) && /\b(tv|television|roku)\b/i.test(lower)) {
    await powerOnTv();
    return;
  }

  // 2. Power Off Commands
  if (/\b(turn\s+off|power\s+off|shut\s+down|sleep)\b/i.test(lower) && /\b(tv|television|roku)\b/i.test(lower)) {
    showToast('😴 Turning TV off...');
    await sendRemoteKey('PowerOff');
    setTimeout(fetchStatus, 1500);
    return;
  }

  // 3. Remote Control navigation commands
  if (/\b(mute|unmute)\b/i.test(lower)) {
    return sendRemoteKey('VolumeMute');
  }
  if (/\b(volume\s+up|louder)\b/i.test(lower)) {
    return sendRemoteKey('VolumeUp');
  }
  if (/\b(volume\s+down|quieter|lower)\b/i.test(lower)) {
    return sendRemoteKey('VolumeDown');
  }
  if (/\b(home|home\s+screen)\b/i.test(lower)) {
    return sendRemoteKey('Home');
  }
  if (/\b(play|pause)\b/i.test(lower)) {
    return sendRemoteKey('Play');
  }

  // 4. Team / Game Commands ("go to the Knicks game", "watch the Chiefs", "put on Arsenal")
  // Extract subject after "go to", "watch", "put on", "turn to", "tune to", "open the"
  let targetQuery = lower
    .replace(/^(please\s+)?(go\s+to|watch|put\s+on|turn\s+to|tune\s+to|switch\s+to|play|open)\s+(the\s+)?/i, '')
    .replace(/\s+(game|match|matchup|stream|broadcast)$/i, '')
    .trim();

  // Check if target matches any known streaming app directly (e.g. "open ESPN", "launch Peacock")
  const directApp = state.appsCatalog.find((app) => {
    const appNameLower = app.name.toLowerCase();
    const shortLabelLower = (app.shortLabel || '').toLowerCase();
    return lower.includes(appNameLower) || lower.includes(shortLabelLower) || targetQuery === app.key;
  });

  // Try matching games first if user asked for a team or game
  let matchedGame = null;
  if (targetQuery.length >= 3 && !directApp) {
    matchedGame = state.games.find((g) => {
      const awayName = (g.awayTeam?.name || '').toLowerCase();
      const awayAbbr = (g.awayTeam?.abbreviation || '').toLowerCase();
      const homeName = (g.homeTeam?.name || '').toLowerCase();
      const homeAbbr = (g.homeTeam?.abbreviation || '').toLowerCase();
      return (
        awayName.includes(targetQuery) ||
        targetQuery.includes(awayName) ||
        homeName.includes(targetQuery) ||
        targetQuery.includes(homeName) ||
        awayAbbr === targetQuery ||
        homeAbbr === targetQuery
      );
    });
  }

  if (matchedGame) {
    const apps = matchedGame.rokuApps || [];
    const appToLaunch = apps.find((a) => a.isInstalledOnTv || a.isEnabled) || apps[0];
    const matchTitle = `${matchedGame.awayTeam.abbreviation || matchedGame.awayTeam.name} vs ${matchedGame.homeTeam.abbreviation || matchedGame.homeTeam.name}`;

    if (appToLaunch) {
      showToast(`🎯 Found game: ${matchTitle}! Opening ${appToLaunch.shortLabel} on TV...`);
      await launchAppOnTv(appToLaunch.rokuId, appToLaunch.shortLabel);
      return;
    } else {
      showToast(`Found ${matchTitle} (${matchedGame.broadcast || 'No channel listed'})`);
      return;
    }
  }

  // If matched a direct app
  if (directApp) {
    showToast(`🚀 Opening ${directApp.shortLabel} on Roku TV...`);
    await launchAppOnTv(directApp.rokuId, directApp.shortLabel);
    return;
  }

  // Fallback: Apply query as search filter in UI
  showToast(`🔍 Searching guide for "${text}"`);
  els.searchInput.value = text;
  state.searchQuery = text;
  els.clearSearchBtn.style.display = 'block';
  renderGames();
}

// Bind Power & Wake buttons
if (els.tvPowerBtn) {
  els.tvPowerBtn.addEventListener('click', async () => {
    if (state.tvConnected) {
      // Toggle off
      showToast('😴 Turning TV off...');
      await sendRemoteKey('PowerOff');
      setTimeout(fetchStatus, 1500);
    } else {
      await powerOnTv();
    }
  });
}

if (els.modalWakeBtn) {
  els.modalWakeBtn.addEventListener('click', powerOnTv);
}

document.querySelectorAll('.r-btn[data-key]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const key = btn.getAttribute('data-key');
    sendRemoteKey(key);
  });
});

// Initialize app
(async function init() {
  initVoiceControl();
  await Promise.all([fetchStatus(), fetchGuide(false)]);
  // Refresh live scores every 45 seconds
  setInterval(() => {
    fetchGuide(false);
  }, 45000);
})();

