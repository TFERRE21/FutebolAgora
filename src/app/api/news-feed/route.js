import { NextResponse } from "next/server";
import { getNewsArticles, isDatabaseConfigured } from "../../../lib/database";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ configured: false, articles: [] });
  }
  try {
    const articles = await getNewsArticles(12);
    return NextResponse.json({ configured: true, articles, source: "database" }, {
      headers: { "Cache-Control": "public, max-age=300, s-maxage=300" }
    });
  } catch (error) {
    return NextResponse.json({ configured: true, articles: [], error: error?.message || "Falha ao ler notícias." }, { status: 503 });
  }
}
