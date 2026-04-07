const WebSocket = require("ws");
const { HttpsProxyAgent } = require("https-proxy-agent");
const config = require("./config");
const { getRandomSequence } = require("./messages");
const { generateDeviceId, randomDelay, sleep, log } = require("./utils");

// Shared registry of active matchIds across all bot instances
// Proactively detects bot-to-bot matches before any message is sent
const activeMatchIds = new Set();

// Max consecutive reconnect failures before giving up
const MAX_RECONNECT_ATTEMPTS = 15;

// Periodic cleanup of stale matchIds (safety against memory leaks)
setInterval(() => {
  if (activeMatchIds.size > 500) {
    log("warn", `activeMatchIds cleanup: ${activeMatchIds.size} entries — clearing stale`);
    activeMatchIds.clear();
  }
}, 60000);

class OmegleBot {
  constructor(sessionId = 1) {
    this.sessionId = sessionId;
    this.deviceId = generateDeviceId();
    this.ws = null;
    this.seq = 0;
    this.matchId = null;
    this.isSearching = false;
    this.isClosed = false;
    this.pingTimer = null;
    this.conversationActive = false;
    this.needsReconnect = false;
    this.reconnectAttempts = 0;
    this.vpnBlockedCount = 0;
    this.stats = { sessions: 0, messagesDelivered: 0, errors: 0 };
    this.strangerReplied = false;
  }

  // Build the WebSocket URL matching the real client
  buildWsUrl() {
    const params = new URLSearchParams({
      page: config.page,
      did: this.deviceId,
      dc: "desktop",
      sb: "lg",
    });
    return `${config.wsUrl}?${params.toString()}`;
  }

  // Build Geonode proxy agent
  // Format: username-type-TYPE[-country-XX]:password
  // Note: session/lifetime params are NOT supported by Geonode in the username.
  // Sticky IPs are not needed since each bot uses a single long-lived WebSocket connection.
  buildProxyAgent() {
    const p = config.proxy;
    if (!p || !p.enabled) return null;

    let user = `${p.username}-type-${p.type || "residential"}`;
    if (p.country) user += `-country-${p.country}`;

    const proxyUrl = `http://${encodeURIComponent(user)}:${encodeURIComponent(p.password)}@${p.host}:${p.port}`;
    log("info", `[S${this.sessionId}] Using proxy: ${p.host}:${p.port}${p.country ? ` (${p.country})` : ""}`);
    return new HttpsProxyAgent(proxyUrl);
  }

  // Send JSON over WebSocket
  send(obj) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return false;
    try {
      this.ws.send(JSON.stringify(obj));
      return true;
    } catch (e) {
      log("error", `[S${this.sessionId}] Send error:`, e.message);
      return false;
    }
  }

  // Start heartbeat
  startPing() {
    this.stopPing();
    this.pingTimer = setInterval(() => {
      this.send({ type: "ping", t: Date.now() });
    }, config.pingIntervalMs);
  }

  stopPing() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  // Connect to the platform
  connect() {
    return new Promise((resolve, reject) => {
      const url = this.buildWsUrl();
      log("info", `[S${this.sessionId}] Connecting...`);

      const wsOptions = {
        headers: {
          Origin: "https://omegleweb.com",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        },
      };

      // Attach proxy agent if configured
      const agent = this.buildProxyAgent();
      if (agent) wsOptions.agent = agent;

      this.ws = new WebSocket(url, wsOptions);

      this.ws.on("open", () => {
        log("info", `[S${this.sessionId}] Connected`);
        this.startPing();
        resolve();
      });

      this.ws.on("message", (data) => {
        this.handleMessage(data);
      });

      this.ws.on("close", (code, reason) => {
        log("warn", `[S${this.sessionId}] WS closed: ${code} ${reason}`);
        this.stopPing();
        if (this.matchId) activeMatchIds.delete(this.matchId);
        this.matchId = null;
        this.isSearching = false;
        this.conversationActive = false;
        // Flag for reconnection unless intentionally closed or blocked
        if (!this.isClosed) {
          this.needsReconnect = true;
        }
      });

      this.ws.on("error", (err) => {
        log("error", `[S${this.sessionId}] WS error:`, err.message);
        this.stats.errors++;
        reject(err);
      });
    });
  }

  // Handle incoming WebSocket messages
  handleMessage(raw) {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    if (!msg || !msg.type) return;

    log("debug", `[S${this.sessionId}] ← ${msg.type}`, JSON.stringify(msg).slice(0, 200));

    switch (msg.type) {
      case "pong":
        break;

      case "session":
        log("info", `[S${this.sessionId}] Session established: ${msg.userId}`);
        break;

      case "stats":
        if (!this._lastOnlineLog || Date.now() - this._lastOnlineLog > 10000) {
          log("info", `[S${this.sessionId}] Online: ${msg.online}`);
          this._lastOnlineLog = Date.now();
        }
        break;

      case "match_found":
        // Proactive bot-to-bot detection: if another bot already owns this matchId, skip immediately
        if (activeMatchIds.has(msg.matchId)) {
          log("warn", `[S${this.sessionId}] Bot-to-bot match detected on match_found — skipping with delay`);
          this.isSearching = false;
          this.matchId = msg.matchId;
          // Random delay (8-20s) before re-queuing to break cascade synchronization
          sleep(randomDelay(8000, 20000)).then(() => {
            if (!this.isClosed) this.nextPartner();
          });
          break;
        }
        activeMatchIds.add(msg.matchId);
        this.matchId = msg.matchId;
        this.isSearching = false;
        this.conversationActive = true;
        this.vpnBlockedCount = 0; // IP works — reset vpn counter
        this.reconnectAttempts = 0;
        this.stats.sessions++;
        this.strangerReplied = false;
        log("info", `[S${this.sessionId}] Matched! (matchId: ${msg.matchId}, country: ${msg.partnerCountryCode || "?"})`);
        this.runConversation();
        break;

      case "partner_disconnected":
        if (msg.matchId && msg.matchId !== this.matchId) break;
        log("info", `[S${this.sessionId}] Partner disconnected`);
        if (this.matchId) activeMatchIds.delete(this.matchId);
        this.matchId = null;
        this.conversationActive = false;
        break;

      case "chat_message":
        if (msg.from !== "you") {
          log("info", `[S${this.sessionId}] Stranger: ${msg.text}`);
          this.strangerReplied = true;
          // Bot-to-bot detection: if stranger sends our promo, skip with delay
          if (msg.text && msg.text.includes(config.appUrl)) {
            log("warn", `[S${this.sessionId}] Bot-to-bot match detected — skipping with delay`);
            sleep(randomDelay(8000, 20000)).then(() => { if (!this.isClosed) this.nextPartner(); });
          }
        }
        break;

      case "partner_typing":
        break;

      case "error":
        log("error", `[S${this.sessionId}] Server error: ${msg.code} - ${msg.message}`);
        this.stats.errors++;
        if (msg.code === "vpn_blocked") {
          this.vpnBlockedCount++;
          const vpnBackoff = Math.min(30000 * Math.pow(2, this.vpnBlockedCount - 1), 300000);
          log("warn", `[S${this.sessionId}] Proxy IP blocked (${this.vpnBlockedCount}x) — will reconnect with new IP in ${Math.round(vpnBackoff / 1000)}s`);
          this.needsReconnect = true;
          this._vpnBackoff = vpnBackoff;
          // Force close WS so reconnect logic kicks in
          if (this.ws) try { this.ws.close(); } catch {}
        }
        if (msg.code === "did_required") {
          this.isClosed = true;
        }
        if (msg.code === "rate_limited") {
          this.isSearching = false;
          this.matchId = null;
          this.conversationActive = false;
          const backoff = randomDelay(10000, 20000);
          log("warn", `[S${this.sessionId}] Rate limited — waiting ${Math.round(backoff/1000)}s`);
          sleep(backoff).then(() => { if (!this.isClosed) this.findPartner(); });
        }
        break;

      case "banned":
        log("error", `[S${this.sessionId}] BANNED - stopping`);
        this.isClosed = true;
        break;

      case "system":
        log("info", `[S${this.sessionId}] System: ${msg.text}`);
        break;

      default:
        log("debug", `[S${this.sessionId}] Unhandled: ${msg.type}`);
    }
  }

  // Search for a partner
  findPartner() {
    this.seq++;
    const prefs = {};
    if (config.interests && config.interests.length) {
      prefs.interests = config.interests;
    }
    this.send({
      type: "find_partner",
      seq: this.seq,
      bucket: config.bucket,
      chatType: config.chatType,
      prefs,
    });
    this.isSearching = true;
    log("info", `[S${this.sessionId}] Searching for partner...`);
  }

  // Skip to next partner
  nextPartner() {
    this.seq++;
    const prefs = {};
    if (config.interests && config.interests.length) {
      prefs.interests = config.interests;
    }
    // Free the matchId from the shared registry before moving on
    if (this.matchId) activeMatchIds.delete(this.matchId);
    this.send({
      type: "next",
      seq: this.seq,
      bucket: config.bucket,
      chatType: config.chatType,
      prefs,
    });
    this.matchId = null;
    this.conversationActive = false;
    this.isSearching = true;
    log("info", `[S${this.sessionId}] Skipping to next partner...`);
  }

  // Send a chat message with typing simulation
  async sendMessage(text) {
    if (!this.matchId || !this.conversationActive) return false;

    // Send typing indicator
    this.send({ type: "typing", matchId: this.matchId, isTyping: true });

    // Simulate typing time based on message length
    const typingTime = Math.min(
      config.typingIndicatorDelay + text.length * 40,
      4000
    );
    await sleep(typingTime);

    if (!this.matchId || !this.conversationActive) return false;

    // Stop typing indicator
    this.send({ type: "typing", matchId: this.matchId, isTyping: false });

    // Send the actual message
    this.send({ type: "chat_message", matchId: this.matchId, text });
    this.stats.messagesDelivered++;
    log("info", `[S${this.sessionId}] You: ${text}`);
    return true;
  }

  // Run a conversation sequence
  async runConversation() {
    const sequence = getRandomSequence();

    // Wait 3 seconds after match before sending anything
    await sleep(3000);
    if (!this.matchId || !this.conversationActive) return;

    for (let i = 0; i < sequence.length; i++) {
      if (!this.matchId || !this.conversationActive) {
        log("info", `[S${this.sessionId}] Partner left mid-conversation`);
        return;
      }

      // Random delay between messages
      if (i > 0) {
        const delay = randomDelay(config.minDelayBetweenMsgs, config.maxDelayBetweenMsgs);
        await sleep(delay);
      }

      // Check again after delay
      if (!this.matchId || !this.conversationActive) return;

      const sent = await this.sendMessage(sequence[i]);
      if (!sent) return;

      // After the first message (greeting), wait for a response
      if (i === 0) {
        this.strangerReplied = false;
        await sleep(config.waitForResponseMs);
        if (!this.matchId || !this.conversationActive) return;
        // If stranger replied, add a natural extra pause before promo
        if (this.strangerReplied) {
          await sleep(randomDelay(config.delayBeforePromoMs, config.delayBeforePromoMs + 2000));
          if (!this.matchId || !this.conversationActive) return;
        }
      }
    }

    // Linger a bit if stranger was engaged
    if (this.strangerReplied) {
      await sleep(randomDelay(3000, 5000));
    }

    // Conversation done, wait a moment then move to next
    await sleep(config.delayBeforeNextMs);
    if (this.matchId && this.conversationActive) {
      this.nextPartner();
    }
  }

  // Reconnect after a disconnect
  async reconnect() {
    this.reconnectAttempts++;

    if (this.reconnectAttempts > MAX_RECONNECT_ATTEMPTS) {
      log("error", `[S${this.sessionId}] Max reconnect attempts (${MAX_RECONNECT_ATTEMPTS}) reached — stopping bot`);
      this.isClosed = true;
      return false;
    }

    // Use vpn-specific backoff if we got vpn_blocked, otherwise normal backoff
    const backoff = this._vpnBackoff || Math.min(5000 * this.reconnectAttempts, 30000);
    this._vpnBackoff = null;

    log("info", `[S${this.sessionId}] Reconnecting in ${Math.round(backoff / 1000)}s (attempt ${this.reconnectAttempts})...`);
    await sleep(backoff);
    if (this.isClosed) return false;

    // Clean up old WS
    if (this.ws) {
      try { this.ws.removeAllListeners(); this.ws.close(); } catch {}
      this.ws = null;
    }

    // Generate a fresh device ID for the new connection
    this.deviceId = generateDeviceId();
    this.needsReconnect = false;

    try {
      await this.connect();
      // Only reset attempts if we haven't been vpn-blocked recently
      if (this.vpnBlockedCount === 0) {
        this.reconnectAttempts = 0;
      }
      return true;
    } catch (e) {
      log("error", `[S${this.sessionId}] Reconnect failed: ${e.message}`);
      return false;
    }
  }

  // Main loop
  async run() {
    try {
      await this.connect();
    } catch (e) {
      log("error", `[S${this.sessionId}] Connection failed: ${e.message}`);
      return;
    }

    // Wait for session to be established
    await sleep(1500);

    // Start first search
    this.findPartner();

    // Keep running until closed
    while (!this.isClosed) {
      await sleep(2000);

      // Reconnect if WebSocket died
      if (this.needsReconnect && !this.isClosed) {
        const ok = await this.reconnect();
        if (!ok) continue;
        await sleep(1500);
        if (!this.isClosed) this.findPartner();
        continue;
      }

      // If not searching and not in a match, search again
      if (!this.isSearching && !this.matchId && !this.conversationActive) {
        await sleep(randomDelay(1000, 3000));
        if (!this.isClosed) {
          this.findPartner();
        }
      }
    }

    this.stopPing();
    if (this.ws) {
      this.ws.close();
    }
    log("info", `[S${this.sessionId}] Session ended. Stats:`, JSON.stringify(this.stats));
  }

  // Graceful shutdown
  stop() {
    this.isClosed = true;
    this.conversationActive = false;
    this.stopPing();
    if (this.ws) {
      try {
        this.send({ type: "cancel", seq: ++this.seq, chatType: config.chatType });
      } catch {}
      this.ws.close();
    }
  }
}

module.exports = OmegleBot;
