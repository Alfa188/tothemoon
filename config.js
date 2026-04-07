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

  // Interests (optional - helps match with relevant people)
  interests: ["chat", "friends", "bored", "talk"],

  // IPRoyal Residential Proxy (credentials from .env)
  proxy: {
    enabled: envBool("PROXY_ENABLED", true),
    host: env("PROXY_HOST", "geo.iproyal.com"),
    port: envInt("PROXY_PORT", 12321),
    username: env("PROXY_USERNAME", ""),
    password: env("PROXY_PASSWORD", ""),
    country: env("PROXY_COUNTRY", ""),
    sticky: envBool("PROXY_STICKY", true),
    stickyLifetime: env("PROXY_STICKY_LIFETIME", "2h"),
  },

  // Logging
  logLevel: env("LOG_LEVEL", "info"),
};
