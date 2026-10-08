import { NextResponse } from "next/server";

const cache = new Map();
const CACHE_MS = 6 * 60 * 60 * 1000;

function clean(value = "") {
  return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function isUseful(title = "") {
  const t = title.toLowerCase();
  return !/(logo|escudo|brasao|badge|icon|emblem|kit|uniform|jersey|flag|mapa)/i.test(t);
}

async function searchCommons(query) {
  const params = new URLSearchParams({
    action: "query",
    generator: "search",
    gsrsearch: query,
    gsrnamespace: "6",
    gsrlimit: "8",
    prop: "imageinfo",
    iiprop: "url",
    iiurlwidth: "1400",
    format: "json",
    origin: "*"
  });
  const response = await fetch("https://commons.wikimedia.org/w/api.php?" + params.toString(), {
    headers: { Accept: "application/json", "User-Agent": "FutebolAgora/1.0" },
    cache: "no-store"
  });
  if (!response.ok) return "";
  const data = await response.json();
  const pages = Object.values(data?.query?.pages || {});
  const page = pages.find((item) => isUseful(item?.title) && item?.imageinfo?.[0]?.thumburl);
  return page?.imageinfo?.[0]?.thumburl || page?.imageinfo?.[0]?.url || "";
}

export async function GET(request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ image: "" });

  const cached = cache.get(id);
  if (cached && Date.now() - cached.createdAt < CACHE_MS) {
    return NextResponse.json({ image: cached.image, source: "Wikimedia Commons" });
  }

  try {
    const sports = await import("../../../lib/sports-api");
    const result = await sports.getMatchDetails(id, "football", 30 * 60 * 1000);
    const game = result?.data?.game || result?.data?.match || result?.data;
    const home = game?.homeTeam?.name || game?.home?.name || "";
    const away = game?.awayTeam?.name || game?.away?.name || "";
    const competition = game?.league?.name || game?.competition?.name || "";

    let image = "";
    if (home && away) image = await searchCommons(clean(home) + " " + clean(away) + " football");
    if (!image && home) image = await searchCommons(clean(home) + " football");
    if (!image && competition) image = await searchCommons(clean(competition) + " football");

    cache.set(id, { image, createdAt: Date.now() });
    return NextResponse.json({ image, source: image ? "Wikimedia Commons" : null });
  } catch {
    return NextResponse.json({ image: "" });
  }
}
