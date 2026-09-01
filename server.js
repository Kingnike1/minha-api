require('dotenv').config();

const crypto = require('crypto');
const express = require('express');
const axios = require('axios');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const OMDB_KEY = process.env.OMDB_API_KEY;
const TMDB_KEY = process.env.TMDB_API_KEY;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

if (!OMDB_KEY || !TMDB_KEY) {
  const missing = [!OMDB_KEY && 'OMDB_API_KEY', !TMDB_KEY && 'TMDB_API_KEY'].filter(Boolean);
  const message = `Variáveis obrigatórias ausentes: ${missing.join(', ')}`;
  if (IS_PRODUCTION) throw new Error(message);
  console.warn(`⚠️ ${message}`);
}

const apiClient = axios.create({
  timeout: 8000,
  headers: { Accept: 'application/json' },
});

const cache = new Map();
const rateBuckets = new Map();

function normalizeQuery(value) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

function validateQuery(value, fieldName = 'consulta') {
  const normalized = normalizeQuery(value);
  if (normalized.length < 2 || normalized.length > 120) {
    const error = new Error(`${fieldName} deve ter entre 2 e 120 caracteres.`);
    error.status = 400;
    error.code = 'INVALID_QUERY';
    throw error;
  }
  return normalized;
}

function cacheGet(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function cacheSet(key, value, ttlMs) {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
  return value;
}

function rateLimit({ windowMs = 60_000, max = 60 } = {}) {
  return (req, res, next) => {
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    const bucket = rateBuckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    bucket.count += 1;
    if (bucket.count > max) {
      res.set('Retry-After', String(Math.ceil((bucket.resetAt - now) / 1000)));
      return res.status(429).json({
        error: { code: 'RATE_LIMITED', message: 'Muitas requisições. Tente novamente em instantes.', requestId: req.id },
      });
    }

    next();
  };
}

function securityHeaders(_req, res, next) {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Cross-Origin-Opener-Policy': 'same-origin',
  });
  next();
}

app.disable('x-powered-by');
app.use((req, res, next) => {
  req.id = req.get('x-request-id') || crypto.randomUUID();
  res.set('x-request-id', req.id);
  const startedAt = Date.now();
  res.on('finish', () => {
    console.log(`${req.id} ${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - startedAt}ms`);
  });
  next();
});
app.use(securityHeaders);
app.use(express.json({ limit: '100kb' }));
app.use(express.static('public'));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.get('/ready', (_req, res) => {
  const ready = Boolean(OMDB_KEY && TMDB_KEY);
  res.status(ready ? 200 : 503).json({ status: ready ? 'ready' : 'not_ready' });
});

app.get('/piada', rateLimit({ max: 30 }), async (req, res, next) => {
  try {
    const { data } = await apiClient.get('https://v2.jokeapi.dev/joke/Any');
    const piada = data.type === 'single'
      ? { tipo: 'Única', piada: data.joke }
      : { tipo: 'Dupla', pergunta: data.setup, resposta: data.delivery };
    res.json(piada);
  } catch (error) {
    error.code = error.code === 'ECONNABORTED' ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_ERROR';
    next(error);
  }
});

app.get('/api/movie', rateLimit({ max: 30 }), async (req, res, next) => {
  try {
    const title = validateQuery(req.query.title, 'title');
    const cacheKey = `movie:${title.toLowerCase()}`;
    const cached = cacheGet(cacheKey);
    if (cached) return res.json(cached);

    const [omdbResult, tmdbResult] = await Promise.allSettled([
      apiClient.get('https://www.omdbapi.com/', { params: { t: title, apikey: OMDB_KEY } }),
      apiClient.get('https://api.themoviedb.org/3/search/movie', {
        params: { api_key: TMDB_KEY, query: title, language: 'pt-BR' },
      }),
    ]);

    if (omdbResult.status === 'rejected' && tmdbResult.status === 'rejected') {
      const error = new Error('As fontes de filmes estão indisponíveis no momento.');
      error.code = 'UPSTREAM_UNAVAILABLE';
      throw error;
    }

    const payload = {
      omdb: omdbResult.status === 'fulfilled' ? omdbResult.value.data : null,
      tmdb: tmdbResult.status === 'fulfilled' ? (tmdbResult.value.data.results || []).slice(0, 12) : [],
      warnings: [],
    };

    if (omdbResult.status === 'rejected') payload.warnings.push('OMDb indisponível no momento');
    if (tmdbResult.status === 'rejected') payload.warnings.push('TMDb indisponível no momento');

    cacheSet(cacheKey, payload, 5 * 60_000);
    res.json(payload);
  } catch (error) {
    next(error);
  }
});

app.get('/api/popular', rateLimit({ max: 60 }), async (req, res, next) => {
  try {
    const page = Math.min(Math.max(Number.parseInt(req.query.page, 10) || 1, 1), 20);
    const cacheKey = `popular:${page}`;
    const cached = cacheGet(cacheKey);
    if (cached) return res.json(cached);

    const { data } = await apiClient.get('https://api.themoviedb.org/3/movie/popular', {
      params: { api_key: TMDB_KEY, language: 'pt-BR', page },
    });

    const movies = (data.results || []).slice(0, 20);
    cacheSet(cacheKey, movies, 20 * 60_000);
    res.json(movies);
  } catch (error) {
    next(error);
  }
});

app.get('/api/related', rateLimit({ max: 40 }), async (req, res, next) => {
  try {
    const query = validateQuery(req.query.query, 'query');
    const cacheKey = `related:${query.toLowerCase()}`;
    const cached = cacheGet(cacheKey);
    if (cached) return res.json(cached);

    const { data } = await apiClient.get('https://api.themoviedb.org/3/search/movie', {
      params: { api_key: TMDB_KEY, language: 'pt-BR', query },
    });

    const titles = (data.results || []).slice(0, 8).map((movie) => movie.title).filter(Boolean);
    cacheSet(cacheKey, titles, 2 * 60_000);
    res.json(titles);
  } catch (error) {
    next(error);
  }
});

app.use((req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Rota não encontrada.', requestId: req.id } });
});

app.use((error, req, res, _next) => {
  const status = error.status || (error.response ? 502 : 500);
  const code = error.code === 'ECONNABORTED' ? 'UPSTREAM_TIMEOUT' : (error.code || 'INTERNAL_ERROR');
  console.error(req.id, code, error.message);
  res.status(status).json({
    error: {
      code,
      message: status >= 500 ? 'Não foi possível concluir a solicitação agora.' : error.message,
      requestId: req.id,
    },
  });
});

if (require.main === module) {
  app.listen(PORT, () => console.log(`✅ Servidor rodando em http://localhost:${PORT}`));
}

module.exports = { app, normalizeQuery, validateQuery };
