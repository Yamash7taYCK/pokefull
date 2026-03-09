const input = document.querySelector("#pokemonInput");
const buscarBtn = document.querySelector("#buscarBtn");
const randomBtn = document.querySelector("#randomBtn");
const prevBtn = document.querySelector("#prevBtn");
const nextBtn = document.querySelector("#nextBtn");
const resultado = document.querySelector("#resultado");
const favoritosLista = document.querySelector("#favoritosLista");
const historicoLista = document.querySelector("#historicoLista");
const sugestoes = document.querySelector("#sugestoes");

let pokemonAtual = 1;
let dadosAtuais = null;
let audioAtual = null;
let listaNomesPokemon = [];

/* =========================
   UTILITÁRIOS
========================= */

function capitalizar(texto) {
  if (!texto) return "";
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function capitalizarComHifen(texto) {
  return texto
    .split("-")
    .map(parte => capitalizar(parte))
    .join(" ");
}

function formatarNumero(numero) {
  return String(numero).padStart(3, "0");
}

function corPorTipo(tipo) {
  const cores = {
    normal: "#A8A77A",
    fire: "#EE8130",
    water: "#6390F0",
    electric: "#F7D02C",
    grass: "#7AC74C",
    ice: "#96D9D6",
    fighting: "#C22E28",
    poison: "#A33EA1",
    ground: "#E2BF65",
    flying: "#A98FF3",
    psychic: "#F95587",
    bug: "#A6B91A",
    rock: "#B6A136",
    ghost: "#735797",
    dragon: "#6F35FC",
    dark: "#705746",
    steel: "#B7B7CE",
    fairy: "#D685AD"
  };

  return cores[tipo] || "#666";
}

function traduzirStat(nome) {
  const nomes = {
    hp: "HP",
    attack: "Ataque",
    defense: "Defesa",
    "special-attack": "Sp. Atk",
    "special-defense": "Sp. Def",
    speed: "Velocidade"
  };

  return nomes[nome] || nome;
}

function extrairIdDaUrl(url) {
  const partes = url.split("/").filter(Boolean);
  return Number(partes[partes.length - 1]);
}

/* =========================
   LOCAL STORAGE
========================= */

function obterFavoritos() {
  return JSON.parse(localStorage.getItem("favoritos")) || [];
}

function salvarFavoritos(favoritos) {
  localStorage.setItem("favoritos", JSON.stringify(favoritos));
}

function obterHistorico() {
  return JSON.parse(localStorage.getItem("historicoPokemon")) || [];
}

function salvarHistorico(historico) {
  localStorage.setItem("historicoPokemon", JSON.stringify(historico));
}

/* =========================
   ÁUDIO
========================= */

function tocarSom(dados) {
  if (!dados?.cries?.latest) return;

  if (audioAtual) {
    audioAtual.pause();
    audioAtual.currentTime = 0;
  }

  audioAtual = new Audio(dados.cries.latest);
  audioAtual.volume = 0.3;
  audioAtual.play().catch(() => {});
}

/* =========================
   FAVORITOS
========================= */

function pokemonJaEstaNosFavoritos(id) {
  const favoritos = obterFavoritos();
  return favoritos.some(pokemon => pokemon.id === id);
}

function adicionarFavorito() {
  if (!dadosAtuais) return;

  const favoritos = obterFavoritos();

  if (pokemonJaEstaNosFavoritos(dadosAtuais.id)) {
    alert("Esse Pokémon já está nos favoritos.");
    return;
  }

  favoritos.push({
    id: dadosAtuais.id,
    nome: capitalizarComHifen(dadosAtuais.name),
    imagem: dadosAtuais.sprites.front_default,
    tipos: dadosAtuais.types.map(tipo => tipo.type.name)
  });

  salvarFavoritos(favoritos);
  renderizarFavoritos();
}

function removerFavorito(id) {
  const favoritos = obterFavoritos().filter(pokemon => pokemon.id !== id);
  salvarFavoritos(favoritos);
  renderizarFavoritos();
}

function renderizarFavoritos() {
  const favoritos = obterFavoritos();

  if (favoritos.length === 0) {
    favoritosLista.innerHTML = `<p class="empty-message">Nenhum favorito salvo.</p>`;
    return;
  }

  favoritosLista.innerHTML = favoritos
    .map(pokemon => {
      const tipoPrincipal = pokemon.tipos?.[0] || "normal";

      return `
        <div class="favorito-item">
          <div class="favorito-left">
            <img class="mini-sprite" src="${pokemon.imagem}" alt="${pokemon.nome}">
            <div
              class="item-click"
              onclick="buscarPokemon(${pokemon.id})"
              title="${pokemon.nome}"
            >
              #${formatarNumero(pokemon.id)} - ${pokemon.nome}
            </div>
            <span class="badge tipo-${tipoPrincipal}">
              ${capitalizar(tipoPrincipal)}
            </span>
          </div>

          <button class="remover-btn" onclick="removerFavorito(${pokemon.id})">
            X
          </button>
        </div>
      `;
    })
    .join("");
}

/* =========================
   HISTÓRICO
========================= */

function adicionarAoHistorico(dados) {
  const historicoAtual = obterHistorico();

  const novoHistorico = historicoAtual.filter(item => item.id !== dados.id);

  novoHistorico.unshift({
    id: dados.id,
    nome: capitalizarComHifen(dados.name),
    imagem: dados.sprites.front_default
  });

  const limitado = novoHistorico.slice(0, 8);

  salvarHistorico(limitado);
  renderizarHistorico();
}

function renderizarHistorico() {
  const historico = obterHistorico();

  if (historico.length === 0) {
    historicoLista.innerHTML = `<p class="empty-message">Nenhuma busca ainda.</p>`;
    return;
  }

  historicoLista.innerHTML = historico
    .map(item => {
      return `
        <div class="historico-item">
          <div class="historico-left">
            <img class="mini-sprite" src="${item.imagem}" alt="${item.nome}">
            <div
              class="item-click"
              onclick="buscarPokemon(${item.id})"
              title="${item.nome}"
            >
              #${formatarNumero(item.id)} - ${item.nome}
            </div>
          </div>
        </div>
      `;
    })
    .join("");
}

/* =========================
   SUGESTÕES / AUTOCOMPLETE
========================= */

async function carregarListaNomesPokemon() {
  try {
    const resposta = await fetch("https://pokeapi.co/api/v2/pokemon?limit=1025");
    const dados = await resposta.json();
    listaNomesPokemon = dados.results.map(item => item.name);
  } catch {
    listaNomesPokemon = [];
  }
}

function renderizarSugestoes(valorDigitado) {
  const termo = valorDigitado.toLowerCase().trim();

  if (!termo || listaNomesPokemon.length === 0) {
    sugestoes.innerHTML = "";
    return;
  }

  const encontrados = listaNomesPokemon
    .filter(nome => nome.includes(termo))
    .slice(0, 6);

  if (encontrados.length === 0) {
    sugestoes.innerHTML = "";
    return;
  }

  sugestoes.innerHTML = encontrados
    .map(nome => {
      return `
        <div class="sugestao-item" onclick="selecionarSugestao('${nome}')">
          ${capitalizarComHifen(nome)}
        </div>
      `;
    })
    .join("");
}

function selecionarSugestao(nome) {
  input.value = nome;
  sugestoes.innerHTML = "";
  buscarPokemon(nome);
}

/* =========================
   EVOLUÇÕES
========================= */

function extrairTodasEvolucoes(chain) {
  const resultado = [];

  function percorrer(no) {
    if (!no) return;

    resultado.push({
      nome: no.species.name,
      id: extrairIdDaUrl(no.species.url)
    });

    if (no.evolves_to && no.evolves_to.length > 0) {
      no.evolves_to.forEach(proximaEvolucao => {
        percorrer(proximaEvolucao);
      });
    }
  }

  percorrer(chain);

  const unicos = [];
  const idsJaVistos = new Set();

  for (const item of resultado) {
    if (!idsJaVistos.has(item.id)) {
      idsJaVistos.add(item.id);
      unicos.push(item);
    }
  }

  return unicos;
}

async function buscarEvolucoes(nomeOuId) {
  try {
    const respostaPokemon = await fetch(`https://pokeapi.co/api/v2/pokemon/${nomeOuId}`);
    if (!respostaPokemon.ok) return [];

    const dadosPokemon = await respostaPokemon.json();

    const respostaSpecies = await fetch(dadosPokemon.species.url);
    if (!respostaSpecies.ok) return [];

    const dadosSpecies = await respostaSpecies.json();

    const respostaEvolution = await fetch(dadosSpecies.evolution_chain.url);
    if (!respostaEvolution.ok) return [];

    const dadosEvolution = await respostaEvolution.json();

    return extrairTodasEvolucoes(dadosEvolution.chain);
  } catch {
    return [];
  }
}

async function renderizarEvolucoes(nomeOuId) {
  const evolucoesArea = document.querySelector("#evolucoesArea");
  if (!evolucoesArea) return;

  evolucoesArea.innerHTML = `
    <h3>Evoluções</h3>
    <p>Carregando evoluções...</p>
  `;

  const evolucoes = await buscarEvolucoes(nomeOuId);

  if (evolucoes.length === 0) {
    evolucoesArea.innerHTML = `
      <h3>Evoluções</h3>
      <p>Não foi possível carregar as evoluções.</p>
    `;
    return;
  }

  evolucoesArea.innerHTML = `
    <h3>Evoluções</h3>
    <div class="evolucoes-lista">
      ${evolucoes.map(evolucao => {
        return `
          <span class="evolucao-item" onclick="buscarPokemon(${evolucao.id})">
            ${capitalizarComHifen(evolucao.nome)}
          </span>
        `;
      }).join("")}
    </div>
  `;
}

/* =========================
   SPRITES
========================= */

function trocarSprite(tipoSprite) {
  if (!dadosAtuais) return;

  const img = document.querySelector("#spritePokemon");
  if (!img) return;

  const sprites = {
    normal: dadosAtuais.sprites.front_default,
    shiny: dadosAtuais.sprites.front_shiny || dadosAtuais.sprites.front_default,
    back: dadosAtuais.sprites.back_default || dadosAtuais.sprites.front_default,
    backShiny: dadosAtuais.sprites.back_shiny || dadosAtuais.sprites.front_default
  };

  img.src = sprites[tipoSprite] || dadosAtuais.sprites.front_default;
}

/* =========================
   RENDER DO CARD
========================= */

async function criarCardPokemon(dados) {
  dadosAtuais = dados;

  const nome = capitalizarComHifen(dados.name);
  const tipos = dados.types.map(t => t.type.name);
  const tiposFormatados = tipos.map(tipo => capitalizar(tipo));
  const cor = corPorTipo(tipos[0]);

  const habilidades = dados.abilities
    .map(item => capitalizarComHifen(item.ability.name))
    .join(", ");

  const totalStats = dados.stats.reduce((acc, stat) => acc + stat.base_stat, 0);

  const stats = dados.stats
    .map(stat => {
      const nomeStat = traduzirStat(stat.stat.name);
      const valor = stat.base_stat;
      const largura = Math.min((valor / 200) * 100, 100);

      return `
        <div class="stat">
          <div class="stat-top">
            <span>${nomeStat}</span>
            <span>${valor}</span>
          </div>
          <div class="stat-bar">
            <div class="stat-fill" style="width: ${largura}%"></div>
          </div>
        </div>
      `;
    })
    .join("");

  resultado.innerHTML = `
    <div class="pokemon-card" style="background: linear-gradient(135deg, ${cor}, #2b2b44);">
      <div class="pokemon-top">
        <div class="sprite-area">
          <div class="pokemon-id">#${formatarNumero(dados.id)}</div>
          <img id="spritePokemon" src="${dados.sprites.front_default}" alt="${nome}">

          <div class="sprite-actions">
            <button class="sprite-btn" type="button" onclick="trocarSprite('normal')">Normal</button>
            <button class="sprite-btn" type="button" onclick="trocarSprite('shiny')">Shiny</button>
            <button class="sprite-btn" type="button" onclick="trocarSprite('back')">Costas</button>
            <button class="sprite-btn" type="button" onclick="trocarSprite('backShiny')">Costas Shiny</button>
          </div>
        </div>

        <div>
          <h2>${nome}</h2>

          <div class="tipo-badges">
            ${tipos.map((tipo, index) => `
              <span class="badge tipo-${tipo}">
                ${tiposFormatados[index]}
              </span>
            `).join("")}
          </div>

          <div class="info">
            <p><strong>Altura:</strong> ${dados.height}</p>
            <p><strong>Peso:</strong> ${dados.weight}</p>
            <p><strong>Experiência base:</strong> ${dados.base_experience ?? "N/A"}</p>
          </div>

          <div class="habilidades-box">
            <h3>Habilidades</h3>
            <p>${habilidades}</p>
          </div>
        </div>
      </div>

      <div class="stats">
        <h3>Stats</h3>
        <div class="stats-grid">
          ${stats}
        </div>
        <div class="total-stats">Total base stats: ${totalStats}</div>
      </div>

      <div id="evolucoesArea" class="evolucoes-box">
        <h3>Evoluções</h3>
        <p>Carregando evoluções...</p>
      </div>

      <div class="actions">
        <button id="favoritarBtn" type="button">❤️ Favoritar</button>
        <button id="somBtn" type="button">🔊 Tocar som</button>
      </div>
    </div>
  `;

  document.querySelector("#favoritarBtn").addEventListener("click", adicionarFavorito);
  document.querySelector("#somBtn").addEventListener("click", () => tocarSom(dados));

  await renderizarEvolucoes(dados.id);
}

/* =========================
   BUSCA PRINCIPAL
========================= */

async function buscarPokemon(valor) {
  const nomeOuId = String(valor).toLowerCase().trim();

  if (!nomeOuId) {
    resultado.innerHTML = `<div class="erro">Digite o nome ou id de um Pokémon.</div>`;
    return;
  }

  try {
    sugestoes.innerHTML = "";
    resultado.innerHTML = `<div class="loading">🔄 Buscando Pokémon...</div>`;

    let resposta = await fetch(`https://pokeapi.co/api/v2/pokemon/${nomeOuId}`);

    if (!resposta.ok && isNaN(Number(nomeOuId))) {
      const encontradoParcial = listaNomesPokemon.find(nome => nome.includes(nomeOuId));

      if (encontradoParcial) {
        resposta = await fetch(`https://pokeapi.co/api/v2/pokemon/${encontradoParcial}`);
      }
    }

    if (!resposta.ok) {
      throw new Error("Pokémon não encontrado.");
    }

    const dados = await resposta.json();

    pokemonAtual = dados.id;
    input.value = dados.name;

    await criarCardPokemon(dados);
    adicionarAoHistorico(dados);
    tocarSom(dados);
  } catch (erro) {
    resultado.innerHTML = `<div class="erro">${erro.message}</div>`;
  }
}

/* =========================
   NAVEGAÇÃO
========================= */

function buscarAleatorio() {
  const numero = Math.floor(Math.random() * 1025) + 1;
  buscarPokemon(numero);
}

function proximoPokemon() {
  buscarPokemon(pokemonAtual + 1);
}

function pokemonAnterior() {
  if (pokemonAtual > 1) {
    buscarPokemon(pokemonAtual - 1);
  }
}

/* =========================
   EVENTOS
========================= */

buscarBtn.addEventListener("click", () => {
  buscarPokemon(input.value);
});

randomBtn.addEventListener("click", buscarAleatorio);
prevBtn.addEventListener("click", pokemonAnterior);
nextBtn.addEventListener("click", proximoPokemon);

input.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    buscarPokemon(input.value);
  }
});

input.addEventListener("input", () => {
  renderizarSugestoes(input.value);
});

/* =========================
   INICIALIZAÇÃO
========================= */

async function iniciarApp() {
  renderizarFavoritos();
  renderizarHistorico();
  await carregarListaNomesPokemon();
  buscarPokemon(1);
}

iniciarApp();