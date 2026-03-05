const express = require('express');
const axios = require('axios');
const { query, validationResult } = require('express-validator');
const { getDB } = require('../db');
const logger = require('../logger');

const router = express.Router();

function getTmdbKey() {
  const db = getDB();
  const row = db.prepare("SELECT value FROM settings WHERE key = 'tmdb_api_key'").get();
  return row?.value || null;
}


// ── TheTVDB helpers ────────────────────────────────────────────────────────────
function getTvdbKey() {
  const db = getDB();
  return db.prepare("SELECT value FROM settings WHERE key = 'tvdb_api_key'").get()?.value || null;
}

let tvdbTokenCache = null;
let tvdbTokenExpiry = 0;

async function getTvdbToken() {
  if (tvdbTokenCache && Date.now() < tvdbTokenExpiry) return tvdbTokenCache;
  const apiKey = getTvdbKey();
  if (!apiKey) throw new Error('TheTVDB API key not configured');
  const r = await axios.post('https://api4.thetvdb.com/v4/login', { apikey: apiKey }, { timeout: 8000 });
  tvdbTokenCache = r.data.data.token;
  tvdbTokenExpiry = Date.now() + 23 * 60 * 60 * 1000;
  return tvdbTokenCache;
}

function getMetaProvider() {
  const db = getDB();
  return db.prepare("SELECT value FROM settings WHERE key = 'meta_provider'").get()?.value || 'tmdb';
}

// GET /api/search/tvdb?q=...&type=series|movie|both
router.get('/tvdb',
  query('q').trim().isLength({ min: 1, max: 200 }),
  query('type').optional().isIn(['movie', 'series', 'both']),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { q, type = 'both' } = req.query;
    try {
      const token = await getTvdbToken();
      const headers = { Authorization: 'Bearer ' + token };
      const results = [];

      if (type === 'series' || type === 'both') {
        const r = await axios.get('https://api4.thetvdb.com/v4/search', {
          params: { query: q, type: 'series', limit: 20 },
          headers, timeout: 8000,
        });
        (r.data.data || []).forEach(s => {
          results.push({
            tvdb_id: s.tvdb_id || s.id,
            tmdb_id: s.tmdb_id || null,
            type: 'series',
            title: s.name,
            year: s.year || s.first_air_time?.slice(0, 4) || null,
            overview: s.overviews?.eng || s.overview || '',
            poster_url: s.image_url || s.thumbnail || null,
            backdrop_url: null,
            rating: s.score ? parseFloat(s.score) : null,
            source: 'tvdb',
          });
        });
      }

      if (type === 'movie' || type === 'both') {
        const r = await axios.get('https://api4.thetvdb.com/v4/search', {
          params: { query: q, type: 'movie', limit: 20 },
          headers, timeout: 8000,
        });
        (r.data.data || []).forEach(m => {
          results.push({
            tvdb_id: m.tvdb_id || m.id,
            tmdb_id: m.tmdb_id || null,
            type: 'movie',
            title: m.name,
            year: m.year || null,
            overview: m.overviews?.eng || m.overview || '',
            poster_url: m.image_url || m.thumbnail || null,
            backdrop_url: null,
            rating: m.score ? parseFloat(m.score) : null,
            source: 'tvdb',
          });
        });
      }

      res.json({ results: results.slice(0, 40) });
    } catch (err) {
      logger.error('TheTVDB search failed', { error: err.message });
      res.status(500).json({ error: 'TheTVDB search failed: ' + err.message });
    }
  }
);

// GET /api/search/tvdb/details/:type/:id
router.get('/tvdb/details/:type/:id', async (req, res) => {
  const { type, id } = req.params;
  try {
    const token = await getTvdbToken();
    const headers = { Authorization: 'Bearer ' + token };
    const endpoint = type === 'series' ? 'series' : 'movies';
    const r = await axios.get('https://api4.thetvdb.com/v4/' + endpoint + '/' + id + '/extended', {
      params: { meta: 'translations' },
      headers, timeout: 8000,
    });
    const d = r.data.data;
    res.json({
      tvdb_id: d.id,
      tmdb_id: d.remoteIds?.find(x => x.sourceName === 'TheMovieDB.com')?.id || null,
      type,
      title: d.name,
      year: d.firstAired?.slice(0, 4) || null,
      overview: d.translations?.overviewTranslations?.find(t => t.language === 'eng')?.overview || d.overview || '',
      poster_url: d.image || null,
      rating: d.score || null,
      seasons: (d.seasons || []).map(s => ({ season_number: s.number, episode_count: s.episodeCount || 0 })),
    });
  } catch (err) {
    res.status(500).json({ error: 'TheTVDB details failed: ' + err.message });
  }
});

// GET /api/search/meta?q=... — unified search using configured provider
router.get('/meta',
  query('q').trim().isLength({ min: 1, max: 200 }),
  query('type').optional().isIn(['movie', 'series', 'both']),
  async (req, res) => {
    const provider = getMetaProvider();
    // Proxy to the right provider
    req.url = (provider === 'tvdb' ? '/tvdb' : '/tmdb') + '?q=' + encodeURIComponent(req.query.q) + '&type=' + (req.query.type || 'both');
    router.handle(req, res, () => {});
  }
);

// GET /api/search/tmdb?q=...&type=movie|series
router.get('/tmdb',
  query('q').trim().isLength({ min: 1, max: 200 }),
  query('type').optional().isIn(['movie', 'series', 'both']),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const apiKey = getTmdbKey();
    if (!apiKey) return res.status(400).json({ error: 'TMDB API key not configured' });

    const { q, type = 'both' } = req.query;

    try {
      const TMDB_BASE = 'https://api.themoviedb.org/3';
      const results = [];

      if (type === 'movie' || type === 'both') {
        const r = await axios.get(`${TMDB_BASE}/search/movie`, {
          params: { api_key: apiKey, query: q, language: 'de-DE', include_adult: false },
          timeout: 8000,
        });
        results.push(...r.data.results.map(m => ({
          tmdb_id: m.id,
          type: 'movie',
          title: m.title,
          year: m.release_date?.slice(0, 4),
          overview: m.overview,
          poster_url: m.poster_path ? `https://image.tmdb.org/t/p/w342${m.poster_path}` : null,
          backdrop_url: m.backdrop_path ? `https://image.tmdb.org/t/p/w780${m.backdrop_path}` : null,
          rating: m.vote_average,
          genres: [],
        })));
      }

      if (type === 'series' || type === 'both') {
        const r = await axios.get(`${TMDB_BASE}/search/tv`, {
          params: { api_key: apiKey, query: q, language: 'de-DE', include_adult: false },
          timeout: 8000,
        });
        results.push(...r.data.results.map(s => ({
          tmdb_id: s.id,
          type: 'series',
          title: s.name,
          year: s.first_air_date?.slice(0, 4),
          overview: s.overview,
          poster_url: s.poster_path ? `https://image.tmdb.org/t/p/w342${s.poster_path}` : null,
          backdrop_url: s.backdrop_path ? `https://image.tmdb.org/t/p/w780${s.backdrop_path}` : null,
          rating: s.vote_average,
          genres: [],
        })));
      }

      results.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      res.json({ results: results.slice(0, 40) });
    } catch (err) {
      logger.error('TMDB search failed', { error: err.message });
      res.status(502).json({ error: 'TMDB search failed' });
    }
  }
);

// GET /api/search/tmdb/details/:type/:id
router.get('/tmdb/details/:type/:id', async (req, res) => {
  const { type, id } = req.params;
  if (!['movie', 'series'].includes(type)) return res.status(400).json({ error: 'Invalid type' });
  if (!/^\d+$/.test(id)) return res.status(400).json({ error: 'Invalid ID' });

  const apiKey = getTmdbKey();
  if (!apiKey) return res.status(400).json({ error: 'TMDB API key not configured' });

  try {
    const endpoint = type === 'movie' ? 'movie' : 'tv';
    const TMDB_BASE = 'https://api.themoviedb.org/3';
    const r = await axios.get(`${TMDB_BASE}/${endpoint}/${id}`, {
      params: { api_key: apiKey, language: 'de-DE', append_to_response: type === 'series' ? 'seasons' : '' },
      timeout: 8000,
    });

    const d = r.data;
    const result = {
      tmdb_id: d.id,
      imdb_id: d.imdb_id || null,
      type,
      title: type === 'movie' ? d.title : d.name,
      original_title: type === 'movie' ? (d.original_title || d.title) : (d.original_name || d.name),
      year: (type === 'movie' ? d.release_date : d.first_air_date)?.slice(0, 4),
      overview: d.overview,
      poster_url: d.poster_path ? `https://image.tmdb.org/t/p/w500${d.poster_path}` : null,
      backdrop_url: d.backdrop_path ? `https://image.tmdb.org/t/p/w1280${d.backdrop_path}` : null,
      rating: d.vote_average,
      genres: d.genres?.map(g => g.name) || [],
      runtime: d.runtime || null,
      seasons: d.seasons || null,
      number_of_seasons: d.number_of_seasons || null,
      status: d.status,
    };
    res.json(result);
  } catch (err) {
    logger.error('TMDB details failed', { error: err.message });
    res.status(502).json({ error: 'Failed to fetch details' });
  }
});

// Helper: parse Newznab XML/JSON response into unified list
// Extract a named newznab:attr value from item
function getAttr(item, name) {
  const attrs = item['newznab:attr'] || item['attr'] || [];
  const arr = Array.isArray(attrs) ? attrs : (attrs ? [attrs] : []);
  const found = arr.find(a => {
    const n = a?.['@attributes']?.name || a?.name;
    return n === name;
  });
  return found?.['@attributes']?.value ?? found?.value ?? null;
}

// Detect quality from release title
function detectQuality(title) {
  const t = title.toLowerCase();
  if (t.includes('remux')) return 'Remux';
  if (t.includes('2160p') || t.includes('4k') || t.includes('uhd')) return '2160p';
  if (t.includes('1080p')) return '1080p';
  if (t.includes('720p')) return '720p';
  if (t.includes('480p') || t.includes('dvdrip')) return '480p';
  if (t.includes('bluray') || t.includes('blu-ray')) return 'BluRay';
  if (t.includes('webrip') || t.includes('web-rip')) return 'WEBRip';
  if (t.includes('webdl') || t.includes('web-dl') || t.includes('web.dl')) return 'WEB-DL';
  if (t.includes('hdtv')) return 'HDTV';
  return null;
}

// Detect language from release title
function detectLanguage(title) {
  const t = title.toLowerCase();
  const langs = [
    // German markers
    ['german','German'], ['deutsch','German'], ['.de.','German'], ['.ger.','German'],
    // Multi
    ['multi','Multi'], ['ml.','Multi'], ['.ml.','Multi'],
    // Dubbed
    ['dubbed','Dubbed'], ['.dub.','Dubbed'],
    // French
    ['french','French'], ['.fr.','French'], ['.fra.','French'],
    // Spanish
    ['spanish','Spanish'], ['.es.','Spanish'], ['.spa.','Spanish'],
    // Italian
    ['italian','Italian'], ['.it.','Italian'], ['.ita.','Italian'],
    // Dutch
    ['dutch','Dutch'], ['.nl.','Dutch'],
    // Korean
    ['korean','Korean'], ['.ko.','Korean'],
    // Japanese
    ['japanese','Japanese'], ['.ja.','Japanese'],
    // Chinese
    ['chinese','Chinese'], ['.zh.','Chinese'],
    // Turkish
    ['turkish','Turkish'], ['.tr.','Turkish'],
    // Atmos/Audio hints that imply English if no other lang found
    ['english','English'], ['.en.','English'],
  ];
  for (const [key, label] of langs) {
    if (t.includes(key)) return label;
  }
  // Default: if title has typical English scene tags, assume English
  if (/\.(web-dl|webrip|bluray|hdtv|remux)\./i.test(title)) return 'English';
  return null;
}

// Score a release (higher = better) — mimics Radarr/Sonarr scoring
function scoreRelease(item) {
  let score = 0;
  const t = item.title.toLowerCase();
  // Quality bonus
  if (t.includes('remux')) score += 300;
  else if (t.includes('1080p')) score += 200;
  else if (t.includes('2160p') || t.includes('4k')) score += 150;
  else if (t.includes('720p')) score += 100;
  // Source bonus
  if (t.includes('bluray') || t.includes('blu-ray')) score += 100;
  else if (t.includes('web-dl') || t.includes('webdl')) score += 80;
  else if (t.includes('webrip')) score += 60;
  else if (t.includes('hdtv')) score += 40;
  // Codec bonus
  if (t.includes('x265') || t.includes('hevc') || t.includes('h265')) score += 30;
  // Recency bonus (newer = better)
  const age = item.agedays || 9999;
  if (age < 7) score += 50;
  else if (age < 30) score += 30;
  else if (age < 180) score += 10;
  return score;
}

function parseNewznabItems(data, indexerName) {
  let items = data?.channel?.item || data?.item || [];
  if (!Array.isArray(items)) items = items ? [items] : [];
  return items.map(item => {
    // Try all known size fields
    const rawSize = item.enclosure?.['@attributes']?.length
      || item.enclosure?.length
      || item.size
      || getAttr(item, 'size')
      || getAttr(item, 'length')
      || item['size']
      || null;
    const size = rawSize && Number(rawSize) > 0 ? rawSize : null;

    const pubDate = item.pubDate || '';
    let agedays = null;
    if (pubDate) {
      const ms = Date.now() - new Date(pubDate).getTime();
      agedays = Math.floor(ms / 86400000);
    }

    const peers   = parseInt(getAttr(item, 'peers') || getAttr(item, 'seeders') || '0') || null;
    const grabs   = parseInt(getAttr(item, 'grabs') || getAttr(item, 'downloadvolumefactor') || '0') || null;
    const catId   = getAttr(item, 'category') || '';

    const title    = item.title || '';
    const quality  = detectQuality(title);
    const language = detectLanguage(title);

    const result = {
      title,
      size,
      pubDate,
      agedays,
      link: item.link || item.enclosure?.['@attributes']?.url || item.enclosure?.url || '',
      indexer: indexerName || '',
      peers,
      grabs,
      quality,
      language,
      catId,
    };
    result.score = scoreRelease(result);
    return result;
  }).filter(r => r.title);
}

// GET /api/search/nzb?q=...
router.get('/nzb',
  query('q').trim().isLength({ min: 1, max: 200 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const db = getDB();
    const q = req.query.q;
    const sources = [];

    // 1. NZBHydra2 if configured
    const hydra2Url = db.prepare("SELECT value FROM settings WHERE key = 'hydra2_url'").get()?.value;
    const hydra2Key = db.prepare("SELECT value FROM settings WHERE key = 'hydra2_api_key'").get()?.value;
    if (hydra2Url && hydra2Key) sources.push({ name: 'NZBHydra2', url: hydra2Url, apiKey: hydra2Key });

    // 2. All enabled Newznab/Torznab indexers from DB
    const indexers = db.prepare(
      "SELECT * FROM indexers WHERE enabled = 1 AND type IN ('newznab', 'torznab')"
    ).all();
    for (const idx of indexers) {
      sources.push({ name: idx.name, url: idx.url, apiKey: idx.api_key });
    }

    if (sources.length === 0) {
      return res.status(400).json({
        error: 'Kein Indexer konfiguriert — NZBHydra2 oder Newznab-Indexer in den Einstellungen hinzufügen.'
      });
    }

    // Determine category from media context (pass ?cat=tv or ?cat=movie)
    const catHint = req.query.cat; // 'tv' | 'movie' | undefined
    // Newznab categories: 5000=TV, 5030=TV/HD, 2000=Movie, 2040=Movie/HD
    const cats = catHint === 'movie' ? '2000,2040,2045' : catHint === 'tv' ? '5000,5030,5040' : '2000,2040,2045,5000,5030,5040';

    // Search all sources in parallel
    const allResults = (await Promise.all(
      sources.map(async (source) => {
        try {
          const response = await axios.get(`${source.url}/api`, {
            params: { t: 'search', apikey: source.apiKey, q, o: 'json', cat: cats, limit: 100 },
            timeout: 15000,
          });
          return parseNewznabItems(response.data, source.name);
        } catch (err) {
          logger.warn(`Indexer "${source.name}" failed`, { error: err.message });
          return [];
        }
      })
    )).flat()
    // Filter out non-video results: must be > 50MB or have video-like name
    .filter(r => {
      if (!r.size) return true; // keep if size unknown
      const mb = Number(r.size) / 1024 / 1024;
      if (mb < 50) return false; // skip tiny files (music, samples, etc.)
      // Skip obvious non-video extensions
      const lower = r.title.toLowerCase();
      if (lower.endsWith('.mp3') || lower.endsWith('.flac') || lower.endsWith('.zip') && mb < 500) return false;
      return true;
    })
    // Sort by date descending
    .sort((a, b) => new Date(b.pubDate || 0) - new Date(a.pubDate || 0));

    logger.info('NZB search', { q, results: allResults.length });
    res.json({ results: allResults, sources: sources.map(s => s.name) });
  }
);

module.exports = router;
