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
  maxConcurrentSessions: envInt("MAX_CONCURRENT_SESSIONS", 30),
  minDelayBetweenMsgs: 1500,
  maxDelayBetweenMsgs: 3500,
  typingIndicatorDelay: 800,
  waitForResponseMs: 8000,
  delayBeforePromoMs: 2000,
  delayBeforeNextMs: 1500,
  pingIntervalMs: 20000,

  // Geonode Residential Proxy (credentials from .env)
  // Proxy config — set PROXY_PROVIDER=iproyal or geonode
  proxy: {
    enabled: envBool("PROXY_ENABLED", true),
    provider: env("PROXY_PROVIDER", "geonode"),
    host: env("PROXY_HOST", "proxy.geonode.io"),
    port: envInt("PROXY_PORT", 9000),
    username: env("PROXY_USERNAME", ""),
    password: env("PROXY_PASSWORD", ""),
    type: env("PROXY_TYPE", "residential"),
    country: env("PROXY_COUNTRY", ""),
    sticky: envBool("PROXY_STICKY", true),
    stickyLifetime: env("PROXY_STICKY_LIFETIME", "10m"),
  },

  // Logging
  logLevel: env("LOG_LEVEL", "info"),
};
