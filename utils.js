const crypto = require("crypto");

// Generate a device ID mimicking the real client format (UUID v4)
function generateDeviceId() {
  return crypto.randomUUID();
}

// Random integer between min and max (inclusive)
function randomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Sleep helper
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Timestamped log
function log(level, ...args) {
  const levels = { debug: 0, info: 1, warn: 2, error: 3 };
  const config = require("./config");
  if (levels[level] >= levels[config.logLevel]) {
    const ts = new Date().toISOString().slice(11, 19);
    console.log(`[${ts}] [${level.toUpperCase()}]`, ...args);
  }
}

module.exports = { generateDeviceId, randomDelay, sleep, log };
