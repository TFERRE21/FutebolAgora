"use client";
import { useEffect, useState } from "react";

const images=[
 "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=1000&q=82",
 "https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=1000&q=82",
 "https://images.unsplash.com/photo-1577223625816-7546f13df25d?auto=format&fit=crop&w=1000&q=82"
];

function getImage(article,index){
 const text=((article.category||"")+" "+(article.title||"")).toLowerCase();
 if(text.includes("basquete"))return "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1000&q=82";
 if(text.includes("vôlei")||text.includes("volei"))return "https://images.unsplash.com/photo-1592656670411-0a3f8e0a5b9e?auto=format&fit=crop&w=1000&q=82";
 return images[index%images.length];
}

export default function LatestNews(){
 const [articles,setArticles]=useState([]);
 const [loading,setLoading]=useState(true);
 useEffect(()=>{
  let active=true;
  fetch("/api/news-feed",{cache:"no-store"})
   .then(r=>r.json()).then(d=>{if(active&&Array.isArray(d.articles))setArticles(d.articles)})
   .catch(()=>{}).finally(()=>active&&setLoading(false));
  return()=>{active=false};
 },[]);
 if(loading&&!articles.length)return <div className="news-loading">Atualizando notícias, times, jogadores e informações da rodada…</div>;
 if(!articles.length)return <div className="news-loading">As notícias automáticas estão sendo atualizadas.</div>;
 return <section className="latest-news-shell">
  <div className="latest-news-grid">
   {articles.map((a,i)=><a className="rich-news-card" href={"/noticia/"+a.slug} key={a.slug||a.title}>
    <div className="rich-news-image"><img src={getImage(a,i)} alt={a.title}/><div className="rich-news-overlay"><div className="kicker">{a.category||"Esportes"}</div><small>{a.publishedAt?new Date(a.publishedAt).toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}):""}</small></div></div>
    <div className="rich-news-copy"><h3>{a.title}</h3><p>{a.summary}</p>
     {(a.teams||[]).length>0&&<div className="news-entities">{a.teams.slice(0,4).map(t=><span className="entity-chip" key={t.id||t.name}>{t.logo&&<img src={t.logo} alt=""/>}{t.name}</span>)}</div>}
     {(a.players||[]).length>0&&<div className="news-facts"><b>Jogadores:</b> {a.players.slice(0,3).map(p=>p.name).join(" · ")}</div>}
     {(a.keyFacts||[]).length>0&&<div className="news-facts"><b>Fato:</b> {a.keyFacts[0]}</div>}
    </div>
   </a>)}
  </div>
  <aside className="news-side-panel"><h3>📰 Matéria completa</h3><p><b>Times:</b> escudos e contexto dos clubes.</p><p><b>Jogadores:</b> destaques, desfalques e protagonistas.</p><p><b>Jogo:</b> placar, rodada, estádio e situação quando disponíveis.</p><p><b>Dados:</b> estatísticas somente quando confirmadas.</p><p><b>Fontes:</b> referências usadas pela redação.</p></aside>
 </section>;
}
