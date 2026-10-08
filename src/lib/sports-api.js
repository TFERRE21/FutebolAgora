const BASE_URL = process.env.SPORTS_API_BASE_URL || "https://sportsapi.com.br/api/v1";
const API_KEY = process.env.SPORTS_API_KEY;
const SPORTS = ["football", "basketball", "volleyball", "baseball", "futsal", "esports"];

async function request(path) {
  if (!API_KEY) return { matches: [], configured: false };
  const response = await fetch(BASE_URL + path, {
    headers: { "X-API-Key": API_KEY, Accept: "application/json" },
    cache: "no-store"
  });
  if (!response.ok) throw new Error("SportsAPI " + response.status);
  return response.json();
}

export async function getMatches({ date, statusIn, sport }) {
  const sports = sport ? [sport] : SPORTS;
  const results = await Promise.allSettled(
    sports.map((item) => {
      const params = new URLSearchParams({ sport: item, date, statusIn, limit: "100", offset: "0" });
      return request("/games?" + params.toString());
    })
  );
  const matches = results.flatMap((result) =>
    result.status === "fulfilled" ? (result.value.matches || []) : []
  );
  return { matches, configured: Boolean(API_KEY), sports };
}
