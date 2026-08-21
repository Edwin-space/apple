import { notFound } from 'next/navigation';
import { getArticle } from '@/lib/articles';

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();

  return (
    <main className="shell articlePage">
      <article className="articleHero">
        {article.image?.url ? <img src={article.image.url} alt="" /> : null}
        <div className="articleCopy">
          <div className="articleMeta">{article.categoryLabel} · {article.publishedAt}</div>
          <h1>{article.title}</h1>
          <p>{article.summary}</p>
          {article.image?.credit ? <div className="credit">{article.image.credit}</div> : null}

          <h2>핵심 변화</h2>
          <ul>
            {article.highlights?.length
              ? article.highlights.map((item) => <li key={item}>{item}</li>)
              : <li>세부 변화는 검토 후 보강됩니다.</li>}
          </ul>

          <h2>왜 중요한가</h2>
          <p>{article.whyItMatters || '제품 및 플랫폼 변화의 맥락을 검토 중입니다.'}</p>
        </div>
      </article>
    </main>
  );
}
