import { NextResponse } from "next/server";
import { ensureDatabase, isDatabaseConfigured, saveNewsArticles, saveSportsSnapshot, query } from "../../../../lib/database";
import { generateSportsNews, isOpenAIConfigured } from "../../../../lib/openai";
import { getFilteredMatches } from "../../../../lib/sports-api";

export const dynamic = "force-dynamic";

function dateBR(offset = 0) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit"
  }).format(new Date(Date.now() + offset * 86400000));
}

const sections = [
  { key: "futebol", sport: "football" },
  { key: "brasileirao", sport: "football", competition: "Serie A", region: "Brasil" },
  { key: "libertadores", sport: "football", competition: "Libertadores" },
  { key: "feminino", sport: "football", competition: "Feminino", region: "Brasil" },
  { key: "volei", sport: "volleyball" },
  { key: "basquete", sport: "basketball" },
  { key: "futsal", sport: "futsal" },
  { key: "esports", sport: "esports" }
];

async function fetchSnapshot(section) {
  const today = dateBR(0);
  const yesterday = dateBR(-1);
  const futureDates = [today, dateBR(1), dateBR(2)];
  const [future, yesterdayData] = await Promise.all([
    Promise.all(futureDates.map((date) => getFilteredMatches({
      sport: section.sport, date, statusIn: "live,scheduled,finished",
      competition: section.competition, region: section.region, maxAgeMs: 0
    }))),
    getFilteredMatches({
      sport: section.sport, date: yesterday, status: "finished",
      competition: section.competition, region: section.region, maxAgeMs: 0
    })
  ]);
  const matches = future.flatMap((x) => x.matches || []);
  const unique = new Map();
  for (const game of matches) {
    const key = String(game.id || [game.startTime, game.homeTeam?.name, game.awayTeam?.name].join("|"));
    unique.set(key, game);
  }
  const all = [...unique.values()];
  return {
    configured: true,
    updatedAt: new Date().toISOString(),
    today,
    yesterday,
    live: all.filter((g) => g.status === "live"),
    scheduled: all.filter((g) => g.status === "scheduled"),
    yesterdayResults: yesterdayData.matches || [],
    errors: [...future.flatMap((x) => x.errors || []), ...(yesterdayData.errors || [])]
  };
}

async function findImage(query) {
  if (!query) return "";
  try {
    const params = new URLSearchParams({
      action: "query", generator: "search", gsrsearch: query,
      gsrnamespace: "6", gsrlimit: "8", prop: "imageinfo",
      iiprop: "url", iiurlwidth: "1400", format: "json", origin: "*"
    });
    const response = await fetch("https://commons.wikimedia.org/w/api.php?" + params.toString(), {
      headers: { Accept: "application/json", "User-Agent": "ArenaAgora/1.0" },
      cache: "no-store"
    });
    if (!response.ok) return "";
    const data = await response.json();
    const pages = Object.values(data?.query?.pages || {});
    const good = pages.find((p) => !/(logo|escudo|badge|emblem|kit|uniform|jersey|flag|mapa)/i.test(p?.title || "") && p?.imageinfo?.[0]?.thumburl);
    return good?.imageinfo?.[0]?.thumburl || "";
  } catch { return ""; }
}

export async function GET(request) {
  const auth = request.headers.get("authorization") || "";
  const secret = process.env.CRON_SECRET || "";
  if (!secret || auth !== "Bearer " + secret) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "DATABASE_URL não configurada." }, { status: 503 });
  if (!isOpenAIConfigured()) return NextResponse.json({ error: "OPENAI_API_KEY não configurada." }, { status: 503 });

  const runDate = dateBR(0);
  await ensureDatabase();
  await query(
    `INSERT INTO daily_runs(run_date,status,started_at) VALUES($1,'running',NOW())
     ON CONFLICT(run_date) DO UPDATE SET status='running',started_at=NOW(),finished_at=NULL,message=NULL`,
    [runDate]
  );

  try {
    const snapshots = {};
    for (const section of sections) {
      snapshots[section.key] = await fetchSnapshot(section);
      await saveSportsSnapshot(section.key, snapshots[section.key]);
    }

    const base = snapshots.futebol;
    const matches = [...(base.live || []), ...(base.scheduled || []), ...(base.yesterdayResults || [])].slice(0, 24);
    const news = await generateSportsNews({
      topic: "esportes do Brasil e principais competições",
      count: 10,
      context: {
        referenceDates: [runDate, dateBR(-1), dateBR(1)],
        matches: matches.map((m) => ({
          id: m.id, status: m.status, startTime: m.startTime,
          homeTeam: m.homeTeam, awayTeam: m.awayTeam,
          homeScore: m.homeScore, awayScore: m.awayScore,
          competition: m.league?.name || m.competition?.name || "",
          venue: m.venue?.name || ""
        }))
      },
      force: true
    });

    for (const article of news.articles || []) {
      const q = article.imageSearchQuery || article.teams?.map((t) => t.name).join(" ") || article.title;
      article.image = await findImage(q);
    }
    await saveNewsArticles(news.articles || []);

    await query(
      `UPDATE daily_runs SET status='success',finished_at=NOW(),message=$2 WHERE run_date=$1`,
      [runDate, `Atualizados ${Object.keys(snapshots).length} painéis e ${news.articles?.length || 0} notícias.`]
    );

    return NextResponse.json({
      ok: true, updatedAt: new Date().toISOString(),
      sections: Object.keys(snapshots),
      articles: news.articles?.length || 0
    });
  } catch (error) {
    await query(
      `UPDATE daily_runs SET status='error',finished_at=NOW(),message=$2 WHERE run_date=$1`,
      [runDate, error?.message || "Falha na atualização"]
    ).catch(() => {});
    return NextResponse.json({ ok: false, error: error?.message || "Falha na atualização diária." }, { status: 502 });
  }
}
