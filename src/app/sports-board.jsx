"use client";

import { useEffect, useState } from "react";

function fmtTime(ms) {
  if (!ms) return "--:--";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }).format(new Date(ms));
}

function Match({ game, live = false }) {
  const home = game.homeTeam?.name || "Mandante";
  const away = game.awayTeam?.name || "Visitante";
  const logo = (team) => team?.logo ? "https://sportsapi.com.br" + team.logo : null;
  return (
    <div className="live-match">
      <div className="match-league">{game.league?.name || game.sport}</div>
      <div className="match-teams">
        <div>{logo(game.homeTeam) && <img src={logo(game.homeTeam)} alt="" />}{home}</div>
        <strong>{game.homeScore ?? "-"} <span>×</span> {game.awayScore ?? "-"}</strong>
        <div>{logo(game.awayTeam) && <img src={logo(game.awayTeam)} alt="" />}{away}</div>
      </div>
      <div className={live ? "match-status live-status" : "match-status"}>
        {live ? (game.gameTimeDisplay || "AO VIVO") : (game.status === "finished" ? "ENCERRADO" : fmtTime(game.startTime))}
      </div>
    </div>
  );
}

export default function SportsBoard() {
  const [data, setData] = useState(null);
  async function load() {
    try {
      const response = await fetch("/api/sports", { cache: "no-store" });
      setData(await response.json());
    } catch {}
  }
  useEffect(() => {
    load();
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, []);

  if (!data) return <section className="score-columns"><div className="panel"><h3>⚡ Placar esportivo</h3><p>Carregando jogos e resultados...</p></div></section>;
  if (!data.configured) return <section className="score-columns">
    <div className="panel"><h3>⚡ Jogos de hoje</h3><p>Conecte a SportsAPI no servidor para ativar placares, resultados e atualização automática.</p></div>
    <div className="panel"><h3>🕘 Resultados de ontem</h3><p>Assim que a chave estiver configurada, esta área será preenchida automaticamente.</p></div>
  </section>;

  return <section className="score-columns">
    <div className="panel">
      <div className="score-head"><h3>🔴 Ao vivo agora</h3><span>{data.live.length} partidas</span></div>
      {data.live.length ? data.live.slice(0, 8).map((g) => <Match key={g.id} game={g} live />) : <p className="empty-score">Nenhuma partida ao vivo neste momento.</p>}
      <div className="score-head today-head"><h3>📅 Jogos de hoje</h3><span>Atualiza a cada 30s</span></div>
      {data.scheduled.slice(0, 8).map((g) => <Match key={g.id} game={g} />)}
    </div>
    <div className="panel">
      <div className="score-head"><h3>🕘 Resultados de ontem</h3><span>{data.yesterdayResults.length} jogos</span></div>
      {data.yesterdayResults.length ? data.yesterdayResults.slice(0, 12).map((g) => <Match key={g.id} game={g} />) : <p className="empty-score">Nenhum resultado encontrado.</p>}
    </div>
  </section>;
}
