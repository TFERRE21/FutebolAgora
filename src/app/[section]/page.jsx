import Link from "next/link";
import SportsBoard from "../sports-board";
import { sports } from "../../config/sports";

const sections = {
  futebol: { title: "Futebol", intro: "Jogos, resultados, agenda e principais competições do futebol.", groups: sports.find((s) => s.slug === "futebol")?.groups || [] },
  brasileirao: { title: "Brasileirão", intro: "Resultados, jogos e informações do Campeonato Brasileiro Série A.", groups: ["Série A", "Classificação", "Resultados", "Próximos jogos"] },
  libertadores: { title: "Libertadores", intro: "Acompanhe jogos e resultados da CONMEBOL Libertadores.", groups: ["Fase de grupos", "Mata-mata", "Resultados"] },
  feminino: { title: "Futebol Feminino", intro: "Resultados e jogos do futebol feminino.", groups: ["Brasileirão Feminino", "Seleções", "Internacional"] },
  volei: { title: "Vôlei", intro: "Placares, jogos e competições de vôlei.", groups: sports.find((s) => s.slug === "volei")?.groups || [] },
  basquete: { title: "Basquete", intro: "NBA, NBB e principais competições de basquete.", groups: sports.find((s) => s.slug === "basquete")?.groups || [] },
  futsal: { title: "Futsal", intro: "Jogos, resultados e competições de futsal.", groups: sports.find((s) => s.slug === "futsal")?.groups || [] },
  esports: { title: "eSports", intro: "Competições e confrontos dos principais jogos competitivos.", groups: sports.find((s) => s.slug === "esports")?.groups || [] },
  noticias: { title: "Últimas notícias", intro: "Notícias e análises esportivas do FutebolAgora.", groups: [] }
};

const filters = {
  futebol: { sport: "football" },
  brasileirao: { sport: "football", competition: "Serie A", region: "Brasil" },
  libertadores: { sport: "football", competition: "Libertadores" },
  feminino: { sport: "football", competition: "Feminino", region: "Brasil" },
  volei: { sport: "volleyball" },
  basquete: { sport: "basketball" },
  futsal: { sport: "futsal" },
  esports: { sport: "esports" },
  noticias: {}
};

export default async function SectionPage({ params, searchParams }) {
  const { section } = await params;
  const page = sections[section] || sections.futebol;
  const query = await searchParams;
  const view = query?.view || "overview";
  const isBrasileirao = section === "brasileirao";

  return (
    <>
      <header className="site-header">
        <div className="header-main">
          <Link className="brand" href="/"><b className="brand-mark">⚽</b><span>Futebol</span>Agora</Link>
        </div>
        <nav className="nav"><div className="nav-inner">
          <Link href="/">Início</Link><Link href="/futebol">Futebol</Link><Link href="/brasileirao">Brasileirão</Link><Link href="/libertadores">Libertadores</Link><Link href="/feminino">Feminino</Link><Link href="/volei">Vôlei</Link><Link href="/basquete">Basquete</Link><Link href="/futsal">Futsal</Link><Link href="/esports">eSports</Link>
        </div></nav>
      </header>
      <main className="container">
        <div className="section-title"><h1>{page.title}</h1></div>
        <section className="panel section-intro">
          <div className="kicker">FutebolAgora</div>
          <h2>{page.title}</h2>
          <p>{page.intro}</p>
          <div className="section-links">
            {isBrasileirao ? <><Link className={view === "overview" ? "active" : ""} href="/brasileirao">Série A</Link><Link className={view === "classification" ? "active" : ""} href="/brasileirao?view=classification">Classificação</Link><Link className={view === "results" ? "active" : ""} href="/brasileirao?view=results">Resultados</Link><Link className={view === "upcoming" ? "active" : ""} href="/brasileirao?view=upcoming">Próximos jogos</Link></> : page.groups.map((group) => <span key={group}>{group}</span>)}
          </div>
        </section>
        <SportsBoard filter={filters[section] || {}} view={view} />
        <div className="section-title"><h2>Principais páginas</h2></div>
        <section className="sports-strip">
          <Link className="sport-pill" href="/brasileirao"><strong>Brasileirão</strong><span>Resultados e classificação</span></Link>
          <Link className="sport-pill" href="/libertadores"><strong>Libertadores</strong><span>Jogos e resultados</span></Link>
          <Link className="sport-pill" href="/futebol"><strong>Futebol</strong><span>Todas as competições</span></Link>
          <Link className="sport-pill" href="/volei"><strong>Vôlei</strong><span>Superliga e internacional</span></Link>
          <Link className="sport-pill" href="/basquete"><strong>Basquete</strong><span>NBA e NBB</span></Link>
        </section>
      </main>
      <footer className="footer"><div className="footer-inner"><b>FutebolAgora</b><small>Resultados, jogos e notícias esportivas.</small></div></footer>
    </>
  );
}
