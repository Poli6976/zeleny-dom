import { getCollection } from 'astro:content';
import { articleUrl } from '../lib/urls.mjs';
import { CATEGORIES } from '../site.config.mjs';

/**
 * Индекс для поиска по сайту. Отдаётся статическим файлом /search-index.json
 * и грузится на главной один раз — при первом клике в поле поиска.
 *
 * Поля намеренно однобуквенные: на 78 статьях это экономит несколько килобайт,
 * а читать этот файл руками всё равно никто не будет.
 *   t — заголовок, d — описание, k — ключевые слова, u — адрес, c — категория.
 */
export async function GET() {
  const all = await getCollection('articles', ({ data }) => !data.draft);
  const titles = Object.fromEntries(CATEGORIES.map((c) => [c.slug, c.title]));

  const items = all
    .sort((a, b) => +new Date(b.data.publishDate) - +new Date(a.data.publishDate))
    .map((entry) => ({
      t: entry.data.title,
      d: entry.data.description,
      k: entry.data.keywords ?? [],
      u: articleUrl(entry),
      c: titles[entry.data.category] ?? '',
    }));

  return new Response(JSON.stringify(items), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
