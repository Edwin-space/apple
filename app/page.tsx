import { categories, getArticles } from '@/lib/articles';

export default function HomePage() {
  const articles = getArticles();

  return (
    <main className="shell">
      <section className="hero">
        <div className="eyebrow">Apple Update Archive</div>
        <h1>Apple의 변화를 제품별로 빠르게 읽는 아카이브.</h1>
        <p>iPhone, Mac, iPad, Apple Watch의 주요 변화와 루머를 한국어로 구조화해 정리합니다.</p>
      </section>

      <section className="categoryGrid" aria-label="제품 카테고리">
        {categories.map((category) => (
          <a className="card categoryCard" key={category.slug} href={`/category/${category.slug}`}>
            <span className="eyebrow">Category</span>
            <h2>{category.label}</h2>
            <p>업데이트와 주요 변화 보기</p>
          </a>
        ))}
      </section>

      <h2 className="sectionTitle">Latest</h2>
      <section className="articleGrid">
        {articles.map((article) => (
          <a className="card articleCard" key={article.slug} href={`/article/${article.slug}`}>
            <img src={article.image.url} alt="" loading="lazy" />
            <div className="articleBody">
              <div className="articleMeta">{article.categoryLabel} · {article.publishedAt}</div>
              <h2>{article.title}</h2>
              <p className="articleSummary">{article.summary}</p>
              <div className="credit">{article.image.credit}</div>
            </div>
          </a>
        ))}
      </section>
    </main>
  );
}
