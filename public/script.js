async function fetchMovie() {
  const titleInput = document.getElementById("movie-title");
  const title = titleInput.value.trim();
  const apiKeyOMDb = "d044463e"; // Sua chave da OMDb API
  const apiKeyTMDb = "48d9a534329856096d05454c42e16275"; // Sua chave da TMDb API
  const movieDiv = document.getElementById("movie");

  if (!title) {
    alert("Por favor, insira um nome de filme.");
    return;
  }

  movieDiv.innerHTML =
    '    <div class="loading"> Carregando <span class="dot"></span><span class="dot"></span><span class="dot"></span></div>';

  try {
    // Requisição à OMDb API
    const responseOMDb = await fetch(
      `https://www.omdbapi.com/?t=${encodeURIComponent(
        title
      )}&apikey=${apiKeyOMDb}`
    );
    const dataOMDb = await responseOMDb.json();

    if (dataOMDb.Response === "True") {
      // Requisição à TMDb API para obter popularidade e trailer
      const responseTMDb = await fetch(
        `https://api.themoviedb.org/3/search/movie?api_key=${apiKeyTMDb}&query=${encodeURIComponent(
          title
        )}`
      );
      const dataTMDb = await responseTMDb.json();
      const movieDataTMDb = dataTMDb.results[0];

      const trailerResponse = await fetch(
        `https://api.themoviedb.org/3/movie/${movieDataTMDb.id}/videos?api_key=${apiKeyTMDb}`
      );
      const trailerData = await trailerResponse.json();
      const trailer =
        trailerData.results.length > 0 ? trailerData.results[0].key : "";

      // Exibe o resultado no formato de flip card
      movieDiv.innerHTML = `
          <div class="flip-card">
            <div class="flip-card-inner">
              <div class="flip-card-front">
                <img src="${dataOMDb.Poster}" alt="${dataOMDb.Title}">
                <h2>${dataOMDb.Title}</h2>
              </div>
              <div class="flip-card-back">
                <h2>${dataOMDb.Title} (${dataOMDb.Year})</h2>
                <p><strong>Diretor:</strong> ${dataOMDb.Director}</p>
                <p><strong>Atores:</strong> ${dataOMDb.Actors}</p>
                <p><strong>Gênero:</strong> ${dataOMDb.Genre}</p>
                <p><strong>Resumo:</strong> ${dataOMDb.Plot}</p>
                <p><strong>Popularidade:</strong> ${
                  movieDataTMDb.popularity
                }</p>
                <p><strong>Trailer:</strong> ${
                  trailer
                    ? `<a href="https://www.youtube.com/watch?v=${trailer}" target="_blank">Assistir trailer</a>`
                    : "Não disponível"
                }</p>
              </div>
            </div>
          </div>
        `;
    } else {
      movieDiv.innerHTML =
        '<p style="text-align: center;">Filme não encontrado. Tente novamente.</p>';
    }
  } catch (error) {
    console.error("Erro ao buscar o filme:", error);
    movieDiv.innerHTML =
      '<p style="text-align: center; color: red;">Falha ao carregar os dados do filme.</p>';
  }
}

// Função para buscar filmes populares
async function fetchPopularMovies() {
  const apiKey = "48d9a534329856096d05454c42e16275"; // Substitua pela sua chave da API TMDb
  const url = `https://api.themoviedb.org/3/movie/popular?api_key=${apiKey}&language=pt-BR`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    return data.results; // Retorna uma lista de filmes populares
  } catch (error) {
    console.error("Erro ao buscar filmes populares:", error);
    return [];
  }
}

// Função para criar a tabela de filmes
async function createMovieTable() {
  const movies = await fetchPopularMovies(); // Busca os filmes populares
  const tabelaDiv = document.getElementById("tabela");

  if (movies.length === 0) {
    tabelaDiv.innerHTML = "<p>Nenhum filme encontrado.</p>";
    return;
  }

  // Cria a estrutura da tabela
  let tableHTML = `
    <table class="table table-dark table-hover">
      <thead>
        <tr>
          <th>Poster</th>
          <th>Título</th>
          <th>Data de Lançamento</th>
          <th>Nota</th>
        </tr>
      </thead>
      <tbody>
  `;

  // Adiciona cada filme como uma linha na tabela
  movies.forEach((movie) => {
    tableHTML += `
      <tr>
        <td><img src="https://image.tmdb.org/t/p/w200${movie.poster_path}" alt="${movie.title}"></td>
        <td>${movie.title}</td>
        <td>${movie.release_date}</td>
        <td>${movie.vote_average}</td>
      </tr>
    `;
  });

  tableHTML += `
      </tbody>
    </table>
  `;

  // Insere a tabela na div
  tabelaDiv.innerHTML = tableHTML;
}

// Executa a função para criar a tabela ao carregar a página
createMovieTable();
