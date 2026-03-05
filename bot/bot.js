require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const cron = require('node-cron');
const logger = require('./logger');

// ── Config ────────────────────────────────────────────────────────────────────
const TELEGRAM_TOKEN   = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID; // optional: restrict to one chat
const DISCORD_WEBHOOK  = process.env.DISCORD_WEBHOOK_URL;
const API_BASE         = process.env.STREAMLINE_API_URL || 'http://backend:3001/api';
const API_USER         = process.env.STREAMLINE_BOT_USER;
const API_PASS         = process.env.STREAMLINE_BOT_PASS;

if (!TELEGRAM_TOKEN) {
  logger.error('TELEGRAM_TOKEN not set. Exiting.');
  process.exit(1);
}

// ── Auth: get JWT from Streamline API ────────────────────────────────────────
let cachedToken = null;
let tokenExpiry = 0;

async function getToken() {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;
  try {
    const res = await axios.post(`${API_BASE}/auth/login`, {
      username: API_USER,
      password: API_PASS,
    }, { timeout: 5000 });
    cachedToken = res.data.token;
    tokenExpiry = Date.now() + 23 * 60 * 60 * 1000; // 23h
    return cachedToken;
  } catch (err) {
    logger.error('Bot auth failed', { error: err.message });
    throw new Error('Streamline login fehlgeschlagen');
  }
}

async function apiGet(path) {
  const token = await getToken();
  const res = await axios.get(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 10000,
  });
  return res.data;
}

async function apiPost(path, data) {
  const token = await getToken();
  const res = await axios.post(`${API_BASE}${path}`, data, {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 10000,
  });
  return res.data;
}

// ── Telegram Bot ──────────────────────────────────────────────────────────────
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

// Security: only respond to allowed chat
function isAllowed(msg) {
  if (!TELEGRAM_CHAT_ID) return true;
  return String(msg.chat.id) === String(TELEGRAM_CHAT_ID);
}

function deny(chatId) {
  bot.sendMessage(chatId, '⛔ Nicht autorisiert.');
}

// ── Helper: format bytes ──────────────────────────────────────────────────────
function fmtSize(bytes) {
  if (!bytes) return '?';
  const mb = bytes / 1024 / 1024;
  return mb > 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb.toFixed(1)} MB`;
}

// ── Command: /start ───────────────────────────────────────────────────────────
bot.onText(/\/start/, (msg) => {
  if (!isAllowed(msg)) return deny(msg.chat.id);
  const help = `
🎬 *Streamline Bot*

*Bibliothek*
/library — Alle Medien anzeigen
/movies — Nur Filme
/series — Nur Serien
/wanted — Gewünschte Medien

*Suche & Hinzufügen*
/search <Titel> — TMDB durchsuchen
/add\\_movie <Title or TMDB-ID> — Add movie
/add\\_series <Title or TMDB-ID> — Add TV show

*Downloads*
/queue — SABnzbd Queue
/history — Download-Verlauf

*System*
/status — Systemübersicht
/help — Diese Hilfe
  `.trim();
  bot.sendMessage(msg.chat.id, help, { parse_mode: 'Markdown' });
});

bot.onText(/\/help/, (msg) => {
  bot.emit('text', msg, ['/start']);
});

// ── Command: /status ─────────────────────────────────────────────────────────
bot.onText(/\/status/, async (msg) => {
  if (!isAllowed(msg)) return deny(msg.chat.id);
  try {
    const [mediaData, health] = await Promise.all([
      apiGet('/media?limit=1'),
      axios.get(`${API_BASE}/health`, { timeout: 3000 }).then(r => r.data).catch(() => null),
    ]);

    const movies = await apiGet('/media?type=movie&limit=1');
    const series = await apiGet('/media?type=series&limit=1');
    const wanted = await apiGet('/media?status=wanted&limit=1');
    const downloading = await apiGet('/media?status=downloading&limit=1');

    const text = `
📊 *Streamline Status*

🟢 API: ${health ? 'Online' : 'Offline'}
🎬 Filme: *${movies.total}*
📺 Serien: *${series.total}*
⏳ Gewünscht: *${wanted.total}*
⬇️ Am Laden: *${downloading.total}*
    `.trim();
    bot.sendMessage(msg.chat.id, text, { parse_mode: 'Markdown' });
  } catch (err) {
    bot.sendMessage(msg.chat.id, `❌ Fehler: ${err.message}`);
  }
});

// ── Command: /library, /movies, /series ──────────────────────────────────────
async function sendMediaList(chatId, params, title) {
  try {
    const data = await apiGet(`/media?${params}&limit=20`);
    if (!data.items.length) {
      return bot.sendMessage(chatId, `📭 Keine Einträge gefunden.`);
    }
    const STATUS_ICON = { wanted: '⏳', downloading: '⬇️', downloaded: '✅', missing: '❌' };
    const lines = data.items.map(i =>
      `${STATUS_ICON[i.status] || '•'} *${i.title}*${i.year ? ` (${i.year})` : ''}`
    );
    const text = `*${title}* (${data.total} gesamt)\n\n${lines.join('\n')}${data.total > 20 ? '\n\n_...und mehr_' : ''}`;
    bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
  } catch (err) {
    bot.sendMessage(chatId, `❌ Fehler: ${err.message}`);
  }
}

bot.onText(/\/library/, (msg) => {
  if (!isAllowed(msg)) return deny(msg.chat.id);
  sendMediaList(msg.chat.id, '', '📚 Mediathek');
});
bot.onText(/\/movies/, (msg) => {
  if (!isAllowed(msg)) return deny(msg.chat.id);
  sendMediaList(msg.chat.id, 'type=movie', '🎬 Filme');
});
bot.onText(/\/series/, (msg) => {
  if (!isAllowed(msg)) return deny(msg.chat.id);
  sendMediaList(msg.chat.id, 'type=series', '📺 Serien');
});
bot.onText(/\/wanted/, (msg) => {
  if (!isAllowed(msg)) return deny(msg.chat.id);
  sendMediaList(msg.chat.id, 'status=wanted', '⏳ Gewünscht');
});

// ── Command: /search <query> ──────────────────────────────────────────────────
bot.onText(/\/search (.+)/, async (msg, match) => {
  if (!isAllowed(msg)) return deny(msg.chat.id);
  const query = match[1].trim().slice(0, 100);
  bot.sendMessage(msg.chat.id, `🔍 Searching for _${query}_...`, { parse_mode: 'Markdown' });

  try {
    const data = await apiGet(`/search/tmdb?q=${encodeURIComponent(query)}&type=both`);
    const results = data.results.slice(0, 8);
    if (!results.length) {
      return bot.sendMessage(msg.chat.id, '📭 Keine Ergebnisse gefunden.');
    }

    // Send results as inline keyboard for easy adding
    const keyboard = results.map((r, i) => [{
      text: `${r.type === 'movie' ? '🎬' : '📺'} ${r.title}${r.year ? ` (${r.year})` : ''} ⭐${r.rating?.toFixed(1) || '?'}`,
      callback_data: `add_${r.type}_${r.tmdb_id}_${encodeURIComponent(r.title.slice(0, 30))}`,
    }]);

    bot.sendMessage(msg.chat.id, `🎯 *${results.length} results for "${query}"*\nTap to add:`, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: keyboard },
    });
  } catch (err) {
    bot.sendMessage(msg.chat.id, `❌ Suche fehlgeschlagen: ${err.message}`);
  }
});

// ── Callback: inline keyboard button press (add from search) ─────────────────
bot.on('callback_query', async (query) => {
  if (!isAllowed(query.message)) return;

  const [action, type, tmdbId, encodedTitle] = query.data.split('_');
  if (action !== 'add') return;

  const title = decodeURIComponent(encodedTitle || '');
  bot.answerCallbackQuery(query.id, { text: `Füge "${title}" hinzu...` });

  try {
    await addByTmdbId(query.message.chat.id, type, tmdbId);
    // Also notify Discord
    const icon = type === 'movie' ? '🎬' : '📺';
    await discordNotify({
      title: `${icon} Added via Telegram`,
      description: `**${title}** was added via Telegram.`,
      color: 0x6366f1,
    });
  } catch (err) {
    if (err.response?.status === 409) {
      bot.sendMessage(query.message.chat.id, `⚠️ *${title}* is already in the library.`, { parse_mode: 'Markdown' });
    } else {
      bot.sendMessage(query.message.chat.id, `❌ Error: ${err.message}`);
    }
  }
});

// ── Command: /add_movie <tmdb_id or title> ───────────────────────────────────
bot.onText(/\/add_movie (.+)/, async (msg, match) => {
  if (!isAllowed(msg)) return deny(msg.chat.id);
  const input = match[1].trim();
  // If it's a number, treat as TMDB ID directly
  if (/^\d+$/.test(input)) {
    await addByTmdbId(msg.chat.id, 'movie', input);
  } else {
    // Search by title and add first result
    await addByTitle(msg.chat.id, 'movie', input);
  }
});

bot.onText(/\/add_series (.+)/, async (msg, match) => {
  if (!isAllowed(msg)) return deny(msg.chat.id);
  const input = match[1].trim();
  if (/^\d+$/.test(input)) {
    await addByTmdbId(msg.chat.id, 'series', input);
  } else {
    await addByTitle(msg.chat.id, 'series', input);
  }
});

// Add by title — search TMDB and show top results as buttons
async function addByTitle(chatId, type, query) {
  bot.sendMessage(chatId, `🔍 Searching for _${query}_...`, { parse_mode: 'Markdown' });
  try {
    const data = await apiGet(`/search/tmdb?q=${encodeURIComponent(query)}&type=${type}`);
    const results = (data.results || []).slice(0, 5);
    if (!results.length) {
      return bot.sendMessage(chatId, `📭 No results found for "${query}".`);
    }
    // If only one result, add directly
    if (results.length === 1) {
      return addByTmdbId(chatId, results[0].type, results[0].tmdb_id, results[0]);
    }
    // Otherwise show buttons to pick
    const keyboard = results.map(r => [{
      text: `${r.type === 'movie' ? '🎬' : '📺'} ${r.title}${r.year ? ` (${r.year})` : ''}`,
      callback_data: `add_${r.type}_${r.tmdb_id}_${encodeURIComponent(r.title.slice(0, 20))}`,
    }]);
    bot.sendMessage(chatId, `🎯 *Found ${results.length} results — pick one:*`, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: keyboard },
    });
  } catch (err) {
    bot.sendMessage(chatId, `❌ Search failed: ${err.message}`);
  }
}

async function addByTmdbId(chatId, type, tmdbId, knownDetails = null) {
  try {
    const details = knownDetails || await apiGet(`/search/tmdb/details/${type}/${tmdbId}`);
    await apiPost('/media', {
      type,
      title: details.title,
      tmdb_id: details.tmdb_id || tmdbId,
      year: details.year ? parseInt(details.year) : undefined,
      poster_url: details.poster_url,
      overview: details.overview,
      rating: details.rating,
      quality_profile: '1080p',
    });
    const icon = type === 'movie' ? '🎬' : '📺';
    bot.sendMessage(chatId, `${icon} *${details.title}*${details.year ? ` (${details.year})` : ''} added to library! ✅`, { parse_mode: 'Markdown' });
  } catch (err) {
    if (err.response?.status === 409) {
      bot.sendMessage(chatId, `⚠️ Already in library.`);
    } else {
      bot.sendMessage(chatId, `❌ Error: ${err.message}`);
    }
  }
}

// ── Command: /queue ───────────────────────────────────────────────────────────
bot.onText(/\/queue/, async (msg) => {
  if (!isAllowed(msg)) return deny(msg.chat.id);
  try {
    const data = await apiGet('/downloads/sabnzbd');
    if (!data.queue?.length) {
      return bot.sendMessage(msg.chat.id, '📭 Queue ist leer.');
    }
    const lines = data.queue.map(item =>
      `⬇️ *${item.name.slice(0, 50)}*\n   ${item.progress?.toFixed(0) || 0}% · ${item.eta || '?'} · ${item.status}`
    );
    bot.sendMessage(msg.chat.id,
      `📥 *SABnzbd Queue (${data.queue.length})*\n\n${lines.join('\n\n')}`,
      { parse_mode: 'Markdown' }
    );
  } catch (err) {
    bot.sendMessage(msg.chat.id, `❌ SABnzbd nicht erreichbar: ${err.message}`);
  }
});

// ── Command: /history ─────────────────────────────────────────────────────────
bot.onText(/\/history/, async (msg) => {
  if (!isAllowed(msg)) return deny(msg.chat.id);
  try {
    const data = await apiGet('/downloads/sabnzbd');
    if (!data.history?.length) {
      return bot.sendMessage(msg.chat.id, '📭 Kein Verlauf vorhanden.');
    }
    const lines = data.history.slice(0, 10).map(item =>
      `${item.status === 'Completed' ? '✅' : '❌'} ${item.name.slice(0, 50)}`
    );
    bot.sendMessage(msg.chat.id,
      `📋 *Download-Verlauf*\n\n${lines.join('\n')}`,
      { parse_mode: 'Markdown' }
    );
  } catch (err) {
    bot.sendMessage(msg.chat.id, `❌ Fehler: ${err.message}`);
  }
});

// ── Discord Webhook ───────────────────────────────────────────────────────────
async function discordNotify({ title, description, color = 0x6366f1, thumbnail = null, fields = [] }) {
  if (!DISCORD_WEBHOOK) return;
  try {
    const embed = {
      title,
      description,
      color,
      timestamp: new Date().toISOString(),
      footer: { text: 'Streamline' },
      fields,
    };
    if (thumbnail) embed.thumbnail = { url: thumbnail };

    await axios.post(DISCORD_WEBHOOK, { embeds: [embed] }, { timeout: 5000 });
  } catch (err) {
    logger.warn('Discord notification failed', { error: err.message });
  }
}

// ── Expose discordNotify for external use (from backend via HTTP) ──────────────
const http = require('http');
const PORT = process.env.BOT_PORT || 3002;

http.createServer(async (req, res) => {
  if (req.method !== 'POST' || req.url !== '/notify') {
    res.writeHead(404); res.end(); return;
  }

  // Simple shared-secret auth
  const secret = req.headers['x-bot-secret'];
  if (secret !== process.env.BOT_SECRET) {
    res.writeHead(401); res.end('Unauthorized'); return;
  }

  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    try {
      const payload = JSON.parse(body);

      // Send Telegram message
      if (payload.telegram && TELEGRAM_CHAT_ID) {
        await bot.sendMessage(TELEGRAM_CHAT_ID, payload.telegram, { parse_mode: 'Markdown' });
      }

      // Send Discord embed
      if (payload.discord) {
        await discordNotify(payload.discord);
      }

      res.writeHead(200); res.end('OK');
    } catch (err) {
      logger.error('Notify error', { error: err.message });
      res.writeHead(500); res.end('Error');
    }
  });
}).listen(PORT, () => {
  logger.info(`Bot notification server on port ${PORT}`);
});

// ── Scheduled: daily digest at 8:00 ──────────────────────────────────────────
cron.schedule('0 8 * * *', async () => {
  if (!TELEGRAM_CHAT_ID) return;
  try {
    const [movies, series, wanted, downloading] = await Promise.all([
      apiGet('/media?type=movie&limit=1'),
      apiGet('/media?type=series&limit=1'),
      apiGet('/media?status=wanted&limit=1'),
      apiGet('/media?status=downloading&limit=1'),
    ]);

    const msg = `
☀️ *Streamline Tagesübersicht*

🎬 Filme: *${movies.total}* | 📺 Serien: *${series.total}*
⏳ Gewünscht: *${wanted.total}* | ⬇️ Am Laden: *${downloading.total}*
    `.trim();

    bot.sendMessage(TELEGRAM_CHAT_ID, msg, { parse_mode: 'Markdown' });
    await discordNotify({
      title: '☀️ Tagesübersicht',
      description: `Filme: **${movies.total}** | Serien: **${series.total}** | Gewünscht: **${wanted.total}**`,
      color: 0x10b981,
    });
  } catch (err) {
    logger.warn('Daily digest failed', { error: err.message });
  }
});

// ── Error handling ────────────────────────────────────────────────────────────
bot.on('polling_error', (err) => {
  logger.error('Telegram polling error', { error: err.message });
});

bot.on('error', (err) => {
  logger.error('Telegram bot error', { error: err.message });
});

logger.info('Streamline Bot started 🎬');
