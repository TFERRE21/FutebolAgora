import { NextResponse } from "next/server";
import { getSportsSnapshot, isDatabaseConfigured } from "../../../../lib/database";
import { getMatches } from "../../../../lib/sports-api";

const map = {
  futebol: "futebol", brasileirao: "brasileirao", libertadores: "libertadores",
  feminino: "feminino", volei: "volei", basquete: "basquete", futsal: "futsal", esports: "esports"
};

export const dynamic = "force-dynamic";

const fallbackCache = new Map();
const inflight = new Map();
let databaseUnavailableUntil = 0;

export async function GET(request) {
  const section = map[new URL(request.url).searchParams.get("section") || "futebol"] || "futebol";
  try {
    if (isDatabaseConfigured() && Date.now() >= databaseUnavailableUntil) {
      try {
        const data = await getSportsSnapshot(section, 26 * 60 * 60 * 1000);
        if (data) {
          return NextResponse.json({ configured: true, section, data, source: "database" }, {
            headers: { "Cache-Control": "public, max-age=30, s-maxage=30" }
          });
        }
      } catch (dbError) {
        databaseUnavailableUntil = Date.now() + 30_000;
      }
    }

    const cached = fallbackCache.get(section);
    if (cached && Date.now() - cached.at < 30 * 1000) {
      return NextResponse.json(cached.response, {
        headers: { "Cache-Control": "public, max-age=30, s-maxage=30" }
      });
    }

    if (inflight.has(section)) {
      const shared = await inflight.get(section);
      return NextResponse.json(shared, {
        headers: { "Cache-Control": "public, max-age=30, s-maxage=30" }
      });
    }

    const loadFallback = (async () => {
    // Fallback rápido: se o snapshot diário ainda não existir, entrega os jogos atuais
    // diretamente da SportsAPI. O banco continua sendo a fonte principal quando preenchido.
    const sport = section === "volei" ? "volleyball"
      : section === "basquete" ? "basketball"
      : section === "futsal" ? "futsal"
      : section === "esports" ? "esports"
      : "football";

    const now = new Date();
    const date = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric", month: "2-digit", day: "2-digit"
    }).format(now);
    const yesterdayDate = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric", month: "2-digit", day: "2-digit"
    }).format(new Date(now.getTime() - 86400000));

    const [todayResult, yesterdayResult] = await Promise.all([
      getMatches({ sport, date, statusIn: "live,scheduled", maxAgeMs: 60000 }),
      getMatches({ sport, date: yesterdayDate, status: "finished", maxAgeMs: 10 * 60000 })
    ]);

    const todayMatches = todayResult.matches || [];
    const data = {
      updatedAt: new Date().toISOString(),
      today: date,
      yesterday: yesterdayDate,
      live: todayMatches.filter((g) => g.status === "live"),
      scheduled: todayMatches.filter((g) => g.status === "scheduled"),
      yesterdayResults: yesterdayResult.matches || []
    };

    const response = {
      configured: Boolean(process.env.SPORTS_API_KEY),
      section,
      data,
      source: "sports-api-fallback",
      errors: [...(todayResult.errors || []), ...(yesterdayResult.errors || [])]
    };
    fallbackCache.set(section, { at: Date.now(), response });
    return response;
    })();

    inflight.set(section, loadFallback);
    try {
      const response = await loadFallback;
      return NextResponse.json(response, {
        headers: { "Cache-Control": "public, max-age=30, s-maxage=30" }
      });
    } finally {
      inflight.delete(section);
    }
  } catch (error) {
    return NextResponse.json({
      configured: Boolean(process.env.SPORTS_API_KEY),
      section, data: null, source: "error",
      error: error?.message || "Falha ao carregar dados esportivos."
    }, { status: 200 });
  }
}
