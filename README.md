# tothemoon — OmeFree Promo Bot

Bot promotionnel pour omegleweb.com → [omefree.com](https://omefree.com)

## Installation

```bash
npm install
```

## Configuration

Modifier `config.js` pour ajuster :
- `maxConcurrentSessions` — nombre de bots en parallèle
- `interests` — centres d'intérêt pour le matching
- `waitForResponseMs` — temps d'attente de réponse du stranger
- Messages dans `messages.js`

## Lancement

```bash
npm start
```

## Structure

```
config.js      — Configuration du bot
messages.js    — Séquences de messages (rotation aléatoire)
bot.js         — Logique du bot (WebSocket, protocole, conversation)
utils.js       — Helpers (sleep, device ID, logging)
index.js       — Point d'entrée, gestion multi-sessions
```

## Notes

- Le bot simule un timing humain (frappe, délais entre messages)
- Les messages sont variés et tournent aléatoirement
- Heartbeat ping/pong pour maintenir la connexion
- Reconnexion automatique entre conversations
- **Ne fonctionne pas depuis un VPN/proxy** (bloqué par omegleweb.com)
- Lancer depuis une connexion résidentielle ou un VPS non-flaggé
