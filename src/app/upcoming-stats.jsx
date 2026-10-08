"use client";

import { useEffect, useMemo, useState } from "react";

function logo(team) {
  if (!team?.logo) return "";
  return /^https?:\/\//i.test(team.logo) ? team.logo : "https://sportsapi.com.br" + (team.logo.startsWith("/") ? team.logo : "/" + team.logo);
}

function formText(form) {
  if (!form?.games) return "—";
  return [form.wins ? `${form.wins}V` : "", form.draws ? `${form.draws}E` : "", form.losses ? `${form.losses}D` : ""].filter(Boolean).join(" · ") || "Sem histórico";
}

function TeamStat({ team, stats }) {
  const f = stats?.form || {};
  const t = stats?.table || {};
  const campaign = t?.played != null ? `${t.played}J · ${t.won ?? 0}V · ${t.drew ?? t.drawn ?? 0}E · ${t.lost ?? 0}D` : "Sem tabela";
  return <div className="up-team-stat">
    <div className="up-team-head">{logo(team) ? <img src={logo(team)} alt="" /> : null}<strong>{team?.name || "Time"}</strong></div>
    <div className="up-stat-row"><span>Últimos jogos</span><b>{formText(f)}</b></div>
    <div className="up-stat-row"><span>Gols</span><b>{f.goals || 0}</b></div>
    <div className="up-stat-row"><span>Campanha</span><b>{campaign}</b></div>
    <div className="up-stat-row"><span>Média de gols</span><b>{f.games ? (f.goals / f.games).toFixed(1) : "—"}</b></div>
  </div>;
}

export default function UpcomingStats({ games = [], sport = "football" }) {
  const ids = useMemo(() => games.filter((g) => g?.id).slice(0, 3).map((g) => g.id), [games]);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!ids.length) return;
    fetch("/api/upcoming-stats?sport=" + encodeURIComponent(sport) + "&ids=" + encodeURIComponent(ids.join(",")), { cache: "no-store" })
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData({ matches: [] }));
  }, [ids.join(",")]);

  if (!games.length) return null;

  return <section className="upcoming-stats">
    <div className="section-title compact-title">
      <div><span className="section-eyebrow">ANÁLISE PRÉ-JOGO</span><h2>Estatísticas dos próximos jogos</h2></div>
      <span className="section-note">Dados disponíveis na SportsAPI</span>
    </div>
    <div className="upcoming-grid">
      {games.slice(0, 3).map((game, index) => {
        const item = data?.matches?.find((m) => String(m.id) === String(game.id));
        const hs = item?.stats?.home?.form;
        const as = item?.stats?.away?.form;
        return <article className="upcoming-card" key={game.id || index}>
          <div className="up-card-top"><span>{game.league?.name || game.competition?.name || "Jogo"}</span><b>{game.startTime ? new Date(game.startTime).toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}) : "Horário a confirmar"}</b></div>
          <div className="up-match-teams">
            <div>{logo(game.homeTeam) && <img src={logo(game.homeTeam)} alt="" />}<strong>{game.homeTeam?.name || "Mandante"}</strong></div>
            <b>×</b>
            <div className="up-away">{logo(game.awayTeam) && <img src={logo(game.awayTeam)} alt="" />}<strong>{game.awayTeam?.name || "Visitante"}</strong></div>
          </div>
          <div className="up-stats-cols">
            <TeamStat team={game.homeTeam} stats={{form:hs, table:item?.stats?.home?.table}} />
            <div className="up-vs">VS</div>
            <TeamStat team={game.awayTeam} stats={{form:as, table:item?.stats?.away?.table}} />
          </div>
          {item?.stats?.h2h?.length > 0 && <div className="up-h2h"><span>H2H recentes</span><b>{item.stats.h2h.length} confrontos encontrados</b></div>}
          {!item?.stats?.available && <p className="up-unavailable">Estatísticas detalhadas ainda não disponibilizadas para esta partida.</p>}
          <a href={game.id ? "/jogo/" + encodeURIComponent(game.id) : "#"} className="up-card-link">VER JOGO E DETALHES →</a>
        </article>;
      })}
    </div>
  </section>;
}
