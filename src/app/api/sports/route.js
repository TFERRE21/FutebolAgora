import { NextResponse } from "next/server";
import { getMatches } from "../../../lib/sports-api";

function dateBR(days = 0) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit"
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
      configured: false, today, yesterday, live: [], scheduled: [], yesterdayResults: []
    }, { headers: { "Cache-Control": "no-store" } });
  }

  const [liveToday, scheduledToday, finishedYesterday] = await Promise.all([
    getMatches({ date: today, status: "live" }),
    getMatches({ date: today, status: "scheduled" }),
    getMatches({ date: yesterday, status: "finished" })
  ]);

  return NextResponse.json({
    updatedAt: new Date().toISOString(),
    today, yesterday,
    configured: true,
    sports: liveToday.sports,
    live: liveToday.matches,
    scheduled: scheduledToday.matches,
    yesterdayResults: finishedYesterday.matches
  }, { headers: { "Cache-Control": "no-store" } });
}
