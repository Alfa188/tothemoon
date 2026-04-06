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
  maxConcurrentSessions: 50,      // Number of parallel bot sessions
  minDelayBetweenMsgs: 1500,      // Min ms between messages (simulates typing)
  maxDelayBetweenMsgs: 3500,      // Max ms between messages
  typingIndicatorDelay: 800,       // ms to show typing before sending
  waitForResponseMs: 8000,         // How long to wait for stranger reply before moving on
  delayBeforePromoMs: 2000,        // Delay after greeting before promo message
  delayBeforeNextMs: 1500,         // Delay after promo before skipping to next
  pingIntervalMs: 20000,           // Heartbeat interval (match the real client)

  // Interests (optional - helps match with relevant people)
  interests: ["chat", "friends", "bored", "talk"],

  // IPRoyal Residential Proxy
  // Docs: https://dashboard.iproyal.com/residential-proxies
  proxy: {
    enabled: true,
    // Format: http://username:password@host:port
    // IPRoyal residential endpoint
    host: "geo.iproyal.com",
    port: 12321,
    username: "PROXY_USERNAME_REDACTED",
    password: "PROXY_PASSWORD_REDACTED",
    // IPRoyal params appended to password: country, session, lifetime
    // country: target country code (e.g. "us", "fr", "gb", "de")
    // session: random string for sticky session (same IP for duration)
    // lifetime: sticky session duration in minutes (e.g. "10m", "30m")
    country: "",           // Leave empty for random worldwide
    sticky: true,           // Use sticky sessions (same IP per bot session)
    stickyLifetime: "30m",  // How long to keep the same IP
  },

  // Logging
  logLevel: "info", // "debug" | "info" | "warn" | "error"
};
