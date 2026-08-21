import { ArticleCard } from '@/components/ArticleCard';
import { categories, getArticles, getProducts } from '@/lib/articles';

export default function HomePage() {
  const articles = getArticles();
  const products = getProducts().slice(0, 8);

  return (
    <main className="shell">
      <section className="hero">
        <div className="eyebrow">Apple Update Archive</div>
        <h1>Apple의 변화를 제품과 세대 중심으로 읽는 아카이브.</h1>
        <p>iPhone, Mac, iPad, Apple Watch의 주요 변화와 루머를 제품별 타임라인으로 축적합니다.</p>
      </section>

      <section className="categoryGrid" aria-label="제품 카테고리">
        {categories.map((category) => (
          <a className="card categoryCard" key={category.slug} href={`/category/${category.slug}`}>
            <span className="eyebrow">Category</span>
            <h2>{category.label}</h2>
            <p>제품군 아카이브 보기</p>
          </a>
        ))}
      </section>

      <div className="sectionHeader">
        <div>
          <div className="eyebrow">Browse by product</div>
          <h2 className="sectionTitle">제품 · OS 허브</h2>
        </div>
      </div>
      <section className="productGrid">
        {products.map((product) => (
          <a className="card productCard" key={`${product.category}-${product.slug}`} href={`/category/${product.category}/product/${product.slug}`}>
            <div className="articleMeta">{categories.find((item) => item.slug === product.category)?.label}</div>
            <h3>{product.label}</h3>
            <p>{product.count}개의 업데이트</p>
            <span>{product.latestAt}</span>
          </a>
        ))}
      </section>

      <div className="sectionHeader">
        <div>
          <div className="eyebrow">Timeline</div>
          <h2 className="sectionTitle">최신 업데이트</h2>
        </div>
      </div>
      <section className="articleGrid">
        {articles.map((article) => <ArticleCard key={article.slug} article={article} />)}
      </section>
    </main>
  );
}
