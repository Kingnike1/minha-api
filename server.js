const express = require('express');
const axios = require('axios');
const app = express();
const port = 3000;

// Servindo arquivos estáticos da pasta "public"
app.use(express.static('public'));

// Definindo uma rota GET para obter uma piada
app.get('/piada', async (req, res) => {
  const url = 'https://v2.jokeapi.dev/joke/Any'; // URL para pegar uma piada aleatória

  try {
    // Fazendo a requisição à API de piada
    const response = await axios.get(url);

    // Estruturando a resposta
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

    // Retornando a piada em formato JSON
    res.json(piada);
  } catch (error) {
    // Capturando e logando o erro completo
    console.error('Erro na requisição à API:', error.response ? error.response.data : error.message);

    // Retornando um erro detalhado
    res.status(500).json({
      erro: 'Não foi possível obter a piada',
      detalhes: error.response ? error.response.data : error.message,
    });
  }
});

// Iniciar o servidor
app.listen(port, () => {
  console.log(`API rodando na porta ${port}`);
});
