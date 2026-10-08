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
  const [liveToday, scheduledToday, finishedYesterday] = await Promise.all([
    getMatches({ date: today, statusIn: "live" }),
    getMatches({ date: today, statusIn: "scheduled" }),
    getMatches({ date: yesterday, statusIn: "finished" })
  ]);
  return NextResponse.json({
    updatedAt: new Date().toISOString(), today, yesterday,
    configured: liveToday.configured,
    live: liveToday.matches, scheduled: scheduledToday.matches,
    yesterdayResults: finishedYesterday.matches
  }, { headers: { "Cache-Control": "no-store" } });
}
