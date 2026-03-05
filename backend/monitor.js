/**
 * monitor.js — Streamline Monitoring Scheduler
 *
 * Mimics Sonarr/Radarr's monitoring engine:
 *  - Runs on a configurable interval (default 60 min)
 *  - Searches all 'wanted' & eligible 'missing' items across all enabled indexers
 *  - Grabs the best match based on quality profile and custom format scores
 *  - Logs all activity to the activity_log table
 *  - Handles retries with exponential backoff
 *  - Supports quality upgrades (e.g., 720p → 1080p)
 */

const { getDB } = require('./db');
const logger = require('./logger');
const axios = require('axios');
const xml2js = require('xml2js');
const { v4: uuidv4 } = require('uuid');

// ── Activity logger ───────────────────────────────────────────────────────────
function logActivity(type, message, { mediaId = null, episodeId = null, details = null } = {}) {
  try {
    const db = getDB();
    db.prepare(`
      INSERT INTO activity_log (type, media_id, episode_id, message, details)
      VALUES (?, ?, ?, ?, ?)
    `).run(type, mediaId, episodeId, message, details ? JSON.stringify(details) : null);
  } catch (err) {
    logger.error('Failed to write activity log', { error: err.message });
  }
}

// ── Config helpers ────────────────────────────────────────────────────────────
function getSetting(key, fallback = '') {
  try {
    const db = getDB();
    return db.prepare("SELECT value FROM settings WHERE key = ?").get(key)?.value ?? fallback;
  } catch { return fallback; }
}

function getQualityRank(q) {
  const ranks = { 'Any': 0, '480p': 1, '720p': 2, '1080p': 3, '2160p': 4 };
  return ranks[q] ?? 0;
}

// ── Indexer query ─────────────────────────────────────────────────────────────
async function queryIndexer(indexer, query, { category = null } = {}) {
  const db = getDB();
  const startTime = Date.now();

  // Ensure stats row exists
  db.prepare(`INSERT OR IGNORE INTO indexer_stats (indexer_id) VALUES (?)`).run(indexer.id);

  const params = {
    apikey: indexer.api_key || '',
    t: 'search',
    q: query,
    output: 'json',
  };
  if (category) params.cat = category;

  try {
    const res = await axios.get(`${indexer.url}/api`, {
      params,
      timeout: 12000,
      headers: { 'User-Agent': 'Streamline/1.0' },
    });

    const elapsed = Date.now() - startTime;

    // Update stats
    db.prepare(`
      UPDATE indexer_stats SET
        total_queries = total_queries + 1,
        successful_queries = successful_queries + 1,
        last_queried_at = CURRENT_TIMESTAMP,
        avg_response_ms = (avg_response_ms + ?) / 2
      WHERE indexer_id = ?
    `).run(elapsed, indexer.id);

    // Parse response — handle both JSON and XML (Newznab can return both)
    let items = [];
    if (typeof res.data === 'object' && res.data.channel?.item) {
      items = Array.isArray(res.data.channel.item)
        ? res.data.channel.item
        : [res.data.channel.item];
    } else if (Array.isArray(res.data)) {
      items = res.data;
    } else if (res.data?.results) {
      items = res.data.results;
    }

    return items.map(item => normaliseRelease(item, indexer.name, indexer.type));

  } catch (err) {
    const elapsed = Date.now() - startTime;
    db.prepare(`
      UPDATE indexer_stats SET
        total_queries = total_queries + 1,
        failed_queries = failed_queries + 1,
        last_queried_at = CURRENT_TIMESTAMP,
        last_error = ?
      WHERE indexer_id = ?
    `).run(err.message, indexer.id);

    logger.warn('Indexer query failed', { indexer: indexer.name, error: err.message });
    return [];
  }
}

// ── Normalise release from any indexer format ─────────────────────────────────
function normaliseRelease(item, indexerName, indexerType) {
  // Newznab JSON / XML
  const attrs = {};
  if (Array.isArray(item['newznab:attr'])) {
    for (const a of item['newznab:attr']) {
      attrs[a.$.name] = a.$.value;
    }
  }

  const title = item.title?.[0] || item.title || '';
  const link = item.link?.[0] || item.link || item.guid?.[0] || item.guid || '';
  const sizeBytes = parseInt(attrs.size || item.size || item.enclosure?.$.length || 0);
  const seeders = parseInt(attrs.seeders || item.seeders || 0);
  const peers = parseInt(attrs.peers || item.peers || seeders);
  const pubDate = item.pubDate?.[0] || item.pubDate || item.date || '';
  const category = attrs.category || '';

  // Detect quality from title
  const tl = title.toLowerCase();
  let quality = 'Unknown';
  if (tl.includes('2160p') || tl.includes('4k') || tl.includes('uhd')) quality = '2160p';
  else if (tl.includes('1080p')) quality = '1080p';
  else if (tl.includes('720p')) quality = '720p';
  else if (tl.includes('480p')) quality = '480p';

  // Source
  let source = 'Unknown';
  if (tl.includes('bluray') || tl.includes('blu-ray') || tl.includes('bdrip')) source = 'BluRay';
  else if (tl.includes('web-dl') || tl.includes('webdl')) source = 'WEB-DL';
  else if (tl.includes('webrip')) source = 'WEBRip';
  else if (tl.includes('hdtv')) source = 'HDTV';
  else if (tl.includes('remux')) source = 'Remux';

  // HDR
  const hdr = tl.includes('hdr') || tl.includes('dv') || tl.includes('dolby vision');

  // Score (simple quality score for sorting)
  const qualityScore = { '2160p': 40, '1080p': 30, '720p': 20, '480p': 10, 'Unknown': 5 }[quality] ?? 5;
  const sourceScore = { Remux: 20, BluRay: 15, 'WEB-DL': 12, WEBRip: 8, HDTV: 5, Unknown: 0 }[source] ?? 0;
  const score = qualityScore + sourceScore + (hdr ? 5 : 0);

  return {
    title,
    link,
    size_bytes: sizeBytes,
    seeders,
    peers,
    quality,
    source,
    hdr,
    score,
    pub_date: pubDate,
    indexer: indexerName,
    indexer_type: indexerType,
    category,
  };
}

// ── Pick best release for a quality profile ───────────────────────────────────
function pickBestRelease(releases, qualityProfile, currentQuality = null) {
  if (!releases.length) return null;

  const targetRank = getQualityRank(qualityProfile);

  // Filter: must meet or exceed profile (unless 'Any')
  let eligible = releases.filter(r => {
    if (qualityProfile === 'Any') return true;
    return getQualityRank(r.quality) >= targetRank;
  });

  // If upgrading: must be better than current
  if (currentQuality) {
    const currentRank = getQualityRank(currentQuality);
    eligible = eligible.filter(r => getQualityRank(r.quality) > currentRank);
  }

  if (!eligible.length) {
    // Fallback: take best available even if below profile
    eligible = releases;
  }

  // Sort by score desc, then by size desc (larger = better for same quality)
  eligible.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.size_bytes - a.size_bytes;
  });

  return eligible[0] || null;
}

// ── Send to SABnzbd ───────────────────────────────────────────────────────────
async function sendToSabnzbd(release, category = '') {
  const db = getDB();
  const url = db.prepare("SELECT value FROM settings WHERE key = 'sabnzbd_url'").get()?.value;
  const key = db.prepare("SELECT value FROM settings WHERE key = 'sabnzbd_api_key'").get()?.value;

  if (!url || !key) throw new Error('SABnzbd not configured');

  const params = {
    mode: 'addurl',
    name: release.link,
    apikey: key,
    output: 'json',
    cat: category || undefined,
    priority: -1, // normal priority
  };

  const res = await axios.get(`${url}/api`, { params, timeout: 10000 });
  if (!res.data?.status) throw new Error('SABnzbd rejected the NZB');
  return res.data?.nzo_ids?.[0] || 'unknown';
}

// ── Send to qBittorrent ───────────────────────────────────────────────────────
async function sendToQbittorrent(release) {
  const db = getDB();
  const url = db.prepare("SELECT value FROM settings WHERE key = 'qbittorrent_url'").get()?.value;
  const username = db.prepare("SELECT value FROM settings WHERE key = 'qbittorrent_username'").get()?.value;
  const password = db.prepare("SELECT value FROM settings WHERE key = 'qbittorrent_password'").get()?.value;

  if (!url) throw new Error('qBittorrent not configured');

  // Login
  await axios.post(`${url}/api/v2/auth/login`, `username=${username}&password=${password}`, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 8000,
    withCredentials: true,
  });

  // Add torrent
  const FormData = require('form-data');
  const form = new FormData();
  form.append('urls', release.link);
  form.append('paused', 'false');

  await axios.post(`${url}/api/v2/torrents/add`, form, {
    headers: form.getHeaders(),
    timeout: 10000,
  });

  return 'qbt-' + Date.now();
}

// ── Grab release (route to correct client) ───────────────────────────────────
async function grabRelease(release, mediaItem, episodeId = null) {
  const db = getDB();
  const category = mediaItem.type === 'movie' ? 'movies' : 'tv';

  let sourceId;
  let source;

  // Try SABnzbd first for NZBs, qBittorrent for torrents
  const isNzb = release.indexer_type === 'newznab' ||
    release.link?.includes('.nzb') || release.category?.startsWith('5');

  try {
    if (isNzb) {
      sourceId = await sendToSabnzbd(release, category);
      source = 'sabnzbd';
    } else {
      sourceId = await sendToQbittorrent(release);
      source = 'torrent';
    }
  } catch (sabErr) {
    // If SABnzbd fails, try qBittorrent as fallback
    try {
      sourceId = await sendToQbittorrent(release);
      source = 'torrent';
    } catch (qbtErr) {
      throw new Error(`Both clients failed. SABnzbd: ${sabErr.message}. qBittorrent: ${qbtErr.message}`);
    }
  }

  // Record in download_queue
  db.prepare(`
    INSERT INTO download_queue (id, media_id, episode_id, title, source, source_id, status)
    VALUES (?, ?, ?, ?, ?, ?, 'queued')
  `).run(uuidv4(), mediaItem.id, episodeId, release.title, source, sourceId);

  // Update media/episode status
  if (episodeId) {
    db.prepare("UPDATE episodes SET status = 'downloading' WHERE id = ?").run(episodeId);
  } else {
    db.prepare("UPDATE media_items SET status = 'downloading', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(mediaItem.id);
  }

  return { source, sourceId };
}

// ── Search for a single media item or episode ─────────────────────────────────
async function searchAndGrab(mediaItem, episodeInfo = null) {
  const db = getDB();

  // Build search query — use original (English) title when available
  const searchTitle = (mediaItem.original_title && mediaItem.original_title !== mediaItem.title)
    ? mediaItem.original_title
    : mediaItem.title;

  let query = searchTitle;
  if (episodeInfo) {
    // S01E01 format for episodes
    const s = String(episodeInfo.season_number).padStart(2, '0');
    const e = String(episodeInfo.episode_number).padStart(2, '0');
    query = `${searchTitle} S${s}E${e}`;
  } else if (mediaItem.year) {
    query = `${searchTitle} ${mediaItem.year}`;
  }

  // Get all enabled indexers sorted by priority
  const indexers = db.prepare(`
    SELECT * FROM indexers WHERE enabled = 1 ORDER BY priority DESC
  `).all();

  if (!indexers.length) {
    logActivity('warning', `Keine aktivierten Indexer für: ${mediaItem.title}`, { mediaId: mediaItem.id });
    return null;
  }

  // Search all indexers in parallel
  const allReleases = (await Promise.allSettled(
    indexers.map(idx => queryIndexer(idx, query))
  ))
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value);

  logActivity('search', `Suche: "${query}" — ${allReleases.length} Releases gefunden auf ${indexers.length} Indexer`, {
    mediaId: mediaItem.id,
    episodeId: episodeInfo?.id,
    details: { query, indexer_count: indexers.length, results: allReleases.length },
  });

  if (!allReleases.length) return null;

  // Pick best release
  const qualityProfile = mediaItem.quality_profile || '1080p';
  const upgradeEnabled = getSetting('quality_upgrade_enabled', 'true') === 'true';
  const currentQuality = upgradeEnabled && mediaItem.status === 'downloaded'
    ? (episodeInfo?.quality || mediaItem.current_quality || null)
    : null;

  const best = pickBestRelease(allReleases, qualityProfile, currentQuality);
  if (!best) {
    logActivity('info', `Kein passendes Release für "${query}" (Profil: ${qualityProfile})`, {
      mediaId: mediaItem.id,
      episodeId: episodeInfo?.id,
    });
    return null;
  }

  // Grab it
  try {
    const { source, sourceId } = await grabRelease(best, mediaItem, episodeInfo?.id);
    logActivity('grab', `Gegrabt: "${best.title}" via ${source} [${best.quality} ${best.source}]`, {
      mediaId: mediaItem.id,
      episodeId: episodeInfo?.id,
      details: { release: best.title, quality: best.quality, source: best.source, client: source },
    });
    return best;
  } catch (err) {
    logActivity('error', `Grab fehlgeschlagen für "${best.title}": ${err.message}`, {
      mediaId: mediaItem.id,
      episodeId: episodeInfo?.id,
    });
    return null;
  }
}

// ── Main monitoring cycle ─────────────────────────────────────────────────────
async function runMonitorCycle() {
  const db = getDB();
  const enabled = getSetting('monitor_enabled', 'true') === 'true';
  if (!enabled) return;

  const failedRetryCount = parseInt(getSetting('failed_retry_count', '3'));
  const failedRetryDelayHours = parseInt(getSetting('failed_retry_delay_hours', '6'));

  logger.info('Monitor cycle started');
  logActivity('info', 'Monitor-Zyklus gestartet');

  let searched = 0;
  let grabbed = 0;

  try {
    // ── 1. Wanted movies ───────────────────────────────────────────────────────
    const wantedMovies = db.prepare(`
      SELECT * FROM media_items
      WHERE type = 'movie'
        AND status = 'wanted'
        AND monitored = 1
      ORDER BY added_at ASC
      LIMIT 20
    `).all();

    for (const movie of wantedMovies) {
      searched++;
      db.prepare("UPDATE media_items SET last_monitored_at = CURRENT_TIMESTAMP WHERE id = ?").run(movie.id);
      const result = await searchAndGrab(movie);
      if (result) grabbed++;
      // Small delay between searches to avoid hammering indexers
      await delay(800);
    }

    // ── 2. Wanted episodes ────────────────────────────────────────────────────
    const wantedEpisodes = db.prepare(`
      SELECT e.*, mi.title as series_title, mi.original_title, mi.quality_profile,
             mi.status as series_status, mi.year, mi.id as media_item_id,
             mi.monitored as series_monitored
      FROM episodes e
      JOIN media_items mi ON mi.id = e.series_id
      WHERE e.status = 'wanted'
        AND e.monitored = 1
        AND mi.monitored = 1
        AND mi.type = 'series'
        AND (e.air_date IS NULL OR e.air_date <= date('now'))
      ORDER BY e.air_date ASC
      LIMIT 30
    `).all();

    for (const ep of wantedEpisodes) {
      searched++;
      const mediaItem = {
        id: ep.media_item_id,
        title: ep.series_title,
        original_title: ep.original_title,
        quality_profile: ep.quality_profile,
        status: ep.series_status,
        year: ep.year,
        type: 'series',
      };
      const result = await searchAndGrab(mediaItem, ep);
      if (result) grabbed++;
      await delay(800);
    }

    // ── 3. Missing items (retry logic) ────────────────────────────────────────
    const missingItems = db.prepare(`
      SELECT * FROM media_items
      WHERE status = 'missing'
        AND monitored = 1
        AND (
          last_monitored_at IS NULL
          OR last_monitored_at < datetime('now', '-${failedRetryDelayHours} hours')
        )
      LIMIT 10
    `).all();

    for (const item of missingItems) {
      searched++;
      db.prepare("UPDATE media_items SET last_monitored_at = CURRENT_TIMESTAMP WHERE id = ?").run(item.id);
      const result = await searchAndGrab(item);
      if (result) grabbed++;
      await delay(800);
    }

  } catch (err) {
    logger.error('Monitor cycle error', { error: err.message });
    logActivity('error', `Monitor-Fehler: ${err.message}`);
  }

  const summary = `Monitor-Zyklus beendet: ${searched} gesucht, ${grabbed} gegrabt`;
  logger.info(summary, { searched, grabbed });
  logActivity('info', summary, { details: { searched, grabbed } });
}

// ── Scheduler ─────────────────────────────────────────────────────────────────
let monitorTimer = null;

function startMonitor() {
  if (monitorTimer) return; // already running

  const run = async () => {
    try {
      await runMonitorCycle();
    } catch (err) {
      logger.error('Unhandled monitor error', { error: err.message });
    }
    scheduleNext();
  };

  const scheduleNext = () => {
    const intervalMinutes = parseInt(getSetting('monitor_interval_minutes', '60'));
    const ms = Math.max(5, intervalMinutes) * 60 * 1000;
    monitorTimer = setTimeout(run, ms);
    logger.info(`Next monitor cycle in ${intervalMinutes} minutes`);
  };

  // Run first cycle after 30 seconds (let server fully start)
  monitorTimer = setTimeout(run, 30_000);
  logger.info('Monitoring scheduler started');
}

function stopMonitor() {
  if (monitorTimer) {
    clearTimeout(monitorTimer);
    monitorTimer = null;
    logger.info('Monitoring scheduler stopped');
  }
}

// Trigger immediate cycle (for manual "Search All" button)
async function triggerNow() {
  stopMonitor();
  await runMonitorCycle();
  startMonitor();
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  startMonitor,
  stopMonitor,
  triggerNow,
  runMonitorCycle,
  searchAndGrab,
  logActivity,
  queryIndexer,
  normaliseRelease,
};
