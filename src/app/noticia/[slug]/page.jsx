import Link from "next/link";

const articles = {
  "rodada-brasileirao": {
    category: "Futebol brasileiro",
    title: "A rodada que pode mexer de vez com a tabela do campeonato",
    image: "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=1400&q=85",
    lead: "Resultados, confrontos diretos e a disputa por posições fazem cada rodada ganhar peso diferente na reta decisiva.",
    paragraphs: [
      "A rodada de um campeonato não é apenas uma sequência de partidas. O resultado de um jogo pode alterar a posição de vários clubes, mudar a distância para o líder e aumentar a pressão na parte de baixo da tabela.",
      "Por isso, o FutebolAgora apresenta o resultado acompanhado de contexto: quem ganhou, quem perdeu, como o placar interfere na classificação e quais são os próximos desafios de cada equipe.",
      "A partir dos dados esportivos atualizados automaticamente, esta página será renovada conforme as partidas forem encerradas. Assim, o leitor encontra em um único lugar o placar, o momento da competição e uma explicação objetiva do que aquele resultado significa.",
      "Nas partidas em andamento, o placar também pode mudar em tempo real. Depois do apito final, o conteúdo passa para o histórico de resultados e pode receber uma análise complementar."
    ]
  },
  "mercado-da-bola": {
    category: "Mercado da bola",
    title: "Clubes aceleram planejamento e movimentam bastidores",
    image: "https://images.unsplash.com/photo-1577223625816-7546f13df25d?auto=format&fit=crop&w=1400&q=85",
    lead: "As movimentações de clubes ganham contexto quando são apresentadas junto ao momento esportivo e às necessidades de cada elenco.",
    paragraphs: [
      "Contratações, saídas e negociações fazem parte do planejamento esportivo. Uma notícia de mercado precisa explicar não apenas o nome envolvido, mas também o papel que o jogador pode desempenhar e a situação do clube.",
      "No FutebolAgora, as informações de mercado serão organizadas a partir de fatos verificáveis e atualizadas quando houver novas confirmações.",
      "O objetivo é separar rumor de informação confirmada e explicar o impacto esportivo de cada movimentação."
    ]
  },
  "analise-da-rodada": {
    category: "Análise",
    title: "O que observar nos próximos jogos e onde estão os pontos decisivos",
    image: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=1400&q=85",
    lead: "Antes de uma rodada começar, alguns confrontos merecem atenção especial por causa da tabela, da sequência recente e do peso do resultado.",
    paragraphs: [
      "Uma boa análise precisa ir além de dizer quem é favorito. O contexto da competição, o mando de campo, a sequência de resultados e a necessidade de pontuar ajudam a explicar por que determinado confronto é importante.",
      "A proposta do FutebolAgora é transformar dados em leitura simples: o que está em jogo, quais posições podem mudar e quais resultados podem alterar o cenário da competição.",
      "Quando novos resultados forem registrados, esta análise será atualizada para refletir o cenário mais recente."
    ]
  },
  "nbb-em-foco": {
    category: "Basquete",
    title: "NBB entra em fase decisiva com grandes confrontos",
    image: "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1400&q=85",
    lead: "Acompanhe resultados, agenda e o contexto dos confrontos do basquete brasileiro.",
    paragraphs: [
      "O basquete tem uma dinâmica diferente do futebol e exige acompanhamento de placar, períodos e sequência de partidas.",
      "O FutebolAgora reúne esses dados e apresenta uma explicação curta sobre o que cada resultado representa para a competição."
    ]
  },
  "superliga-em-foco": {
    category: "Vôlei",
    title: "Superliga chega com rodada de alto nível",
    image: "https://images.unsplash.com/photo-1592656670411-0a3f8e0a5b9e?auto=format&fit=crop&w=1400&q=85",
    lead: "Resultados, sets e agenda ajudam a acompanhar a evolução das equipes na competição.",
    paragraphs: [
      "No vôlei, o placar precisa ser acompanhado set a set. Por isso, o FutebolAgora prepara a estrutura para mostrar resultados e informações específicas da modalidade.",
      "A página será atualizada automaticamente conforme novos jogos forem registrados."
    ]
  },
  "esports-em-foco": {
    category: "eSports",
    title: "Calendário competitivo ganha novos confrontos",
    image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1400&q=85",
    lead: "Os principais confrontos de eSports terão agenda, resultados e explicações em uma página própria.",
    paragraphs: [
      "O calendário competitivo dos eSports muda rapidamente. A cobertura precisa mostrar horários, confrontos, resultados e situação dos torneios.",
      "O FutebolAgora vai aplicar a mesma lógica usada nas modalidades tradicionais, adaptando a apresentação aos dados disponíveis para cada competição."
    ]
  }
};

export function generateStaticParams() {
  return Object.keys(articles).map((slug) => ({ slug }));
}

export default async function ArticlePage({ params }) {
  const { slug } = await params;
  const article = articles[slug] || articles["rodada-brasileirao"];

  return (
    <>
      <header className="site-header">
        <div className="header-main">
          <Link className="brand" href="/"><b className="brand-mark">⚽</b><span>Futebol</span>Agora</Link>
          <Link href="/" style={{fontSize:13,fontWeight:800,color:"#087443"}}>← Voltar para a página inicial</Link>
        </div>
      </header>
      <main className="container">
        <article className="article">
          <img src={article.image} alt={article.title} />
          <div className="article-body">
            <div className="kicker">{article.category}</div>
            <h1>{article.title}</h1>
            <div className="article-meta">FutebolAgora • atualização automática de informações esportivas</div>
            <p className="lead">{article.lead}</p>
            {article.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            <p><b>O que vem agora?</b> Esta página faz parte da estrutura editorial automática do FutebolAgora. Conforme os dados de jogos e resultados forem atualizados, o conteúdo poderá receber novas informações e contexto.</p>
          </div>
        </article>
      </main>
    </>
  );
}
