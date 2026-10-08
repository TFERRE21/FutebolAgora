import { sports } from "../config/sports";
import SportsBoard from "./sports-board";

const images = {
  hero: [
    "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=1400&q=85",
    "https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=1400&q=85",
    "https://images.unsplash.com/photo-1577223625816-7546f13df25d?auto=format&fit=crop&w=1400&q=85"
  ],
  match: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=900&q=80",
  stadium: "https://images.unsplash.com/photo-1577223625816-7546f13df25d?auto=format&fit=crop&w=900&q=80",
  basketball: "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=900&q=80",
  volleyball: "https://images.unsplash.com/photo-1592656670411-0a3f8e0a5b9e?auto=format&fit=crop&w=900&q=80",
  esports: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=900&q=80"
};

const news = [
  ["Futebol brasileiro", "A rodada que pode mexer de vez com a tabela do campeonato", images.hero[1], "rodada-brasileirao"],
  ["Mercado da bola", "Clubes aceleram planejamento e movimentam bastidores", images.stadium, "mercado-da-bola"],
  ["Análise", "O que observar nos próximos jogos e onde estão os pontos decisivos", images.match, "analise-da-rodada"],
  ["Basquete", "NBB entra em fase decisiva com grandes confrontos", images.basketball, "nbb-em-foco"],
  ["Vôlei", "Superliga chega com rodada de alto nível", images.volleyball, "superliga-em-foco"],
  ["eSports", "Calendário competitivo ganha novos confrontos", images.esports, "esports-em-foco"]
];

function brDate() {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "full" }).format(new Date());
}

export default function HomePage() {
  const hero = images.hero[new Date().getDate() % images.hero.length];

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
      <section className="hero">
        <article className="hero-card">
          <img src={hero} alt="Futebol em destaque" />
          <div className="hero-copy"><div className="kicker">FutebolAgora • Destaque</div><h1 className="hero-title">O esporte acontecendo agora, em um só lugar.</h1><div className="hero-meta">Notícias • Jogos • Resultados • Tabelas • Análises</div></div>
        </article>
        <div className="side-news">
          <a className="side-card" href="/noticia/rodada-brasileirao"><img src={images.match} alt="Jogo de futebol" /><div className="side-copy"><div className="kicker">Jogos de hoje</div><h3>Veja os principais confrontos e horários</h3><p>Agenda completa, placares e acompanhamento das partidas.</p></div></a>
          <a className="side-card" href="/noticia/analise-da-rodada"><img src={images.stadium} alt="Estádio" /><div className="side-copy"><div className="kicker">Brasileirão</div><h3>Tudo sobre a rodada e a classificação</h3><p>Contexto, resultados e os impactos de cada partida.</p></div></a>
        </div>
      </section>

      <SportsBoard />

      <div className="section-title"><h2>Resultados do Brasileirão</h2><a href="/brasileirao">VER CAMPEONATO →</a></div>
      <section className="panel"><div id="brasileirao-results"><p className="empty-score">Os resultados do Brasileirão são atualizados junto com o placar.</p></div></section>

      <div className="section-title"><h2>Últimas notícias</h2><a href="/noticias">VER TODAS →</a></div>
      <section className="content-grid">
        <div className="news-grid">{news.map(([kicker,title,img,slug]) => <a className="news-card" href={"/noticia/" + slug} key={title}><div className="news-image"><img src={img} alt={title} /></div><div className="news-copy"><div className="kicker">{kicker}</div><h3>{title}</h3><p>Entenda o que aconteceu, por que importa e o que pode acontecer a seguir.</p></div></a>)}</div>
        <aside className="sidebar">
          <div className="panel"><h3>📊 Em alta</h3><p><b>1.</b> Brasileirão</p><p><b>2.</b> Mercado da bola</p><p><b>3.</b> Libertadores</p><p><b>4.</b> Seleção Brasileira</p></div>
          <div className="panel"><h3>📰 Por que ler o FutebolAgora?</h3><p>Notícias com contexto, placares atualizados e explicações objetivas para você entender o que realmente aconteceu.</p></div>
        </aside>
      </section>

      <div className="section-title"><h2>Todos os esportes</h2><a href="/futebol">EXPLORAR →</a></div>
      <section className="sports-strip">{sports.map((sport) => <a className="sport-pill" href={"/" + sport.slug} key={sport.slug}><strong>{sport.name}</strong><span>{sport.groups.slice(0,3).join(" · ")}</span></a>)}</section>
    </main>

    <footer className="footer"><div className="footer-inner"><div><b>FutebolAgora</b><br/><small>Informação esportiva, resultados e notícias em um só lugar.</small></div><small>© 2026 FutebolAgora</small></div></footer>
  </>;
}
