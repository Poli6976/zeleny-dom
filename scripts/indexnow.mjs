/**
 * Уведомляет поисковики (Bing, Яндекс и др.) через IndexNow о новых и
 * изменённых страницах. Запускается из GitHub Actions после деплоя.
 *
 * Ключ — не секрет: он лежит в public/<ключ>.txt и отдаётся с сайта, так
 * поисковик проверяет, что мы владеем доменом.
 *
 *   node scripts/indexnow.mjs          — только статьи, изменённые в последнем коммите
 *   INDEXNOW_ALL=1 node scripts/indexnow.mjs — все страницы из sitemap
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { SITE } from '../src/site.config.mjs';

const ENDPOINT = 'https://api.indexnow.org/IndexNow';
const HOST = new URL(SITE.url).host;
const BASE = SITE.url.replace(/\/$/, '');

const keyFile = readdirSync('public').find((f) => /^[0-9a-f]{32}\.txt$/.test(f));
if (!keyFile) throw new Error('В public/ нет файла ключа IndexNow (<32 hex>.txt)');
const key = keyFile.replace('.txt', '');

/** Адрес статьи по файлу: /<категория>/<slug>/ (категория — из frontmatter). */
function articleUrl(file) {
  const text = readFileSync(file, 'utf8');
  const front = text.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
  if (/^draft:\s*true\s*$/m.test(front)) return null;
  const category = front.match(/^category:\s*['"]?([\w-]+)['"]?\s*$/m)?.[1];
  const slug = file.split('/').pop().replace(/\.mdx?$/, '');
  return category ? `${BASE}/${category}/${slug}/` : null;
}

async function allUrlsFromSitemap() {
  const get = async (u) => (await fetch(u)).text();
  const locs = (xml) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const index = await get(`${BASE}/sitemap-index.xml`);
  const pages = await Promise.all(locs(index).map(async (u) => locs(await get(u))));
  return pages.flat();
}

function changedUrls() {
  const diff = execFileSync(
    'git',
    ['diff', '--name-only', '--diff-filter=AM', process.env.INDEXNOW_FROM || 'HEAD~1', 'HEAD', '--', 'src/content/articles'],
    { encoding: 'utf8' },
  );
  const urls = diff
    .split('\n')
    .filter((f) => /\.mdx?$/.test(f))
    .map(articleUrl)
    .filter(Boolean);
  // Главная и категории показывают списки статей — тоже обновились.
  return urls.length ? [...urls, `${BASE}/`] : [];
}

const urlList = [...new Set(process.env.INDEXNOW_ALL ? await allUrlsFromSitemap() : changedUrls())];

if (!urlList.length) {
  console.log('IndexNow: нечего отправлять.');
  process.exit(0);
}

if (process.env.INDEXNOW_DRY) {
  console.log(`IndexNow (проба, без отправки): ${urlList.length} URL\n${urlList.join('\n')}`);
  process.exit(0);
}

const res = await fetch(ENDPOINT, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: HOST, key, keyLocation: `${BASE}/${keyFile}`, urlList }),
});

console.log(`IndexNow: отправлено ${urlList.length} URL, ответ ${res.status}`);
if (!res.ok) {
  console.error(await res.text());
  process.exit(1);
}
