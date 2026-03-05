# 🎬 Streamline

**Streamline** is a self-hosted media manager — a modern, all-in-one alternative to Sonarr + Radarr, built from scratch with a clean dark UI.

![Version](https://img.shields.io/badge/version-1.0.0-6366f1?style=flat-square)
![Docker](https://img.shields.io/badge/docker-ready-2496ED?style=flat-square&logo=docker)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)

## Screenshots

> 📸 **Screenshots werden nach dem ersten Start hinzugefügt.**
> Starte Streamline, mach Screenshots der folgenden Ansichten und lege sie in `docs/screenshots/` ab:

| Dashboard | Mediathek |
|---|---|
| ![Dashboard](docs/screenshots/dashboard.png) | ![Bibliothek](docs/screenshots/library.png) |

| Suche | Einstellungen |
|---|---|
| ![Suche](docs/screenshots/search.png) | ![Einstellungen](docs/screenshots/settings.png) |

---

## Features

- 🎬 **Movies & TV Shows** in one interface — replaces Sonarr + Radarr
- 🔍 **TMDB & TheTVDB** — metadata, posters and ratings (user-configurable)
- 📥 **SABnzbd** — live queue, pause/resume/delete, send NZBs directly
- 🔎 **NZBHydra2 / Newznab** — integrated indexer search
- 🌐 **Custom Indexers** — add any Newznab/Torznab indexer by URL and API key
- ⭐ **Custom Formats** — import scoring rules directly from Radarr/Sonarr JSON export
- 📊 **Interactive NZB Search** — Radarr-style sortable table with quality, language and score columns
- 📦 **Bulk Import** — import your existing media collection from a text list
- 🤖 **Telegram Bot** — search, add and monitor media from Telegram
- 💬 **Discord Webhooks** — notifications for downloads, new media and daily digest
- 👤 **User Management** — create users and change passwords from the UI
- 🧙 **Onboarding Wizard** — guided first-run setup with a 5-minute time window
- 🔐 **JWT Authentication** with secure token handling
- 🐳 **Fully Dockerized** — starts with a single command

---

## Quick Start

### Requirements

- Docker >= 24.0
- Docker Compose >= 2.0

### 1. Clone the repository

```bash
git clone https://github.com/your-user/streamline.git
cd streamline
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and set at least `JWT_SECRET` and `BOT_SECRET`:

```bash
openssl rand -hex 32   # for JWT_SECRET
openssl rand -hex 16   # for BOT_SECRET
```

```env
JWT_SECRET=your_generated_secret_here
BOT_SECRET=your_generated_secret_here
HOST_PORT=7878
ALLOWED_ORIGINS=http://localhost:7878
```

### 3. Start

```bash
docker compose up -d --build
```

Streamline is now available at: **http://localhost:7878**

### 4. First launch — Onboarding Wizard

On first visit, Streamline shows a guided setup wizard where you create your admin account and optionally connect SABnzbd, TMDB/TheTVDB and your first indexer. The wizard is available for **5 minutes** — after that it expires and you land on the normal login page.

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `JWT_SECRET` | — | **Required.** Min. 32 chars. Generate with `openssl rand -hex 32` |
| `BOT_SECRET` | — | Shared secret between backend and bot. Generate with `openssl rand -hex 16` |
| `HOST_PORT` | `7878` | Port exposed on the host |
| `ALLOWED_ORIGINS` | `http://localhost:7878` | Comma-separated list of allowed CORS origins |
| `TELEGRAM_TOKEN` | — | Telegram bot token from @BotFather |
| `TELEGRAM_CHAT_ID` | — | Restrict bot to one chat ID (leave empty for no restriction) |
| `STREAMLINE_BOT_USER` | `bot` | Username of the Streamline bot account |
| `STREAMLINE_BOT_PASS` | — | Password of the Streamline bot account |
| `DISCORD_WEBHOOK_URL` | — | Discord webhook URL for notifications |
| `LOG_LEVEL` | `info` | Logging level: error / warn / info / debug |

---

## Settings

After login, configure everything under the **Settings** menu:

### Metadata Provider
Choose between **TMDB** (movies + TV) and **TheTVDB** (best for TV shows). Enter the API key and test the connection.

- **TMDB API Key (v3):** [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api) — free
- **TheTVDB API Key (v4):** [thetvdb.com/api-information](https://www.thetvdb.com/api-information) — free

### SABnzbd
- URL: `http://192.168.1.x:8080`
- API Key: SABnzbd → Configuration → General → API Key

### NZBHydra2
- URL: `http://192.168.1.x:5076`
- API Key: NZBHydra2 → Config → Authorization

### Indexers
Add any Newznab/Torznab indexer by name, type, URL and API key. Compatible with Prowlarr, Jackett and NZBHydra2.

### Custom Formats
Import scoring rules from Radarr or Sonarr:
1. In Radarr/Sonarr: **Settings → Custom Formats → Export**
2. Paste the JSON in Streamline → **Custom Formats → Import**
3. Scores are applied automatically to all NZB search results

---

## User Management

Go to **Users** in the sidebar to create users, change passwords and manage roles.

### Creating the bot user via CLI

```bash
docker exec -it streamline-backend node -e "
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
bcrypt.hash('your_bot_password', 12).then(hash => {
  const db = new Database('/app/data/streamline.db');
  db.prepare('INSERT OR IGNORE INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)').run(
    require('crypto').randomUUID(), 'bot', hash, 'user'
  );
  console.log('Bot user created!');
  process.exit(0);
});
"
```

### Reset a forgotten password

```bash
docker exec -it streamline-backend node -e "
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
bcrypt.hash('NewPassword123', 12).then(hash => {
  const db = new Database('/app/data/streamline.db');
  db.prepare('UPDATE users SET password_hash = ? WHERE username = ?').run(hash, 'admin');
  console.log('Password updated!');
  process.exit(0);
});
"
```

---

## Telegram Bot & Discord

Streamline includes a native bot container — no external tools needed.

### Telegram Bot Setup

**1. Create a bot via @BotFather:**
```
/newbot → Name: Streamline → get token
```

**2. Find your Chat ID:**
```bash
curl https://api.telegram.org/bot<TOKEN>/getUpdates
# look for "chat":{"id": 123456789}
```

**3. Add to `.env` and restart:**
```env
TELEGRAM_TOKEN=123456:ABC-DEF...
TELEGRAM_CHAT_ID=123456789
STREAMLINE_BOT_USER=bot
STREAMLINE_BOT_PASS=your_bot_password
```

### Bot Commands

| Command | Description |
|---|---|
| `/start` | Show help and all commands |
| `/status` | System overview |
| `/library` | Full media library |
| `/movies` | Movies only |
| `/series` | TV shows only |
| `/wanted` | Wanted media |
| `/search <title>` | Search and add inline via buttons |
| `/add_movie <title or ID>` | Add a movie by title or TMDB ID |
| `/add_series <title or ID>` | Add a TV show by title or TMDB ID |
| `/queue` | SABnzbd live queue |
| `/history` | Download history |

### Discord Webhook

```
Discord: Server Settings → Integrations → Webhooks → New Webhook → copy URL
```

```env
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

Automatic notifications for: new media added, download completed/failed, daily digest at 08:00.

---

## Architecture

```
┌─────────────────────────────────────────────┐
│              Browser / Client               │
└──────────────────────┬──────────────────────┘
                       │ HTTP :7878
┌──────────────────────▼──────────────────────┐
│         Nginx (Frontend Container)          │
│     React SPA + Reverse Proxy for /api/*    │
└──────────┬──────────────────────────────────┘
           │ /api/* → http://backend:3001
┌──────────▼──────────────────────────────────┐
│    Node.js / Express (Backend Container)    │
│  Auth │ Media │ Search │ Settings │ DLs     │
└──────────┬──────────────────────────────────┘
           │
┌──────────▼──────────┐   ┌─────────────────┐
│  SQLite (Persistent │   │  External APIs: │
│  Docker Volume)     │   │  TMDB, TheTVDB, │
└─────────────────────┘   │  SABnzbd, Hydra │
                          └─────────────────┘
┌─────────────────────────────────────────────┐
│         Bot Container (Node.js)             │
│   Telegram polling + Discord webhooks       │
└─────────────────────────────────────────────┘
```

---

## Security

| Measure | Details |
|---|---|
| Password hashing | bcrypt with 12 salt rounds |
| JWT tokens | HS256, 24h expiry, issuer validation |
| Rate limiting | 200 req/15min general, 20 req/15min for login |
| Helmet.js | Security HTTP headers (CSP, HSTS, etc.) |
| Input validation | express-validator on all endpoints |
| SQL injection protection | Prepared statements (better-sqlite3) |
| CORS whitelist | Only origins listed in `ALLOWED_ORIGINS` |
| Non-root container | Backend runs as unprivileged `streamline` user |
| API keys masked | Never returned in plaintext after saving |
| Timing-attack protection | Always runs bcrypt.compare(), even for invalid users |

---

## Backup & Restore

```bash
# Backup
docker cp streamline-backend:/app/data/streamline.db ./backup_$(date +%Y%m%d).db

# Restore
docker cp ./backup_20260101.db streamline-backend:/app/data/streamline.db
docker restart streamline-backend
```

---

## Updates

```bash
git pull
docker compose down
docker compose up -d --build
```

---

## Logs

```bash
docker compose logs -f          # all containers
docker compose logs -f backend  # backend only
docker compose logs -f frontend # nginx only
docker compose logs -f bot      # bot only
```

---

## Troubleshooting

**Container won't start:**
```bash
docker compose logs backend
# Common cause: JWT_SECRET not set or too short (min. 32 chars)
```

**Login not working after update:**
```
Browser: Ctrl + Shift + R  (hard refresh, clears cached JS)
```

**TMDB/TheTVDB search not working:**
- Check the API key under Settings → Metadata Provider
- TMDB requires v3 API keys (not Bearer tokens)

**SABnzbd unreachable:**
- Use the host IP instead of `localhost` — e.g. `http://192.168.1.100:8080`

**Port conflict:**
```env
HOST_PORT=8989
```

**Bot not responding:**
- Verify `STREAMLINE_BOT_USER` / `STREAMLINE_BOT_PASS` match the user in Streamline → Users
- Run `docker compose logs bot` for details

---

## License

MIT License

---

## Credits

Inspired by [Sonarr](https://sonarr.tv) and [Radarr](https://radarr.video).
Uses the [TMDB API](https://www.themoviedb.org/documentation/api) and [TheTVDB API](https://www.thetvdb.com/api-information).

> ⚠️ **Disclaimer:** Streamline is a management tool only. Downloading copyrighted content without permission is illegal and the sole responsibility of the user.
