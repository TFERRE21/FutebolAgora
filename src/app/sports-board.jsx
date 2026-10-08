"use client";

import { useEffect, useState } from "react";

function fmtTime(ms) {
  if (!ms) return "--:--";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }).format(new Date(ms));
}

function Match({ game, live = false }) {
  const home = game.homeTeam?.name || "Mandante";
  const away = game.awayTeam?.name || "Visitante";
  const logo = (team) => {
    if (!team?.logo) return null;
    return /^https?:\/\//i.test(team.logo)
      ? team.logo
      : "https://sportsapi.com.br" + (team.logo.startsWith("/") ? team.logo : "/" + team.logo);
  };
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


function Standings({ rows }) {
  if (!rows?.length) return <p className="empty-score">A classificação ainda não foi retornada pela SportsAPI.</p>;
  const logo = (row) => {
    if (!row?.logo) return null;
    return /^https?:\/\//i.test(row.logo) ? row.logo : "https://sportsapi.com.br" + (row.logo.startsWith("/") ? row.logo : "/" + row.logo);
  };
  return <div className="standings-wrap"><table className="standings-table">
    <thead><tr><th>#</th><th>Time</th><th>J</th><th>V</th><th>E</th><th>D</th><th>SG</th><th>Pts</th></tr></thead>
    <tbody>{rows.map((row, i) => <tr key={row.teamId || row.id || row.teamName || i}>
      <td><b>{row.position ?? i + 1}</b></td>
      <td className="standing-team">{logo(row) && <img src={logo(row)} alt="" />}<strong>{row.teamName || row.name || "Time"}</strong></td>
      <td>{row.played ?? row.gamesPlayed ?? "-"}</td><td>{row.won ?? "-"}</td><td>{row.drew ?? row.drawn ?? "-"}</td><td>{row.lost ?? "-"}</td><td>{row.goalDiff ?? "-"}</td><td><b>{row.points ?? "-"}</b></td>
    </tr>)}</tbody>
  </table></div>;
}

export default function SportsBoard({ filter = {}, view = "overview" }) {
  const [data, setData] = useState(null);
  async function load() {
    try {
      const query = new URLSearchParams({ ...filter, view }).toString();
      const response = await fetch("/api/sports" + (query ? "?" + query : ""), { cache: "no-store" });
      setData(await response.json());
    } catch {}
  }
  useEffect(() => {
    load();
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, [JSON.stringify(filter), view]);

  if (!data) return <section className="score-columns"><div className="panel"><h3>⚡ Placar esportivo</h3><p>Carregando jogos e resultados...</p></div></section>;
  if (!data.configured) return <section className="score-columns">
    <div className="panel"><h3>⚡ Jogos de hoje</h3><p>Conecte a SportsAPI no servidor para ativar placares, resultados e atualização automática.</p></div>
    <div className="panel"><h3>🕘 Resultados de ontem</h3><p>Assim que a chave estiver configurada, esta área será preenchida automaticamente.</p></div>
  </section>;

  if (view === "classification") return <section className="score-columns"><div className="panel standings-panel"><div className="score-head"><h3>🏆 Classificação do Brasileirão</h3><span>Atualização automática</span></div><Standings rows={data.standings} /></div></section>;

  if (view === "results") return <section className="score-columns"><div className="panel"><div className="score-head"><h3>🕘 Resultados do Brasileirão</h3><span>{data.yesterdayResults.length} jogos</span></div>{data.yesterdayResults.length ? data.yesterdayResults.map((g) => <Match key={g.id} game={g} />) : <p className="empty-score">Nenhum resultado encontrado para ontem.</p>}</div></section>;

  if (view === "upcoming") return <section className="score-columns"><div className="panel"><div className="score-head"><h3>📅 Próximos jogos do Brasileirão</h3><span>{data.scheduled.length} jogos</span></div>{data.scheduled.length ? data.scheduled.map((g) => <Match key={g.id} game={g} />) : <p className="empty-score">Nenhum jogo agendado para hoje.</p>}</div></section>;

  return <section className="score-columns">
    {data.errors?.length > 0 && (
      <div className="panel api-warning" style={{ gridColumn: "1 / -1" }}>
        <h3>⚠️ SportsAPI</h3>
        <p>Conexão realizada, mas a API retornou avisos. Confira abaixo:</p>
        <ul>
          {data.errors.slice(0, 5).map((item, index) => (
            <li key={index}>
              {item.sport ? <strong>{item.sport}: </strong> : null}
              {item.status ? `HTTP ${item.status} — ` : ""}
              {item.error || "Resposta sem dados"}
            </li>
          ))}
        </ul>
      </div>
    )}

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
