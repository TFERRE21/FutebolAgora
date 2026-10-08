import { notFound } from "next/navigation";
import { getMatchDetails } from "../../../lib/sports-api";

const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=1600&q=88",
  "https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=1600&q=88"
];

function logo(team) {
  if (!team?.logo) return "";
  return /^https?:\/\//i.test(team.logo)
    ? team.logo
    : "https://sportsapi.com.br" + (team.logo.startsWith("/") ? team.logo : "/" + team.logo);
}

function image(game) {
  return game?.image || game?.photo || game?.thumbnail || game?.cover ||
    game?.venue?.image || game?.stadium?.image || FALLBACK_IMAGES[0];
}

export default async function MatchPage({ params }) {
  const { id } = await params;
  const result = await getMatchDetails(decodeURIComponent(id), "football", 0);

  if (!result?.ok || !result?.data) notFound();

  const game = result.data.game || result.data.match || result.data;
  const home = game.homeTeam?.name || game.home?.name || "Mandante";
  const away = game.awayTeam?.name || game.away?.name || "Visitante";
  const homeLogo = logo(game.homeTeam || game.home);
  const awayLogo = logo(game.awayTeam || game.away);

  return (
    <main className="container match-page">
      <a className="back-link" href="/">← Voltar para o FutebolAgora</a>
      <article className="match-article">
        <div className="match-cover">
          <img src={image(game)} alt={"Jogo " + home + " x " + away} />
          <div className="match-cover-overlay">
            <span>{game.league?.name || game.competition?.name || "Futebol"}</span>
            <h1>{home} <b>x</b> {away}</h1>
            <strong>{game.homeScore ?? "-"} × {game.awayScore ?? "-"}</strong>
          </div>
        </div>

        <div className="match-body">
          <div className="match-clubs">
            <div><div className="match-club-logo">{homeLogo ? <img src={homeLogo} alt="" /> : "⚽"}</div><b>{home}</b></div>
            <strong>×</strong>
            <div><div className="match-club-logo">{awayLogo ? <img src={awayLogo} alt="" /> : "⚽"}</div><b>{away}</b></div>
          </div>

          <div className="match-info-grid">
            <div><span>Status</span><b>{game.gameTimeDisplay || game.status || "A confirmar"}</b></div>
            <div><span>Competição</span><b>{game.league?.name || game.competition?.name || "Futebol"}</b></div>
            <div><span>Estádio</span><b>{game.venue?.name || game.stadium?.name || "Não informado"}</b></div>
            <div><span>Horário</span><b>{game.startTime ? new Date(game.startTime).toLocaleString("pt-BR") : "Não informado"}</b></div>
          </div>

          {Array.isArray(game.events) && game.events.length > 0 && (
            <section className="match-events">
              <h2>Principais acontecimentos</h2>
              {game.events.slice(0, 20).map((event, index) => (
                <div key={event.id || index}><b>{event.minute ? event.minute + "'" : "•"}</b><span>{event.player?.name || event.playerName || ""}</span><span>{event.type || event.detail || event.description || "Evento da partida"}</span></div>
              ))}
            </section>
          )}
        </div>
      </article>
    </main>
  );
}
