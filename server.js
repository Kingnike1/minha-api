// server.js
require('dotenv').config(); // Carrega variáveis do .env
const express = require('express');
const axios = require('axios');
const app = express();
const port = process.env.PORT || 3000;

// Servindo arquivos estáticos da pasta "public"
app.use(express.static('public'));

// Rota GET para obter uma piada aleatória
app.get('/piada', async (req, res) => {
  const url = 'https://v2.jokeapi.dev/joke/Any';

  try {
    const response = await axios.get(url);

    let piada = {};
    if (response.data.type === 'single') {
      piada = {
        tipo: 'Única',
        piada: response.data.joke,
      };
    } else {
      piada = {
        tipo: 'Dupla',
        pergunta: response.data.setup,
        resposta: response.data.delivery,
      };
    }

    res.json(piada);
  } catch (error) {
    console.error('Erro na requisição à API:', error.response ? error.response.data : error.message);

    res.status(500).json({
      erro: 'Não foi possível obter a piada',
      detalhes: error.response ? error.response.data : error.message,
    });
  }
});

const fetch = require("node-fetch"); // se necessário, instale: npm install node-fetch

app.get("/api/movie", async (req, res) => {
  const title = req.query.title;
  if (!title) return res.status(400).json({ error: "Digite o título do filme" });

  try {
    // OMDb
    const responseOMDb = await fetch(`https://www.omdbapi.com/?t=${encodeURIComponent(title)}&apikey=${process.env.OMDB_API_KEY}`);
    const dataOMDb = await responseOMDb.json();

    // TMDb
    const responseTMDb = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${process.env.TMDB_API_KEY}&query=${encodeURIComponent(title)}`);
    const dataTMDb = await responseTMDb.json();

    res.json({ omdb: dataOMDb, tmdb: dataTMDb.results });
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar o filme" });
  }
});

app.get("/api/popular", async (req, res) => {
  try {
    const response = await axios.get(`https://api.themoviedb.org/3/movie/popular?api_key=${process.env.TMDB_API_KEY}&language=pt-BR`);
    const movies = response.data.results || [];
    res.json(movies);
  } catch (err) {
    console.error("Erro ao buscar filmes populares:", err.response ? err.response.data : err.message);
    res.status(500).json({ error: "Não foi possível obter filmes populares" });
  }
});
app.get("/api/related", async (req, res) => {
  const query = req.query.query;
  if (!query) return res.json([]);

  try {
    const response = await axios.get(`https://api.themoviedb.org/3/search/movie`, {
      params: {
        api_key: process.env.TMDB_API_KEY,
        language: "pt-BR",
        query
      }
    });

    const titles = (response.data.results || []).map(movie => movie.title);
    res.json(titles);
  } catch (err) {
    console.error("Erro ao buscar filmes relacionados:", err.response ? err.response.data : err.message);
    res.status(500).json([]);
  }
});

// Iniciar o servidor
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
