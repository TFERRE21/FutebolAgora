import { NextResponse } from "next/server";
import { getAvailableSports, getMatches, getFilteredMatches } from "../../../lib/sports-api";

let responseCache = { expiresAt: 0, payload: null };

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

export async function GET(request) {
  const now = Date.now();
  const url = new URL(request.url);
  const sportFilter = url.searchParams.get("sport") || "";
  const competition = url.searchParams.get("competition") || "";
  const region = url.searchParams.get("region") || "";
  const team = url.searchParams.get("team") || "";
  const cacheScope = [sportFilter, competition, region, team].join("|");

  if (responseCache.payload && responseCache.scope === cacheScope && now < responseCache.expiresAt) {
    return NextResponse.json(responseCache.payload, { headers: { "Cache-Control": "no-store", "X-Sports-Cache": "HIT" } });
  }

  const today = dateBR(0);
  const yesterday = dateBR(-1);

  if (!process.env.SPORTS_API_KEY) {
    return NextResponse.json({ configured:false, today, yesterday, live:[], scheduled:[], yesterdayResults:[], brasileiraoResults:[], errors:[{error:"SPORTS_API_KEY não está disponível no runtime do servidor."}] });
  }

  try {
    if (competition || region || team) {
      const sport = sportFilter || "football";
      const [todayData, yesterdayData] = await Promise.all([
        getFilteredMatches({ sport, date:today, statusIn:"live,scheduled", competition, region, team, maxAgeMs:sport === "football" ? 60*1000 : SPORT_CACHE_MS }),
        getFilteredMatches({ sport, date:yesterday, status:"finished", competition, region, team, maxAgeMs:10*60*1000 })
      ]);
      const allToday = todayData.matches || [];
      const payload = {
        updatedAt:new Date().toISOString(), today, yesterday, configured:true,
        sports:todayData.sports,
        live:allToday.filter(g=>g.status==="live"),
        scheduled:allToday.filter(g=>g.status==="scheduled"),
        yesterdayResults:yesterdayData.matches || [],
        brasileiraoResults:competition.toLowerCase().includes("serie a") && region.toLowerCase().includes("brasil") ? (yesterdayData.matches || []) : [],
        errors:[...(todayData.errors||[]), ...(yesterdayData.errors||[])]
      };
      responseCache={payload,scope:cacheScope,expiresAt:now+60*1000};
      return NextResponse.json(payload,{headers:{"Cache-Control":"no-store","X-Sports-Cache":"MISS"}});
    }

    const available=await getAvailableSports();
    const allSports=available.sports||[];
    const selected=PRIORITY_SPORTS.map(slug=>allSports.find(item=>(item.slug||item.sport||item)===slug)).filter(Boolean);
    const sportsToQuery=selected.length?selected:[{slug:"football",sport:"football",label:"Futebol"}];

    const todayResults=await Promise.all(sportsToQuery.map(item=>{
      const sport=item.slug||item.sport||item;
      return getMatches({sport,date:today,statusIn:"live,scheduled",maxAgeMs:sport==="football"?60*1000:SPORT_CACHE_MS});
    }));
    const yesterdayFootball=await getMatches({sport:"football",date:yesterday,status:"finished",maxAgeMs:10*60*1000});
    const allToday=todayResults.flatMap(r=>r.matches);
    const payload={
      updatedAt:new Date().toISOString(),today,yesterday,configured:true,sports:allSports,
      live:allToday.filter(g=>g.status==="live"),scheduled:allToday.filter(g=>g.status==="scheduled"),
      yesterdayResults:yesterdayFootball.matches,brasileiraoResults:[],
      errors:[...available.errors,...todayResults.flatMap(r=>r.errors||[]),...yesterdayFootball.errors]
    };
    responseCache={payload,scope:cacheScope,expiresAt:now+60*1000};
    return NextResponse.json(payload,{headers:{"Cache-Control":"no-store","X-Sports-Cache":"MISS"}});
  } catch(error) {
    return NextResponse.json({configured:true,today,yesterday,live:[],scheduled:[],yesterdayResults:[],brasileiraoResults:[],errors:[{error:error?.message||"Erro interno ao consultar SportsAPI"}]},{status:200,headers:{"Cache-Control":"no-store"}});
  }
}
