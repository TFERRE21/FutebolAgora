import "./globals.css";

export const metadata = {
  title: "Arena Agora — O esporte acontece aqui",
  description: "Notícias, jogos, resultados, tabelas e estatísticas dos principais esportes em um só lugar."
};

export default function RootLayout({ children }) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
