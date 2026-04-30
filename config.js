// Load .env file if present
require("dotenv").config();

function env(key, fallback) {
  return process.env[key] !== undefined ? process.env[key] : fallback;
}

function envBool(key, fallback) {
  const v = process.env[key];
  if (v === undefined) return fallback;
  return v === "true" || v === "1";
}

function envInt(key, fallback) {
  const v = process.env[key];
  return v !== undefined ? parseInt(v, 10) : fallback;
}

module.exports = {
  // Target platform
  wsUrl: "wss://omegleweb.com/ws",
  page: "chat",
  chatType: "text",
  bucket: "global",

  // Your app to promote
  appName: "OmeFree",
  appUrl: "omefree.com",

  // Bot behavior
  maxConcurrentSessions: 28,
  minDelayBetweenMsgs: 1500,
  maxDelayBetweenMsgs: 3500,
  typingIndicatorDelay: 800,
  waitForResponseMs: 8000,
  delayBeforePromoMs: 2000,
  delayBeforeNextMs: envInt("DELAY_BEFORE_NEXT_MS", 8000),
  delayBeforeNextMaxMs: envInt("DELAY_BEFORE_NEXT_MAX_MS", 25000),
  pingIntervalMs: 20000,

  // Proxy configuration (iproyal or geonode)
  proxy: {
    enabled: envBool("PROXY_ENABLED", false),
    provider: env("PROXY_PROVIDER", "geonode"),
    host: env("PROXY_HOST", "proxy.geonode.io"),
    port: envInt("PROXY_PORT", 9000),
    username: env("PROXY_USERNAME", "geonode_upocSqHxCN"),
    password: env("PROXY_PASSWORD", "32c4d3fe-d466-4029-b8c7-71667b3a71de"),
    country: env("PROXY_COUNTRY", ""),
    sticky: envBool("PROXY_STICKY", false),
    stickyLifetime: env("PROXY_STICKY_LIFETIME", "2h"),
  },

  // Logging
  logLevel: env("LOG_LEVEL", "info"),
};
