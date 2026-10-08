import { NextResponse } from "next/server";
import { generateSportsNews, isOpenAIConfigured } from "../../../../lib/openai";
import { getFilteredMatches, getMatchDetails } from "../../../../lib/sports-api";

const cache = new Map();
const CACHE_MS = 15 * 60 * 1000;

function dateBR(offset = 0) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit"
  }).format(new Date(Date.now() + offset * 86400000));
}

function compactMatch(m) {
  return {
    id: m.id || null, status: m.status || null, startTime: m.startTime || null,
    homeTeam: { id: m.homeTeam?.id || null, name: m.homeTeam?.name || "", logo: m.homeTeam?.logo ? "https://sportsapi.com.br" + m.homeTeam.logo : null },
    awayTeam: { id: m.awayTeam?.id || null, name: m.awayTeam?.name || "", logo: m.awayTeam?.logo ? "https://sportsapi.com.br" + m.awayTeam.logo : null },
    homeScore: m.homeScore ?? null, awayScore: m.awayScore ?? null,
    competition: m.league?.name || "", round: m.roundNum ? String(m.roundNum) : (m.roundName || ""),
    venue: m.venue?.name || ""
  };
}

export async function GET(request) {
  if (!isOpenAIConfigured()) {
    return NextResponse.json({ configured: false, articles: [], error: "OPENAI_API_KEY não configurada no servidor." }, { status: 503 });
  }

  const url = new URL(request.url);
  const topic = (url.searchParams.get("topic") || "futebol brasileiro").slice(0, 100);
  const count = Math.min(Math.max(Number(url.searchParams.get("count") || 8), 1), 10);
  const force = url.searchParams.get("force") === "1";
  const key = topic + "|" + count;

  if (!force) {
    const hit = cache.get(key);
    if (hit && Date.now() - hit.createdAt < CACHE_MS) return NextResponse.json(hit.result);
  }

  try {
    const today = dateBR(0);
    const yesterday = dateBR(-1);
    const q = topic === "futebol brasileiro" ? "" : topic;

    const [td, yd, fd] = await Promise.all([
      getFilteredMatches({ date: today, sport: "football", statusIn: "live,scheduled,finished", region: "Brasil", maxAgeMs: 5 * 60 * 1000 }),
      getFilteredMatches({ date: yesterday, sport: "football", statusIn: "finished", region: "Brasil", maxAgeMs: 15 * 60 * 1000 }),
      q ? getFilteredMatches({ sport: "football", q, statusIn: "live,scheduled,finished", maxAgeMs: 10 * 60 * 1000 }) : Promise.resolve({ matches: [] })
    ]);

    const matches = [...(td.matches || []), ...(yd.matches || []), ...(fd.matches || [])]
      .filter(Boolean)
      .sort((a, b) => Number(b.startTime || 0) - Number(a.startTime || 0))
      .slice(0, 18);

    let detail = null;
    const relevant = (fd.matches || [])[0] || matches[0];
    if (relevant?.id) {
      const d = await getMatchDetails(relevant.id, "football");
      if (d?.ok) detail = {
        events: d.data?.events || [],
        lineups: d.data?.lineups || null,
        playerStats: d.data?.playerStats || [],
        standings: d.data?.standings || [],
        form: d.data?.form || [],
        headToHead: d.data?.headToHead || null
      };
    }

    const result = await generateSportsNews({
      topic, count,
      context: { referenceDates: [today, yesterday], matches: matches.map(compactMatch), detail },
      force
    });

    const payload = { configured: true, contextUpdatedAt: new Date().toISOString(), ...result };
    cache.set(key, { createdAt: Date.now(), result: payload });
    return NextResponse.json(payload, { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } });
  } catch (error) {
    return NextResponse.json({ configured: true, articles: [], error: error?.message || "Falha ao gerar notícias com OpenAI." }, { status: 502 });
  }
}
