#!/usr/bin/env node
/**
 * Diagnostic script to test proxy IPs against omegleweb.com
 *
 * Usage:
 *   node test-proxy.js                  # test with .env proxy settings
 *   node test-proxy.js --no-proxy       # test without proxy (raw server IP)
 *   node test-proxy.js --port 9010      # override proxy port
 *   node test-proxy.js --country US     # override country
 *   node test-proxy.js --no-sticky      # disable sticky session (new IP per connection)
 */
require("dotenv").config();
const WebSocket = require("ws");
const { HttpsProxyAgent } = require("https-proxy-agent");
const crypto = require("crypto");

// Parse CLI args
const args = process.argv.slice(2);
const noProxy = args.includes("--no-proxy");
const portIdx = args.indexOf("--port");
const countryIdx = args.indexOf("--country");
const noSticky = args.includes("--no-sticky");
const overridePort = portIdx >= 0 ? parseInt(args[portIdx + 1]) : null;
const overrideCountry = countryIdx >= 0 ? args[countryIdx + 1] : null;

const deviceId = crypto.randomUUID();

function buildProxyAgent() {
  if (noProxy) return null;

  const provider = process.env.PROXY_PROVIDER || "geonode";
  const host = process.env.PROXY_HOST || "proxy.geonode.io";
  const port = overridePort || parseInt(process.env.PROXY_PORT || "9000");
  const password = process.env.PROXY_PASSWORD || "";
  const country = overrideCountry || process.env.PROXY_COUNTRY || "";

  let user;
  if (provider === "iproyal") {
    user = process.env.PROXY_USERNAME || "";
    let pass = password;
    if (country) pass += `_country-${country}`;
    if (!noSticky) pass += `_session-test${Date.now()}_lifetime-10m`;
    const url = `http://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}:${port}`;
    console.log(`[PROXY] IPRoyal ${host}:${port}${country ? ` (${country})` : ""}`);
    return new HttpsProxyAgent(url);
  }

  // Geonode
  user = process.env.PROXY_USERNAME || "";
  if (country) user += `-country-${country}`;
  if (!noSticky) user += `-session-test${Date.now().toString(36)}`;
  const url = `http://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}`;
  console.log(`[PROXY] Geonode ${host}:${port}${country ? ` (${country})` : ""} user=${user}`);
  return new HttpsProxyAgent(url);
}

// Build WebSocket URL like the real client
const wsParams = new URLSearchParams({
  page: "chat",
  did: deviceId,
  dc: "desktop",
  sb: "lg",
  tz: "Europe/Paris",
  net: "4g",
  wv: "Google Inc. (NVIDIA)",
  wr: "ANGLE (NVIDIA, NVIDIA GeForce GTX 1660 SUPER Direct3D11 vs_5_0 ps_5_0, D3D11)",
});
const wsUrl = `wss://omegleweb.com/ws?${wsParams.toString()}`;

console.log(`\n=== omegleweb.com proxy diagnostic ===`);
console.log(`[MODE] ${noProxy ? "NO PROXY (direct)" : "WITH PROXY"}`);
console.log(`[DID]  ${deviceId}\n`);

const agent = buildProxyAgent();

const wsOptions = {
  headers: {
    Origin: "https://omegleweb.com",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
    Cookie: `omegle_device_id_v1=${deviceId}`,
  },
};
if (agent) wsOptions.agent = agent;

let gotSession = false;
let seq = 0;
let statsCount = 0;

const ws = new WebSocket(wsUrl, wsOptions);

ws.on("open", () => {
  console.log("[OK] WebSocket connected");
});

ws.on("message", (data) => {
  let msg;
  try { msg = JSON.parse(data); } catch { return; }

  switch (msg.type) {
    case "session":
      gotSession = true;
      console.log(`[OK] Session: ${msg.userId} (edge: ${msg.edgeName})`);
      // Wait 2s then send find_partner
      console.log("[..] Waiting 2s before find_partner...");
      setTimeout(() => {
        seq++;
        ws.send(JSON.stringify({ type: "find_partner", seq, bucket: "global", chatType: "text", prefs: {} }));
        console.log("[>>] Sent find_partner");
      }, 2000);
      break;

    case "stats":
      statsCount++;
      if (statsCount <= 2) console.log(`[OK] Stats: ${msg.online} online`);
      break;

    case "match_found":
      console.log(`\n✅ MATCH FOUND! matchId=${msg.matchId} country=${msg.partnerCountryCode || "?"}`);
      console.log("   >>> Proxy IP is CLEAN — this config works! <<<");
      // Disconnect cleanly
      ws.send(JSON.stringify({ type: "disconnect", matchId: msg.matchId }));
      setTimeout(() => { ws.close(); process.exit(0); }, 1000);
      break;

    case "error":
      if (msg.code === "vpn_blocked") {
        console.log(`\n❌ vpn_blocked — this IP/config is detected as VPN`);
        console.log("   The server flagged this connection as proxy/VPN.");
        console.log("   Try: --port 9010, --country US, --no-sticky, or switch provider.");
      } else {
        console.log(`[ERROR] ${msg.code}: ${msg.message}`);
      }
      break;

    case "pong":
      break;

    default:
      console.log(`[<<] ${msg.type}: ${JSON.stringify(msg).slice(0, 150)}`);
  }
});

ws.on("close", (code, reason) => {
  console.log(`[CLOSED] code=${code} reason=${reason}`);
  process.exit(code === 1008 ? 1 : 0);
});

ws.on("error", (err) => {
  console.error(`[ERROR] ${err.message}`);
  process.exit(1);
});

// Timeout after 30s
setTimeout(() => {
  console.log("\n[TIMEOUT] 30s elapsed — no match found");
  if (!gotSession) console.log("   Could not even establish a session — proxy may be down.");
  ws.close();
  process.exit(2);
}, 30000);
