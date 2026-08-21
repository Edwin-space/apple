import fs from 'node:fs/promises';
import path from 'node:path';
import { load } from 'cheerio';

const ROOT = process.cwd();
const DATA_PATH = path.join(ROOT, 'data/articles.json');
const MODEL = process.env.GITHUB_MODELS_MODEL || 'openai/gpt-4o';
const TOKEN = process.env.GITHUB_TOKEN;
const FORCE = process.argv.includes('--force');
const LIMIT_ARG = process.argv.find((arg) => arg.startsWith('--limit='));
const LIMIT = LIMIT_ARG ? Number(LIMIT_ARG.split('=')[1]) : Infinity;

const CATEGORY_FALLBACK = {
  iphone: {
    url: 'https://www.apple.com/newsroom/images/product/iphone/standard/Apple-iPhone-17-hero-250909_inline.jpg.large.jpg',
    credit: '이미지: Apple'
  },
  mac: {
    url: 'https://www.apple.com/newsroom/images/product/mac/standard/Apple-MacBook-Air-M5-hero_inline.jpg.large.jpg',
    credit: '이미지: Apple'
  }
};

function cleanText(value = '') {
  return value
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    url.hash = '';
    return url.href;
  } catch {
    return null;
  }
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    redirect: 'follow',
    headers: {
      'user-agent': 'Mozilla/5.0 (compatible; AppleArchiveBot/2.0; +https://github.com/Edwin-space/apple)',
      accept: 'text/html,application/xhtml+xml',
      'accept-language': 'en-US,en;q=0.9'
    }
  });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.text();
}

function extractArticle(html) {
  const $ = load(html);
  const paragraphs = [];

  $('article p, .post-content p, .entry-content p').each((_, node) => {
    const text = cleanText($(node).text());
    if (text.length < 45) return;
    if (/FTC|affiliate|subscribe|newsletter|follow 9to5Mac|You’re reading 9to5Mac|Check out 9to5Mac/i.test(text)) return;
    if (!paragraphs.includes(text)) paragraphs.push(text);
  });

  const description = cleanText(
    $('meta[property="og:description"]').attr('content') ||
    $('meta[name="description"]').attr('content') ||
    ''
  );

  const ogImage = normalizeUrl($('meta[property="og:image"]').attr('content'));
  const body = paragraphs.join('\n\n').slice(0, 14000);

  return { description, body, ogImage };
}

async function callModel(article, source) {
  if (!TOKEN) throw new Error('GITHUB_TOKEN is required for GitHub Models enrichment');

  const prompt = `당신은 Apple 전문 한국어 테크 에디터다. 아래 9to5Mac 기사 정보를 바탕으로 독립적인 한국어 아카이브 항목을 작성하라. 원문 사이트명, 기자명, 링크, 출처 표현은 결과 본문에 넣지 마라. 사실을 과장하지 말고 루머는 루머라고 명확히 표현한다. 원문 문장을 길게 번역하거나 복제하지 말고 핵심 사실을 재구성한다.\n\n카테고리: ${article.categoryLabel}\n현재 제품 분류: ${article.product || article.categoryLabel}\n원문 제목: ${article.title}\n설명: ${source.description}\n본문:\n${source.body}\n\nJSON만 반환한다. 형식:\n{\n  "title": "자연스러운 한국어 제목",\n  "summary": "핵심 내용을 3~5문장, 약 250~500자",\n  "highlights": ["구체적 핵심 변화 1", "핵심 변화 2", "핵심 변화 3", "필요하면 4~5"],\n  "whyItMatters": "사용자/제품 전략 관점에서 왜 중요한지 2~4문장",\n  "status": "reported 또는 rumor"\n}`;

  const response = await fetch('https://models.github.ai/inference/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN}`
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.2,
      max_tokens: 1100,
      messages: [
        { role: 'system', content: 'Return valid JSON only. Write in Korean.' },
        { role: 'user', content: prompt }
      ]
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub Models ${response.status}: ${text.slice(0, 300)}`);
  }

  const payload = await response.json();
  const raw = payload.choices?.[0]?.message?.content?.trim();
  if (!raw) throw new Error('Empty model response');

  const cleaned = raw.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  return JSON.parse(cleaned);
}

function needsEnrichment(article) {
  if (FORCE) return true;
  return Boolean(
    article.provenance?.needsEditorialReview ||
    !article.summary || article.summary.length < 120 ||
    !Array.isArray(article.highlights) || article.highlights.length < 3 ||
    !article.whyItMatters ||
    !article.image?.url
  );
}

function chooseImage(article, source) {
  if (article.image?.url) return article.image;
  if (CATEGORY_FALLBACK[article.category]) return CATEGORY_FALLBACK[article.category];
  if (source.ogImage) {
    return {
      url: source.ogImage,
      credit: '이미지: 9to5Mac'
    };
  }
  return null;
}

async function main() {
  const raw = JSON.parse(await fs.readFile(DATA_PATH, 'utf8'));
  const articles = Array.isArray(raw) ? raw : raw.articles ?? [];
  let processed = 0;
  let updated = 0;
  let failed = 0;

  for (const article of articles) {
    if (!needsEnrichment(article) || processed >= LIMIT) continue;
    const sourceUrl = article.provenance?.sourceUrl;
    if (!sourceUrl) continue;
    processed += 1;

    try {
      const html = await fetchHtml(sourceUrl);
      const source = extractArticle(html);
      if (!source.body && !source.description) throw new Error('Article body not found');

      const editorial = await callModel(article, source);
      article.title = cleanText(editorial.title) || article.title;
      article.summary = cleanText(editorial.summary) || article.summary;
      article.highlights = Array.isArray(editorial.highlights)
        ? editorial.highlights.map(cleanText).filter(Boolean).slice(0, 5)
        : article.highlights;
      article.whyItMatters = cleanText(editorial.whyItMatters) || article.whyItMatters;
      article.status = editorial.status === 'rumor' ? 'rumor' : 'reported';
      article.image = chooseImage(article, source);
      article.provenance = {
        ...article.provenance,
        needsEditorialReview: false,
        enrichedAt: new Date().toISOString(),
        enrichmentModel: MODEL
      };
      updated += 1;
      console.log(`Enriched: ${article.slug}`);
    } catch (error) {
      failed += 1;
      console.warn(`Failed: ${article.slug}: ${error.message}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 700));
  }

  const output = Array.isArray(raw) ? articles : { ...raw, articles };
  await fs.writeFile(DATA_PATH, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`Enrichment complete: processed=${processed} updated=${updated} failed=${failed}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
