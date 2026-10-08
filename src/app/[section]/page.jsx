import Link from "next/link";
import SportsBoard from "../sports-board";
import FeaturedMatch from "../featured-match";
import { sports } from "../../config/sports";
import { getMatches, getFilteredMatches } from "../../lib/sports-api";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const sections = {
  futebol: { title: "Futebol", intro: "Jogos, resultados, agenda e principais competições do futebol.", groups: sports.find((s) => s.slug === "futebol")?.groups || [] },
  brasileirao: { title: "Brasileirão", intro: "Resultados, jogos e informações do Campeonato Brasileiro Série A.", groups: ["Série A", "Classificação", "Resultados", "Próximos jogos"] },
  libertadores: { title: "Libertadores", intro: "Acompanhe jogos e resultados da CONMEBOL Libertadores.", groups: ["Fase de grupos", "Mata-mata", "Resultados"] },
  feminino: { title: "Futebol Feminino", intro: "Resultados e jogos do futebol feminino.", groups: ["Brasileirão Feminino", "Seleções", "Internacional"] },
  volei: { title: "Vôlei", intro: "Placares, jogos e competições de vôlei.", groups: sports.find((s) => s.slug === "volei")?.groups || [] },
  basquete: { title: "Basquete", intro: "NBA, NBB e principais competições de basquete.", groups: sports.find((s) => s.slug === "basquete")?.groups || [] },
  futsal: { title: "Futsal", intro: "Jogos, resultados e competições de futsal.", groups: sports.find((s) => s.slug === "futsal")?.groups || [] },
  esports: { title: "eSports", intro: "Competições e confrontos dos principais jogos competitivos.", groups: sports.find((s) => s.slug === "esports")?.groups || [] },
  noticias: { title: "Últimas notícias", intro: "Notícias e análises esportivas do Arena Agora.", groups: [] }
};

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

async function loadInitialData(section, view, filter) {
  const configured = Boolean(process.env.SPORTS_API_KEY);
  const empty = {
    configured,
    live: [],
    scheduled: [],
    yesterdayResults: [],
    standings: [],
    errors: []
  };
  if (!configured || section === "noticias") return empty;

  try {
    const today = dateBR(0);
    const yesterday = dateBR(-1);
    const dates = view === "upcoming" ? [0, 1, 2] : view === "results" ? [-1] : [0];

    const loadDate = async (offset) => {
      const date = dateBR(offset);
      if (filter.competition || filter.region || filter.team) {
        return getFilteredMatches({
          ...filter,
          sport: filter.sport || "football",
          date,
          ...(offset === -1 ? { status: "finished" } : { statusIn: "live,scheduled" }),
          maxAgeMs: offset === -1 ? 10 * 60 * 1000 : 60 * 1000
        });
      }
      return getMatches({
        sport: filter.sport || "football",
        date,
        ...(offset === -1 ? { status: "finished" } : { statusIn: "live,scheduled" }),
        maxAgeMs: offset === -1 ? 10 * 60 * 1000 : 60 * 1000
      });
    };

    if (view === "classification") {
      const result = await getFilteredMatches({
        sport: "football",
        competition: filter.competition || "Serie A",
        region: filter.region || "Brasil",
        hasStandings: true,
        maxAgeMs: 30 * 60 * 1000
      });
      const standings = (result.matches || []).flatMap((match) =>
        Array.isArray(match?.standings)
          ? match.standings.flatMap((group) => Array.isArray(group?.rows) ? group.rows : [])
          : []
      );
      return {
        ...empty,
        today,
        yesterday,
        standings,
        errors: result.errors || []
      };
    }

    const results = await Promise.all(dates.map(loadDate));
    const matches = results.flatMap((result) => result.matches || []);
    const errors = results.flatMap((result) => result.errors || []);
    const live = matches.filter((g) => g.status === "live");
    const scheduled = matches.filter((g) => g.status === "scheduled");
    const yesterdayResults = view === "results"
      ? matches.filter((g) => g.status === "finished" || !g.status)
      : [];

    return {
      ...empty,
      today,
      yesterday,
      live,
      scheduled,
      yesterdayResults,
      errors
    };
  } catch (error) {
    return {
      ...empty,
      errors: [{ error: error?.message || "Falha ao carregar os dados esportivos." }]
    };
  }
}

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
  const filter = filters[section] || {};
  const initialData = await loadInitialData(section, view, filter);

  return (
    <>
      <header className="site-header">
        <div className="header-main">
          <Link className="brand" href="/"><img className="brand-logo-img" src="/arena-agora-logo.svg" alt="Arena Agora" /></Link>
        </div>
        <nav className="nav"><div className="nav-inner">
          <Link href="/">Início</Link><Link href="/futebol">Futebol</Link><Link href="/brasileirao">Brasileirão</Link><Link href="/libertadores">Libertadores</Link><Link href="/feminino">Feminino</Link><Link href="/volei">Vôlei</Link><Link href="/basquete">Basquete</Link><Link href="/futsal">Futsal</Link><Link href="/esports">eSports</Link>
        </div></nav>
      </header>
      <main className="container">
        <section className="section-masthead">
          <div className="section-breadcrumb">Arena Agora <span>›</span> {page.title}</div>
          <div className="section-masthead-grid">
            <div>
              <div className="kicker">ARENA AGORA · CENTRAL ESPORTIVA</div>
              <h1>{page.title}</h1>
              <p>{page.intro}</p>
            </div>
            <div className="section-feature-list">
              <span>🔴 Ao vivo</span><span>📅 Próximos jogos</span><span>📊 Estatísticas</span><span>🏆 Resultados</span>
            </div>
          </div>
        </section>
        <section className="panel section-intro">
          <div className="section-intro-label">NAVEGAÇÃO DO CAMPEONATO</div>
          <p>Escolha uma visão para acompanhar os jogos, resultados e informações desta seção.</p>
          <div className="section-links">
            {isBrasileirao ? <><Link className={view === "overview" ? "active" : ""} href="/brasileirao">Série A</Link><Link className={view === "classification" ? "active" : ""} href="/brasileirao?view=classification">Classificação</Link><Link className={view === "results" ? "active" : ""} href="/brasileirao?view=results">Resultados</Link><Link className={view === "upcoming" ? "active" : ""} href="/brasileirao?view=upcoming">Próximos jogos</Link></> : page.groups.map((group) => <span key={group}>{group}</span>)}
          </div>
        </section>
        <FeaturedMatch filter={filter} initialData={initialData} />
        <SportsBoard filter={filter} view={view} initialData={initialData} />
        <div className="section-title"><h2>Principais páginas</h2></div>
        <section className="sports-strip">
          <Link className="sport-pill" href="/brasileirao"><strong>Brasileirão</strong><span>Resultados e classificação</span></Link>
          <Link className="sport-pill" href="/libertadores"><strong>Libertadores</strong><span>Jogos e resultados</span></Link>
          <Link className="sport-pill" href="/futebol"><strong>Futebol</strong><span>Todas as competições</span></Link>
          <Link className="sport-pill" href="/volei"><strong>Vôlei</strong><span>Superliga e internacional</span></Link>
          <Link className="sport-pill" href="/basquete"><strong>Basquete</strong><span>NBA e NBB</span></Link>
        </section>
      </main>
      <footer className="footer"><div className="footer-inner"><b>Arena Agora</b><small>O esporte acontece aqui.</small></div></footer>
    </>
  );
}
