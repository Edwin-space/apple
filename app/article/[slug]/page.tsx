import { notFound } from 'next/navigation';
import { getArticle } from '@/lib/articles';

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();

  return (
    <main className="shell articlePage">
      <article className="articleHero">
        <img src={article.image.url} alt="" />
        <div className="articleCopy">
          <div className="articleMeta">{article.categoryLabel} · {article.publishedAt}</div>
          <h1>{article.title}</h1>
          <p>{article.summary}</p>
          <div className="credit">{article.image.credit}</div>

          <h2>핵심 변화</h2>
          <ul>
            {article.highlights.map((item) => <li key={item}>{item}</li>)}
          </ul>

          <h2>왜 중요한가</h2>
          <p>{article.whyItMatters}</p>
        </div>
      </article>
    </main>
  );
}
