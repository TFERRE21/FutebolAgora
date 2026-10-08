import { NextResponse } from "next/server";
import { getAvailableSports, getMatches } from "../../../lib/sports-api";

let responseCache = { expiresAt: 0, payload: null };

const PRIORITY_SPORTS = ["football", "basketball", "tennis", "ice-hockey", "baseball"];
const SPORT_CACHE_MS = 5 * 60 * 1000;

function dateBR(days = 0) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const y = Number(parts.find((p) => p.type === "year").value);
  const m = Number(parts.find((p) => p.type === "month").value);
  const d = Number(parts.find((p) => p.type === "day").value);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export async function GET() {
  const now = Date.now();
  if (responseCache.payload && now < responseCache.expiresAt) {
    return NextResponse.json(responseCache.payload, {
      headers: { "Cache-Control": "no-store", "X-Sports-Cache": "HIT" }
    });
  }

  const today = dateBR(0);
  const yesterday = dateBR(-1);

  if (!process.env.SPORTS_API_KEY) {
    return NextResponse.json({
      configured: false, today, yesterday, live: [], scheduled: [], yesterdayResults: [],
      errors: [{ error: "SPORTS_API_KEY não está disponível no runtime do servidor." }]
    }, { headers: { "Cache-Control": "no-store" } });
  }

  try {
    // Descobre as modalidades do plano sem fazer uma chamada /games extra.
    const available = await getAvailableSports();
    const allSports = available.sports || [];
    const selected = PRIORITY_SPORTS
      .map((slug) => allSports.find((item) => (item.slug || item.sport || item) === slug))
      .filter(Boolean);

    // Se o plano devolver alguma modalidade diferente das prioritárias,
    // ela também entra depois, mas limitamos o lote para proteger a API.
    const sportsToQuery = selected.length
      ? selected
      : [{ slug: "football", sport: "football", label: "Futebol" }];

    // Uma consulta por esporte para os jogos de hoje.
    // Cacheia futebol por 60s e os demais por 5 minutos.
    const todayResults = await Promise.all(
      sportsToQuery.map((item) => {
        const sport = item.slug || item.sport || item;
        return getMatches({
          sport,
          date: today,
          statusIn: "live,scheduled",
          maxAgeMs: sport === "football" ? 60 * 1000 : SPORT_CACHE_MS
        });
      })
    );

    // Resultados de ontem: somente futebol na página principal.
    const yesterdayFootball = await getMatches({
      sport: "football",
      date: yesterday,
      status: "finished",
      maxAgeMs: 10 * 60 * 1000
    });

    const allToday = todayResults.flatMap((r) => r.matches);
    const live = allToday.filter((game) => game.status === "live");
    const scheduled = allToday.filter((game) => game.status === "scheduled");

    const errors = [
      ...available.errors,
      ...todayResults.flatMap((r) => r.errors || []),
      ...yesterdayFootball.errors
    ];

    const payload = {
      updatedAt: new Date().toISOString(),
      today,
      yesterday,
      configured: true,
      sports: allSports,
      live,
      scheduled,
      yesterdayResults: yesterdayFootball.matches,
      errors
    };

    responseCache = { payload, expiresAt: now + 60 * 1000 };

    return NextResponse.json(payload, {
      headers: { "Cache-Control": "no-store", "X-Sports-Cache": "MISS" }
    });
  } catch (error) {
    return NextResponse.json({
      configured: true, today, yesterday, live: [], scheduled: [], yesterdayResults: [],
      errors: [{ error: error?.message || "Erro interno ao consultar SportsAPI" }]
    }, { status: 200, headers: { "Cache-Control": "no-store" } });
  }
}
