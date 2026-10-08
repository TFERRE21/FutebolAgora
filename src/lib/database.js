import pg from "pg";

const { Pool } = pg;

let pool;
let dbFailureUntil = 0;

function getPool() {
  if (!process.env.DATABASE_URL) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 1500
    });
  }
  return pool;
}

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

export async function query(text, params = []) {
  const p = getPool();
  if (!p) throw new Error("DATABASE_URL não configurada.");
  if (Date.now() < dbFailureUntil) throw new Error("Banco temporariamente indisponível; usando fonte esportiva de contingência.");
  try {
    const result = await p.query(text, params);
    dbFailureUntil = 0;
    return result;
  } catch (error) {
    dbFailureUntil = Date.now() + 30_000;
    throw error;
  }
}

export async function ensureDatabase() {
  await query(`
    CREATE TABLE IF NOT EXISTS sports_snapshots (
      cache_key TEXT PRIMARY KEY,
      payload JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS news_articles (
      slug TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      summary TEXT,
      body TEXT,
      category TEXT,
      published_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      competition TEXT,
      round TEXT,
      venue TEXT,
      match JSONB,
      teams JSONB,
      players JSONB,
      key_facts JSONB,
      stats JSONB,
      tags JSONB,
      sources JSONB,
      image_url TEXT,
      image_prompt TEXT,
      image_search_query TEXT
    );
    CREATE INDEX IF NOT EXISTS news_articles_published_idx ON news_articles(published_at DESC);
    CREATE TABLE IF NOT EXISTS daily_runs (
      run_date DATE PRIMARY KEY,
      status TEXT NOT NULL,
      started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      finished_at TIMESTAMPTZ,
      message TEXT
    );
  `);
}

export async function saveSportsSnapshot(cacheKey, payload) {
  await query(
    `INSERT INTO sports_snapshots(cache_key,payload,updated_at)
     VALUES($1,$2,NOW())
     ON CONFLICT(cache_key) DO UPDATE SET payload=EXCLUDED.payload,updated_at=NOW()`,
    [cacheKey, JSON.stringify(payload)]
  );
}

export async function getSportsSnapshot(cacheKey, maxAgeMs = 26 * 60 * 60 * 1000) {
  const result = await query(
    `SELECT payload, updated_at FROM sports_snapshots
     WHERE cache_key=$1 AND updated_at > NOW() - ($2 * INTERVAL '1 millisecond')`,
    [cacheKey, maxAgeMs]
  );
  if (!result.rows[0]) return null;
  return result.rows[0].payload;
}

export async function saveNewsArticles(articles = []) {
  for (const article of articles) {
    await query(
      `INSERT INTO news_articles
       (slug,title,summary,body,category,published_at,updated_at,competition,round,venue,match,teams,players,key_facts,stats,tags,sources,image_url,image_prompt,image_search_query)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
       ON CONFLICT(slug) DO UPDATE SET
       title=EXCLUDED.title,summary=EXCLUDED.summary,body=EXCLUDED.body,category=EXCLUDED.category,
       published_at=EXCLUDED.published_at,updated_at=NOW(),competition=EXCLUDED.competition,round=EXCLUDED.round,
       venue=EXCLUDED.venue,match=EXCLUDED.match,teams=EXCLUDED.teams,players=EXCLUDED.players,
       key_facts=EXCLUDED.key_facts,stats=EXCLUDED.stats,tags=EXCLUDED.tags,sources=EXCLUDED.sources,
       image_url=COALESCE(EXCLUDED.image_url,news_articles.image_url),image_prompt=EXCLUDED.image_prompt,
       image_search_query=EXCLUDED.image_search_query`,
      [
        article.slug, article.title, article.summary, article.body, article.category,
        article.publishedAt || null, article.updatedAt || null, article.competition, article.round,
        article.venue, JSON.stringify(article.match || null), JSON.stringify(article.teams || []),
        JSON.stringify(article.players || []), JSON.stringify(article.keyFacts || []),
        JSON.stringify(article.stats || []), JSON.stringify(article.tags || []),
        JSON.stringify(article.sources || []), article.image || null, article.imagePrompt || "",
        article.imageSearchQuery || ""
      ]
    );
  }
}

export async function getNewsArticles(limit = 12) {
  const result = await query(
    `SELECT slug,title,summary,body,category,published_at AS "publishedAt",updated_at AS "updatedAt",
      competition,round,venue,match,teams,players,key_facts AS "keyFacts",stats,tags,sources,
      image_url AS image,"imagePrompt",image_search_query AS "imageSearchQuery"
     FROM news_articles ORDER BY published_at DESC NULLS LAST LIMIT $1`,
    [limit]
  );
  return result.rows;
}
