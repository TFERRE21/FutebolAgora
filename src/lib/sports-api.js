const BASE_URL = process.env.SPORTS_API_BASE_URL || "https://sportsapi.com.br/api/v1";
const API_KEY = process.env.SPORTS_API_KEY;

async function request(path) {
  if (!API_KEY) return { matches: [], configured: false };
  const response = await fetch(BASE_URL + path, {
    headers: { "X-API-Key": API_KEY, Accept: "application/json" },
    cache: "no-store"
  });
  if (!response.ok) throw new Error("SportsAPI " + response.status);
  return response.json();
}

export async function getAvailableSports() {
  const data = await request("/sports");
  return data.sports || [];
}

export async function getMatches({ date, status, sport }) {
  const sports = sport ? [sport] : await getAvailableSports();
  const results = await Promise.allSettled(
    sports.map((item) => {
      const slug = item.slug || item.sport || item;
      const params = new URLSearchParams({ sport: slug, status, limit: "100", offset: "0" });
      if (date) params.set("date", date);
      return request("/games?" + params.toString());
    })
  );
  const matches = results.flatMap((result) =>
    result.status === "fulfilled" ? (result.value.matches || []) : []
  );
  return { matches, configured: Boolean(API_KEY), sports };
}
