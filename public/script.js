const input = document.getElementById('movie-title');
const suggestions = document.getElementById('suggestions');
const movieDiv = document.getElementById('movie');
const tabelaDiv = document.getElementById('tabela');
const carousel = document.getElementById('carousel');
const errorMsg = document.getElementById('error-message');
const searchButton = document.getElementById('btn-buscar');

let debounceTimer;
let suggestionController;
let searchController;

function clearElement(element) {
  element.replaceChildren();
}

function textElement(tag, text, className = '') {
  const element = document.createElement(tag);
  element.textContent = text;
  if (className) element.className = className;
  return element;
}

function safeImageUrl(url, fallback = '') {
  if (!url || url === 'N/A') return fallback;
  try {
    const parsed = new URL(url, window.location.origin);
    const allowedHosts = new Set(['m.media-amazon.com', 'image.tmdb.org', 'via.placeholder.com']);
    if (parsed.protocol === 'https:' && allowedHosts.has(parsed.hostname)) return parsed.href;
  } catch {}
  return fallback;
}

function tmdbPoster(path, width = 'w200') {
  if (typeof path !== 'string' || !path.startsWith('/')) return '';
  return `https://image.tmdb.org/t/p/${width}${path}`;
}

async function parseResponse(response) {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = body?.error?.message || body?.error || 'Erro na API';
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return body;
}

async function fetchMovie() {
  const title = input.value.trim();
  if (title.length < 2) return showError('Digite pelo menos 2 caracteres.');

  searchController?.abort();
  searchController = new AbortController();
  setSearchLoading(true);
  showLoading(movieDiv);
  hideSuggestions();

  try {
    const response = await fetch(`/api/movie?title=${encodeURIComponent(title)}`, {
      signal: searchController.signal,
    });
    const data = await parseResponse(response);

    if (!data.omdb || data.omdb.Response !== 'True') {
      clearElement(movieDiv);
      movieDiv.appendChild(textElement('p', 'Filme não encontrado. Tente novamente.', 'text-center text-gray-300'));
      renderCarousel(data.tmdb || []);
      return;
    }

    renderFlipCard(data);
    renderCarousel(data.tmdb || []);

    if (data.warnings?.length) showError(data.warnings.join(' • '), 5000);
  } catch (error) {
    if (error.name !== 'AbortError') {
      console.error('Erro ao buscar filme:', error);
      clearElement(movieDiv);
      showError(error.message || 'Falha ao carregar os dados do filme.');
    }
  } finally {
    setSearchLoading(false);
  }
}

function setSearchLoading(isLoading) {
  searchButton.disabled = isLoading;
  searchButton.textContent = isLoading ? 'Buscando…' : 'Buscar';
  movieDiv.setAttribute('aria-busy', String(isLoading));
}

function showLoading(container) {
  clearElement(container);
  const wrapper = document.createElement('div');
  wrapper.className = 'flex justify-center items-center gap-2 text-blue-400';
  wrapper.appendChild(textElement('span', 'Carregando'));
  for (let i = 0; i < 3; i += 1) {
    const dot = document.createElement('span');
    dot.className = 'dot';
    wrapper.appendChild(dot);
  }
  container.appendChild(wrapper);
}

function showError(message, duration = 3500) {
  errorMsg.textContent = message;
  errorMsg.classList.remove('hidden');
  window.clearTimeout(showError.timer);
  showError.timer = window.setTimeout(() => errorMsg.classList.add('hidden'), duration);
}

function infoParagraph(label, value) {
  const paragraph = document.createElement('p');
  const strong = document.createElement('strong');
  strong.textContent = `${label}: `;
  paragraph.append(strong, document.createTextNode(value ?? 'Desconhecido'));
  return paragraph;
}

function renderFlipCard(data) {
  clearElement(movieDiv);
  const tmdbData = data.tmdb?.[0] || {};
  const { Title, Poster, Year, Director, Actors, Genre, Plot } = data.omdb;

  const card = document.createElement('div');
  card.className = 'flip-card mx-auto';
  const inner = document.createElement('div');
  inner.className = 'flip-card-inner';
  const front = document.createElement('div');
  front.className = 'flip-card-front';
  const back = document.createElement('div');
  back.className = 'flip-card-back p-4';

  const image = document.createElement('img');
  image.src = safeImageUrl(Poster, 'https://via.placeholder.com/300x450?text=Sem+Imagem');
  image.alt = Title || 'Poster do filme';
  image.className = 'rounded-t-xl w-full h-80 object-cover';

  front.append(image, textElement('h2', Title || 'Sem título', 'text-xl font-bold mt-2'));
  back.appendChild(textElement('h2', `${Title || 'Sem título'} (${Year || '—'})`, 'text-lg font-semibold mb-2'));
  back.appendChild(infoParagraph('Diretor', Director || 'Desconhecido'));
  back.appendChild(infoParagraph('Atores', Actors || 'Desconhecido'));
  back.appendChild(infoParagraph('Gênero', Genre || 'Desconhecido'));
  back.appendChild(infoParagraph('Resumo', Plot || 'Não disponível'));
  back.appendChild(infoParagraph('Popularidade', String(tmdbData.popularity ?? 'N/A')));

  inner.append(front, back);
  card.appendChild(inner);
  movieDiv.appendChild(card);
}

async function fetchPopularMovies() {
  try {
    const response = await fetch('/api/popular');
    return (await parseResponse(response)) || [];
  } catch (error) {
    console.error('Erro ao buscar filmes populares:', error);
    return [];
  }
}

async function createMovieTable() {
  const movies = await fetchPopularMovies();
  clearElement(tabelaDiv);

  if (!movies.length) {
    tabelaDiv.appendChild(textElement('p', 'Nenhum filme encontrado.'));
    return;
  }

  const table = document.createElement('table');
  table.className = 'w-full border-collapse border border-gray-700';
  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  headRow.className = 'bg-gray-800 text-blue-400';
  ['Poster', 'Título', 'Lançamento', 'Nota'].forEach((label) => headRow.appendChild(textElement('th', label)));
  thead.appendChild(headRow);

  const tbody = document.createElement('tbody');
  movies.forEach((movie) => {
    const row = document.createElement('tr');
    const posterCell = document.createElement('td');
    const image = document.createElement('img');
    image.src = safeImageUrl(tmdbPoster(movie.poster_path), 'https://via.placeholder.com/100x150?text=Sem+Imagem');
    image.alt = movie.title ? `Poster de ${movie.title}` : 'Poster do filme';
    image.className = 'rounded shadow';
    posterCell.appendChild(image);

    [posterCell, textElement('td', movie.title || 'Sem título'), textElement('td', movie.release_date || '—'), textElement('td', String(movie.vote_average ?? 'N/A'))]
      .forEach((cell) => row.appendChild(cell));
    tbody.appendChild(row);
  });

  table.append(thead, tbody);
  tabelaDiv.appendChild(table);
}

function renderCarousel(movies) {
  const container = carousel.querySelector('div');
  clearElement(container);

  if (!movies.length) {
    carousel.classList.add('hidden');
    return;
  }

  movies.slice(0, 12).forEach((movie) => {
    const card = document.createElement('div');
    card.className = 'flip-card min-w-[180px] bg-gray-800 rounded-xl shadow-lg hover:scale-105 transition';
    const inner = document.createElement('div');
    inner.className = 'flip-card-inner';
    const front = document.createElement('div');
    front.className = 'flip-card-front flex flex-col items-center';
    const back = document.createElement('div');
    back.className = 'flip-card-back p-4 text-xs text-gray-200 bg-gray-900 rounded-xl';

    const image = document.createElement('img');
    image.src = safeImageUrl(tmdbPoster(movie.poster_path), 'https://via.placeholder.com/200x300?text=Sem+Imagem');
    image.alt = movie.title || 'Poster do filme';
    image.className = 'w-full h-48 object-cover rounded-t-xl';

    front.append(image, textElement('h3', movie.title || 'Sem título', 'text-sm font-semibold text-gray-200 truncate p-2 text-center'));
    back.appendChild(textElement('h3', movie.title || 'Sem título', 'text-base font-bold text-blue-400 mb-2'));
    back.appendChild(textElement('p', `Lançamento: ${movie.release_date || '—'}`));
    back.appendChild(textElement('p', `Nota: ${movie.vote_average ?? 'N/A'}`));
    back.appendChild(textElement('p', movie.overview ? `${movie.overview.slice(0, 120)}${movie.overview.length > 120 ? '…' : ''}` : 'Sem sinopse.'));

    inner.append(front, back);
    card.appendChild(inner);
    container.appendChild(card);
  });

  carousel.classList.remove('hidden');
}

input.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  suggestionController?.abort();
  const query = input.value.trim();

  if (query.length < 2) {
    hideSuggestions();
    return;
  }

  debounceTimer = setTimeout(async () => {
    suggestionController = new AbortController();
    const results = await searchRelatedMovies(query, suggestionController.signal);
    if (input.value.trim() === query) renderSuggestions(results);
  }, 300);
});

function renderSuggestions(titles = []) {
  clearElement(suggestions);
  if (!titles.length) return hideSuggestions();

  titles.forEach((title, index) => {
    const item = textElement('li', title, 'px-4 py-2 hover:bg-gray-600 cursor-pointer');
    item.setAttribute('role', 'option');
    item.dataset.idx = String(index);
    item.tabIndex = 0;
    const select = () => {
      input.value = title;
      hideSuggestions();
      fetchMovie();
    };
    item.addEventListener('click', select);
    item.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') select();
    });
    suggestions.appendChild(item);
  });

  suggestions.classList.remove('hidden');
  input.setAttribute('aria-expanded', 'true');
}

function hideSuggestions() {
  suggestions.classList.add('hidden');
  clearElement(suggestions);
  input.setAttribute('aria-expanded', 'false');
}

async function searchRelatedMovies(query, signal) {
  try {
    const response = await fetch(`/api/related?query=${encodeURIComponent(query)}`, { signal });
    return await parseResponse(response);
  } catch (error) {
    if (error.name !== 'AbortError') console.error('Erro no autocomplete:', error);
    return [];
  }
}

function showMovieTriviaModal() {
  const curiosidades = [
    'O rugido do T-Rex em Jurassic Park foi feito misturando sons de cachorro, pinguim e tigre.',
    'O filme Psicose foi o primeiro a mostrar uma descarga de privada em Hollywood.',
    'Indiana Jones quase foi interpretado por Tom Selleck.',
    'O som do sabre de luz em Star Wars veio do zumbido de um projetor.',
    'O Oscar original pesava 4 kg e era feito de bronze banhado a ouro.',
  ];

  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/70 flex items-center justify-center z-[9999]';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');

  const box = document.createElement('div');
  box.className = 'bg-gray-900 border-4 border-indigo-600 rounded-2xl p-8 max-w-md w-full mx-4 text-center shadow-2xl';
  box.appendChild(textElement('h2', '🎬 Curiosidade de Cinema', 'text-2xl font-bold text-indigo-400 mb-4'));
  box.appendChild(textElement('p', curiosidades[Math.floor(Math.random() * curiosidades.length)], 'text-gray-200 mb-6'));

  const closeButton = textElement('button', 'Fechar', 'bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-semibold');
  closeButton.type = 'button';
  closeButton.addEventListener('click', () => modal.remove());
  box.appendChild(closeButton);
  modal.appendChild(box);
  document.body.appendChild(modal);
  closeButton.focus();
}

searchButton.addEventListener('click', fetchMovie);
document.getElementById('btn-curiosidade')?.addEventListener('click', showMovieTriviaModal);
input.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') fetchMovie();
  if (event.key === 'Escape') hideSuggestions();
});
document.addEventListener('click', (event) => {
  if (!input.contains(event.target) && !suggestions.contains(event.target)) hideSuggestions();
});

createMovieTable();
