const config = require("./config");
const OmegleBot = require("./bot");
const { log } = require("./utils");

const bots = [];

// Graceful shutdown
function shutdown() {
  log("info", "Shutting down...");
  for (const bot of bots) {
    bot.stop();
  }
  setTimeout(() => process.exit(0), 2000);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

async function main() {
  log("info", `=== OmeFree Promo Bot ===`);
  log("info", `Target: omegleweb.com | Promoting: ${config.appUrl}`);
  log("info", `Sessions: ${config.maxConcurrentSessions}`);
  log("info", `Interests: ${config.interests.join(", ") || "none"}`);
  log("info", "");

  for (let i = 0; i < config.maxConcurrentSessions; i++) {
    const bot = new OmegleBot(i + 1);
    bots.push(bot);

    // Stagger launches to prevent bot-to-bot cascade at startup
    if (i > 0) {
      await new Promise((r) => setTimeout(r, 3000));
    }

    // Run each bot (non-blocking)
    bot.run().catch((err) => {
      log("error", `Bot ${i + 1} crashed:`, err.message);
    });
  }
}

main();
