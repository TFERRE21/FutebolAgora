const BASE_URL = process.env.SPORTS_API_BASE_URL || "https://sportsapi.com.br/api/v1";
const API_KEY = process.env.SPORTS_API_KEY;

let sportsCache = { expiresAt: 0, sports: null, errors: [] };

async function request(path) {
  if (!API_KEY) {
    return { ok: false, configured: false, data: {}, error: "SPORTS_API_KEY ausente" };
  }

  try {
    const response = await fetch(BASE_URL + path, {
      headers: { "X-API-Key": API_KEY, Accept: "application/json" },
      cache: "no-store"
    });
    const raw = await response.text();
    let data = {};
    try { data = raw ? JSON.parse(raw) : {}; } catch { data = { raw }; }

    if (!response.ok) {
      return {
        ok: false,
        configured: true,
        status: response.status,
        data,
        error: data?.message || data?.error || ("SportsAPI HTTP " + response.status)
      };
    }
    return { ok: true, configured: true, status: response.status, data };
  } catch (error) {
    return {
      ok: false,
      configured: true,
      data: {},
      error: error?.message || "Falha de conexão com SportsAPI"
    };
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
    sportsCache = { sports: fallback, errors: [{ endpoint: "/sports", status: result.status || null, error: result.error }], expiresAt: now + 5 * 60 * 1000 };
    return { sports: fallback, errors: sportsCache.errors };
  }

  const sports = Array.isArray(result.data?.sports) ? result.data.sports : [];
  sportsCache = { sports, errors: [], expiresAt: now + 60 * 60 * 1000 };
  return { sports, errors: [] };
}

export async function getMatches({ date, status, statusIn, sport }) {
  const available = sport
    ? { sports: [{ slug: sport, sport }], errors: [] }
    : await getAvailableSports();

  const sports = available.sports.length
    ? available.sports
    : [{ slug: "football", sport: "football", label: "Futebol" }];

  const results = await Promise.all(
    sports.map(async (item) => {
      const slug = item.slug || item.sport || item;
      const params = new URLSearchParams({
        sport: slug,
        limit: "100",
        offset: "0"
      });

      if (status) params.set("status", status);
      if (statusIn) params.set("statusIn", statusIn);
      if (date) params.set("date", date);

      const result = await request("/games?" + params.toString());

      if (!result.ok) {
        return {
          matches: [],
          error: {
            sport: slug,
            endpoint: "/games?" + params.toString(),
            status: result.status || null,
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

  return {
    matches: results.flatMap((result) => result.matches),
    configured: Boolean(API_KEY),
    sports,
    errors: [
      ...available.errors,
      ...results.map((result) => result.error).filter(Boolean)
    ]
  };
}
