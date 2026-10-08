import { validateArticle } from "./schema";

export async function buildDailyEdition({ facts, generateArticle }) {
  const grouped = groupFacts(facts);
  const articles = [];

  for (const group of grouped) {
    const article = await generateArticle(group);
    const validation = validateArticle(article);
    articles.push({
      ...article,
      status: validation.valid ? "published" : "review",
      validation
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    count: articles.length,
    articles
  };
}

function groupFacts(facts = []) {
  const seen = new Set();
  return facts.filter((fact) => {
    const key = fact.canonicalKey || fact.title?.toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return fact.confidence >= 0.8;
  });
}
