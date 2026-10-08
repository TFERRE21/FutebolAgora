export const newsStatus = ["draft", "review", "published", "rejected"];

export function validateArticle(article) {
  const errors = [];
  if (!article?.title || article.title.length < 20) errors.push("Título inválido");
  if (!article?.slug) errors.push("Slug ausente");
  if (!article?.summary) errors.push("Resumo ausente");
  if (!article?.body || article.body.length < 300) errors.push("Texto insuficiente");
  if (!Array.isArray(article?.sources) || article.sources.length === 0) errors.push("Fonte factual ausente");
  if (!article?.sport) errors.push("Modalidade ausente");
  return { valid: errors.length === 0, errors };
}
