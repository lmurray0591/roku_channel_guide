const express = require('express');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const crypto = require('crypto');
const {
  loadConfig,
  saveConfig,
  getActiveTv,
  addOrUpdateSavedTv,
  removeSavedTv,
  setActiveTvIp,
  getLocalSubnets,
  queryDeviceInfo,
  discoverRokuDevices,
  relocateTvIfMoved,
  getInstalledApps,
  getActiveApp,
  resolveAppsCatalog,
  getRokuEndpoint,
  launchRokuApp,
  sendKeypress,
  fetchWithTimeout,
  getLastQueryError,
  wakeRokuTv
} = require('./roku');
const { getSportsGuideData, answerSportsQuestion } = require('./sports');

const app = express();
const PORT = process.env.PORT || 3000;
const IS_CLOUD_SERVER = Boolean(process.env.RENDER || process.env.IS_CLOUD_SERVER === '1');
const CLOUD_RELAY_URL = (process.env.CLOUD_RELAY_URL || 'https://roku-channel-guide.onrender.com').replace(/\/+$/, '');

app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

// In-memory icon cache so TV isn't hammered
const iconCache = new Map();

function httpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function getLanUrl() {
  const subnets = getLocalSubnets();
  const ip = subnets[0]?.localIp || 'localhost';
  return `http://${ip}:${PORT}`;
}

// ---------------- Cloud <-> Home Wi-Fi Relay State ----------------
const relayState = {
  lastHeartbeatAt: 0,
  snapshotUpdatedAt: 0,
  statusSnapshot: null,
  commandQueue: [],
  waitingPollerRes: null,
  waitingPollerTimer: null,
  pendingCommands: new Map()
};

function isRelayOnline() {
  return Date.now() - relayState.lastHeartbeatAt < 45000;
}

function flushWaitingPoller() {
  if (!relayState.waitingPollerRes || relayState.commandQueue.length === 0) return;
  const res = relayState.waitingPollerRes;
  const timer = relayState.waitingPollerTimer;
  relayState.waitingPollerRes = null;
  relayState.waitingPollerTimer = null;
  if (timer) clearTimeout(timer);
  const commands = relayState.commandQueue.splice(0);
  try {
    res.json({ commands });
  } catch {}
}

function dispatchViaRelay(action, payload = {}, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const id = crypto.randomUUID();
    const timer = setTimeout(() => {
      relayState.pendingCommands.delete(id);
      relayState.commandQueue = relayState.commandQueue.filter((c) => c.id !== id);
      reject(httpError(504, 'Home Wi-Fi relay timed out waiting for response from Mac.'));
    }, timeoutMs);

    relayState.pendingCommands.set(id, { resolve, reject, timer });
    relayState.commandQueue.push({ id, action, payload, createdAt: Date.now() });
    flushWaitingPoller();
  });
}

app.post('/api/relay/heartbeat', (req, res) => {
  relayState.lastHeartbeatAt = Date.now();
  if (req.body && req.body.statusSnapshot) {
    relayState.statusSnapshot = req.body.statusSnapshot;
    relayState.snapshotUpdatedAt = Date.now();
  }
  res.json({ ok: true });
});

app.get('/api/relay/poll', (req, res) => {
  relayState.lastHeartbeatAt = Date.now();
  if (relayState.commandQueue.length > 0) {
    const commands = relayState.commandQueue.splice(0);
    return res.json({ commands });
  }

  // Close any older dangling poller connection cleanly
  if (relayState.waitingPollerRes) {
    try {
      if (relayState.waitingPollerTimer) clearTimeout(relayState.waitingPollerTimer);
      relayState.waitingPollerRes.json({ commands: [] });
    } catch {}
  }

  const timer = setTimeout(() => {
    if (relayState.waitingPollerRes === res) {
      relayState.waitingPollerRes = null;
      relayState.waitingPollerTimer = null;
      try {
        res.json({ commands: [] });
      } catch {}
    }
  }, 25000);

  relayState.waitingPollerRes = res;
  relayState.waitingPollerTimer = timer;

  req.on('close', () => {
    if (relayState.waitingPollerRes === res) {
      clearTimeout(timer);
      relayState.waitingPollerRes = null;
      relayState.waitingPollerTimer = null;
    }
  });
});

app.post('/api/relay/result', (req, res) => {
  relayState.lastHeartbeatAt = Date.now();
  const { id, ok, statusCode, data, error, statusSnapshot } = req.body || {};
  if (statusSnapshot) {
    relayState.statusSnapshot = statusSnapshot;
    relayState.snapshotUpdatedAt = Date.now();
  }
  const pending = relayState.pendingCommands.get(id);
  if (pending) {
    clearTimeout(pending.timer);
    relayState.pendingCommands.delete(id);
    if (ok) {
      pending.resolve(data);
    } else {
      pending.reject(httpError(statusCode || 500, error || 'Relay command failed'));
    }
  }
  res.json({ ok: true });
});

// ---------------- Local Execution Implementations ----------------
async function buildLocalStatusPayload() {
  let cfg = loadConfig();
  let activeTv = getActiveTv(cfg);
  let activeIp = activeTv?.ip || null;

  let device = null;
  let activeApp = null;
  let installedApps = cfg.cachedInstalledApps || [];

  let activeIpError = null;
  if (activeIp) {
    const [devInfo, active, apps] = await Promise.all([
      queryDeviceInfo(activeIp, 1500),
      getActiveApp(activeIp),
      getInstalledApps(activeIp)
    ]);
    device = devInfo;
    activeIpError = device ? null : getLastQueryError();
    activeApp = active;
    if (apps && apps.length > 0) {
      installedApps = apps;
    }

    // If TV did not respond at its saved IP, check ARP neighbors in case router reassigned its IP
    if (!device && activeTv) {
      const relocated = await relocateTvIfMoved(activeTv);
      if (relocated) {
        device = relocated;
        activeIpError = null;
        activeIp = relocated.ip;
        cfg = loadConfig();
        activeTv = getActiveTv(cfg);
        const [relocatedActive, relocatedApps] = await Promise.all([
          getActiveApp(activeIp),
          getInstalledApps(activeIp)
        ]);
        activeApp = relocatedActive;
        if (relocatedApps && relocatedApps.length > 0) {
          installedApps = relocatedApps;
        }
      }
    }
  }

  const isStandby = Boolean(
    device?.powerMode && /^(displayoff|poweroff|headless|standby|suspend)$/i.test(device.powerMode)
  );
  const isConnected = Boolean(device) && !isStandby;
  const appsCatalog = resolveAppsCatalog(installedApps, cfg.enabledAppKeys || []);

  return {
    connected: isConnected,
    reachable: Boolean(device),
    standby: isStandby,
    powerMode: device?.powerMode || null,
    ecpSettingMode: device?.ecpSettingMode || null,
    lastError: device ? null : activeIpError,
    activeTvIp: activeIp,
    activeTv: activeTv ? { ...activeTv, online: isConnected, reachable: Boolean(device) } : null,
    savedTvs: cfg.savedTvs || [],
    configuredIp: activeIp,
    savedDeviceName: activeTv?.name || 'Roku TV',
    device,
    activeApp,
    installedAppsCount: installedApps.length,
    installedApps,
    appsCatalog,
    enabledAppKeys: cfg.enabledAppKeys || [],
    lanUrl: getLanUrl()
  };
}

async function handleSelectTvLocal(body = {}) {
  const ip = String(body.ip || '').trim();
  if (!ip) {
    throw httpError(400, 'Missing TV IP');
  }
  setActiveTvIp(ip);
  const cfg = loadConfig();
  const activeTv = getActiveTv(cfg);

  const [device, activeApp, installedApps] = await Promise.all([
    queryDeviceInfo(ip, 1500),
    getActiveApp(ip),
    getInstalledApps(ip)
  ]);

  const isStandby = Boolean(
    device?.powerMode && /^(displayoff|poweroff|headless|standby|suspend)$/i.test(device.powerMode)
  );
  const isConnected = Boolean(device) && !isStandby;
  const appsCatalog = resolveAppsCatalog(installedApps, cfg.enabledAppKeys || []);

  return {
    connected: isConnected,
    reachable: Boolean(device),
    standby: isStandby,
    activeTvIp: ip,
    activeTv: activeTv ? { ...activeTv, online: isConnected, reachable: Boolean(device) } : null,
    savedTvs: cfg.savedTvs || [],
    device,
    activeApp,
    installedApps,
    appsCatalog
  };
}

function handleForgetTvLocal(body = {}) {
  const ip = String(body.ip || '').trim();
  if (!ip) {
    throw httpError(400, 'Missing TV IP');
  }
  const updated = removeSavedTv(ip);
  return {
    ok: true,
    savedTvs: updated.savedTvs || [],
    activeTvIp: updated.activeTvIp
  };
}

async function handleDiscoverLocal() {
  const devices = await discoverRokuDevices();
  const cfg = loadConfig();
  const activeTv = getActiveTv(cfg);
  const activeIp = activeTv?.ip || (devices[0]?.ip || null);

  let installedApps = [];
  let activeApp = null;
  let device = null;

  if (activeIp) {
    [device, installedApps, activeApp] = await Promise.all([
      queryDeviceInfo(activeIp, 1500),
      getInstalledApps(activeIp),
      getActiveApp(activeIp)
    ]);
  }

  const appsCatalog = resolveAppsCatalog(installedApps, cfg.enabledAppKeys || []);

  return {
    devices,
    savedTvs: cfg.savedTvs || [],
    activeTv: activeTv ? { ...activeTv, online: Boolean(device) } : null,
    activeTvIp: activeIp,
    selectedDevice: device || (devices[0] || null),
    activeApp,
    installedApps,
    appsCatalog
  };
}

async function handleConnectLocal(body = {}) {
  const ip = String(body.ip || '').trim();
  const customName = String(body.name || '').trim();
  if (!ip) {
    throw httpError(400, 'Please provide a Roku TV IP address');
  }

  const device = await queryDeviceInfo(ip, 2500);
  if (!device) {
    const detail = getLastQueryError() || '';
    let specificHint = '';
    if (/no route to host|ehostunreach|couldn't connect to server|failed to connect|no response/i.test(detail)) {
      specificHint = ' TV unreachable on local network. 1) Make sure the TV is connected to the same Wi-Fi network (Settings > Network > Check connection). 2) In Roku settings, ensure "Control by mobile apps" is set to "Permissive" (Settings > System > Advanced system settings > Control by mobile apps > Network access).';
    } else if (/refused|econnrefused/i.test(detail)) {
      specificHint = ' Connection was refused by the TV. On your TV, go to Settings > System > Advanced system settings > Control by mobile apps > Network access and set it to "Permissive".';
    } else if (/timeout|timed out/i.test(detail)) {
      specificHint = ' Connection timed out. Make sure the TV is on the same Wi-Fi network and powered on.';
    }
    throw httpError(
      404,
      `Could not reach a Roku TV at ${ip}:8060.${specificHint || ' Make sure your TV is on the same Wi-Fi and "Control by mobile apps" is enabled.'}`
    );
  }

  addOrUpdateSavedTv({
    ip,
    name: customName || device.name,
    modelName: device.modelName,
    vendorName: device.vendorName,
    isTv: device.isTv,
    mac: device.mac,
    wifiMac: device.wifiMac,
    ethernetMac: device.ethernetMac
  });

  const [installedApps, activeApp] = await Promise.all([
    getInstalledApps(ip),
    getActiveApp(ip)
  ]);

  const cfg = loadConfig();
  const appsCatalog = resolveAppsCatalog(installedApps, cfg.enabledAppKeys || []);

  return {
    connected: true,
    reachable: true,
    device,
    activeTv: { ip, name: customName || device.name, online: true, reachable: true },
    savedTvs: cfg.savedTvs || [],
    activeApp,
    installedApps,
    appsCatalog
  };
}

async function handleLaunchLocal(body = {}) {
  const { appId, tvIp } = body;
  if (!appId) {
    throw httpError(400, 'Missing appId to launch');
  }
  const cfg = loadConfig();
  const targetIp = tvIp || cfg.activeTvIp || cfg.rokuIp;
  if (!targetIp) {
    throw httpError(400, 'No Roku TV connected yet. Tap the TV icon at the top to discover or enter your TV IP.');
  }
  return launchRokuApp(targetIp, appId);
}

async function handlePowerOnLocal(body = {}) {
  const { tvIp } = body;
  const cfg = loadConfig();
  const targetIp = tvIp || cfg.activeTvIp || cfg.rokuIp;
  if (!targetIp) {
    throw httpError(400, 'No Roku TV connected yet. Tap the TV icon at the top to discover or enter your TV IP.');
  }
  return wakeRokuTv(targetIp);
}

async function handleKeypressLocal(body = {}) {
  const { key, tvIp } = body;
  const cfg = loadConfig();
  const targetIp = tvIp || cfg.activeTvIp || cfg.rokuIp;
  if (!targetIp) {
    throw httpError(400, 'No Roku TV connected yet.');
  }
  return sendKeypress(targetIp, key);
}

function handleConfigAppsLocal(body = {}) {
  const { enabledAppKeys } = body;
  if (!Array.isArray(enabledAppKeys)) {
    throw httpError(400, 'enabledAppKeys must be an array');
  }
  const updated = saveConfig({ enabledAppKeys });
  const appsCatalog = resolveAppsCatalog(updated.cachedInstalledApps || [], updated.enabledAppKeys);
  return { enabledAppKeys: updated.enabledAppKeys, appsCatalog };
}

async function executeLocalRelayAction(action, payload) {
  switch (action) {
    case 'status':
      return buildLocalStatusPayload();
    case 'select-tv':
      return handleSelectTvLocal(payload);
    case 'forget-tv':
      return handleForgetTvLocal(payload);
    case 'discover':
      return handleDiscoverLocal();
    case 'connect':
      return handleConnectLocal(payload);
    case 'launch':
      return handleLaunchLocal(payload);
    case 'power-on':
      return handlePowerOnLocal(payload);
    case 'keypress':
      return handleKeypressLocal(payload);
    case 'config-apps':
      return handleConfigAppsLocal(payload);
    default:
      throw httpError(400, `Unknown relay action: ${action}`);
  }
}

// ---------------- Express HTTP Routes ----------------
app.get('/api/status', async (req, res) => {
  try {
    if (IS_CLOUD_SERVER && isRelayOnline()) {
      if (!relayState.statusSnapshot) {
        const fresh = await dispatchViaRelay('status', {}, 5000);
        return res.json({
          ...fresh,
          relayConnected: true
        });
      }
      if (Date.now() - relayState.snapshotUpdatedAt > 12000) {
        dispatchViaRelay('status', {}, 4000).catch(() => {});
      }
      return res.json({
        ...relayState.statusSnapshot,
        relayConnected: true
      });
    }
    const payload = await buildLocalStatusPayload();
    res.json({
      ...payload,
      relayConnected: !IS_CLOUD_SERVER ? true : false
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

app.post('/api/roku/select-tv', async (req, res) => {
  try {
    const out = (IS_CLOUD_SERVER && isRelayOnline())
      ? await dispatchViaRelay('select-tv', req.body, 6000)
      : await handleSelectTvLocal(req.body);
    res.json(out);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

app.post('/api/roku/forget-tv', async (req, res) => {
  try {
    const out = (IS_CLOUD_SERVER && isRelayOnline())
      ? await dispatchViaRelay('forget-tv', req.body, 4000)
      : handleForgetTvLocal(req.body);
    res.json(out);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

app.post('/api/roku/discover', async (req, res) => {
  try {
    const out = (IS_CLOUD_SERVER && isRelayOnline())
      ? await dispatchViaRelay('discover', req.body, 28000)
      : await handleDiscoverLocal();
    res.json(out);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

app.post('/api/roku/connect', async (req, res) => {
  try {
    const out = (IS_CLOUD_SERVER && isRelayOnline())
      ? await dispatchViaRelay('connect', req.body, 7000)
      : await handleConnectLocal(req.body);
    res.json(out);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

app.get('/api/roku/icon/:appId', async (req, res) => {
  const { appId } = req.params;
  const cfg = loadConfig();
  const targetIp = req.query.ip || cfg.activeTvIp || cfg.rokuIp;
  if (!targetIp) {
    return res.status(404).end();
  }

  const cacheKey = `${targetIp}:${appId}`;
  if (iconCache.has(cacheKey)) {
    const cached = iconCache.get(cacheKey);
    res.setHeader('Content-Type', cached.contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(cached.buffer);
  }

  try {
    const iconUrl = getRokuEndpoint(targetIp, `/query/icon/${encodeURIComponent(appId)}`);
    const iconRes = await fetchWithTimeout(iconUrl, {}, 2000);
    if (!iconRes.ok) {
      return res.status(404).end();
    }
    const contentType = iconRes.headers.get('content-type') || 'image/png';
    const arrayBuffer = await iconRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    iconCache.set(cacheKey, { contentType, buffer });
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(buffer);
  } catch {
    res.status(404).end();
  }
});

app.post('/api/roku/launch', async (req, res) => {
  try {
    const out = (IS_CLOUD_SERVER && isRelayOnline())
      ? await dispatchViaRelay('launch', req.body, 10000)
      : await handleLaunchLocal(req.body);
    res.json(out);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

app.post('/api/roku/power-on', async (req, res) => {
  try {
    const out = (IS_CLOUD_SERVER && isRelayOnline())
      ? await dispatchViaRelay('power-on', req.body, 9000)
      : await handlePowerOnLocal(req.body);
    res.json(out);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

app.post('/api/roku/keypress', async (req, res) => {
  try {
    const out = (IS_CLOUD_SERVER && isRelayOnline())
      ? await dispatchViaRelay('keypress', req.body, 5000)
      : await handleKeypressLocal(req.body);
    res.json(out);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

app.post('/api/config/apps', async (req, res) => {
  try {
    const out = handleConfigAppsLocal(req.body);
    if (IS_CLOUD_SERVER && isRelayOnline()) {
      dispatchViaRelay('config-apps', req.body, 4000).catch(() => {});
    }
    res.json(out);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

app.get('/api/guide', async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === '1';
    const installedApps = (IS_CLOUD_SERVER && relayState.statusSnapshot?.installedApps?.length)
      ? relayState.statusSnapshot.installedApps
      : (loadConfig().cachedInstalledApps || []);
    const enabledAppKeys = (IS_CLOUD_SERVER && relayState.statusSnapshot?.enabledAppKeys?.length)
      ? relayState.statusSnapshot.enabledAppKeys
      : (loadConfig().enabledAppKeys || []);
    const guide = await getSportsGuideData({
      installedApps,
      enabledAppKeys,
      forceRefresh
    });
    res.json(guide);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/assistant', async (req, res) => {
  try {
    const query = String(req.body.query || '').trim();
    if (!query) {
      return res.status(400).json({ error: 'Missing query' });
    }
    const cfg = loadConfig();
    const installedApps = (IS_CLOUD_SERVER && relayState.statusSnapshot?.installedApps?.length)
      ? relayState.statusSnapshot.installedApps
      : (cfg.cachedInstalledApps || []);
    const result = await answerSportsQuestion(
      query,
      installedApps,
      cfg.enabledAppKeys || []
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- Home Mac Outbound Cloud Relay Client ----------------
function startHomeRelayClient() {
  if (IS_CLOUD_SERVER || CLOUD_RELAY_URL === 'off' || !CLOUD_RELAY_URL) return;

  console.log(`☁️  Connecting Home Wi-Fi Relay -> ${CLOUD_RELAY_URL}`);

  const pushHeartbeat = async () => {
    try {
      const statusSnapshot = await buildLocalStatusPayload();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      try {
        await fetch(`${CLOUD_RELAY_URL}/api/relay/heartbeat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ statusSnapshot }),
          signal: controller.signal
        });
      } finally {
        clearTimeout(timer);
      }
    } catch {}
  };

  // Push initial status immediately and keep Render warm every 20s
  pushHeartbeat();
  setInterval(pushHeartbeat, 20000);

  // Continuous low-latency long-poll loop for instant TV commands
  (async function pollLoop() {
    while (true) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 32000);
      try {
        const res = await fetch(`${CLOUD_RELAY_URL}/api/relay/poll`, {
          method: 'GET',
          signal: controller.signal
        });
        clearTimeout(timer);

        if (!res.ok) {
          // e.g. Render redeploying or not yet updated with /api/relay/poll
          await new Promise((r) => setTimeout(r, 5000));
          continue;
        }

        const payload = await res.json();
        const commands = Array.isArray(payload?.commands) ? payload.commands : [];

        for (const cmd of commands) {
          (async () => {
            let ok = true;
            let statusCode = 200;
            let data = null;
            let error = null;
            try {
              data = await executeLocalRelayAction(cmd.action, cmd.payload);
            } catch (err) {
              ok = false;
              statusCode = err.statusCode || 500;
              error = err.message || String(err);
            }

            let statusSnapshot = null;
            if (cmd.action === 'status') {
              statusSnapshot = data;
            } else if (cmd.action !== 'keypress') {
              try {
                statusSnapshot = await buildLocalStatusPayload();
              } catch {}
            }

            try {
              await fetch(`${CLOUD_RELAY_URL}/api/relay/result`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  id: cmd.id,
                  ok,
                  statusCode,
                  data,
                  error,
                  statusSnapshot
                })
              });
            } catch {}
          })();
        }
      } catch {
        clearTimeout(timer);
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
  })();
}

const httpServer = http.createServer(app);
httpServer.listen(PORT, '0.0.0.0', () => {
  const lanUrl = getLanUrl();
  console.log(`\n🏈 Roku Sports Guide HTTP running!`);
  console.log(`   Local:   http://localhost:${PORT}`);
  console.log(`   Phone:   ${lanUrl}`);
});

// HTTPS Server for local LAN Secure Context
if (!IS_CLOUD_SERVER) {
  const HTTPS_PORT = process.env.HTTPS_PORT || 3443;
  try {
    const keyPath = path.join(__dirname, 'key.pem');
    const certPath = path.join(__dirname, 'cert.pem');
    if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
      const credentials = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath)
      };
      const httpsServer = https.createServer(credentials, app);
      httpsServer.listen(HTTPS_PORT, '0.0.0.0', () => {
        const subnets = getLocalSubnets();
        const ip = subnets[0]?.localIp || 'localhost';
        console.log(`🔒 HTTPS Server running (Mic & Speech Enabled for iPhone):`);
        console.log(`   iPhone URL: https://${ip}:${HTTPS_PORT}\n`);
      });
    }
  } catch (e) {
    console.warn('Could not start HTTPS server:', e.message);
  }
}

// Proactively discover Roku TV & start Cloud Relay on launch
(async () => {
  if (!IS_CLOUD_SERVER) {
    startHomeRelayClient();
    try {
      const devices = await discoverRokuDevices();
      if (devices.length > 0) {
        console.log(`📺 Discovered Roku TV: ${devices[0].name} (${devices[0].ip})`);
        await getInstalledApps(devices[0].ip);
      }
    } catch (err) {
      console.error('Background Roku discovery error:', err.message);
    }
  }
})();

// Process-level crash prevention: Ensure the server never dies on unhandled network errors
process.on('uncaughtException', (err) => {
  console.error('🛡️ Intercepted uncaught exception (server kept running):', err.message || err);
});

process.on('unhandledRejection', (reason) => {
  console.error('🛡️ Intercepted unhandled promise rejection (server kept running):', reason?.message || reason);
});
