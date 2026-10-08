import { NextResponse } from "next/server";
import { getSportsSnapshot, isDatabaseConfigured } from "../../../../lib/database";
import { getMatches } from "../../../../lib/sports-api";

const map = {
  futebol: "futebol", brasileirao: "brasileirao", libertadores: "libertadores",
  feminino: "feminino", volei: "volei", basquete: "basquete", futsal: "futsal", esports: "esports"
};

export const dynamic = "force-dynamic";

export async function GET(request) {
  const section = map[new URL(request.url).searchParams.get("section") || "futebol"] || "futebol";
  try {
    if (isDatabaseConfigured()) {
      const data = await getSportsSnapshot(section, 26 * 60 * 60 * 1000);
      if (data) {
        return NextResponse.json({ configured: true, section, data, source: "database" }, {
          headers: { "Cache-Control": "public, max-age=30, s-maxage=30" }
        });
      }
    }

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

    return NextResponse.json({
      configured: Boolean(process.env.SPORTS_API_KEY),
      section,
      data,
      source: "sports-api-fallback",
      errors: [...(todayResult.errors || []), ...(yesterdayResult.errors || [])]
    }, {
      headers: { "Cache-Control": "public, max-age=30, s-maxage=30" }
    });
  } catch (error) {
    return NextResponse.json({
      configured: Boolean(process.env.SPORTS_API_KEY),
      section, data: null, source: "error",
      error: error?.message || "Falha ao carregar dados esportivos."
    }, { status: 200 });
  }
}
