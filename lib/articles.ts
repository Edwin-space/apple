import data from '@/data/articles.json';

type RawArticle = (typeof data.articles)[number];

export type Article = RawArticle & {
  product?: string;
  status?: 'rumor' | 'reported' | 'confirmed' | string;
  image?: {
    url: string;
    credit: string;
    source?: string;
  } | null;
};

export const categories = [
  { slug: 'iphone', label: 'iPhone' },
  { slug: 'mac', label: 'Mac' },
  { slug: 'ipad', label: 'iPad' },
  { slug: 'apple-watch', label: 'Apple Watch' },
] as const;

export type CategorySlug = (typeof categories)[number]['slug'];

export type ProductGroup = {
  slug: string;
  label: string;
  category: string;
  count: number;
  latestAt: string;
  latestArticle: Article;
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function getArticles(): Article[] {
  return [...data.articles].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export function getArticle(slug: string): Article | undefined {
  return data.articles.find((article) => article.slug === slug);
}

export function getArticlesByCategory(category: string): Article[] {
  return getArticles().filter((article) => article.category === category);
}

export function getProducts(category?: string): ProductGroup[] {
  const groups = new Map<string, ProductGroup>();
  const articles = category ? getArticlesByCategory(category) : getArticles();

  for (const article of articles) {
    const label = article.product || article.categoryLabel;
    const productSlug = slugify(label);
    const key = `${article.category}:${productSlug}`;
    const current = groups.get(key);

    if (!current) {
      groups.set(key, {
        slug: productSlug,
        label,
        category: article.category,
        count: 1,
        latestAt: article.publishedAt,
        latestArticle: article,
      });
      continue;
    }

    current.count += 1;
  }

  return [...groups.values()].sort((a, b) => b.latestAt.localeCompare(a.latestAt));
}

export function getProduct(category: string, productSlug: string): ProductGroup | undefined {
  return getProducts(category).find((product) => product.slug === productSlug);
}

export function getArticlesByProduct(category: string, productSlug: string): Article[] {
  const product = getProduct(category, productSlug);
  if (!product) return [];
  return getArticlesByCategory(category).filter((article) => (article.product || article.categoryLabel) === product.label);
}
