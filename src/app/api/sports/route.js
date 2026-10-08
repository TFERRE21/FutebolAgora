import { NextResponse } from "next/server";
import { getMatches } from "../../../lib/sports-api";

let responseCache = { expiresAt: 0, payload: null };

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
      headers: {
        "Cache-Control": "no-store",
        "X-Sports-Cache": "HIT"
      }
    });
  }

  const today = dateBR(0);
  const yesterday = dateBR(-1);

  if (!process.env.SPORTS_API_KEY) {
    return NextResponse.json({
      configured: false,
      today,
      yesterday,
      live: [],
      scheduled: [],
      yesterdayResults: [],
      errors: [{ error: "SPORTS_API_KEY não está disponível no runtime do servidor." }]
    }, { headers: { "Cache-Control": "no-store" } });
  }

  try {
    // Reduzimos drasticamente as chamadas:
    // 1) hoje: live + scheduled em uma única consulta por esporte
    // 2) ontem: finished em uma única consulta por esporte
    // /sports fica em cache por 1 hora e o resultado desta rota por 60s.
    const [todayData, yesterdayData] = await Promise.all([
      getMatches({ date: today, statusIn: "live,scheduled" }),
      getMatches({ date: yesterday, status: "finished" })
    ]);

    const live = todayData.matches.filter((game) => game.status === "live");
    const scheduled = todayData.matches.filter((game) => game.status === "scheduled");

    const payload = {
      updatedAt: new Date().toISOString(),
      today,
      yesterday,
      configured: true,
      sports: todayData.sports,
      live,
      scheduled,
      yesterdayResults: yesterdayData.matches,
      errors: [...todayData.errors, ...yesterdayData.errors]
    };

    responseCache = {
      payload,
      expiresAt: now + 60 * 1000
    };

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "no-store",
        "X-Sports-Cache": "MISS"
      }
    });
  } catch (error) {
    return NextResponse.json({
      configured: true,
      today,
      yesterday,
      live: [],
      scheduled: [],
      yesterdayResults: [],
      errors: [{ error: error?.message || "Erro interno ao consultar SportsAPI" }]
    }, {
      status: 200,
      headers: { "Cache-Control": "no-store" }
    });
  }
}
