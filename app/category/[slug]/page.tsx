import { ArticleCard } from '@/components/ArticleCard';
import { categories, getArticlesByCategory, getProducts } from '@/lib/articles';

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = categories.find((item) => item.slug === slug);
  const articles = getArticlesByCategory(slug);
  const products = getProducts(slug);

  return (
    <main className="shell">
      <section className="hero heroCompact">
        <div className="eyebrow">Category</div>
        <h1>{category?.label ?? slug}</h1>
        <p>제품과 OS별 허브를 통해 주요 변화와 업데이트 흐름을 이어서 볼 수 있습니다.</p>
      </section>

      <section className="productGrid">
        {products.map((product) => (
          <a className="card productCard" key={product.slug} href={`/category/${slug}/product/${product.slug}`}>
            <div className="articleMeta">{product.count} updates</div>
            <h3>{product.label}</h3>
            <p>{product.latestArticle.title}</p>
            <span>{product.latestAt}</span>
          </a>
        ))}
      </section>

      <div className="sectionHeader">
        <div>
          <div className="eyebrow">All updates</div>
          <h2 className="sectionTitle">전체 타임라인</h2>
        </div>
      </div>
      <section className="articleGrid">
        {articles.map((article) => <ArticleCard key={article.slug} article={article} />)}
      </section>
    </main>
  );
}
