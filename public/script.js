// =======================
// Elementos do DOM
// =======================
const input = document.getElementById("movie-title");
const suggestions = document.getElementById("suggestions");
const movieDiv = document.getElementById("movie");
const tabelaDiv = document.getElementById("tabela");
const carousel = document.getElementById("carousel");
// Garantindo que o JSON existe e tem as chaves certas
const omdbData = data.omdb || {};
const tmdbData = data.tmdb || {};
const trailer = data.trailer || "";
const relacionados = data.relacionados || [];

// Exemplo de uso
console.log(omdbData.Title); // título do OMDb
console.log(tmdbData.popularity); // popularidade do TMDb
console.log(trailer); // trailer
console.log(relacionados); // array de filmes relacionados

// =======================
// Fetch Movie ao pressionar Enter
// =======================
input.addEventListener("keypress", (e) => {
  if (e.key === "Enter") fetchMovie();
});

// =======================// Buscar filme ao clicar no botão
async function fetchMovie() {
  const title = input.value.trim();

  if (!title) return alert("Por favor, insira um nome de filme.");

  // Loading
  movieDiv.innerHTML =
    '<div class="loading">Carregando <span class="dot"></span><span class="dot"></span><span class="dot"></span></div>';

  try {
    const res = await fetch(`/api/movie?title=${encodeURIComponent(title)}`); // ajuste conforme servidor
    const text = await res.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.error("Resposta inválida do servidor:", text);
      movieDiv.innerHTML =
        '<p style="text-align: center; color: red;">Resposta do servidor inválida.</p>';
      return;
    }

    if (data.omdb && data.omdb.Response === "True") {
      renderFlipCard(data);
      if (data.relacionados) renderCarousel(data.relacionados);
      if (data.tmdb && data.tmdb.length > 0) {
        renderCarousel(data.tmdb);
      } else {
        carousel.classList.add("hidden");
      }
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

// =======================
// Renderiza Flip Card
// =======================
function renderFlipCard(data) {
  // Garante que tmdbData seja um objeto mesmo que o array esteja vazio
  const tmdbData = data.tmdb && data.tmdb.length > 0 ? data.tmdb[0] : {};

  movieDiv.innerHTML = `
    <div class="flip-card">
      <div class="flip-card-inner">
        <div class="flip-card-front">
          <img src="${data.omdb.Poster}" alt="${data.omdb.Title}">
          <h2>${data.omdb.Title}</h2>
        </div>
        <div class="flip-card-back">
          <h2>${data.omdb.Title} (${data.omdb.Year})</h2>
          <p><strong>Diretor:</strong> ${
            data.omdb.Director || "Desconhecido"
          }</p>
          <p><strong>Atores:</strong> ${data.omdb.Actors || "Desconhecido"}</p>
          <p><strong>Gênero:</strong> ${data.omdb.Genre || "Desconhecido"}</p>
          <p><strong>Resumo:</strong> ${data.omdb.Plot || "Não disponível"}</p>
          <p><strong>Popularidade:</strong> ${tmdbData.popularity || "N/A"}</p>
          <p><strong>Trailer:</strong> ${
            data.trailer
              ? `<a href="https://www.youtube.com/watch?v=${data.trailer}" target="_blank">Assistir trailer</a>`
              : "Não disponível"
          }</p>
        </div>
      </div>
    </div>
  `;
}

// =======================
// Buscar filmes populares
// =======================
async function fetchPopularMovies() {
  try {
    const res = await fetch("/api/popular");
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Erro ao buscar filmes populares:", error);
    return [];
  }
}

// =======================
// Criar Tabela de Filmes Populares
// =======================
async function createMovieTable() {
  const movies = await fetchPopularMovies();

  if (!movies || movies.length === 0) {
    tabelaDiv.innerHTML = "<p>Nenhum filme encontrado.</p>";
    return;
  }

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

  movies.forEach((movie) => {
    const poster = movie.poster_path
      ? `https://image.tmdb.org/t/p/w200${movie.poster_path}`
      : "https://via.placeholder.com/100x150?text=Sem+Imagem";
    const releaseDate = movie.release_date || "Desconhecida";
    const vote = movie.vote_average !== undefined ? movie.vote_average : "N/A";

    tableHTML += `
      <tr>
        <td><img src="${poster}" alt="${movie.title}"></td>
        <td>${movie.title || "Desconhecido"}</td>
        <td>${releaseDate}</td>
        <td>${vote}</td>
      </tr>
    `;
  });

  tableHTML += "</tbody></table>";
  tabelaDiv.innerHTML = tableHTML;
}

// Executa ao carregar a página
createMovieTable();

// =======================
// Renderiza Carrossel de Filmes
// =======================
function renderCarousel(movies) {
  const container = carousel.querySelector("div");
  container.innerHTML = "";
  container.className = "flex overflow-x-auto scrollbar-hide space-x-4 p-2";

  movies.forEach((movie) => {
    const card = document.createElement("div");
    card.className =
      "flip-card min-w-[180px] bg-gray-800 rounded-xl shadow-lg cursor-pointer transform transition-transform duration-300 hover:scale-105";

    card.innerHTML = `
      <div class="flip-card-inner relative w-full h-full">
        <div class="flip-card-front flex flex-col items-center">
          <img src="${
            movie.poster_path
              ? "https://image.tmdb.org/t/p/w200" + movie.poster_path
              : "https://via.placeholder.com/200x300?text=Sem+Imagem"
          }"
            alt="${movie.title}"
            class="w-full h-48 object-cover rounded-t-xl" />
          <h3 class="text-sm font-semibold text-gray-200 truncate p-2 text-center">
            ${movie.title || "Desconhecido"}
          </h3>
        </div>
        <div class="flip-card-back absolute top-0 left-0 w-full h-full bg-gray-900 text-center text-gray-200 p-4 rounded-xl flex flex-col justify-center items-center backface-hidden">
          <h3 class="text-base font-bold text-blue-400 mb-2">${movie.title || "Desconhecido"}</h3>
          <p class="text-xs mb-1">Lançamento: ${movie.release_date || "Desconhecido"}</p>
          <p class="text-xs mb-1">Nota: ${movie.vote_average ?? "N/A"}</p>
          <p class="text-xs">${movie.overview ? movie.overview.slice(0, 80) + "..." : "Sem sinopse."}</p>
        </div>
      </div>
    `;

    card.addEventListener("click", () => card.classList.toggle("flipped"));
    card.addEventListener("mouseenter", () => card.classList.add("flipped"));
    card.addEventListener("mouseleave", () => card.classList.remove("flipped"));

    container.appendChild(card);
  });

  carousel.classList.remove("hidden");

}


// =======================
// Autocomplete / Sugestões
// =======================
let selectedSuggestionIndex = -1;

input.addEventListener("input", async () => {
  const query = input.value.trim();
  if (!query) {
    suggestions.classList.add("hidden");
    suggestions.innerHTML = "";
    return;
  }

  const filtered = await searchRelatedMovies(query);

  if (filtered.length === 0) {
    suggestions.classList.add("hidden");
    suggestions.innerHTML = "";
    return;
  }

  suggestions.innerHTML = filtered
    .map(
      (title, idx) =>
        `<li class="px-4 py-2 hover:bg-gray-600 cursor-pointer" data-idx="${idx}">${title}</li>`
    )
    .join("");
  suggestions.classList.remove("hidden");
  selectedSuggestionIndex = -1;

  // Clique na sugestão
  document.querySelectorAll("#suggestions li").forEach((li) => {
    li.addEventListener("click", () => {
      input.value = li.textContent;
      suggestions.classList.add("hidden");
      fetchMovie();
    });
  });
});

// Navegação por teclado nas sugestões
input.addEventListener("keydown", (e) => {
  const items = suggestions.querySelectorAll("li");
  if (suggestions.classList.contains("hidden") || items.length === 0) return;

  if (e.key === "ArrowDown") {
    e.preventDefault();
    selectedSuggestionIndex = (selectedSuggestionIndex + 1) % items.length;
    updateSuggestionHighlight(items);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    selectedSuggestionIndex =
      (selectedSuggestionIndex - 1 + items.length) % items.length;
    updateSuggestionHighlight(items);
  } else if (e.key === "Enter" && selectedSuggestionIndex >= 0) {
    e.preventDefault();
    items[selectedSuggestionIndex].click();
  }
});

function updateSuggestionHighlight(items) {
  items.forEach((li, idx) => {
    if (idx === selectedSuggestionIndex) {
      li.classList.add("bg-blue-700");
    } else {
      li.classList.remove("bg-blue-700");
    }
  });
}

// Fecha dropdown ao clicar fora ou pressionar Esc
document.addEventListener("click", (e) => {
  if (!input.contains(e.target) && !suggestions.contains(e.target))
    suggestions.classList.add("hidden");
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") suggestions.classList.add("hidden");
});

// =======================
// Função para buscar filmes relacionados
// =======================
async function searchRelatedMovies(query) {
  if (!query) return [];
  try {
    const res = await fetch(`/api/related?query=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error("Erro ao buscar filmes relacionados");
    return await res.json();
  } catch (err) {
    console.error(err);
    return [];
  }
}

// =======================
// Easter Eggs / Curiosidades
// =======================
function showMovieTriviaModal() {
  const trivia = [
    "O rugido do T-Rex em Jurassic Park foi feito misturando sons de cachorro, pinguim, tigre e elefante.",
    "O filme 'Psicose' foi o primeiro a mostrar uma descarga de privada em Hollywood.",
    "O personagem Indiana Jones quase foi interpretado por Tom Selleck.",
    "O som do sabre de luz em Star Wars foi criado misturando o zumbido de um projetor de filmes e o som de cabos de microfone.",
    "O Oscar original pesava cerca de 4 kg e era feito de bronze banhado a ouro.",
    // ...adicione mais curiosidades aqui
  ];

  const randomTrivia = trivia[Math.floor(Math.random() * trivia.length)];

  document.querySelectorAll(".movie-trivia-modal").forEach((el) => el.remove());

  const modal = document.createElement("div");
  modal.className =
    "movie-trivia-modal fixed inset-0 z-[9999] flex items-center justify-center bg-black/70";
  modal.innerHTML = `
    <div class="bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full mx-4 p-8 flex flex-col items-center border-4 border-indigo-600 animate-fade-in">
      <h2 class="text-2xl md:text-3xl font-bold mb-4 text-indigo-400 flex items-center gap-2">
        <span>🎬</span> Curiosidade de Cinema!
      </h2>
      <p class="text-base md:text-lg text-gray-200 mb-6 leading-relaxed text-center">${randomTrivia}</p>
      <button id="closeTrivia" class="mt-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow transition focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2">
        Fechar
      </button>
    </div>
  `;
  document.body.appendChild(modal);

  document.getElementById("closeTrivia").onclick = () => modal.remove();
}

// Lista fixa de sugestões iniciais
const sugestoesFixas = [
  "Inception",
  "The Matrix",
  "Forrest Gump",
  "Interestelar",
  "O Senhor dos Anéis",
  "Titanic",
  "Clube da Luta",
  "Pulp Fiction",
  "O Rei Leão",
  "Jurassic Park",
];

// Mostra sugestões fixas ao focar no input se estiver vazio
input.addEventListener("focus", () => {
  if (!input.value.trim()) {
    suggestions.innerHTML = sugestoesFixas
      .map(
        (title, idx) =>
          `<li class="px-4 py-2 hover:bg-gray-600 cursor-pointer" data-idx="${idx}">${title}</li>`
      )
      .join("");
    suggestions.classList.remove("hidden");
    selectedSuggestionIndex = -1;

    document.querySelectorAll("#suggestions li").forEach((li) => {
      li.addEventListener("click", () => {
        input.value = li.textContent;
        suggestions.classList.add("hidden");
        fetchMovie();
      });
    });
  }
});

console.log("JSON recebido da API:", data);
