import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const data = JSON.parse(await fs.readFile(path.join(root, 'data/articles.json'), 'utf8'));
const docsRoot = path.join(root, 'docs');
const categories = [
  ['iphone', 'iPhone'],
  ['mac', 'Mac'],
  ['ipad', 'iPad'],
  ['apple-watch', 'Apple Watch'],
];

await fs.rm(docsRoot, { recursive: true, force: true });
await fs.mkdir(docsRoot, { recursive: true });

const home = `# Apple Update Archive\n\nApple 제품별 주요 변화와 업데이트를 한국어로 정리한 아카이브입니다.\n\n- iPhone\n- Mac\n- iPad\n- Apple Watch\n`;
await fs.writeFile(path.join(docsRoot, 'README.md'), home);

const summary = ['# Summary', '', '* [홈](README.md)'];

for (const [slug, label] of categories) {
  const categoryDir = path.join(docsRoot, slug);
  await fs.mkdir(categoryDir, { recursive: true });
  const articles = data.articles
    .filter((article) => article.category === slug)
    .sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)));

  const grouped = new Map();
  for (const article of articles) {
    const product = article.product || article.categoryLabel || label;
    const list = grouped.get(product) ?? [];
    list.push(article);
    grouped.set(product, list);
  }

  const indexLines = [`# ${label}`, '', `${label} 관련 업데이트를 제품과 OS별로 정리합니다.`, ''];
  summary.push(`* [${label}](${slug}/README.md)`);

  for (const [product, productArticles] of grouped) {
    indexLines.push(`## ${product}`, '');
    for (const article of productArticles) {
      const fileName = `${article.slug}.md`;
      indexLines.push(`- [${article.title}](${fileName}) — ${article.publishedAt ?? ''}`);
      summary.push(`  * [${article.title}](${slug}/${fileName})`);

      const page = [
        `# ${article.title}`,
        '',
        `**${product} · ${article.publishedAt ?? ''}**`,
        '',
        ...(article.image?.url ? [`![${article.title}](${article.image.url})`, '', `_${article.image.credit ?? '이미지: Apple'}_`, ''] : []),
        article.summary ?? '',
        '',
        '## 핵심 변화',
        '',
        ...((article.highlights?.length ? article.highlights : ['세부 변화는 검토 후 보강됩니다.']).map((item) => `- ${item}`)),
        '',
        '## 왜 중요한가',
        '',
        article.whyItMatters || '제품 및 플랫폼 변화의 맥락을 검토 중입니다.',
        '',
      ].join('\n');

      await fs.writeFile(path.join(categoryDir, fileName), page);
    }
    indexLines.push('');
  }

  if (articles.length === 0) indexLines.push('아직 등록된 업데이트가 없습니다.');
  await fs.writeFile(path.join(categoryDir, 'README.md'), indexLines.join('\n'));
}

await fs.writeFile(path.join(docsRoot, 'SUMMARY.md'), `${summary.join('\n')}\n`);
console.log(`Generated GitBook pages for ${data.articles.length} articles.`);
