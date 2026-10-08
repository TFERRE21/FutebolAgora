import { NextResponse } from "next/server";
import { getMatchDetails } from "../../../lib/sports-api";

function pickTeam(game, side) {
  return side === "home" ? (game?.homeTeam || game?.home || {}) : (game?.awayTeam || game?.away || {});
}

function numeric(...values) {
  for (const value of values) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function summarizeForm(form) {
  if (!Array.isArray(form)) return { games: 0, wins: 0, draws: 0, losses: 0, goals: 0, conceded: 0 };
  const out = { games: form.length, wins: 0, draws: 0, losses: 0, goals: 0, conceded: 0 };
  for (const item of form.slice(0, 5)) {
    const result = String(item?.result || item?.outcome || item?.status || "").toLowerCase();
    if (/win|won|vitoria|vit/.test(result)) out.wins++;
    else if (/draw|drew|empate/.test(result)) out.draws++;
    else if (/loss|lost|derrota|defeat/.test(result)) out.losses++;
    const gf = numeric(item?.goalsFor, item?.scored, item?.teamScore, item?.goals?.for);
    const ga = numeric(item?.goalsAgainst, item?.conceded, item?.opponentScore, item?.goals?.against);
    if (gf != null) out.goals += gf;
    if (ga != null) out.conceded += ga;
  }
  return out;
}

function normalizeStats(data, game) {
  const home = pickTeam(game, "home");
  const away = pickTeam(game, "away");
  const form = Array.isArray(data?.form) ? data.form : [];
  const h2h = Array.isArray(data?.headToHead) ? data.headToHead : [];
  const standings = Array.isArray(data?.standings) ? data.standings : [];
  const homeForm = form.find((item) => String(item?.teamId || item?.team?.id) === String(home?.id || home?.teamId));
  const awayForm = form.find((item) => String(item?.teamId || item?.team?.id) === String(away?.id || away?.teamId));
  return {
    home: {
      name: home?.name || "Mandante",
      form: summarizeForm(homeForm?.matches || homeForm?.games || homeForm?.form || (Array.isArray(homeForm) ? homeForm : [])),
      table: standings.find((row) => String(row?.teamId || row?.id) === String(home?.id))
    },
    away: {
      name: away?.name || "Visitante",
      form: summarizeForm(awayForm?.matches || awayForm?.games || awayForm?.form || (Array.isArray(awayForm) ? awayForm : [])),
      table: standings.find((row) => String(row?.teamId || row?.id) === String(away?.id))
    },
    h2h: h2h.slice(0, 5),
    stats: data?.stats || data?.statistics || null,
    available: Boolean(form.length || h2h.length || standings.length || data?.stats || data?.statistics)
  };
}

export async function GET(request) {
  const sport = new URL(request.url).searchParams.get("sport") || "football";
  const ids = [...new Set((new URL(request.url).searchParams.get("ids") || "").split(",").map((id) => id.trim()).filter(Boolean))].slice(0, 4);
  if (!ids.length) return NextResponse.json({ matches: [] });
  const matches = [];
  for (const id of ids) {
    const result = await getMatchDetails(id, sport, 30 * 60 * 1000);
    if (!result?.ok) continue;
    const game = result.data?.game || result.data?.match || result.data;
    matches.push({ id, game, stats: normalizeStats(result.data || {}, game) });
  }
  return NextResponse.json({ matches, updatedAt: new Date().toISOString() }, { headers: { "Cache-Control": "public, max-age=300, s-maxage=300" } });
}
