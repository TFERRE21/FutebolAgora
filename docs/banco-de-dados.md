# Modelo de dados inicial

Entidades principais:

- sports: modalidades
- competitions: competições
- teams: clubes/equipes
- athletes: atletas
- fixtures: partidas
- standings: classificações
- events: eventos da partida
- sources: fontes
- facts: fatos coletados
- articles: notícias originais
- article_sources: relação entre notícia e fontes
- users: usuários administrativos
- audit_logs: histórico de automações

Uma notícia deve guardar as fontes factuais usadas na geração. Partidas devem ser independentes do conteúdo editorial para permitir atualizações automáticas de placar e estatísticas.
