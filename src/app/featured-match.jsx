"use client";

import { useEffect, useMemo, useState } from "react";

const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=1600&q=88",
  "https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=1600&q=88",
  "https://images.unsplash.com/photo-1577223625816-7546f13df25d?auto=format&fit=crop&w=1600&q=88"
];

const BIG_TEAMS = [
  "flamengo","palmeiras","corinthians","sao paulo","santos","botafogo",
  "fluminense","vasco","cruzeiro","atletico mg","gremio","internacional",
  "bahia","fortaleza","athletico pr","atletico-pr"
];

function clean(value = "") {
  return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function teamLogo(team) {
  if (!team?.logo) return "";
  return /^https?:\/\//i.test(team.logo)
    ? team.logo
    : "https://sportsapi.com.br" + (team.logo.startsWith("/") ? team.logo : "/" + team.logo);
}

function matchImage(game, index = 0) {
  return game?.image || game?.photo || game?.thumbnail || game?.cover ||
    game?.venue?.image || game?.stadium?.image || FALLBACK_IMAGES[index % FALLBACK_IMAGES.length];
}

function scoreMatch(game) {
  const text = clean(
    (game?.league?.name || "") + " " +
    (game?.competition?.name || "") + " " +
    (game?.homeTeam?.name || "") + " " +
    (game?.awayTeam?.name || "")
  );
  let score = game?.status === "live" ? 1000 : game?.status === "scheduled" ? 500 : 100;
  if (text.includes("serie a") || text.includes("brasileirao")) score += 180;
  if (text.includes("libertadores")) score += 210;
  if (text.includes("champions")) score += 200;
  if (BIG_TEAMS.some((team) => text.includes(clean(team)))) score += 45;
  const homeName = clean(game?.homeTeam?.name);
  const awayName = clean(game?.awayTeam?.name);
  const homeBig = BIG_TEAMS.some((team) => homeName.includes(clean(team)));
  const awayBig = BIG_TEAMS.some((team) => awayName.includes(clean(team)));
  if (homeBig && awayBig) score += 70;
  if (game?.status === "scheduled" && game?.startTime) {
    const hours = Math.abs(new Date(game.startTime).getTime() - Date.now()) / 3600000;
    score += Math.max(0, 30 - Math.min(hours, 30));
  }
  return score;
}

function pickImportant(games) {
  return [...games].filter(Boolean).sort((a, b) => scoreMatch(b) - scoreMatch(a))[0] || null;
}

function timeLabel(game) {
  if (game?.status === "live") return game.gameTimeDisplay || "AO VIVO";
  if (game?.status === "finished") return "ENCERRADO";
  if (!game?.startTime) return "HORÁRIO A CONFIRMAR";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(game.startTime));
}

export default function FeaturedMatch({ filter = {} }) {
  const [data, setData] = useState(null);
  const [realImage, setRealImage] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const query = new URLSearchParams(filter).toString();
        const section = filter.competition === "Serie A" ? "brasileirao" : filter.competition === "Libertadores" ? "libertadores" : filter.sport === "volleyball" ? "volei" : filter.sport === "basketball" ? "basquete" : filter.sport === "futsal" ? "futsal" : filter.sport === "esports" ? "esports" : "futebol";
        const response = await fetch("/api/sports-db?section=" + section, { cache: "no-store" });
        const json = await response.json();
        setData(json?.data || null);
      } catch {
        setData({ live: [], scheduled: [], yesterdayResults: [] });
      }
    };
    load();
    const timer = setInterval(load, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    if (!data) return () => { active = false; };
    const candidate = pickImportant([...(data.live || []), ...(data.scheduled || []), ...(data.yesterdayResults || [])]);
    if (!candidate?.id) return () => { active = false; };
    setRealImage("");
    fetch("/api/match-image?id=" + encodeURIComponent(candidate.id), { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => { if (active && json?.image) setRealImage(json.image); })
      .catch(() => {});
    return () => { active = false; };
  }, [data]);

  const match = useMemo(() => {
    if (!data) return null;
    return pickImportant([
      ...(data.live || []),
      ...(data.scheduled || []),
      ...(data.yesterdayResults || [])
    ]);
  }, [data]);

  if (!data) {
    return <section className="featured-match-loading"><div className="featured-skeleton" /></section>;
  }

  if (!match) {
    return (
      <section className="featured-match empty-featured">
        <div className="featured-empty-copy">
          <span>FUTEBOLAGORA • DESTAQUE</span>
          <h1>O principal jogo do futebol aparece aqui automaticamente.</h1>
          <p>Assim que a agenda for atualizada, o confronto de maior destaque será carregado nesta área.</p>
        </div>
      </section>
    );
  }

  const homeLogo = teamLogo(match.homeTeam);
  const awayLogo = teamLogo(match.awayTeam);
  const home = match.homeTeam?.name || "Mandante";
  const away = match.awayTeam?.name || "Visitante";
  const image = realImage || matchImage(match, 0);
  const href = match.id ? "/jogo/" + encodeURIComponent(match.id) : "/futebol";

  return (
    <section className="featured-match">
      <a href={href} className="featured-match-main" aria-label={"Abrir jogo " + home + " x " + away}>
        <img className="featured-match-bg" src={image} alt={"Imagem do jogo " + home + " x " + away} />
        <div className="featured-match-shade" />
        <div className="featured-match-content">
          <div className="featured-match-kicker">
            <span className={match.status === "live" ? "featured-live-dot" : ""}>
              {match.status === "live" ? "AO VIVO" : "JOGO EM DESTAQUE"}
            </span>
            <b>{match.league?.name || match.competition?.name || "Futebol"}</b>
          </div>

          <div className="featured-teams">
            <div className="featured-team">
              <div className="featured-logo">{homeLogo ? <img src={homeLogo} alt="" /> : "⚽"}</div>
              <strong>{home}</strong>
            </div>
            <div className="featured-score">
              <span>{match.homeScore ?? "-"}</span>
              <small>x</small>
              <span>{match.awayScore ?? "-"}</span>
            </div>
            <div className="featured-team featured-team-away">
              <div className="featured-logo">{awayLogo ? <img src={awayLogo} alt="" /> : "⚽"}</div>
              <strong>{away}</strong>
            </div>
          </div>

          <div className="featured-bottom">
            <div>
              <strong>{timeLabel(match)}</strong>
              <small>{match.venue?.name || match.stadium?.name || "Acompanhe todos os detalhes do confronto"}</small>
            </div>
            <span className="featured-button">VER JOGO →</span>
          </div>
        </div>
      </a>
    </section>
  );
}
