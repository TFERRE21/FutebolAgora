import OpenAI from "openai";

const client = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export function isOpenAIConfigured() {
  return Boolean(client);
}

async function generateSportsNewsLegacy({ topic = "futebol brasileiro", count = 6 } = {}) {
  if (!client) throw new Error("OPENAI_API_KEY não configurada.");

  const model = process.env.OPENAI_MODEL || "gpt-5.6";

  const response = await client.responses.create({
    model,
    tools: [{ type: "web_search" }],
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: [
              "Você é o editor-chefe do FutebolAgora.",
              "Pesquise na web notícias esportivas atuais e confiáveis.",
              "Não copie textos de terceiros. Use as fontes somente para verificar fatos e produza texto jornalístico original.",
              "Nunca invente placares, classificação, escalações, lesões, datas ou declarações.",
              "Para números esportivos, priorize dados estruturados do provedor esportivo quando forem fornecidos.",
              "Responda SOMENTE JSON válido, sem markdown.",
              "Cada notícia deve ter: title, summary, body, category, publishedAt, sources e imagePrompt.",
              "sources deve ser um array de objetos {title,url}.",
              "imagePrompt deve descrever uma imagem esportiva editorial original, sem logos protegidos, sem copiar fotografia de terceiros e sem pedir a reprodução de uma pessoa específica."
            ].join("\n")
          }
        ]
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `Tema: ${topic}. Gere ${Math.min(Math.max(Number(count) || 6, 1), 10)} notícias relevantes e recentes para o portal FutebolAgora. Dê prioridade ao futebol brasileiro, Brasileirão Série A, Libertadores e clubes brasileiros, mas use outros esportes quando houver fatos relevantes. Sempre informe as fontes utilizadas.`
          }
        ]
      }
    ]
  });

  const text = response.output_text || "";
  const clean = text.replace(/^\s*\`\`\`json\s*/i, "").replace(/\s*\`\`\`\s*$/i, "").trim();

  let parsed;
  try {
    parsed = JSON.parse(clean);
  } catch {
    throw new Error("OpenAI retornou conteúdo que não pôde ser convertido em JSON.");
  }

  return {
    model,
    generatedAt: new Date().toISOString(),
    articles: Array.isArray(parsed) ? parsed : (parsed.articles || [])
  };
}


const articleCache = new Map();
const ARTICLE_CACHE_MS = 20 * 60 * 1000;

function slugifyNews(value = "") {
  return String(value).normalize("NFD").replaceAll("\u0300","").toLowerCase()
    .replaceAll(" ","-").replace(/[^a-z0-9-]/g,"").replace(/-+/g,"-").slice(0,90) || "noticia-esportiva";
}

function normalizeNewsArticle(x = {}, index = 0) {
  return {
    slug: x.slug || slugifyNews(x.title) + (index ? "-" + index : ""),
    title: x.title || "Notícia esportiva",
    summary: x.summary || x.lead || "",
    body: x.body || "",
    category: x.category || "Esportes",
    publishedAt: x.publishedAt || new Date().toISOString(),
    updatedAt: x.updatedAt || new Date().toISOString(),
    competition: x.competition || "",
    round: x.round || "",
    venue: x.venue || "",
    match: x.match || null,
    teams: Array.isArray(x.teams) ? x.teams.slice(0,6) : [],
    players: Array.isArray(x.players) ? x.players.slice(0,10) : [],
    keyFacts: Array.isArray(x.keyFacts) ? x.keyFacts.slice(0,6) : [],
    stats: Array.isArray(x.stats) ? x.stats.slice(0,8) : [],
    tags: Array.isArray(x.tags) ? x.tags.slice(0,10) : [],
    sources: Array.isArray(x.sources) ? x.sources.slice(0,6) : [],
    imagePrompt: x.imagePrompt || "",
    imageSearchQuery: x.imageSearchQuery || ""
  };
}

export function getCachedArticleBySlug(slug) {
  const item = articleCache.get(slug);
  if (!item) return null;
  if (Date.now() - item.createdAt > ARTICLE_CACHE_MS) {
    articleCache.delete(slug);
    return null;
  }
  return item.article;
}

export async function generateSportsNews({ topic = "futebol brasileiro", count = 6, context = null, force = false } = {}) {
  if (!client) throw new Error("OPENAI_API_KEY não configurada.");
  const safeCount = Math.min(Math.max(Number(count) || 6, 1), 10);
  const key = topic + "|" + safeCount + "|" + JSON.stringify(context || {}).slice(0, 12000);
  const cached = articleCache.get("__batch__" + key);
  if (!force && cached && Date.now() - cached.createdAt < ARTICLE_CACHE_MS) return cached.result;

  const model = process.env.OPENAI_MODEL || "gpt-5.6";
  const response = await client.responses.create({
    model,
    tools: [{ type: "web_search" }],
    input: [
      { role: "system", content: [{ type: "input_text", text: [
        "Você é o editor-chefe do FutebolAgora.",
        "Pesquise fatos atuais e confiáveis. Escreva jornalismo original.",
        "Nunca invente placares, classificação, escalações, lesões, suspensões, datas, horários ou estatísticas.",
        "Use o contexto estruturado como fonte prioritária para dados de jogos.",
        "Enriqueça as matérias com times, jogadores, competição, rodada, estádio, tabela, forma recente e números confirmados.",
        "Responda somente JSON válido no formato {articles:[...]}.",
        "Campos: slug,title,summary,body,category,publishedAt,updatedAt,competition,round,venue,match,teams,players,keyFacts,stats,tags,sources,imagePrompt,imageSearchQuery.",
        "Não invente URLs de imagens. sources deve conter URLs reais consultadas."
      ].join("\n") }] },
      { role: "user", content: [{ type: "input_text", text:
        "Tema: " + topic + "\nQuantidade: " + safeCount +
        "\nContexto estruturado:\n" + JSON.stringify(context || { matches: [] }) +
        "\nPriorize fatos das últimas 24 horas e jogos de hoje/amanhã."
      }] }
    ]
  });

  const clean = (response.output_text || "").trim();
  let parsed;
  try { parsed = JSON.parse(clean); }
  catch { throw new Error("OpenAI retornou conteúdo que não pôde ser convertido em JSON."); }

  const raw = Array.isArray(parsed) ? parsed : (parsed.articles || []);
  const articles = raw.map(normalizeNewsArticle);
  articles.forEach(article => articleCache.set(article.slug, { createdAt: Date.now(), article }));
  const result = { model, generatedAt: new Date().toISOString(), articles };
  articleCache.set("__batch__" + key, { createdAt: Date.now(), result });
  return result;
}

export async function generateBrasileiraoClassification() {
  if (!client) throw new Error("OPENAI_API_KEY não configurada.");

  const model = process.env.OPENAI_MODEL || "gpt-5.6";
  const response = await client.responses.create({
    model,
    tools: [{ type: "web_search" }],
    input: [
      {
        role: "system",
        content: [{
          type: "input_text",
          text: [
            "Você é um verificador de dados esportivos do FutebolAgora.",
            "Pesquise na web a classificação ATUAL do Campeonato Brasileiro Série A de 2026.",
            "Priorize fontes confiáveis e atuais, especialmente CBF e grandes portais esportivos.",
            "Não invente nenhum número. Se as fontes divergirem, use a informação mais recente e confiável.",
            "Responda SOMENTE JSON válido, sem markdown.",
            "Retorne exatamente um objeto com a chave standings.",
            "standings deve ser um array de clubes com: position, teamName, played, won, drew, lost, goalsFor, goalsAgainst, goalDiff, points."
          ].join("\n")
        }]
      },
      {
        role: "user",
        content: [{
          type: "input_text",
          text: "Qual é a classificação atual completa do Brasileirão Série A 2026? Inclua todos os clubes e os números atuais."
        }]
      }
    ]
  });

  const clean = (response.output_text || "")
    .replace(/^\s*\`\`\`json\s*/i, "")
    .replace(/\s*\`\`\`\s*$/i, "")
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(clean);
  } catch {
    throw new Error("OpenAI não retornou a classificação em JSON válido.");
  }

  const standings = Array.isArray(parsed) ? parsed : parsed.standings;
  if (!Array.isArray(standings) || standings.length < 10) {
    throw new Error("A pesquisa não retornou uma classificação completa do Brasileirão.");
  }

  return {
    standings: standings.map((row, index) => ({
      position: Number(row.position) || index + 1,
      teamName: row.teamName || row.name || "Time",
      played: Number(row.played) || 0,
      won: Number(row.won) || 0,
      drew: Number(row.drew ?? row.drawn) || 0,
      lost: Number(row.lost) || 0,
      goalsFor: Number(row.goalsFor) || 0,
      goalsAgainst: Number(row.goalsAgainst) || 0,
      goalDiff: Number(row.goalDiff) || 0,
      points: Number(row.points) || 0,
      source: "web"
    })),
    model,
    updatedAt: new Date().toISOString()
  };
}

export async function generateSportsImage({ prompt, size = "1536x1024" }) {
  if (!client) throw new Error("OPENAI_API_KEY não configurada.");

  const model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
  const result = await client.images.generate({
    model,
    prompt: [
      "Imagem editorial esportiva original para o portal FutebolAgora.",
      "Não reproduzir fotografia, composição ou identidade visual de uma matéria existente.",
      "Não inserir logos de clubes, emissoras ou marcas.",
      prompt
    ].join(" "),
    size
  });

  const image = result.data?.[0];
  if (!image?.b64_json) throw new Error("OpenAI não retornou a imagem em base64.");

  return {
    model,
    mimeType: "image/png",
    base64: image.b64_json
  };
}
