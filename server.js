// ============================
// 🌎 Configuração e Imports
// ============================
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const app = express();

const PORT = process.env.PORT || 3000;
const OMDB_KEY = process.env.OMDB_API_KEY;
const TMDB_KEY = process.env.TMDB_API_KEY;

// ============================
// 📂 Middleware
// ============================
app.use(express.static('public')); // Servir front-end
app.use(express.json()); // Garantir JSON parsing para futuras POSTs

// ============================
// 😂 Rota de Piadas
// ============================
app.get('/piada', async (req, res) => {
  try {
    const { data } = await axios.get('https://v2.jokeapi.dev/joke/Any');

    const piada =
      data.type === 'single'
        ? { tipo: 'Única', piada: data.joke }
        : { tipo: 'Dupla', pergunta: data.setup, resposta: data.delivery };

    res.json(piada);
  } catch (err) {
    console.error('❌ Erro na API de piadas:', err.message);
    res.status(500).json({ erro: 'Falha ao obter piada.' });
  }
});

// ============================
// 🎬 Buscar Filme (OMDb + TMDb)
// ============================
app.get('/api/movie', async (req, res) => {
  const title = req.query.title?.trim();
  if (!title) return res.status(400).json({ error: 'Digite o título do filme.' });

  try {
    // Requisições paralelas para performance ⚡
    const [omdbRes, tmdbRes] = await Promise.all([
      axios.get('https://www.omdbapi.com/', { params: { t: title, apikey: OMDB_KEY } }),
      axios.get('https://api.themoviedb.org/3/search/movie', {
        params: { api_key: TMDB_KEY, query: title, language: 'pt-BR' },
      }),
    ]);

    res.json({
      omdb: omdbRes.data,
      tmdb: tmdbRes.data.results || [],
    });
  } catch (err) {
    console.error('❌ Erro ao buscar filme:', err.message);
    res.status(500).json({ error: 'Erro ao buscar informações do filme.' });
  }
});

// ============================
// 🔥 Filmes Populares
// ============================
app.get('/api/popular', async (_, res) => {
  try {
    const { data } = await axios.get(
      'https://api.themoviedb.org/3/movie/popular',
      { params: { api_key: TMDB_KEY, language: 'pt-BR' } }
    );

    res.json(data.results || []);
  } catch (err) {
    console.error('❌ Erro ao buscar filmes populares:', err.message);
    res.status(500).json({ error: 'Falha ao obter filmes populares.' });
  }
});

// ============================
// 🔍 Filmes Relacionados
// ============================
app.get('/api/related', async (req, res) => {
  const query = req.query.query?.trim();
  if (!query) return res.json([]);

  try {
    const { data } = await axios.get('https://api.themoviedb.org/3/search/movie', {
      params: { api_key: TMDB_KEY, language: 'pt-BR', query },
    });

    const titles = (data.results || []).map((m) => m.title);
    res.json(titles);
  } catch (err) {
    console.error('❌ Erro ao buscar relacionados:', err.message);
    res.status(500).json([]);
  }
});

// ============================
// 🧠 Tratamento Global de Erros
// ============================
app.use((err, req, res, _next) => {
  console.error('⚠️ Erro inesperado:', err);
  res.status(500).json({ error: 'Erro interno do servidor.' });
});

// ============================
// 🚀 Inicialização
// ============================
app.listen(PORT, () => console.log(`✅ Servidor rodando em http://localhost:${PORT}`));
