export const metadata = {
  title: 'FutebolAgora',
  description: 'Notícias, jogos, resultados e informações do futebol em um só lugar.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
