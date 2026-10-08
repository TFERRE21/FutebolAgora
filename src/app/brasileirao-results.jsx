"use client";

import { useEffect, useState } from "react";

function MatchRow({ game }) {
  const home = game.homeTeam?.name || "Mandante";
  const away = game.awayTeam?.name || "Visitante";
  const logo = (team) => {
    if (!team?.logo) return null;
    return /^https?:\/\//i.test(team.logo)
      ? team.logo
      : "https://sportsapi.com.br" + (team.logo.startsWith("/") ? team.logo : "/" + team.logo);
  };
  return (
    <a className="br-match-row match-link" href={game?.id ? "/jogo/" + encodeURIComponent(game.id) : "#"} aria-label={"Abrir " + home + " x " + away}>
      <div className="br-team">{logo(game.homeTeam) && <img src={logo(game.homeTeam)} alt="" />}{home}</div>
      <strong>{game.homeScore ?? "-"} × {game.awayScore ?? "-"}</strong>
      <div className="br-team br-away">{away}{logo(game.awayTeam) && <img src={logo(game.awayTeam)} alt="" />}</div>
      <small>{game.league?.name || "Brasileirão"}</small>
    </a>
  );
}

export default function BrasileiraoResults() {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetch("/api/sports?sport=football&competition=Serie%20A&region=Brasil", { cache: "no-store" }).then((r) => r.json()).then(setData).catch(() => {});
  }, []);

  const games = data?.brasileiraoResults || [];
  return (
    <div className="brasileirao-results">
      {games.length ? games.map((game) => <MatchRow key={game.id} game={game} />) : (
        <p className="empty-score">Nenhum resultado do Brasileirão disponível na última rodada consultada. A seção será atualizada automaticamente.</p>
      )}
    </div>
  );
}
