import fs from 'node:fs/promises';
import path from 'node:path';
import { load } from 'cheerio';

const ROOT = process.cwd();
const DATA_PATH = path.join(ROOT, 'data/articles.json');

const CATEGORY_CONFIG = {
  iphone: { label: 'iPhone', guide: 'https://9to5mac.com/guides/iphone/', appleTopic: 'https://www.apple.com/kr/newsroom/topics/iphone/' },
  mac: { label: 'Mac', guide: 'https://9to5mac.com/guides/mac/', appleTopic: 'https://www.apple.com/kr/newsroom/topics/mac/' },
  ipad: { label: 'iPad', guide: 'https://9to5mac.com/guides/ipad/', appleTopic: 'https://www.apple.com/kr/newsroom/topics/ipad/' },
  'apple-watch': { label: 'Apple Watch', guide: 'https://9to5mac.com/guides/apple-watch/', appleTopic: 'https://www.apple.com/kr/newsroom/topics/watch/' }
};

const EXCLUDE = [/deal/i, /discount/i, /sale/i, /amazon/i, /best buy/i, /giveaway/i, /sponsored/i, /back to school/i];

function parseArgs() {
  const values = Object.fromEntries(process.argv.slice(2).map((arg) => {
    const [k, v = 'true'] = arg.replace(/^--/, '').split('=');
    return [k, v];
  }));
  return {
    pages: Math.max(1, Number(values.pages ?? 3)),
    since: values.since ?? '2025-01-01',
    categories: (values.categories ?? Object.keys(CATEGORY_CONFIG).join(',')).split(',').map((v) => v.trim()).filter(Boolean)
  };
}

async function fetchText(url) {
  const response = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 AppleArchiveBot/1.0', accept: 'text/html,application/xhtml+xml' } });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.text();
}

const cleanText = (value = '') => value.replace(/\s+/g, ' ').replace(/\u00a0/g, ' ').trim();

function slugify(value) {
  return value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 90);
}

function shouldExclude(title) { return EXCLUDE.some((rule) => rule.test(title)); }

function inferProduct(title, category) {
  const extract = (regex) => (title.match(regex) || [])[0];
  const rules = [
    [/iphone\s*ultra/i, 'iPhone Ultra'], [/iphone\s*\d+\s*pro\s*max/i, () => extract(/iPhone\s*\d+\s*Pro\s*Max/i)],
    [/iphone\s*\d+\s*pro/i, () => extract(/iPhone\s*\d+\s*Pro/i)], [/iphone\s*\d+/i, () => extract(/iPhone\s*\d+/i)],
    [/macbook\s*pro/i, 'MacBook Pro'], [/macbook\s*air/i, 'MacBook Air'], [/mac\s*mini/i, 'Mac mini'], [/mac\s*studio/i, 'Mac Studio'], [/imac/i, 'iMac'],
    [/ipad\s*pro/i, 'iPad Pro'], [/ipad\s*air/i, 'iPad Air'], [/ipad\s*mini/i, 'iPad mini'],
    [/apple\s*watch\s*ultra/i, 'Apple Watch Ultra'], [/apple\s*watch\s*series\s*\d+/i, () => extract(/Apple\s*Watch\s*Series\s*\d+/i)],
    [/ios\s*\d+/i, () => extract(/iOS\s*\d+/i)], [/macos\s*[\w\s]*\d+/i, () => extract(/macOS\s*[\w\s]*\d+/i)],
    [/ipados\s*\d+/i, () => extract(/iPadOS\s*\d+/i)], [/watchos\s*\d+/i, () => extract(/watchOS\s*\d+/i)]
  ];
  for (const [pattern, result] of rules) {
    if (pattern.test(title)) return typeof result === 'function' ? result() : result;
  }
  return CATEGORY_CONFIG[category].label;
}

function extractGuideItems(html, category) {
  const $ = load(html);
  const found = new Map();
  $('article, .post, .article, main').find('a[href*="9to5mac.com/"]').each((_, node) => {
    const a = $(node); const title = cleanText(a.text()); const href = a.attr('href');
    if (!href || title.length < 18 || shouldExclude(title)) return;
    if (!/^https:\/\/9to5mac\.com\/\d{4}\//.test(href)) return;
    if (!found.has(href)) found.set(href, { title, sourceUrl: href, category });
  });
  return [...found.values()];
}

async function enrichArticle(item) {
  const html = await fetchText(item.sourceUrl); const $ = load(html);
  const published = $('meta[property="article:published_time"]').attr('content') || $('time[datetime]').first().attr('datetime') || null;
  const description = cleanText($('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || '');
  const bodyText = cleanText($('article p').slice(0, 6).text());
  return { ...item, publishedAt: published, summary: description || bodyText.slice(0, 360), product: inferProduct(item.title, item.category) };
}

async function buildAppleImageIndex(category) {
  const topic = CATEGORY_CONFIG[category].appleTopic;
  try {
    const html = await fetchText(topic); const $ = load(html); const links = [];
    $('a[href*="/newsroom/"]').each((_, node) => {
      const href = $(node).attr('href'); const title = cleanText($(node).text());
      if (!href || title.length < 10 || href.includes('/topics/') || href.includes('/archive/')) return;
      links.push({ title, url: new URL(href, topic).href });
    });
    const unique = [...new Map(links.map((x) => [x.url, x])).values()].slice(0, 30); const entries = [];
    for (const link of unique) {
      try {
        const articleHtml = await fetchText(link.url); const $$ = load(articleHtml); const image = $$('meta[property="og:image"]').attr('content');
        if (image) entries.push({ ...link, image });
      } catch {}
    }
    return entries;
  } catch { return []; }
}

function tokenSet(text) { return new Set(text.toLowerCase().match(/[a-z0-9]+/g) ?? []); }
function scoreImage(article, candidate) { const a = tokenSet(`${article.title} ${article.product}`); const b = tokenSet(candidate.title); let score = 0; for (const token of a) if (b.has(token) && token.length > 2) score += 1; return score; }

function pickImage(article, candidates) {
  const ranked = candidates.map((candidate) => ({ candidate, score: scoreImage(article, candidate) })).sort((a, b) => b.score - a.score);
  if (!ranked[0] || ranked[0].score < 1) return null;
  return { url: ranked[0].candidate.image, credit: '이미지: Apple', source: ranked[0].candidate.url };
}

function mergeExisting(existing, incoming) {
  const bySource = new Map(existing.map((item) => [item.provenance?.sourceUrl, item]));
  const usedSlugs = new Set(existing.map((item) => item.slug));
  for (const item of incoming) {
    if (bySource.has(item.sourceUrl)) continue;
    let slug = slugify(item.title) || `${item.category}-${Date.now()}`; let suffix = 2;
    while (usedSlugs.has(slug)) slug = `${slugify(item.title)}-${suffix++}`;
    usedSlugs.add(slug);
    existing.push({
      slug,
      category: item.category,
      categoryLabel: CATEGORY_CONFIG[item.category].label,
      product: item.product,
      publishedAt: item.publishedAt?.slice(0, 10) ?? null,
      title: item.title,
      summary: item.summary,
      highlights: [],
      whyItMatters: '',
      status: /report|rumor|leak|could|may|might/i.test(item.title) ? 'rumor' : 'reported',
      image: item.image,
      provenance: { source: '9to5Mac', sourceUrl: item.sourceUrl, visible: false, importedAt: new Date().toISOString() }
    });
    bySource.set(item.sourceUrl, item);
  }
  return existing;
}

async function main() {
  const options = parseArgs(); const existingRaw = JSON.parse(await fs.readFile(DATA_PATH, 'utf8')); const existing = Array.isArray(existingRaw) ? existingRaw : existingRaw.articles ?? []; const imported = [];
  for (const category of options.categories) {
    if (!CATEGORY_CONFIG[category]) throw new Error(`Unknown category: ${category}`);
    const imageIndex = await buildAppleImageIndex(category);
    for (let page = 1; page <= options.pages; page += 1) {
      const url = page === 1 ? CATEGORY_CONFIG[category].guide : `${CATEGORY_CONFIG[category].guide}page/${page}/`; let html;
      try { html = await fetchText(url); } catch { break; }
      const items = extractGuideItems(html, category); if (!items.length) break;
      for (const item of items) {
        try {
          const enriched = await enrichArticle(item);
          if (!enriched.publishedAt || enriched.publishedAt.slice(0, 10) < options.since) continue;
          enriched.image = pickImage(enriched, imageIndex); imported.push(enriched);
        } catch {}
      }
    }
  }
  const merged = mergeExisting(existing, imported).sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)));
  const output = Array.isArray(existingRaw) ? merged : { ...existingRaw, articles: merged };
  await fs.writeFile(DATA_PATH, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`Imported ${imported.length}; total ${merged.length}`);
}

main().catch((error) => { console.error(error); process.exit(1); });
