import type { Article } from '@/lib/articles';

type Props = {
  article: Article;
  compact?: boolean;
};

export function ArticleCard({ article, compact = false }: Props) {
  return (
    <a className={`card articleCard${compact ? ' articleCardCompact' : ''}`} href={`/article/${article.slug}`}>
      {article.image?.url ? <img src={article.image.url} alt="" loading="lazy" /> : <div className="articleImageFallback" aria-hidden="true" />}
      <div className="articleBody">
        <div className="articleMeta">{article.categoryLabel} · {article.publishedAt}</div>
        <h2>{article.title}</h2>
        <p className="articleSummary">{article.summary}</p>
        {article.image?.credit ? <div className="credit">{article.image.credit}</div> : null}
      </div>
    </a>
  );
}
