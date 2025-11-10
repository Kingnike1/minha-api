// =======================
// Referências ao DOM
// =======================
const input = document.getElementById("movie-title");
const suggestions = document.getElementById("suggestions");
const movieDiv = document.getElementById("movie");
const tabelaDiv = document.getElementById("tabela");
const carousel = document.getElementById("carousel");
const errorMsg = document.getElementById("error-message");

// =======================
// Função Principal - Buscar Filme
// =======================
async function fetchMovie() {
  const title = input.value.trim();
  if (!title) return showError("Por favor, insira o nome de um filme.");

  showLoading(movieDiv);

  try {
    const res = await fetch(`/api/movie?title=${encodeURIComponent(title)}`);
    const data = await res.json();

    if (!data.omdb || data.omdb.Response !== "True") {
      movieDiv.innerHTML = `<p class="text-center text-gray-300">Filme não encontrado. Tente novamente.</p>`;
      return;
    }

    renderFlipCard(data);
    renderCarousel(data.tmdb || []);
  } catch (error) {
    console.error("Erro ao buscar filme:", error);
    showError("Falha ao carregar os dados do filme.");
  }
}

// =======================
// Feedback Visual
// =======================
function showLoading(container) {
  container.innerHTML = `
    <div class="flex justify-center items-center gap-2 text-blue-400">
      <span>Carregando</span>
      <span class="dot"></span><span class="dot"></span><span class="dot"></span>
    </div>`;
}

function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.classList.remove("hidden");
  setTimeout(() => errorMsg.classList.add("hidden"), 3000);
}

// =======================
// Renderizar Flip Card
// =======================
function renderFlipCard(data) {
  const tmdbData = data.tmdb?.[0] || {};
  const { Title, Poster, Year, Director, Actors, Genre, Plot } = data.omdb;

  movieDiv.innerHTML = `
    <div class="flip-card mx-auto">
      <div class="flip-card-inner">
        <div class="flip-card-front">
          <img src="${Poster}" alt="${Title}" class="rounded-t-xl w-full h-80 object-cover" />
          <h2 class="text-xl font-bold mt-2">${Title}</h2>
        </div>
        <div class="flip-card-back p-4">
          <h2 class="text-lg font-semibold mb-2">${Title} (${Year})</h2>
          <p><strong>Diretor:</strong> ${Director || "Desconhecido"}</p>
          <p><strong>Atores:</strong> ${Actors || "Desconhecido"}</p>
          <p><strong>Gênero:</strong> ${Genre || "Desconhecido"}</p>
          <p><strong>Resumo:</strong> ${Plot || "Não disponível"}</p>
          <p><strong>Popularidade:</strong> ${tmdbData.popularity || "N/A"}</p>
        </div>
      </div>
    </div>`;
}

// =======================
// Buscar Filmes Populares
// =======================
async function fetchPopularMovies() {
  try {
    const res = await fetch("/api/popular");
    return (await res.json()) || [];
  } catch (err) {
    console.error("Erro ao buscar filmes populares:", err);
    return [];
  }
}

// =======================
// Criar Tabela de Filmes Populares
// =======================
async function createMovieTable() {
  const movies = await fetchPopularMovies();
  if (!movies.length) {
    tabelaDiv.innerHTML = "<p>Nenhum filme encontrado.</p>";
    return;
  }

  const rows = movies
    .map(
      (m) => `
      <tr>
        <td><img src="${m.poster_path ? `https://image.tmdb.org/t/p/w200${m.poster_path}` : "https://via.placeholder.com/100x150?text=Sem+Imagem"}" class="rounded shadow"/></td>
        <td>${m.title}</td>
        <td>${m.release_date || "—"}</td>
        <td>${m.vote_average ?? "N/A"}</td>
      </tr>`
    )
    .join("");

  tabelaDiv.innerHTML = `
    <table class="w-full border-collapse border border-gray-700">
      <thead>
        <tr class="bg-gray-800 text-blue-400">
          <th>Poster</th><th>Título</th><th>Lançamento</th><th>Nota</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

// =======================
// Renderizar Carrossel
// =======================
function renderCarousel(movies) {
  const container = carousel.querySelector("div");
  if (!movies.length) {
    carousel.classList.add("hidden");
    return;
  }

  container.innerHTML = movies
    .map(
      (movie) => `
      <div class="flip-card min-w-[180px] bg-gray-800 rounded-xl shadow-lg hover:scale-105 transition">
        <div class="flip-card-inner">
          <div class="flip-card-front flex flex-col items-center">
            <img src="${
              movie.poster_path
                ? `https://image.tmdb.org/t/p/w200${movie.poster_path}`
                : "https://via.placeholder.com/200x300?text=Sem+Imagem"
            }" alt="${movie.title}" class="w-full h-48 object-cover rounded-t-xl" />
            <h3 class="text-sm font-semibold text-gray-200 truncate p-2 text-center">${movie.title}</h3>
          </div>
          <div class="flip-card-back p-4 text-xs text-gray-200 bg-gray-900 rounded-xl">
            <h3 class="text-base font-bold text-blue-400 mb-2">${movie.title}</h3>
            <p>Lançamento: ${movie.release_date || "—"}</p>
            <p>Nota: ${movie.vote_average ?? "N/A"}</p>
            <p>${movie.overview ? movie.overview.slice(0, 80) + "..." : "Sem sinopse."}</p>
          </div>
        </div>
      </div>`
    )
    .join("");

  carousel.classList.remove("hidden");
}

// =======================
// Autocomplete / Sugestões
// =======================
let selectedSuggestionIndex = -1;
let debounceTimer;

input.addEventListener("input", () => {
  clearTimeout(debounceTimer);
  const query = input.value.trim();
  if (!query) return hideSuggestions();

  debounceTimer = setTimeout(async () => {
    const results = await searchRelatedMovies(query);
    renderSuggestions(results);
  }, 300);
});

function renderSuggestions(titles = []) {
  if (!titles.length) return hideSuggestions();

  suggestions.innerHTML = titles
    .map(
      (t, i) =>
        `<li data-idx="${i}" class="px-4 py-2 hover:bg-gray-600 cursor-pointer">${t}</li>`
    )
    .join("");

  suggestions.classList.remove("hidden");

  suggestions.querySelectorAll("li").forEach((li) =>
    li.addEventListener("click", () => {
      input.value = li.textContent;
      hideSuggestions();
      fetchMovie();
    })
  );
}

function hideSuggestions() {
  suggestions.classList.add("hidden");
  suggestions.innerHTML = "";
}

async function searchRelatedMovies(query) {
  try {
    const res = await fetch(`/api/related?query=${encodeURIComponent(query)}`);
    return res.ok ? await res.json() : [];
  } catch {
    return [];
  }
}

// =======================
// Easter Egg / Curiosidades
// =======================
function showMovieTriviaModal() {
  const curiosidades = [
    "O rugido do T-Rex em Jurassic Park foi feito misturando sons de cachorro, pinguim e tigre.",
    "O filme Psicose foi o primeiro a mostrar uma descarga de privada em Hollywood.",
    "Indiana Jones quase foi interpretado por Tom Selleck.",
    "O som do sabre de luz em Star Wars veio do zumbido de um projetor.",
    "O Oscar original pesava 4 kg e era feito de bronze banhado a ouro.",
  ];

  const fact = curiosidades[Math.floor(Math.random() * curiosidades.length)];
  const modal = document.createElement("div");
  modal.className =
    "fixed inset-0 bg-black/70 flex items-center justify-center z-[9999]";
  modal.innerHTML = `
    <div class="bg-gray-900 border-4 border-indigo-600 rounded-2xl p-8 max-w-md w-full mx-4 text-center shadow-2xl">
      <h2 class="text-2xl font-bold text-indigo-400 mb-4">🎬 Curiosidade de Cinema</h2>
      <p class="text-gray-200 mb-6">${fact}</p>
      <button class="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-semibold">Fechar</button>
    </div>`;
  modal.querySelector("button").addEventListener("click", () => modal.remove());
  document.body.appendChild(modal);
}

// =======================
// Inicialização
// =======================
document.addEventListener("DOMContentLoaded", () => {
  createMovieTable();

  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") fetchMovie();
  });

  document.addEventListener("click", (e) => {
    if (!input.contains(e.target) && !suggestions.contains(e.target)) hideSuggestions();
  });

  document.getElementById("btn-curiosidade")?.addEventListener("click", showMovieTriviaModal);
});
