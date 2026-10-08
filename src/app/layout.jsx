import "./globals.css";

export const metadata = {
  title: "FutebolAgora — Notícias, jogos e resultados",
  description: "Notícias, jogos, resultados, classificações e informações esportivas em um só lugar."
};

export default function RootLayout({ children }) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
