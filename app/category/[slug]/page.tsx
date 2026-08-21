import { categories, getArticlesByCategory } from '@/lib/articles';

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = categories.find((item) => item.slug === slug);
  const articles = getArticlesByCategory(slug);

  return (
    <main className="shell">
      <section className="hero">
        <div className="eyebrow">Category</div>
        <h1>{category?.label ?? slug}</h1>
        <p>제품군별 주요 업데이트를 날짜순으로 정리합니다.</p>
      </section>

      <section className="articleGrid">
        {articles.map((article) => (
          <a className="card articleCard" key={article.slug} href={`/article/${article.slug}`}>
            <img src={article.image.url} alt="" loading="lazy" />
            <div className="articleBody">
              <div className="articleMeta">{article.publishedAt}</div>
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
