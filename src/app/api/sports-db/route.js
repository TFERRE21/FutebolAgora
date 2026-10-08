import { NextResponse } from "next/server";
import { getSportsSnapshot, isDatabaseConfigured } from "../../../../lib/database";

const map = {
  futebol: "futebol", brasileirao: "brasileirao", libertadores: "libertadores",
  feminino: "feminino", volei: "volei", basquete: "basquete", futsal: "futsal", esports: "esports"
};

export const dynamic = "force-dynamic";

export async function GET(request) {
  const section = map[new URL(request.url).searchParams.get("section") || "futebol"] || "futebol";
  if (!isDatabaseConfigured()) return NextResponse.json({ configured: false, section, data: null });
  try {
    const data = await getSportsSnapshot(section);
    return NextResponse.json({ configured: Boolean(data), section, data, source: "database" });
  } catch (error) {
    return NextResponse.json({ configured: false, section, data: null, error: error?.message || "Falha no banco." }, { status: 503 });
  }
}
