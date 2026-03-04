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
function parseNewznabItems(data, indexerName) {
  let items = data?.channel?.item || data?.item || [];
  if (!Array.isArray(items)) items = items ? [items] : [];
  return items.map(item => {
    const size = item.enclosure?.['@attributes']?.length
      || item.enclosure?.length
      || item.size
      || null;
    return {
      title: item.title || '',
      size,
      pubDate: item.pubDate || '',
      link: item.link || item.enclosure?.['@attributes']?.url || item.enclosure?.url || '',
      indexer: indexerName || '',
    };
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

    // Search all sources in parallel
    const allResults = (await Promise.all(
      sources.map(async (source) => {
        try {
          const response = await axios.get(`${source.url}/api`, {
            params: { t: 'search', apikey: source.apiKey, q, o: 'json' },
            timeout: 15000,
          });
          return parseNewznabItems(response.data, source.name);
        } catch (err) {
          logger.warn(`Indexer "${source.name}" failed`, { error: err.message });
          return [];
        }
      })
    )).flat();

    logger.info('NZB search', { q, results: allResults.length });
    res.json({ results: allResults, sources: sources.map(s => s.name) });
  }
);

module.exports = router;
