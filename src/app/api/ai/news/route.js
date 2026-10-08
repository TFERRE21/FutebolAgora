import { NextResponse } from "next/server";
import { generateSportsNews, isOpenAIConfigured } from "../../../lib/openai";

export async function GET(request) {
  if (!isOpenAIConfigured()) {
    return NextResponse.json({
      configured: false,
      articles: [],
      error: "OPENAI_API_KEY não configurada no servidor."
    }, { status: 503 });
  }

  const url = new URL(request.url);
  const topic = url.searchParams.get("topic") || "futebol brasileiro";
  const count = Number(url.searchParams.get("count") || 6);

  try {
    const result = await generateSportsNews({ topic, count });
    return NextResponse.json({ configured: true, ...result }, {
      headers: { "Cache-Control": "no-store" }
    });
  } catch (error) {
    return NextResponse.json({
      configured: true,
      articles: [],
      error: error?.message || "Falha ao gerar notícias com OpenAI."
    }, { status: 502 });
  }
}
