const express = require('express');
const axios = require('axios');
const { query, validationResult } = require('express-validator');
const { getDB } = require('../db');
const logger = require('../logger');

const router = express.Router();

function getTmdbKey() {
  const db = getDB();
  return db.prepare("SELECT value FROM settings WHERE key = 'tmdb_api_key'").get()?.value || null;
}

/**
 * GET /api/discover?category=trending|popular|top_rated&type=movie|series|both&page=1
 *
 * Returns a shuffled mix of movie/series suggestions from TMDB.
 */
router.get('/',
  query('category').optional().isIn(['trending', 'popular', 'top_rated']),
  query('type').optional().isIn(['movie', 'series', 'both']),
  query('page').optional().isInt({ min: 1, max: 10 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const apiKey = getTmdbKey();
    if (!apiKey) {
      return res.status(503).json({ error: 'TMDB API key not configured. Please add it in Settings.' });
    }

    const { category = 'trending', type = 'both' } = req.query;
    // Use a random page (1-5) so shuffle gives different results each call
    const page = Math.ceil(Math.random() * 5);

    const BASE = 'https://api.themoviedb.org/3';
    const params = { api_key: apiKey, language: 'de-DE', page };
    const headers = { 'User-Agent': 'Streamline/1.0' };

    try {
      const requests = [];

      if (type === 'movie' || type === 'both') {
        let url;
        if (category === 'trending') url = `${BASE}/trending/movie/week`;
        else if (category === 'top_rated') url = `${BASE}/movie/top_rated`;
        else url = `${BASE}/movie/popular`;
        requests.push(axios.get(url, { params, headers, timeout: 8000 }).then(r => ({ mediaType: 'movie', data: r.data.results || [] })));
      }

      if (type === 'series' || type === 'both') {
        let url;
        if (category === 'trending') url = `${BASE}/trending/tv/week`;
        else if (category === 'top_rated') url = `${BASE}/tv/top_rated`;
        else url = `${BASE}/tv/popular`;
        requests.push(axios.get(url, { params, headers, timeout: 8000 }).then(r => ({ mediaType: 'series', data: r.data.results || [] })));
      }

      const responses = await Promise.all(requests);

      const results = [];
      for (const { mediaType, data } of responses) {
        for (const item of data) {
          const title = item.title || item.name || '';
          const releaseDate = item.release_date || item.first_air_date || '';
          const year = releaseDate ? parseInt(releaseDate.slice(0, 4)) : null;

          results.push({
            tmdb_id: item.id,
            type: mediaType,
            title,
            year,
            overview: item.overview || '',
            poster_url: item.poster_path
              ? `https://image.tmdb.org/t/p/w342${item.poster_path}`
              : null,
            backdrop_url: item.backdrop_path
              ? `https://image.tmdb.org/t/p/w780${item.backdrop_path}`
              : null,
            rating: item.vote_average ? Math.round(item.vote_average * 10) / 10 : null,
            vote_count: item.vote_count || 0,
          });
        }
      }

      // Shuffle the combined results
      for (let i = results.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [results[i], results[j]] = [results[j], results[i]];
      }

      res.json({ results, category, type, page });
    } catch (err) {
      logger.error('Discover fetch failed', { error: err.message, category, type });
      if (err.response?.status === 401) {
        return res.status(503).json({ error: 'Invalid TMDB API key. Please check your Settings.' });
      }
      res.status(500).json({ error: 'Failed to fetch discover results: ' + err.message });
    }
  }
);

module.exports = router;
