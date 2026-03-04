const axios = require('axios');
const logger = require('./logger');

const BOT_URL    = process.env.BOT_URL || 'http://bot:3002';
const BOT_SECRET = process.env.BOT_SECRET;

/**
 * Send a notification to the bot (Telegram + Discord).
 * Fire-and-forget — never throws.
 */
async function notify({ telegram, discord }) {
  if (!BOT_SECRET || !BOT_URL) return;
  try {
    await axios.post(`${BOT_URL}/notify`, { telegram, discord }, {
      headers: { 'x-bot-secret': BOT_SECRET },
      timeout: 4000,
    });
  } catch (err) {
    logger.warn('Could not reach bot for notification', { error: err.message });
  }
}

// ── Pre-built notification helpers ───────────────────────────────────────────

function notifyMediaAdded(item) {
  const icon = item.type === 'movie' ? '🎬' : '📺';
  notify({
    telegram: `${icon} *${item.title}*${item.year ? ` (${item.year})` : ''} wurde zur Mediathek hinzugefügt!`,
    discord: {
      title: `${icon} Neu hinzugefügt`,
      description: `**${item.title}**${item.year ? ` (${item.year})` : ''}`,
      color: 0x6366f1,
      thumbnail: item.poster_url || null,
      fields: [
        { name: 'Typ', value: item.type === 'movie' ? 'Film' : 'Serie', inline: true },
        { name: 'Qualität', value: item.quality_profile || '1080p', inline: true },
      ],
    },
  });
}

function notifyDownloadComplete(title, type) {
  const icon = type === 'movie' ? '🎬' : '📺';
  notify({
    telegram: `✅ Download abgeschlossen: ${icon} *${title}*`,
    discord: {
      title: '✅ Download abgeschlossen',
      description: `**${title}** ist fertig!`,
      color: 0x10b981,
    },
  });
}

function notifyDownloadFailed(title) {
  notify({
    telegram: `❌ Download fehlgeschlagen: *${title}*`,
    discord: {
      title: '❌ Download fehlgeschlagen',
      description: `**${title}** konnte nicht heruntergeladen werden.`,
      color: 0xef4444,
    },
  });
}

module.exports = { notify, notifyMediaAdded, notifyDownloadComplete, notifyDownloadFailed };
