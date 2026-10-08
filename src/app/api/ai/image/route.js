import { NextResponse } from "next/server";
import { generateSportsImage, isOpenAIConfigured } from "../../../../lib/openai";

const ALLOWED_SIZES = new Set(["1024x1024", "1536x1024", "1024x1536"]);

export async function POST(request) {
  if (!isOpenAIConfigured()) {
    return NextResponse.json({ error: "OPENAI_API_KEY não configurada no servidor." }, { status: 503 });
  }

  try {
    const body = await request.json();
    if (!body?.prompt || typeof body.prompt !== "string") {
      return NextResponse.json({ error: "Informe um prompt para a imagem." }, { status: 400 });
    }

    const size = ALLOWED_SIZES.has(body.size) ? body.size : "1536x1024";
    const result = await generateSportsImage({
      prompt: body.prompt,
      size
    });

    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" }
    });
  } catch (error) {
    return NextResponse.json({
      error: error?.message || "Falha ao gerar imagem com OpenAI."
    }, { status: 502 });
  }
}
