import data from '@/data/articles.json';

export type Article = (typeof data.articles)[number];

export const categories = [
  { slug: 'iphone', label: 'iPhone' },
  { slug: 'mac', label: 'Mac' },
  { slug: 'ipad', label: 'iPad' },
  { slug: 'apple-watch', label: 'Apple Watch' },
] as const;

export function getArticles(): Article[] {
  return [...data.articles].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export function getArticle(slug: string): Article | undefined {
  return data.articles.find((article) => article.slug === slug);
}

export function getArticlesByCategory(category: string): Article[] {
  return getArticles().filter((article) => article.category === category);
}
