const dgram = require('dgram');
const net = require('net');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { parseStringPromise } = require('xml2js');

const CONFIG_PATH = path.join(__dirname, '..', 'data', 'config.json');

// Official Roku Channel Store IDs & metadata for major sports/streaming apps
const KNOWN_SPORTS_APPS = [
  {
    key: 'espn',
    name: 'ESPN',
    rokuIds: ['34376'],
    namePatterns: [/^espn$/i, /espn/i],
    color: '#cc0000',
    bgGradient: 'linear-gradient(135deg, #d00000, #8a0000)',
    shortLabel: 'ESPN',
    category: 'direct',
    networks: [
      'ESPN', 'ESPN2', 'ESPN+', 'ESPNEWS', 'ESPNU', 'ABC',
      'SEC Network', 'SECN', 'SECN+', 'ACC Network', 'ACCN', 'ACCNX',
      'ESPN Deportes', 'Longhorn Network', 'ESPN3'
    ]
  },
  {
    key: 'paramount',
    name: 'Paramount+',
    rokuIds: ['31440', '17112', '619667'],
    namePatterns: [/paramount/i, /cbs all access/i, /cbs sports/i],
    color: '#0064ff',
    bgGradient: 'linear-gradient(135deg, #0064ff, #003899)',
    shortLabel: 'Paramount+',
    category: 'direct',
    networks: [
      'CBS', 'Paramount+', 'CBS Sports Network', 'CBSSN', 'CBS Sports Golazo'
    ]
  },
  {
    key: 'peacock',
    name: 'Peacock',
    rokuIds: ['593099'],
    namePatterns: [/peacock/i],
    color: '#000000',
    bgGradient: 'linear-gradient(135deg, #1f2937, #090d16)',
    shortLabel: 'Peacock',
    category: 'direct',
    networks: [
      'NBC', 'Peacock', 'USA', 'USA Network', 'CNBC', 'Golf Channel', 'Telemundo', 'Universo'
    ]
  },
  {
    key: 'nbc_sports',
    name: 'NBC / NBC Sports',
    rokuIds: ['53725', '68669', '68155'],
    namePatterns: [/^nbc$/i, /nbc sports/i],
    color: '#0f52ba',
    bgGradient: 'linear-gradient(135deg, #1e40af, #0f172a)',
    shortLabel: 'NBC App',
    category: 'direct',
    networks: [
      'NBC', 'USA', 'USA Network', 'NBCSN', 'Golf Channel', 'CNBC'
    ]
  },
  {
    key: 'fox_sports',
    name: 'FOX Sports / Fox One',
    rokuIds: ['808732', '95307', '19977', '294688'],
    namePatterns: [/fox sports/i, /fox one/i, /^fox$/i, /fox now/i],
    color: '#002e6d',
    bgGradient: 'linear-gradient(135deg, #003f91, #001c42)',
    shortLabel: 'FOX / Fox One',
    category: 'direct',
    networks: [
      'FOX', 'FS1', 'FS2', 'FOX Sports', 'Fox One', 'BTN', 'Big Ten Network', 'FOX Deportes'
    ]
  },
  {
    key: 'prime_video',
    name: 'Prime Video',
    rokuIds: ['13'],
    namePatterns: [/prime video/i, /amazon/i],
    color: '#00a8e1',
    bgGradient: 'linear-gradient(135deg, #00a8e1, #005f80)',
    shortLabel: 'Prime Video',
    category: 'direct',
    networks: [
      'Prime Video', 'Amazon Prime Video', 'Amazon'
    ]
  },
  {
    key: 'max',
    name: 'Max',
    rokuIds: ['61322'],
    namePatterns: [/^max$/i, /hbo max/i],
    color: '#002be7',
    bgGradient: 'linear-gradient(135deg, #002be7, #00126b)',
    shortLabel: 'Max',
    category: 'direct',
    networks: [
      'TNT', 'TBS', 'truTV', 'Max', 'HBO Max', 'B/R Sports'
    ]
  },
  {
    key: 'netflix',
    name: 'Netflix',
    rokuIds: ['12'],
    namePatterns: [/netflix/i],
    color: '#e50914',
    bgGradient: 'linear-gradient(135deg, #e50914, #8c050c)',
    shortLabel: 'Netflix',
    category: 'direct',
    networks: ['Netflix']
  },
  {
    key: 'apple_tv',
    name: 'Apple TV',
    rokuIds: ['551012'],
    namePatterns: [/apple tv/i],
    color: '#333333',
    bgGradient: 'linear-gradient(135deg, #374151, #111827)',
    shortLabel: 'Apple TV+',
    category: 'direct',
    networks: ['Apple TV+', 'Apple TV', 'MLS Season Pass']
  },
  {
    key: 'nfl',
    name: 'NFL',
    rokuIds: ['44856', '33880'],
    namePatterns: [/^nfl$/i, /nfl\+/i],
    color: '#013369',
    bgGradient: 'linear-gradient(135deg, #013369, #d50a0a)',
    shortLabel: 'NFL App',
    category: 'league',
    networks: ['NFL Network', 'NFL Net', 'NFL+', 'NFL RedZone']
  },
  {
    key: 'nba',
    name: 'NBA',
    rokuIds: ['47536'],
    namePatterns: [/^nba$/i, /nba app/i],
    color: '#1d428a',
    bgGradient: 'linear-gradient(135deg, #1d428a, #c8102e)',
    shortLabel: 'NBA App',
    category: 'league',
    networks: ['NBA TV', 'NBA League Pass']
  },
  {
    key: 'mlb',
    name: 'MLB',
    rokuIds: ['14'],
    namePatterns: [/^mlb$/i, /mlb\.tv/i],
    color: '#002d72',
    bgGradient: 'linear-gradient(135deg, #002d72, #d50032)',
    shortLabel: 'MLB App',
    category: 'league',
    networks: ['MLB Network', 'MLB.TV', 'MLBN']
  },
  {
    key: 'f1_tv',
    name: 'F1 TV',
    rokuIds: ['266586'],
    namePatterns: [/f1 tv/i, /formula 1/i],
    color: '#e10600',
    bgGradient: 'linear-gradient(135deg, #e10600, #7a0300)',
    shortLabel: 'F1 TV',
    category: 'league',
    networks: ['F1 TV', 'F1']
  },
  {
    key: 'dazn',
    name: 'DAZN',
    rokuIds: ['199562'],
    namePatterns: [/dazn/i],
    color: '#1f1f1f',
    bgGradient: 'linear-gradient(135deg, #333333, #000000)',
    shortLabel: 'DAZN',
    category: 'direct',
    networks: ['DAZN']
  },
  {
    key: 'cw',
    name: 'The CW',
    rokuIds: ['111255'],
    namePatterns: [/the cw/i, /^cw$/i],
    color: '#00a651',
    bgGradient: 'linear-gradient(135deg, #00a651, #00592b)',
    shortLabel: 'The CW',
    category: 'direct',
    networks: ['CW', 'The CW']
  },
  // Live TV Aggregators (carry local broadcast + cable sports networks)
  {
    key: 'youtube_tv',
    name: 'YouTube TV',
    rokuIds: ['195316'],
    namePatterns: [/youtube tv/i],
    color: '#ff0000',
    bgGradient: 'linear-gradient(135deg, #ff0000, #990000)',
    shortLabel: 'YouTube TV',
    category: 'aggregator',
    networks: [
      'CBS', 'NBC', 'FOX', 'ABC', 'ESPN', 'ESPN2', 'ESPNEWS', 'ESPNU',
      'FS1', 'FS2', 'BTN', 'Big Ten Network', 'SEC Network', 'ACC Network',
      'TNT', 'TBS', 'truTV', 'USA', 'USA Network', 'NFL Network', 'NBA TV',
      'MLB Network', 'CBS Sports Network', 'CBSSN', 'Golf Channel', 'CW', 'The CW'
    ]
  },
  {
    key: 'fubo',
    name: 'Fubo',
    rokuIds: ['43465', '50029'],
    namePatterns: [/fubo/i],
    color: '#ff5500',
    bgGradient: 'linear-gradient(135deg, #ff5500, #993300)',
    shortLabel: 'Fubo',
    category: 'aggregator',
    networks: [
      'CBS', 'NBC', 'FOX', 'ABC', 'ESPN', 'ESPN2', 'ESPNEWS', 'ESPNU',
      'FS1', 'FS2', 'BTN', 'Big Ten Network', 'SEC Network', 'ACC Network',
      'USA', 'USA Network', 'NFL Network', 'NBA TV', 'MLB Network', 'NHL Network',
      'CBS Sports Network', 'CBSSN', 'Golf Channel', 'CW', 'The CW', 'beIN SPORTS'
    ]
  },
  {
    key: 'hulu',
    name: 'Hulu',
    rokuIds: ['2285'],
    namePatterns: [/^hulu$/i, /hulu/i],
    color: '#1ce783',
    bgGradient: 'linear-gradient(135deg, #15b868, #0b5e35)',
    shortLabel: 'Hulu',
    category: 'aggregator',
    networks: [
      'CBS', 'NBC', 'FOX', 'ABC', 'ESPN', 'ESPN2', 'ESPN+', 'ESPNEWS', 'ESPNU',
      'FS1', 'FS2', 'BTN', 'Big Ten Network', 'SEC Network', 'ACC Network',
      'TNT', 'TBS', 'truTV', 'USA', 'USA Network', 'NFL Network', 'CBS Sports Network', 'CW'
    ]
  },
  {
    key: 'directv',
    name: 'DIRECTV',
    rokuIds: ['140474'],
    namePatterns: [/directv/i],
    color: '#00a8e0',
    bgGradient: 'linear-gradient(135deg, #00a8e0, #00506b)',
    shortLabel: 'DIRECTV',
    category: 'aggregator',
    networks: [
      'CBS', 'NBC', 'FOX', 'ABC', 'ESPN', 'ESPN2', 'FS1', 'FS2', 'BTN',
      'SEC Network', 'ACC Network', 'TNT', 'TBS', 'truTV', 'USA', 'NFL Network',
      'NBA TV', 'MLB Network', 'NHL Network', 'CBS Sports Network'
    ]
  },
  {
    key: 'sling',
    name: 'Sling TV',
    rokuIds: ['46041'],
    namePatterns: [/sling/i],
    color: '#0076e4',
    bgGradient: 'linear-gradient(135deg, #0076e4, #003e78)',
    shortLabel: 'Sling TV',
    category: 'aggregator',
    networks: [
      'ESPN', 'ESPN2', 'ESPN3', 'FS1', 'FS2', 'TNT', 'TBS', 'truTV', 'USA',
      'NFL Network', 'NBA TV', 'MLB Network', 'SEC Network', 'ACC Network', 'BTN'
    ]
  },
  {
    key: 'roku_channel',
    name: 'The Roku Channel',
    rokuIds: ['151908'],
    namePatterns: [/the roku channel/i, /live tv/i],
    color: '#662d91',
    bgGradient: 'linear-gradient(135deg, #662d91, #381850)',
    shortLabel: 'Roku Channel',
    category: 'direct',
    networks: ['Roku', 'The Roku Channel', 'Roku Sports']
  },
  {
    key: 'antenna_tv',
    name: 'Live TV / Antenna (OTA)',
    rokuIds: ['tvinput.dtv'],
    namePatterns: [/antenna tv/i, /^live\s*tv$/i],
    color: '#10b981',
    bgGradient: 'linear-gradient(135deg, #10b981, #047857)',
    shortLabel: 'Antenna TV',
    category: 'ota',
    networks: ['CBS', 'NBC', 'FOX', 'ABC', 'CW', 'The CW', 'Telemundo', 'Univision']
  }
];

function loadConfig() {
  let cfg = {
    activeTvIp: null,
    savedTvs: [],
    enabledAppKeys: [
      'paramount', 'peacock', 'nbc_sports', 'espn', 'fox_sports',
      'prime_video', 'max', 'netflix', 'apple_tv', 'nfl', 'youtube_tv'
    ],
    favoriteTeams: [],
    cachedInstalledApps: []
  };

  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const fileData = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      cfg = { ...cfg, ...fileData };
    }
  } catch (err) {
    console.error('Error loading config:', err.message);
  }

  // Gracefully migrate legacy single-TV config
  if (cfg.rokuIp && (!cfg.savedTvs || cfg.savedTvs.length === 0)) {
    cfg.savedTvs = [{
      ip: cfg.rokuIp,
      name: cfg.deviceName || 'Roku TV',
      isTv: true,
      lastSeen: new Date().toISOString()
    }];
  }
  if (!Array.isArray(cfg.savedTvs)) {
    cfg.savedTvs = [];
  }
  if (!cfg.activeTvIp && cfg.savedTvs.length > 0) {
    cfg.activeTvIp = cfg.savedTvs[0].ip;
  }
  return cfg;
}

function saveConfig(partial) {
  const current = loadConfig();
  const updated = { ...current, ...partial };
  // Keep legacy rokuIp / deviceName synchronized for any existing readers
  if (updated.activeTvIp) {
    const active = (updated.savedTvs || []).find((t) => t.ip === updated.activeTvIp);
    updated.rokuIp = updated.activeTvIp;
    if (active) updated.deviceName = active.name;
  }
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(updated, null, 2), 'utf8');
  return updated;
}

function getActiveTv(cfg = null) {
  const c = cfg || loadConfig();
  const tvs = c.savedTvs || [];
  if (c.activeTvIp) {
    const found = tvs.find((t) => t.ip === c.activeTvIp);
    if (found) return found;
  }
  return tvs[0] || null;
}

function addOrUpdateSavedTv(tv) {
  const cfg = loadConfig();
  const tvs = [...(cfg.savedTvs || [])];
  const idx = tvs.findIndex((t) => t.ip === tv.ip);
  const updatedTv = {
    ip: tv.ip,
    name: tv.name || 'Roku TV',
    modelName: tv.modelName || 'Roku TV',
    vendorName: tv.vendorName || 'Roku',
    isTv: tv.isTv !== false,
    mac: tv.mac || tv.wifiMac || tv.ethernetMac || tvs[idx]?.mac || null,
    wifiMac: tv.wifiMac || tvs[idx]?.wifiMac || null,
    ethernetMac: tv.ethernetMac || tvs[idx]?.ethernetMac || null,
    lastSeen: new Date().toISOString()
  };
  if (idx >= 0) {
    tvs[idx] = { ...tvs[idx], ...updatedTv };
  } else {
    tvs.push(updatedTv);
  }
  return saveConfig({ savedTvs: tvs, activeTvIp: tv.ip });
}

function removeSavedTv(ip) {
  const cfg = loadConfig();
  const tvs = (cfg.savedTvs || []).filter((t) => t.ip !== ip);
  const activeTvIp = cfg.activeTvIp === ip ? (tvs[0]?.ip || null) : cfg.activeTvIp;
  return saveConfig({ savedTvs: tvs, activeTvIp });
}

function setActiveTvIp(ip) {
  return saveConfig({ activeTvIp: ip });
}

function getLocalSubnets() {
  const interfaces = os.networkInterfaces();
  const subnets = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        const parts = iface.address.split('.');
        if (parts.length === 4) {
          subnets.push({
            localIp: iface.address,
            prefix: `${parts[0]}.${parts[1]}.${parts[2]}`
          });
        }
      }
    }
  }
  return subnets;
}

const BRIDGE_PORT = 18060;
let bridgeEnsurePromise = null;

function parseRawHttpResponse(stdout, url) {
  if (!stdout || stdout.length === 0) {
    throw new Error(`No response from Roku TV (${url})`);
  }
  let sepIndex = stdout.indexOf('\r\n\r\n');
  let sepLen = 4;
  if (sepIndex === -1) {
    sepIndex = stdout.indexOf('\n\n');
    sepLen = 2;
  }
  const headerPart = sepIndex !== -1 ? stdout.subarray(0, sepIndex).toString('utf8') : '';
  const bodyBuffer = sepIndex !== -1 ? stdout.subarray(sepIndex + sepLen) : stdout;
  const lines = headerPart.split(/\r?\n/);
  const statusLine = lines[0] || '';
  const statusMatch = statusLine.match(/HTTP\/\d+(?:\.\d+)?\s+(\d+)/i);
  if (!statusMatch) {
    throw new Error(`Invalid HTTP response from Roku TV (${url})`);
  }
  const status = parseInt(statusMatch[1], 10);
  const headersMap = new Map();
  for (let i = 1; i < lines.length; i++) {
    const idx = lines[i].indexOf(':');
    if (idx > 0) {
      const k = lines[i].slice(0, idx).trim().toLowerCase();
      const v = lines[i].slice(idx + 1).trim();
      headersMap.set(k, v);
    }
  }
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name) => headersMap.get(String(name).toLowerCase()) || null
    },
    text: async () => bodyBuffer.toString('utf8'),
    arrayBuffer: async () => bodyBuffer.buffer.slice(bodyBuffer.byteOffset, bodyBuffer.byteOffset + bodyBuffer.byteLength)
  };
}

function ensureMacLanBridge() {
  if (process.platform !== 'darwin') return Promise.resolve(false);
  if (bridgeEnsurePromise) return bridgeEnsurePromise;

  bridgeEnsurePromise = new Promise((resolve) => {
    try {
      const agentsDir = path.join(os.homedir(), 'Library', 'LaunchAgents');
      const plistPath = path.join(agentsDir, 'com.roku.ecp-bridge.plist');
      const plistXml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.roku.ecp-bridge</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/bin/perl</string>
    <string>-MIO::Socket::INET</string>
    <string>-e</string>
    <string>
      $SIG{CHLD} = "IGNORE";
      my $srv = IO::Socket::INET-&gt;new(
        LocalAddr =&gt; "127.0.0.1",
        LocalPort =&gt; ${BRIDGE_PORT},
        Proto     =&gt; "tcp",
        Listen    =&gt; 128,
        ReuseAddr =&gt; 1
      ) or die "Cannot bind: $!";
      while (my $cli = $srv-&gt;accept()) {
        my $pid = fork();
        if (defined $pid &amp;&amp; $pid == 0) {
          close($srv);
          my $line = &lt;$cli&gt;;
          $line =~ s/[\\r\\n]+$// if defined $line;
          if ($line &amp;&amp; $line =~ /^(GET|POST)\\s+(\\d+(?:\\.\\d+)?)\\s+(http:\\/\\/(?:192\\.168\\.|10\\.|172\\.(?:1[6-9]|2\\d|3[01])\\.)[\\d.]+:8060\\/[^\\s]*)$/) {
            my ($method, $timeout, $url) = ($1, $2, $3);
            if (open(my $fh, "-|", "/usr/bin/curl", "-sS", "-i", "-X", $method, "--max-time", $timeout, "--connect-timeout", $timeout, $url)) {
              binmode($fh);
              binmode($cli);
              my $buf;
              while (read($fh, $buf, 16384)) {
                print $cli $buf;
              }
              close($fh);
            }
          }
          close($cli);
          exit(0);
        }
        close($cli);
      }
    </string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
</dict>
</plist>
`;
      if (!fs.existsSync(agentsDir)) {
        fs.mkdirSync(agentsDir, { recursive: true });
      }
      if (!fs.existsSync(plistPath)) {
        fs.writeFileSync(plistPath, plistXml, 'utf8');
      }
      execFile('/bin/launchctl', ['load', plistPath], { timeout: 1500 }, () => {
        setTimeout(() => {
          bridgeEnsurePromise = null;
          resolve(true);
        }, 250);
      });
    } catch {
      bridgeEnsurePromise = null;
      resolve(false);
    }
  });
  return bridgeEnsurePromise;
}

function bridgeFetch(url, options = {}, timeoutMs = 1800) {
  return new Promise((resolve, reject) => {
    const method = (options.method || 'GET').toUpperCase();
    const maxTimeSec = Math.max(0.5, timeoutMs / 1000).toFixed(2);
    const chunks = [];
    let settled = false;

    const sock = net.createConnection({ host: '127.0.0.1', port: BRIDGE_PORT });
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        sock.destroy();
        reject(new Error(`Roku bridge timeout (${url})`));
      }
    }, timeoutMs + 500);

    sock.on('connect', () => {
      sock.write(`${method} ${maxTimeSec} ${url}\n`);
    });

    sock.on('data', (chunk) => {
      chunks.push(chunk);
    });

    sock.on('error', (err) => {
      clearTimeout(timer);
      if (!settled) {
        settled = true;
        reject(err);
      }
    });

    sock.on('close', () => {
      clearTimeout(timer);
      if (settled) return;
      settled = true;
      try {
        const stdout = Buffer.concat(chunks);
        resolve(parseRawHttpResponse(stdout, url));
      } catch (err) {
        reject(err);
      }
    });
  });
}

function directCurlFetch(url, options = {}, timeoutMs = 1800) {
  return new Promise((resolve, reject) => {
    const method = (options.method || 'GET').toUpperCase();
    const maxTimeSec = Math.max(0.5, timeoutMs / 1000).toFixed(2);
    const args = [
      '-sS',
      '-i',
      '-X', method,
      '--max-time', maxTimeSec,
      '--connect-timeout', maxTimeSec,
      url
    ];
    execFile('/usr/bin/curl', args, { encoding: 'buffer', maxBuffer: 10 * 1024 * 1024 }, (err, stdout) => {
      if (err) {
        return reject(err);
      }
      try {
        resolve(parseRawHttpResponse(stdout, url));
      } catch (parseErr) {
        reject(parseErr);
      }
    });
  });
}

async function curlFetch(url, options = {}, timeoutMs = 1800) {
  if (process.platform === 'darwin' && /:8060\//.test(url)) {
    try {
      return await bridgeFetch(url, options, timeoutMs);
    } catch (err) {
      if (err && err.code === 'ECONNREFUSED') {
        try {
          await ensureMacLanBridge();
          return await bridgeFetch(url, options, timeoutMs);
        } catch {}
      }
      // If bridge encounters an issue, fallback directly to direct curl
      try {
        return await directCurlFetch(url, options, timeoutMs);
      } catch (directErr) {
        throw err || directErr;
      }
    }
  }
  return directCurlFetch(url, options, timeoutMs);
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 1800) {
  // On macOS 15+, non-platform Node binaries can receive EHOSTUNREACH on LAN sockets
  // due to Local Network Privacy restrictions, whereas /usr/bin/curl succeeds.
  if (process.platform === 'darwin' && /^http:\/\/(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(url)) {
    return curlFetch(url, options, timeoutMs);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } catch (err) {
    if (process.platform === 'darwin') {
      return curlFetch(url, options, timeoutMs);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

let lastQueryError = null;

function getLastQueryError() {
  return lastQueryError;
}

async function queryDeviceInfo(ip, timeoutMs = 1500) {
  try {
    const res = await fetchWithTimeout(`http://${ip}:8060/query/device-info`, {}, timeoutMs);
    if (!res.ok) {
      lastQueryError = `HTTP ${res.status}`;
      return null;
    }
    const xml = await res.text();
    const parsed = await parseStringPromise(xml, { explicitArray: false });
    const info = parsed['device-info'];
    if (!info) {
      lastQueryError = 'Invalid device-info XML response from TV';
      return null;
    }
    const wifiMac = (info['wifi-mac'] || '').toLowerCase();
    const ethMac = (info['ethernet-mac'] || '').toLowerCase();
    const mac = wifiMac || ethMac || '';
    lastQueryError = null;
    return {
      ip,
      name: info['user-device-name'] || info['friendly-device-name'] || info['default-device-name'] || 'TCL Roku TV',
      modelName: info['model-name'] || 'Roku TV',
      modelNumber: info['model-number'] || '',
      vendorName: info['vendor-name'] || 'TCL',
      isTv: info['is-tv'] === 'true',
      powerMode: info['power-mode'] || 'PowerOn',
      serialNumber: info['serial-number'] || '',
      mac,
      wifiMac,
      ethernetMac,
      supportsWakeOnWlan: info['supports-wake-on-wlan'] === 'true'
    };
  } catch (err) {
    lastQueryError = err?.message || String(err);
    return null;
  }
}

function sendWakeOnLan(mac, broadcastIp = '255.255.255.255') {
  return new Promise((resolve, reject) => {
    if (!mac) return resolve(false);
    const cleanMac = mac.replace(/[^0-9a-fA-F]/g, '');
    if (cleanMac.length !== 12) {
      return reject(new Error(`Invalid MAC address: ${mac}`));
    }
    const macBytes = Buffer.from(cleanMac, 'hex');
    const packet = Buffer.alloc(6 + 16 * 6);
    packet.fill(0xff, 0, 6);
    for (let i = 0; i < 16; i++) {
      macBytes.copy(packet, 6 + i * 6);
    }

    const socket = dgram.createSocket('udp4');
    socket.once('error', (err) => {
      try { socket.close(); } catch {}
      reject(err);
    });

    socket.bind(() => {
      try {
        socket.setBroadcast(true);
        socket.send(packet, 0, packet.length, 9, broadcastIp, (err) => {
          try { socket.close(); } catch {}
          if (err) reject(err);
          else resolve(true);
        });
      } catch (e) {
        try { socket.close(); } catch {}
        reject(e);
      }
    });
  });
}

function lookupMacForIp(ip) {
  return new Promise((resolve) => {
    if (!ip) return resolve(null);
    execFile('/usr/sbin/arp', ['-n', ip], { timeout: 1200 }, (err, stdout) => {
      if (err || !stdout) return resolve(null);
      const m = stdout.match(/([0-9a-f]{1,2}(?::[0-9a-f]{1,2}){5})/i);
      if (m && m[1] && m[1] !== 'ff:ff:ff:ff:ff:ff') {
        return resolve(m[1].toLowerCase());
      }
      resolve(null);
    });
  });
}

async function wakeRokuTv(ip) {
  if (!ip) throw new Error('No Roku TV IP specified');

  const cfg = loadConfig();
  const saved = (cfg.savedTvs || []).find((t) => t.ip === ip);
  let mac = saved?.mac || saved?.wifiMac || saved?.ethernetMac;

  if (!mac) {
    mac = await lookupMacForIp(ip);
    if (mac && saved) {
      addOrUpdateSavedTv({ ...saved, mac });
    }
  }

  // 1. Send Wake-on-LAN packets (broadcast + subnet broadcast)
  if (mac) {
    try {
      await sendWakeOnLan(mac, '255.255.255.255');
      const subnets = getLocalSubnets();
      for (const s of subnets) {
        try {
          await sendWakeOnLan(mac, `${s.prefix}.255`);
        } catch {}
      }
    } catch (wolErr) {
      console.warn('WoL broadcast attempt warning:', wolErr.message);
    }
  }

  // 2. Send ECP PowerOn keypress (works immediately if TV is in fast start / standby)
  try {
    await fetchWithTimeout(`http://${ip}:8060/keypress/PowerOn`, { method: 'POST' }, 1200);
  } catch {}

  // 3. Poll for up to 4.5 seconds for the TV to respond
  const startTime = Date.now();
  let info = null;
  while (Date.now() - startTime < 4500) {
    await sleep(400);
    try {
      info = await queryDeviceInfo(ip, 900);
      if (info) break;
    } catch {}
    // Repeat PowerOn keypress once during wake loop
    if (Date.now() - startTime > 1500) {
      try {
        await fetchWithTimeout(`http://${ip}:8060/keypress/PowerOn`, { method: 'POST' }, 1000);
      } catch {}
    }
  }

  return {
    ok: Boolean(info),
    online: Boolean(info),
    device: info,
    mac
  };
}

function getArpCandidateIps() {
  return new Promise((resolve) => {
    execFile('/usr/sbin/arp', ['-an'], { timeout: 1500 }, (err, stdout) => {
      if (err || !stdout) return resolve([]);
      const ips = [];
      for (const line of stdout.split(/\r?\n/)) {
        if (line.includes('(incomplete)')) continue;
        const m = line.match(/\((\d+\.\d+\.\d+\.\d+)\)\s+at\s+([0-9a-f:]+)/i);
        if (m && m[2] !== 'ff:ff:ff:ff:ff:ff') {
          ips.push(m[1]);
        }
      }
      resolve(ips);
    });
  });
}

async function discoverViaSSDP(timeoutMs = 2200) {
  return new Promise((resolve) => {
    const foundIps = new Set();
    const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

    const message = Buffer.from(
      'M-SEARCH * HTTP/1.1\r\n' +
      'HOST: 239.255.255.250:1900\r\n' +
      'MAN: "ssdp:discover"\r\n' +
      'ST: roku:ecp\r\n' +
      'MX: 2\r\n\r\n'
    );

    socket.on('message', (msg, rinfo) => {
      const text = msg.toString();
      if (text.toLowerCase().includes('roku')) {
        foundIps.add(rinfo.address);
      }
    });

    socket.on('error', () => {
      try { socket.close(); } catch {}
      resolve([...foundIps]);
    });

    socket.bind(() => {
      try {
        socket.send(message, 0, message.length, 1900, '239.255.255.250');
        // Send a second packet after 400ms for reliability on Wi-Fi
        setTimeout(() => {
          try {
            socket.send(message, 0, message.length, 1900, '239.255.255.250');
          } catch {}
        }, 400);
      } catch {}
    });

    setTimeout(() => {
      try { socket.close(); } catch {}
      resolve([...foundIps]);
    }, timeoutMs);
  });
}

async function discoverViaSubnetScan() {
  const subnets = getLocalSubnets();
  if (subnets.length === 0) return [];
  const prefix = subnets[0].prefix;
  const candidateIps = [];
  for (let i = 1; i <= 254; i++) {
    candidateIps.push(`${prefix}.${i}`);
  }

  const found = [];
  const batchSize = 45;
  for (let i = 0; i < candidateIps.length; i += batchSize) {
    const batch = candidateIps.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map((ip) => queryDeviceInfo(ip, 750))
    );
    for (const dev of results) {
      if (dev) found.push(dev);
    }
    if (found.length > 0) break;
  }
  return found;
}

async function discoverRokuDevices() {
  const devicesMap = new Map();

  // 1. Check all saved TVs first
  const cfg = loadConfig();
  for (const tv of (cfg.savedTvs || [])) {
    if (tv.ip) {
      const saved = await queryDeviceInfo(tv.ip, 1200);
      if (saved) devicesMap.set(saved.ip, saved);
    }
  }

  // 2. Check active ARP table neighbors (fast & bypasses UDP multicast blocks)
  const arpIps = await getArpCandidateIps();
  if (arpIps.length > 0) {
    const arpResults = await Promise.all(
      arpIps.map((ip) => queryDeviceInfo(ip, 1200))
    );
    for (const info of arpResults) {
      if (info) devicesMap.set(info.ip, info);
    }
  }

  // 3. Try SSDP multicast discovery if none found yet
  if (devicesMap.size === 0) {
    const ssdpIps = await discoverViaSSDP(1800);
    for (const ip of ssdpIps) {
      if (!devicesMap.has(ip)) {
        const info = await queryDeviceInfo(ip, 1200);
        if (info) devicesMap.set(info.ip, info);
      }
    }
  }

  // 4. Fallback to fast subnet scan if none found
  if (devicesMap.size === 0) {
    const scanned = await discoverViaSubnetScan();
    for (const dev of scanned) {
      devicesMap.set(dev.ip, dev);
    }
  }

  // Sort Roku TVs ahead of standalone streaming players
  const devices = [...devicesMap.values()].sort((a, b) => Number(b.isTv) - Number(a.isTv));
  if (devices.length > 0) {
    const currentCfg = loadConfig();
    const tvs = [...(currentCfg.savedTvs || [])];
    for (const dev of devices) {
      const idx = tvs.findIndex((t) => t.ip === dev.ip);
      const tvRecord = {
        ip: dev.ip,
        name: dev.name,
        modelName: dev.modelName,
        vendorName: dev.vendorName,
        isTv: dev.isTv,
        mac: dev.mac || tvs[idx]?.mac || null,
        wifiMac: dev.wifiMac || tvs[idx]?.wifiMac || null,
        ethernetMac: dev.ethernetMac || tvs[idx]?.ethernetMac || null,
        lastSeen: new Date().toISOString()
      };
      if (idx >= 0) {
        tvs[idx] = { ...tvs[idx], ...tvRecord };
      } else {
        tvs.push(tvRecord);
      }
    }
    const activeTvIp = currentCfg.activeTvIp || devices[0].ip;
    saveConfig({ savedTvs: tvs, activeTvIp });
  }
  return devices;
}

async function getInstalledApps(ip) {
  if (!ip) return [];
  try {
    const res = await fetchWithTimeout(`http://${ip}:8060/query/apps`, {}, 2500);
    if (!res.ok) return [];
    const xml = await res.text();
    const parsed = await parseStringPromise(xml, { explicitArray: false });
    if (!parsed || !parsed.apps || !parsed.apps.app) return [];
    const rawApps = Array.isArray(parsed.apps.app) ? parsed.apps.app : [parsed.apps.app];
    const apps = rawApps.map((item) => ({
      id: item.$?.id || '',
      type: item.$?.type || 'appl',
      version: item.$?.version || '',
      name: (typeof item === 'string' ? item : item._ || '').trim()
    })).filter((a) => a.id && a.name);

    saveConfig({ cachedInstalledApps: apps });
    return apps;
  } catch {
    const cfg = loadConfig();
    return cfg.cachedInstalledApps || [];
  }
}

async function getActiveApp(ip) {
  if (!ip) return null;
  try {
    const res = await fetchWithTimeout(`http://${ip}:8060/query/active-app`, {}, 1500);
    if (!res.ok) return null;
    const xml = await res.text();
    const parsed = await parseStringPromise(xml, { explicitArray: false });
    const active = parsed?.['active-app']?.app;
    if (!active) return null;
    return {
      id: active.$?.id || null,
      name: (typeof active === 'string' ? active : active._ || 'Home').trim(),
      hasScreensaver: Boolean(parsed?.['active-app']?.screensaver)
    };
  } catch {
    return null;
  }
}

async function queryMediaPlayer(ip) {
  if (!ip) return null;
  try {
    const res = await fetchWithTimeout(`http://${ip}:8060/query/media-player`, {}, 1500);
    if (!res.ok) return null;
    const xml = await res.text();
    const parsed = await parseStringPromise(xml, { explicitArray: false });
    const player = parsed?.player;
    if (!player) return null;
    const isLiveRaw = player.is_live;
    const isLiveVal = typeof isLiveRaw === 'object' ? isLiveRaw._ : isLiveRaw;
    return {
      state: (player.$?.state || 'none').toLowerCase(),
      error: player.$?.error === 'true',
      pluginId: player.plugin?.$?.id || null,
      pluginName: player.plugin?.$?.name || null,
      isLive: String(isLiveVal).toLowerCase() === 'true'
    };
  } catch {
    return null;
  }
}



/**
 * Matches KNOWN_SPORTS_APPS against the actual installed apps on the TCL Roku TV.
 * Also includes any custom installed apps that look sports/streaming related.
 */
function resolveAppsCatalog(installedApps = [], enabledAppKeys = []) {
  const installedById = new Map();
  for (const inst of installedApps) {
    installedById.set(String(inst.id), inst);
  }

  return KNOWN_SPORTS_APPS.map((known) => {
    // 1. Match by Roku Channel Store ID
    let matchedInstalled = null;
    for (const rid of known.rokuIds) {
      if (installedById.has(String(rid))) {
        matchedInstalled = installedById.get(String(rid));
        break;
      }
    }
    // 2. Match by name regex if ID changed or regional variant (e.g., Fox One)
    if (!matchedInstalled && installedApps.length > 0) {
      for (const inst of installedApps) {
        if (known.namePatterns.some((re) => re.test(inst.name))) {
          matchedInstalled = inst;
          break;
        }
      }
    }

    const effectiveRokuId = matchedInstalled ? matchedInstalled.id : known.rokuIds[0];
    const isInstalledOnTv = Boolean(matchedInstalled);
    const isEnabled = enabledAppKeys.includes(known.key) || isInstalledOnTv;

    return {
      ...known,
      rokuId: effectiveRokuId,
      installedName: matchedInstalled ? matchedInstalled.name : null,
      isInstalledOnTv,
      isEnabled
    };
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function launchRokuApp(ip, appId) {
  if (!ip) {
    throw new Error('No Roku TV IP selected. Connect your Roku TV first.');
  }

  // 1. Wake TV if power is off, standby, or device is currently offline
  let deviceName = 'Roku TV';
  try {
    let info = await queryDeviceInfo(ip, 1200);
    if (!info || (info.powerMode && info.powerMode !== 'PowerOn')) {
      // TV is sleeping, offline, or suspended. Send WoL & PowerOn wake sequence
      const wakeResult = await wakeRokuTv(ip);
      if (wakeResult?.device) {
        info = wakeResult.device;
      }
    }
    if (info?.name) deviceName = info.name;
  } catch {}

  // 2. Check if the application is ALREADY the currently active app
  let activeApp = null;
  try {
    activeApp = await getActiveApp(ip);
    if (activeApp?.hasScreensaver) {
      await fetchWithTimeout(`http://${ip}:8060/keypress/Back`, { method: 'POST' }, 1200);
      await sleep(350);
      activeApp = await getActiveApp(ip);
    }
  } catch {}

  const targetAppIdStr = String(appId).trim();
  const knownApp = KNOWN_SPORTS_APPS.find(
    (a) => a.key === targetAppIdStr || a.rokuIds.includes(targetAppIdStr)
  );
  const targetIds = new Set(knownApp ? knownApp.rokuIds : [targetAppIdStr]);

  const activeIdStr = activeApp?.id ? String(activeApp.id).trim() : null;
  const isAlreadyActive = Boolean(
    activeIdStr && (
      targetIds.has(activeIdStr) ||
      (knownApp && knownApp.namePatterns.some((re) => re.test(activeApp.name || '')))
    )
  );

  if (isAlreadyActive) {
    // App is already running and in foreground on TV.
    // In Roku OS, pressing "Back" twice navigates out of any sub-screen/video player
    // back to the top-level main/home menu of the application without cold restarting it.
    try {
      await fetchWithTimeout(`http://${ip}:8060/keypress/Back`, { method: 'POST' }, 1200);
      await sleep(250);
      await fetchWithTimeout(`http://${ip}:8060/keypress/Back`, { method: 'POST' }, 1200);
    } catch {}

    return {
      ok: true,
      alreadyOpen: true,
      launchedAppId: appId,
      tvName: deviceName,
      message: `${activeApp.name || 'App'} is already open; navigated to home view.`
    };
  }

  // 3. App is not open yet; launch it directly
  const url = `http://${ip}:8060/launch/${encodeURIComponent(appId)}`;
  const res = await fetchWithTimeout(url, { method: 'POST' }, 2500);
  if (!res.ok && res.status !== 204) {
    throw new Error(`Roku TV returned HTTP ${res.status} when launching app ${appId}`);
  }

  return {
    ok: true,
    alreadyOpen: false,
    launchedAppId: appId,
    tvName: deviceName
  };
}

async function sendKeypress(ip, key) {
  if (!ip) {
    throw new Error('No Roku TV IP configured.');
  }
  const allowedKeys = new Set([
    'Home', 'Rev', 'Fwd', 'Play', 'Select', 'Left', 'Right', 'Down', 'Up',
    'Back', 'InstantReplay', 'Info', 'Backspace', 'Search', 'Enter',
    'VolumeDown', 'VolumeMute', 'VolumeUp', 'PowerOff', 'PowerOn',
    'ChannelUp', 'ChannelDown', 'InputTuner', 'InputHDMI1', 'InputHDMI2', 'InputHDMI3'
  ]);
  if (!allowedKeys.has(key)) {
    throw new Error(`Unsupported remote key: ${key}`);
  }
  const url = `http://${ip}:8060/keypress/${encodeURIComponent(key)}`;
  const res = await fetchWithTimeout(url, { method: 'POST' }, 2000);
  return { ok: res.ok || res.status === 204 };
}

module.exports = {
  KNOWN_SPORTS_APPS,
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
  queryMediaPlayer,
  resolveAppsCatalog,
  launchRokuApp,
  sendKeypress,
  fetchWithTimeout,
  getLastQueryError,
  wakeRokuTv,
  sendWakeOnLan,
  lookupMacForIp
};

