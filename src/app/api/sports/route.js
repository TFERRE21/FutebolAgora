import { NextResponse } from "next/server";
import { getAvailableSports, getMatches, getFilteredMatches, getMatchDetails } from "../../../lib/sports-api";
import { generateBrasileiraoClassification, isOpenAIConfigured } from "../../../lib/openai";

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


function normalizeTeamName(name = "") {
  return String(name)
    .normalize("NFD")
    .replace(/[\\u0300-\\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function dedupeMatches(matches = []) {
  const seen = new Map();
  for (const match of matches) {
    const home = normalizeTeamName(match?.homeTeam?.name);
    const away = normalizeTeamName(match?.awayTeam?.name);
    const date = match?.startTime ? new Date(match.startTime).toISOString().slice(0, 10) : "";
    const status = match?.status || "";
    if (!home || !away) continue;
    const key = `${date}|${status}|${home}|${away}`;
    const current = seen.get(key);
    if (!current || Object.keys(match).length > Object.keys(current).length) seen.set(key, match);
  }
  return Array.from(seen.values()).sort((a, b) => new Date(a?.startTime || 0) - new Date(b?.startTime || 0));
}
async function getBrasileiraoMatches(competition, region, status, date, maxAgeMs) {
  const first = await getFilteredMatches({ sport: "football", date, status, competition, region, maxAgeMs });

  if (!first.matches.length && competition === "Serie A") {
    const fallback = await getFilteredMatches({
      sport: "football",
      date,
      status,
      competition: "Brasileirao",
      region,
      maxAgeMs
    });
    return { ...fallback, matches: dedupeMatches(fallback.matches || []) };
  }

  return { ...first, matches: dedupeMatches(first.matches || []) };
}

async function buildBrasileiraoClassification(competition, region) {
  const errors = [];
  const result = await getFilteredMatches({
    sport: "football",
    competition: competition || "Serie A",
    region: region || "Brasil",
    hasStandings: true,
    maxAgeMs: 30 * 60 * 1000
  });

  errors.push(...(result.errors || []));
  const matches = result.matches || [];

  for (const match of matches) {
    for (const group of Array.isArray(match?.standings) ? match.standings : []) {
      const rows = Array.isArray(group?.rows) ? group.rows : [];
      if (rows.length) return { standings: rows, groupName: group.groupName || group.name || "Série A", errors };
    }
  }

  if (matches[0]?.id) {
    const details = await getMatchDetails(matches[0].id, "football", 30 * 60 * 1000);
    for (const group of Array.isArray(details.data?.standings) ? details.data.standings : []) {
      const rows = Array.isArray(group?.rows) ? group.rows : [];
      if (rows.length) return { standings: rows, groupName: group.groupName || group.name || "Série A", errors };
    }
    if (!details.ok && details.error) errors.push({ endpoint: "/games/:id/details", status: details.status, error: details.error });
  }

  if (isOpenAIConfigured()) {
    try {
      const web = await generateBrasileiraoClassification();
      if (web.standings?.length) {
        return {
          standings: web.standings,
          groupName: "Série A",
          errors: [...errors, { endpoint: "OpenAI Web Search", error: "Classificação obtida por pesquisa web porque a SportsAPI não forneceu standings de futebol." }]
        };
      }
    } catch (error) {
      errors.push({ endpoint: "OpenAI Web Search", error: error?.message || "Falha ao pesquisar a classificação atual." });
    }
  }

  return {
    standings: [],
    groupName: "Série A",
    errors: errors.length ? errors : [{ endpoint: "/games/filter", error: "A SportsAPI não retornou standings e o fallback web não trouxe uma classificação completa." }]
  };
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
  const nextDates = [0, 1, 2].map((offset) => dateBR(offset));

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
        if (view === "classification") {
          const classification = await buildBrasileiraoClassification(competition, region);
          const payload = {
            updatedAt: new Date().toISOString(),
            today,
            yesterday,
            configured: true,
            sports: [{ slug: "football", sport: "football" }],
            live: [],
            scheduled: [],
            yesterdayResults: [],
            brasileiraoResults: [],
            standings: classification.standings,
            view,
            errors: classification.errors
          };
          responseCache = {
            payload,
            scope: cacheScope,
            expiresAt: now + 5 * 60 * 1000
          };
          return NextResponse.json(payload, {
            headers: { "Cache-Control": "no-store", "X-Sports-Cache": "MISS" }
          });
        }

        const futureDates = view === "upcoming" ? nextDates : [today];
        const futureResults = await Promise.all(futureDates.map((date) =>
          getBrasileiraoMatches(competition, region, null, date, 60 * 1000)
        ));
        const todayData = futureResults[0] || { matches: [], sports: [{ slug: "football", sport: "football" }], errors: [] };
        const yesterdayData = await getBrasileiraoMatches(
          competition,
          region,
          "finished",
          yesterday,
          10 * 60 * 1000
        );

        const allToday = dedupeMatches(futureResults.flatMap((item) => item.matches || []));
        const errors = [...futureResults.flatMap((item) => item.errors || []), ...(yesterdayData.errors || [])];

        const standings = [];

        const payload = {
          updatedAt: new Date().toISOString(),
          today,
          yesterday,
          configured: true,
          sports: todayData.sports,
          live: allToday.filter((g) => g.status === "live"),
          scheduled: allToday.filter((g) => g.status === "scheduled"),
          yesterdayResults: dedupeMatches(yesterdayData.matches || []),
          brasileiraoResults: dedupeMatches(yesterdayData.matches || []),
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

      const futureDates = view === "upcoming" ? nextDates : [today];
      const futureResults = await Promise.all(futureDates.map((date) => getFilteredMatches({
        sport,
        date,
        statusIn: "live,scheduled",
        competition,
        region,
        team,
        maxAgeMs: sport === "football" ? 60 * 1000 : SPORT_CACHE_MS
      })));
      const todayData = futureResults[0] || { matches: [], sports: [{ slug: sport, sport }], errors: [] };
      const yesterdayData = await getFilteredMatches({
        sport,
        date: yesterday,
        status: "finished",
        competition,
        region,
        team,
        maxAgeMs: 10 * 60 * 1000
      });

      const allToday = dedupeMatches(futureResults.flatMap((item) => item.matches || []));
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
