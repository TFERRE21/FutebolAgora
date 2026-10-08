import { NextResponse } from "next/server";
import { getMatches } from "../../../lib/sports-api";

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
    // Para jogos ao vivo, não prendemos a consulta a uma data:
    // a própria API trabalha com status=live e isso evita diferença de fuso UTC.
    const [liveNow, scheduledToday, finishedYesterday] = await Promise.all([
      getMatches({ status: "live" }),
      getMatches({ date: today, status: "scheduled" }),
      getMatches({ date: yesterday, status: "finished" })
    ]);

    const errors = [
      ...liveNow.errors,
      ...scheduledToday.errors,
      ...finishedYesterday.errors
    ];

    return NextResponse.json({
      updatedAt: new Date().toISOString(),
      today,
      yesterday,
      configured: true,
      sports: liveNow.sports,
      live: liveNow.matches,
      scheduled: scheduledToday.matches,
      yesterdayResults: finishedYesterday.matches,
      errors
    }, {
      headers: { "Cache-Control": "no-store" }
    });
  } catch (error) {
    return NextResponse.json({
      configured: true,
      today,
      yesterday,
      live: [],
      scheduled: [],
      yesterdayResults: [],
      errors: [{
        error: error?.message || "Erro interno ao consultar SportsAPI"
      }]
    }, {
      status: 200,
      headers: { "Cache-Control": "no-store" }
    });
  }
}
