const express = require('express');
const fs = require('fs');
const path = require('path');
const { body, validationResult } = require('express-validator');
const { requireAdmin } = require('../middleware/auth');
const logger = require('../logger');

const router = express.Router();

// Known video file extensions
const VIDEO_EXTS = new Set(['.mkv', '.mp4', '.avi', '.m4v', '.mov', '.wmv', '.ts', '.m2ts', '.flac']);

// Season/Episode patterns
const SE_PATTERN = /[Ss](\d{1,2})[Ee](\d{1,2})/;
const YEAR_PATTERN = /\b(19[0-9]{2}|20[012][0-9])\b/;

// Known junk tokens to strip
const JUNK_TOKENS = new Set([
  '1080p','720p','2160p','4k','uhd','bluray','blu-ray','bdrip','brrip',
  'webrip','web-dl','webdl','web','hdtv','dvdrip','dvd','remux',
  'hevc','x264','x265','h264','h265','avc','xvid','divx',
  'aac','ac3','dts','truehd','atmos','eac3','flac','mp3',
  'hdr','hdr10','dv','dolby','vision','sdr',
  'german','deutsch','english','multi','dubbed',
  'repack','proper','extended','theatrical','directors','cut',
  'unrated','limited','nf','amzn','hbo','disney','apple',
  'yify','yts','rarbg','ettv','eztv','fgt',
  '2160','1080','720','480','576',
]);

/**
 * Parse a video filename into { title, year, season, episode, quality }
 * Mimics how Sonarr/Radarr parse scene filenames.
 */
function parseFilename(filename) {
  // Remove extension
  const base = path.basename(filename, path.extname(filename));

  // Normalise separators: dots and underscores become spaces
  let work = base.replace(/[._]/g, ' ');

  // Extract year
  const yearMatch = work.match(YEAR_PATTERN);
  const year = yearMatch ? parseInt(yearMatch[1]) : null;

  // Extract season/episode
  const seMatch = work.match(SE_PATTERN);
  const season = seMatch ? parseInt(seMatch[1]) : null;
  const episode = seMatch ? parseInt(seMatch[2]) : null;

  // Everything before the year or S/E marker is the title
  let titlePart = work;
  if (seMatch) {
    titlePart = work.slice(0, work.search(SE_PATTERN));
  } else if (yearMatch) {
    titlePart = work.slice(0, work.search(YEAR_PATTERN));
  }

  // Clean up title: remove junk tokens
  const titleTokens = titlePart.split(/\s+/).filter(token => {
    const t = token.toLowerCase().replace(/[^a-z0-9]/g, '');
    return t.length > 0 && !JUNK_TOKENS.has(t) && !JUNK_TOKENS.has(token.toLowerCase());
  });

  const title = titleTokens.join(' ').trim();

  // Detect quality from original filename
  let quality = null;
  const fl = base.toLowerCase();
  if (fl.includes('2160') || fl.includes('4k') || fl.includes('uhd')) quality = '2160p';
  else if (fl.includes('1080')) quality = '1080p';
  else if (fl.includes('720')) quality = '720p';
  else if (fl.includes('480')) quality = '480p';

  return { title, year, season, episode, quality };
}

/**
 * Recursively collect all video files up to maxDepth levels deep.
 * Returns an array of absolute file paths.
 */
function collectVideoFiles(dirPath, maxDepth = 3, depth = 0) {
  if (depth > maxDepth) return [];
  let files = [];
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dirPath, entry.name);
      if (entry.isDirectory() && depth < maxDepth) {
        files = files.concat(collectVideoFiles(full, maxDepth, depth + 1));
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (VIDEO_EXTS.has(ext)) {
          files.push(full);
        }
      }
    }
  } catch (_) { /* permission error — skip */ }
  return files;
}

/**
 * POST /api/import/scan-folder
 * Body: { path: string, maxFiles?: number }
 * Returns: { files: [{ filename, relativePath, parsed, size }] }
 *
 * Security:
 *  - Admin only
 *  - Only allows paths that exist and are directories
 *  - Max 500 files returned to avoid DoS
 */
router.post('/scan-folder',
  requireAdmin,
  body('path').trim().isLength({ min: 1, max: 500 }),
  body('maxFiles').optional().isInt({ min: 1, max: 500 }),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { path: scanPath, maxFiles = 200 } = req.body;

    // Security: resolve to real path
    const realPath = path.resolve(scanPath);

    if (!fs.existsSync(realPath)) {
      return res.status(400).json({ error: `Verzeichnis nicht gefunden: ${realPath}` });
    }

    const stat = fs.statSync(realPath);
    if (!stat.isDirectory()) {
      return res.status(400).json({ error: 'Pfad ist kein Verzeichnis' });
    }

    logger.info('Folder scan started', { path: realPath, user: req.user.username });

    const allFiles = collectVideoFiles(realPath, 4);
    const limited = allFiles.slice(0, maxFiles);

    const result = limited.map(filePath => {
      const filename = path.basename(filePath);
      const relativePath = path.relative(realPath, filePath);
      const parsed = parseFilename(filename);
      let size = null;
      try { size = fs.statSync(filePath).size; } catch (_) {}
      return { filename, relativePath, filePath, parsed, size };
    });

    logger.info('Folder scan complete', { found: allFiles.length, returned: limited.length });
    res.json({
      scanPath: realPath,
      totalFound: allFiles.length,
      returned: limited.length,
      files: result,
    });
  }
);

module.exports = router;
