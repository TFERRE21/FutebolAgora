import { sports } from "../config/sports";
import SportsBoard from "./sports-board";
import BrasileiraoResults from "./brasileirao-results";
import LatestNews from "./latest-news";
import FeaturedMatch from "./featured-match";

function brDate() {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "full" }).format(new Date());
}

export default function HomePage() {
  return <>
    <header className="site-header">
      <div className="header-top"><div className="header-top-inner"><span>{brDate().toUpperCase()}</span><span>Últimas notícias · Resultados · Tabelas</span></div></div>
      <div className="header-main">
        <a className="brand" href="/"><b className="brand-mark">⚽</b><span>Futebol</span>Agora</a>
        <div className="search">🔎 &nbsp; Buscar notícia, time ou campeonato</div>
      </div>
      <nav className="nav"><div className="nav-inner">
        <a className="active" href="/">Início</a><a href="/futebol">Futebol</a><a href="/brasileirao">Brasileirão</a><a href="/libertadores">Libertadores</a><a href="/feminino">Feminino</a><a href="/volei">Vôlei</a><a href="/basquete">Basquete</a><a href="/futsal">Futsal</a><a href="/esports">eSports</a>
      </div></nav>
    </header>

    <div className="ticker"><div className="ticker-inner"><span className="live">AO VIVO</span><span className="ticker-text">Placar, resultados e agenda atualizados automaticamente. Acompanhe o esporte em tempo real.</span></div></div>

    <main className="container">
      <FeaturedMatch />

      <SportsBoard />

      <div className="section-title"><h2>Resultados do Brasileirão</h2><a href="/brasileirao">VER CAMPEONATO →</a></div>
      <section className="panel"><BrasileiraoResults /></section>

      <div className="section-title"><h2>Últimas notícias</h2><a href="/noticias">VER TODAS →</a></div>
      <LatestNews />


      <div className="section-title"><h2>Todos os esportes</h2><a href="/futebol">EXPLORAR →</a></div>
      <section className="sports-strip">{sports.map((sport) => <a className="sport-pill" href={"/" + sport.slug} key={sport.slug}><strong>{sport.name}</strong><span>{sport.groups.slice(0,3).join(" · ")}</span></a>)}</section>
    </main>

    <footer className="footer"><div className="footer-inner"><div><b>FutebolAgora</b><br/><small>Informação esportiva, resultados e notícias em um só lugar.</small></div><small>© 2026 FutebolAgora</small></div></footer>
  </>;
}
