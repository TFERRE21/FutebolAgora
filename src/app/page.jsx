import { sports, featuredClubs } from "../config/sports";

export default function HomePage() {
  return (
    <main style={{ maxWidth: 1180, margin: "0 auto", padding: "32px 20px", fontFamily: "Arial, sans-serif" }}>
      <header style={{ marginBottom: 32 }}>
        <p style={{ fontWeight: 700, letterSpacing: 1 }}>FUTEBOLAGORA</p>
        <h1 style={{ fontSize: 42, margin: "8px 0" }}>O esporte acontecendo agora.</h1>
        <p style={{ color: "#666", fontSize: 18 }}>
          Notícias originais, jogos, resultados, classificações e informações esportivas em um só lugar.
        </p>
      </header>

      <section>
        <h2>Modalidades</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          {sports.map((sport) => (
            <article key={sport.slug} style={{ border: "1px solid #ddd", borderRadius: 12, padding: 18 }}>
              <h3>{sport.name}</h3>
              <p style={{ color: "#666" }}>{sport.groups.slice(0, 4).join(" · ")}</p>
            </article>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>Clubes em destaque</h2>
        <p>{featuredClubs.join(" · ")}</p>
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>Automação editorial</h2>
        <p>
          O sistema coleta fatos, elimina duplicidades, valida informações e prepara conteúdo original.
          A edição diária é programada para 00:00 no horário de Brasília.
        </p>
      </section>
    </main>
  );
}
