const express = require('express');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
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
  getInstalledApps,
  getActiveApp,
  resolveAppsCatalog,
  launchRokuApp,
  sendKeypress,
  fetchWithTimeout,
  getLastQueryError,
  wakeRokuTv
} = require('./roku');
const { getSportsGuideData } = require('./sports');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// In-memory icon cache so TV isn't hammered
const iconCache = new Map();

function getLanUrl() {
  const subnets = getLocalSubnets();
  const ip = subnets[0]?.localIp || 'localhost';
  return `http://${ip}:${PORT}`;
}

app.get('/api/status', async (req, res) => {
  try {
    const cfg = loadConfig();
    const activeTv = getActiveTv(cfg);
    const activeIp = activeTv?.ip || null;

    let device = null;
    let activeApp = null;
    let installedApps = cfg.cachedInstalledApps || [];

    if (activeIp) {
      const [devInfo, active, apps] = await Promise.all([
        queryDeviceInfo(activeIp, 1500),
        getActiveApp(activeIp),
        getInstalledApps(activeIp)
      ]);
      device = devInfo;
      activeApp = active;
      if (apps && apps.length > 0) {
        installedApps = apps;
      }
    }

    const appsCatalog = resolveAppsCatalog(installedApps, cfg.enabledAppKeys || []);

    res.json({
      connected: Boolean(device),
      activeTvIp: activeIp,
      activeTv: activeTv ? { ...activeTv, online: Boolean(device) } : null,
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
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/roku/select-tv', async (req, res) => {
  try {
    const ip = String(req.body.ip || '').trim();
    if (!ip) {
      return res.status(400).json({ error: 'Missing TV IP' });
    }
    setActiveTvIp(ip);
    const cfg = loadConfig();
    const activeTv = getActiveTv(cfg);

    const [device, activeApp, installedApps] = await Promise.all([
      queryDeviceInfo(ip, 1500),
      getActiveApp(ip),
      getInstalledApps(ip)
    ]);

    const appsCatalog = resolveAppsCatalog(installedApps, cfg.enabledAppKeys || []);

    res.json({
      connected: Boolean(device),
      activeTvIp: ip,
      activeTv: activeTv ? { ...activeTv, online: Boolean(device) } : null,
      savedTvs: cfg.savedTvs || [],
      device,
      activeApp,
      installedApps,
      appsCatalog
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/roku/forget-tv', (req, res) => {
  try {
    const ip = String(req.body.ip || '').trim();
    if (!ip) {
      return res.status(400).json({ error: 'Missing TV IP' });
    }
    const updated = removeSavedTv(ip);
    res.json({
      ok: true,
      savedTvs: updated.savedTvs || [],
      activeTvIp: updated.activeTvIp
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/roku/discover', async (req, res) => {
  try {
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

    res.json({
      devices,
      savedTvs: cfg.savedTvs || [],
      activeTv: activeTv ? { ...activeTv, online: Boolean(device) } : null,
      activeTvIp: activeIp,
      selectedDevice: device || (devices[0] || null),
      activeApp,
      installedApps,
      appsCatalog
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/roku/connect', async (req, res) => {
  try {
    const ip = String(req.body.ip || '').trim();
    const customName = String(req.body.name || '').trim();
    if (!ip) {
      return res.status(400).json({ error: 'Please provide a Roku TV IP address' });
    }

    const device = await queryDeviceInfo(ip, 2500);
    if (!device) {
      const detail = getLastQueryError() || '';
      let specificHint = '';
      if (/no route to host|ehostunreach|couldn't connect to server|failed to connect/i.test(detail)) {
        specificHint = ' TV unreachable on local network. 1) Make sure the TV is turned ON (screen active) and enable "Fast TV Start" (Settings > System > Power > Fast TV Start). 2) In Roku settings, ensure "Control by mobile apps" is set to "Permissive" (Settings > System > Advanced system settings > Control by mobile apps > Network access). 3) On your phone/device, ensure Local Network access is allowed and on the same Wi-Fi.';
      } else if (/refused|econnrefused/i.test(detail)) {
        specificHint = ' Connection was refused by the TV. On your TV, go to Settings > System > Advanced system settings > Control by mobile apps > Network access and set it to "Permissive".';
      } else if (/timeout|timed out/i.test(detail)) {
        specificHint = ' Connection timed out. Make sure the TV is on the same Wi-Fi network and powered on.';
      }
      return res.status(404).json({
        error: `Could not reach a Roku TV at ${ip}:8060.${specificHint || ' Make sure your TV is on the same Wi-Fi and "Control by mobile apps" is enabled.'}`
      });
    }

    addOrUpdateSavedTv({
      ip,
      name: customName || device.name,
      modelName: device.modelName,
      vendorName: device.vendorName,
      isTv: device.isTv
    });

    const [installedApps, activeApp] = await Promise.all([
      getInstalledApps(ip),
      getActiveApp(ip)
    ]);

    const cfg = loadConfig();
    const appsCatalog = resolveAppsCatalog(installedApps, cfg.enabledAppKeys || []);

    res.json({
      connected: true,
      device,
      activeTv: { ip, name: customName || device.name, online: true },
      savedTvs: cfg.savedTvs || [],
      activeApp,
      installedApps,
      appsCatalog
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
    const iconRes = await fetchWithTimeout(`http://${targetIp}:8060/query/icon/${encodeURIComponent(appId)}`, {}, 2000);
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
    const { appId, tvIp } = req.body;
    if (!appId) {
      return res.status(400).json({ error: 'Missing appId to launch' });
    }
    const cfg = loadConfig();
    const targetIp = tvIp || cfg.activeTvIp || cfg.rokuIp;
    if (!targetIp) {
      return res.status(400).json({
        error: 'No Roku TV connected yet. Tap the TV icon at the top to discover or enter your TV IP.'
      });
    }

    const result = await launchRokuApp(targetIp, appId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/roku/power-on', async (req, res) => {
  try {
    const { tvIp } = req.body;
    const cfg = loadConfig();
    const targetIp = tvIp || cfg.activeTvIp || cfg.rokuIp;
    if (!targetIp) {
      return res.status(400).json({ error: 'No Roku TV connected yet. Tap the TV icon at the top to discover or enter your TV IP.' });
    }
    const result = await wakeRokuTv(targetIp);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/roku/keypress', async (req, res) => {
  try {
    const { key, tvIp } = req.body;
    const cfg = loadConfig();
    const targetIp = tvIp || cfg.activeTvIp || cfg.rokuIp;
    if (!targetIp) {
      return res.status(400).json({ error: 'No Roku TV connected yet.' });
    }
    const result = await sendKeypress(targetIp, key);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/config/apps', (req, res) => {
  try {
    const { enabledAppKeys } = req.body;
    if (!Array.isArray(enabledAppKeys)) {
      return res.status(400).json({ error: 'enabledAppKeys must be an array' });
    }
    const updated = saveConfig({ enabledAppKeys });
    const appsCatalog = resolveAppsCatalog(updated.cachedInstalledApps || [], updated.enabledAppKeys);
    res.json({ enabledAppKeys: updated.enabledAppKeys, appsCatalog });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/guide', async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === '1';
    const cfg = loadConfig();
    const installedApps = cfg.cachedInstalledApps || [];
    const guide = await getSportsGuideData({
      installedApps,
      enabledAppKeys: cfg.enabledAppKeys || [],
      forceRefresh
    });
    res.json(guide);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const httpServer = http.createServer(app);
httpServer.listen(PORT, '0.0.0.0', () => {
  const lanUrl = getLanUrl();
  console.log(`\n🏈 Roku Sports Guide HTTP running!`);
  console.log(`   Local:   http://localhost:${PORT}`);
  console.log(`   Phone:   ${lanUrl}`);
});

// HTTPS Server for iOS Secure Context (Unlocks Microphone on iPhone Safari & Chrome)
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

// Proactively discover Roku TV in background on launch
(async () => {
  try {
    const devices = await discoverRokuDevices();
    if (devices.length > 0) {
      console.log(`📺 Discovered Roku TV: ${devices[0].name} (${devices[0].ip})`);
      await getInstalledApps(devices[0].ip);
    }
  } catch (err) {
    console.error('Background Roku discovery error:', err.message);
  }
})();

// Process-level crash prevention: Ensure the server never dies on unhandled network errors
process.on('uncaughtException', (err) => {
  console.error('🛡️ Intercepted uncaught exception (server kept running):', err.message || err);
});

process.on('unhandledRejection', (reason) => {
  console.error('🛡️ Intercepted unhandled promise rejection (server kept running):', reason?.message || reason);
});


