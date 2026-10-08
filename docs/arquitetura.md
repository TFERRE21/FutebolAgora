# Arquitetura inicial

## Fluxo editorial automático

1. Coletar fatos de fontes permitidas/licenciadas e fontes públicas apropriadas.
2. Normalizar títulos, horários, clubes, competições e entidades.
3. Deduplicar eventos e matérias semelhantes.
4. Classificar relevância e confiança.
5. Gerar texto editorial original com IA a partir dos fatos consolidados.
6. Validar campos críticos antes da publicação.
7. Publicar ou colocar em revisão quando houver conflito.
8. Registrar fonte, timestamp e versão do conteúdo.

## Publicação diária

A primeira edição será preparada para execução diária às 00:00 no horário de Brasília, mas o pipeline poderá rodar durante o dia para atualizar jogos e acontecimentos urgentes.

## Próximos módulos

- `news-ingest`: coleta e normalização
- `news-editor`: geração e revisão
- `football-data`: jogos, resultados e tabelas
- `publisher`: publicação e atualização
- `seo`: sitemap, metadados e páginas por entidade
- `admin`: painel e observabilidade
