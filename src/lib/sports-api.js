const BASE_URL = process.env.SPORTS_API_BASE_URL || "https://sportsapi.com.br/api/v1";
const API_KEY = process.env.SPORTS_API_KEY;

const sportsCache = { expiresAt: 0, sports: null, errors: [] };
const gamesCache = new Map();
const detailsCache = new Map();

async function request(path) {
  if (!API_KEY) return { ok: false, configured: false, data: {}, error: "SPORTS_API_KEY ausente" };

  try {
    let response = await fetch(BASE_URL + path, {
      headers: { "X-API-Key": API_KEY, Accept: "application/json" },
      cache: "no-store"
    });

    if (response.status === 502) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      response = await fetch(BASE_URL + path, {
        headers: { "X-API-Key": API_KEY, Accept: "application/json" },
        cache: "no-store"
      });
    }

    const raw = await response.text();
    let data = {};
    try { data = raw ? JSON.parse(raw) : {}; } catch { data = { raw }; }

    if (!response.ok) {
      return {
        ok: false,
        configured: true,
        status: response.status,
        retryAfter: response.headers.get("retry-after"),
        data,
        error: data?.message || data?.error || ("SportsAPI HTTP " + response.status)
      };
    }

    return { ok: true, configured: true, status: response.status, data };
  } catch (error) {
    return { ok: false, configured: true, data: {}, error: error?.message || "Falha de conexão com SportsAPI" };
  }
}

export async function getAvailableSports() {
  const now = Date.now();
  if (sportsCache.sports && now < sportsCache.expiresAt) {
    return { sports: sportsCache.sports, errors: sportsCache.errors };
  }

  const result = await request("/sports");
  if (!result.ok) {
    const fallback = [{ slug: "football", sport: "football", label: "Futebol" }];
    sportsCache.sports = fallback;
    sportsCache.errors = [{ endpoint: "/sports", status: result.status || null, error: result.error }];
    sportsCache.expiresAt = now + 60 * 60 * 1000;
    return { sports: fallback, errors: sportsCache.errors };
  }

  const sports = Array.isArray(result.data?.sports) ? result.data.sports : [];
  sportsCache.sports = sports;
  sportsCache.errors = [];
  sportsCache.expiresAt = now + 60 * 60 * 1000;
  return { sports, errors: [] };
}

function cacheKey({ date, status, statusIn, sport }) {
  return [date || "", status || "", statusIn || "", sport || ""].join("|");
}

export async function getMatches({ date, status, statusIn, sport, maxAgeMs = 60_000 }) {
  const key = cacheKey({ date, status, statusIn, sport });
  const cached = gamesCache.get(key);
  const now = Date.now();

  if (cached && now - cached.createdAt < maxAgeMs) return cached.value;

  const available = sport
    ? { sports: [{ slug: sport, sport }], errors: [] }
    : await getAvailableSports();

  const sports = available.sports.length
    ? available.sports
    : [{ slug: "football", sport: "football", label: "Futebol" }];

  const results = await Promise.all(
    sports.map(async (item) => {
      const slug = item.slug || item.sport || item;
      const params = new URLSearchParams({ limit: "100", offset: "0" });
      if (status) params.set("status", status);
      if (statusIn) params.set("statusIn", statusIn);
      if (date) params.set("date", date);
      params.set("sport", slug);

      const result = await request("/games?" + params.toString());

      if (!result.ok) {
        return {
          matches: [],
          error: {
            sport: slug,
            status: result.status || null,
            retryAfter: result.retryAfter || null,
            error: result.error
          }
        };
      }

      const matches = Array.isArray(result.data?.matches)
        ? result.data.matches
        : Array.isArray(result.data?.games)
          ? result.data.games
          : [];

      return { matches, error: null };
    })
  );

  const value = {
    matches: results.flatMap((result) => result.matches),
    configured: Boolean(API_KEY),
    sports,
    errors: [
      ...available.errors,
      ...results.map((result) => result.error).filter(Boolean)
    ]
  };

  gamesCache.set(key, { createdAt: now, value });
  return value;
}

export async function getFilteredMatches({
  date,
  status,
  statusIn,
  sport = "football",
  competition,
  region,
  team,
  maxAgeMs = 60_000
}) {
  const params = new URLSearchParams({ sport, limit: "100", offset: "0" });
  if (date) params.set("date", date);
  if (status) params.set("status", status);
  if (statusIn) params.set("statusIn", statusIn);
  if (competition) params.set("competition", competition);
  if (region) params.set("region", region);
  if (team) params.set("team", team);

  const key = "filter|" + params.toString();
  const cached = gamesCache.get(key);
  const now = Date.now();
  if (cached && now - cached.createdAt < maxAgeMs) return cached.value;

  const result = await request("/games/filter?" + params.toString());
  const value = {
    matches: Array.isArray(result.data?.matches) ? result.data.matches : [],
    configured: Boolean(API_KEY),
    sports: [{ slug: sport, sport }],
    errors: result.ok ? [] : [{
      sport,
      status: result.status || null,
      retryAfter: result.retryAfter || null,
      error: result.error
    }]
  };
  gamesCache.set(key, { createdAt: now, value });
  return value;
}

export async function getMatchDetails(id, sport = "football", maxAgeMs = 30 * 60 * 1000) {
  if (!id) return { ok: false, data: {}, error: "matchId ausente" };

  const key = `details|${sport}|${id}`;
  const cached = detailsCache.get(key);
  const now = Date.now();
  if (cached && now - cached.createdAt < maxAgeMs) return cached.value;

  const result = await request(`/games/${encodeURIComponent(id)}/details?sport=${encodeURIComponent(sport)}`);
  const value = {
    ok: result.ok,
    data: result.data || {},
    status: result.status || null,
    error: result.error || null
  };
  detailsCache.set(key, { createdAt: now, value });
  return value;
}
