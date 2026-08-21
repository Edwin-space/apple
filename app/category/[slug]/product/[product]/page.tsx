import { notFound } from 'next/navigation';
import { ArticleCard } from '@/components/ArticleCard';
import { categories, getArticlesByProduct, getProduct } from '@/lib/articles';

export default async function ProductPage({ params }: { params: Promise<{ slug: string; product: string }> }) {
  const { slug, product: productSlug } = await params;
  const category = categories.find((item) => item.slug === slug);
  const product = getProduct(slug, productSlug);
  if (!category || !product) notFound();

  const articles = getArticlesByProduct(slug, productSlug);

  return (
    <main className="shell">
      <section className="hero heroCompact">
        <div className="eyebrow">{category.label} archive</div>
        <h1>{product.label}</h1>
        <p>{product.count}개의 업데이트를 최신순으로 정리합니다. 같은 제품에 대한 루머와 후속 변화가 하나의 흐름으로 이어집니다.</p>
      </section>

      <section className="timelineList">
        {articles.map((article) => (
          <div className="timelineItem" key={article.slug}>
            <div className="timelineDate">{article.publishedAt}</div>
            <ArticleCard article={article} compact />
          </div>
        ))}
      </section>
    </main>
  );
}
