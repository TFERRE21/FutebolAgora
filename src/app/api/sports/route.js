import { NextResponse } from "next/server";
import { getAvailableSports, getMatches, getFilteredMatches, getMatchDetails } from "../../../lib/sports-api";

let responseCache = { expiresAt: 0, payload: null, scope: "" };

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

async function getBrasileiraoMatches(competition, region, status, date, maxAgeMs) {
  const first = await getFilteredMatches({ sport: "football", date, status, competition, region, maxAgeMs });

  if (!first.matches.length && competition === "Serie A") {
    return getFilteredMatches({
      sport: "football",
      date,
      status,
      competition: "Brasileirao",
      region,
      maxAgeMs
    });
  }

  return first;
}

async function buildBrasileiraoClassification(competition, region) {
  const first = await getFilteredMatches({
    sport: "football",
    competition,
    region,
    hasStandings: true,
    maxAgeMs: 5 * 60 * 1000
  });

  const errors = [...(first.errors || [])];
  let matches = first.matches || [];

  if (!matches.length && competition === "Serie A") {
    const fallback = await getFilteredMatches({
      sport: "football",
      competition: "Brasileirao",
      region,
      hasStandings: true,
      maxAgeMs: 5 * 60 * 1000
    });
    matches = fallback.matches || [];
    errors.push(...(fallback.errors || []));
  }

  for (const match of matches) {
    const standings = Array.isArray(match?.standings) ? match.standings : [];
    const rows = standings.flatMap((group) => Array.isArray(group?.rows) ? group.rows : []);
    if (rows.length) {
      return {
        standings: rows,
        groupName: standings[0]?.groupName || "Série A",
        errors
      };
    }
  }

  return { standings: [], groupName: "Série A", errors };
}

export async function GET(request) {
  const now = Date.now();
  const url = new URL(request.url);
  const sportFilter = url.searchParams.get("sport") || "";
  const competition = url.searchParams.get("competition") || "";
  const region = url.searchParams.get("region") || "";
  const team = url.searchParams.get("team") || "";
  const view = url.searchParams.get("view") || "overview";
  const cacheScope = [sportFilter, competition, region, team, view].join("|");

  if (responseCache.payload && responseCache.scope === cacheScope && now < responseCache.expiresAt) {
    return NextResponse.json(responseCache.payload, {
      headers: { "Cache-Control": "no-store", "X-Sports-Cache": "HIT" }
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
      brasileiraoResults: [],
      standings: [],
      errors: [{ error: "SPORTS_API_KEY não está disponível no runtime do servidor." }]
    });
  }

  try {
    if (competition || region || team) {
      const sport = sportFilter || "football";

      if (sport === "football" && competition && region.toLowerCase().includes("brasil")) {
        const [todayData, yesterdayData] = await Promise.all([
          getBrasileiraoMatches(competition, region, null, today, 60 * 1000),
          getBrasileiraoMatches(competition, region, "finished", yesterday, 10 * 60 * 1000)
        ]);

        const allToday = todayData.matches || [];
        const errors = [...(todayData.errors || []), ...(yesterdayData.errors || [])];

        let standings = [];
        if (view === "classification") {
          const classification = await buildBrasileiraoClassification(competition, region);
          standings = classification.standings;
          errors.push(...classification.errors);
        }

        const payload = {
          updatedAt: new Date().toISOString(),
          today,
          yesterday,
          configured: true,
          sports: todayData.sports,
          live: allToday.filter((g) => g.status === "live"),
          scheduled: allToday.filter((g) => g.status === "scheduled"),
          yesterdayResults: yesterdayData.matches || [],
          brasileiraoResults: yesterdayData.matches || [],
          standings,
          view,
          errors
        };

        responseCache = {
          payload,
          scope: cacheScope,
          expiresAt: now + (view === "classification" ? 5 * 60 * 1000 : 60 * 1000)
        };

        return NextResponse.json(payload, {
          headers: { "Cache-Control": "no-store", "X-Sports-Cache": "MISS" }
        });
      }

      const [todayData, yesterdayData] = await Promise.all([
        getFilteredMatches({
          sport,
          date: today,
          statusIn: "live,scheduled",
          competition,
          region,
          team,
          maxAgeMs: sport === "football" ? 60 * 1000 : SPORT_CACHE_MS
        }),
        getFilteredMatches({
          sport,
          date: yesterday,
          status: "finished",
          competition,
          region,
          team,
          maxAgeMs: 10 * 60 * 1000
        })
      ]);

      const allToday = todayData.matches || [];
      const payload = {
        updatedAt: new Date().toISOString(),
        today,
        yesterday,
        configured: true,
        sports: todayData.sports,
        live: allToday.filter((g) => g.status === "live"),
        scheduled: allToday.filter((g) => g.status === "scheduled"),
        yesterdayResults: yesterdayData.matches || [],
        brasileiraoResults: [],
        standings: [],
        view,
        errors: [...(todayData.errors || []), ...(yesterdayData.errors || [])]
      };

      responseCache = { payload, scope: cacheScope, expiresAt: now + 60 * 1000 };
      return NextResponse.json(payload, {
        headers: { "Cache-Control": "no-store", "X-Sports-Cache": "MISS" }
      });
    }

    const available = await getAvailableSports();
    const allSports = available.sports || [];
    const selected = PRIORITY_SPORTS.map((slug) =>
      allSports.find((item) => (item.slug || item.sport || item) === slug)
    ).filter(Boolean);
    const sportsToQuery = selected.length
      ? selected
      : [{ slug: "football", sport: "football", label: "Futebol" }];

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

    const yesterdayFootball = await getMatches({
      sport: "football",
      date: yesterday,
      status: "finished",
      maxAgeMs: 10 * 60 * 1000
    });

    const allToday = todayResults.flatMap((r) => r.matches);
    const payload = {
      updatedAt: new Date().toISOString(),
      today,
      yesterday,
      configured: true,
      sports: allSports,
      live: allToday.filter((g) => g.status === "live"),
      scheduled: allToday.filter((g) => g.status === "scheduled"),
      yesterdayResults: yesterdayFootball.matches,
      brasileiraoResults: [],
      standings: [],
      view,
      errors: [
        ...available.errors,
        ...todayResults.flatMap((r) => r.errors || []),
        ...yesterdayFootball.errors
      ]
    };

    responseCache = { payload, scope: cacheScope, expiresAt: now + 60 * 1000 };
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "no-store", "X-Sports-Cache": "MISS" }
    });
  } catch (error) {
    return NextResponse.json({
      configured: true,
      today,
      yesterday,
      live: [],
      scheduled: [],
      yesterdayResults: [],
      brasileiraoResults: [],
      standings: [],
      view,
      errors: [{ error: error?.message || "Erro interno ao consultar SportsAPI" }]
    }, { status: 200, headers: { "Cache-Control": "no-store" } });
  }
}
