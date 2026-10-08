import Link from "next/link";
import { generateSportsNews, getCachedArticleBySlug } from "../../../lib/openai";

const fallback={category:"Futebol brasileiro",title:"Notícia esportiva",image:"https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=1400&q=85",summary:"Acompanhe as principais informações do esporte com contexto e dados atualizados."};
export async function generateStaticParams(){return[]}

export default async function ArticlePage({params}){
 const {slug}=await params;
 let article=getCachedArticleBySlug(slug);
 if(!article){try{const result=await generateSportsNews({topic:slug.replaceAll("-"," "),count:1});article=result.articles?.[0]}catch{}}
 article=article||fallback;
 const paragraphs=String(article.body||"").split("\n\n").map(x=>x.trim()).filter(Boolean);
 return <><header className="site-header"><div className="header-main"><Link className="brand" href="/"><b className="brand-mark">⚽</b><span>Futebol</span>Agora</Link><Link href="/" style={{fontSize:13,fontWeight:800,color:"#087443"}}>← Voltar</Link></div></header>
 <main className="container"><article className="article"><div className="article-cover"><img src={article.image||fallback.image} alt={article.title}/><div className="article-cover-badge">FutebolAgora</div></div>
 <div className="article-body"><div className="kicker">{article.category}</div><h1>{article.title}</h1><div className="article-meta">FutebolAgora · {article.competition||"Esportes"} {article.round?"· "+article.round:""} · {article.publishedAt?new Date(article.publishedAt).toLocaleString("pt-BR"):"atualizado agora"}</div>
 <p className="lead">{article.summary||fallback.summary}</p>
 {(article.teams||[]).length>0&&<div className="article-entities">{article.teams.map(t=><span className="entity-chip" key={t.id||t.name}>{t.logo&&<img src={t.logo} alt=""/>}{t.name}</span>)}</div>}
 {(article.players||[]).length>0&&<div className="article-box"><strong>Jogadores em destaque</strong><div className="player-list">{article.players.map(p=><span key={p.name+p.team}>{p.name}{p.team?" · "+p.team:""}</span>)}</div></div>}
 {(article.keyFacts||[]).length>0&&<div className="article-box"><strong>Fatos principais</strong><ul>{article.keyFacts.map(x=><li key={x}>{x}</li>)}</ul></div>}
 {paragraphs.map((x,i)=><p key={i}>{x}</p>)}
 {(article.sources||[]).length>0&&<div className="article-sources"><strong>Fontes consultadas</strong>{article.sources.map(s=><a key={s.url} href={s.url} target="_blank" rel="noreferrer">{s.title}</a>)}</div>}
 </div></article></main></>;
}
