#!/usr/bin/env node
/**
 * Забирает из Яндекс.Метрики запросы, по которым поиск на сайте ничего не нашёл.
 *
 * Как это работает целиком:
 *   1. Посетитель ищет что-то на главной, поиск ничего не находит.
 *   2. SearchBox.astro отправляет цель `search_no_results` с параметром `query`.
 *   3. Этот скрипт вытаскивает накопленные запросы через Reporting API —
 *      получается готовый список тем, которых на сайте не хватает.
 *
 * Токен лежит в .env и в git не попадает. В клиентский код он не идёт никогда:
 * браузер только отправляет цель, читать статистику может лишь эта утилита.
 *
 * Использование:
 *   node scripts/fetch-search-queries.mjs            # за последние 30 дней
 *   node scripts/fetch-search-queries.mjs 90         # за последние 90 дней
 *   node scripts/fetch-search-queries.mjs 30 --json  # машиночитаемый вывод
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Читает .env вручную: тащить зависимость ради трёх строк незачем. */
function loadEnv() {
  const file = path.join(ROOT, '.env');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}
loadEnv();

const TOKEN = process.env.METRIKA_TOKEN;
const COUNTER = process.env.METRIKA_COUNTER_ID || '110844315';
const GOAL_PARAM = 'query'; // имя параметра, который шлёт SearchBox
const days = Number(process.argv.find((a) => /^\d+$/.test(a))) || 30;
const asJson = process.argv.includes('--json');

if (!TOKEN) {
  console.error(
    'Нет METRIKA_TOKEN.\n' +
      'Заведи токен на https://oauth.yandex.ru/ (доступ «Яндекс.Метрика: получение статистики»)\n' +
      'и положи его в .env строкой METRIKA_TOKEN=...\n' +
      'Файл .env в git не попадает.',
  );
  process.exit(1);
}

/** Дата в формате, который ждёт API: ГГГГ-ММ-ДД. */
function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

const date2 = new Date();
const date1 = new Date(date2.getTime() - days * 24 * 60 * 60 * 1000);

const params = new URLSearchParams({
  ids: COUNTER,
  metrics: 'ym:s:visits',
  // paramsLevel1 — имя параметра, paramsLevel2 — его значение (сам запрос).
  dimensions: 'ym:s:paramsLevel1,ym:s:paramsLevel2',
  filters: `ym:s:paramsLevel1=='${GOAL_PARAM}'`,
  date1: isoDate(date1),
  date2: isoDate(date2),
  sort: '-ym:s:visits',
  limit: '200',
  accuracy: 'full',
});

const res = await fetch(`https://api-metrika.yandex.net/stat/v1/data?${params}`, {
  headers: { Authorization: `OAuth ${TOKEN}` },
});

if (!res.ok) {
  const body = await res.text();
  // Подробности — в лог разработчику, наружу этот скрипт ничего не отдаёт.
  console.error(`Метрика ответила ${res.status}.`);
  if (res.status === 403) console.error('Скорее всего у токена нет доступа к счётчику.');
  if (res.status === 401) console.error('Токен недействителен или истёк — выпусти новый.');
  console.error(body.slice(0, 500));
  process.exit(1);
}

const data = await res.json();
const rows = (data.data ?? [])
  .map((row) => ({
    query: row.dimensions?.[1]?.name ?? '',
    visits: row.metrics?.[0] ?? 0,
  }))
  .filter((r) => r.query);

if (asJson) {
  console.log(JSON.stringify(rows, null, 2));
} else if (rows.length === 0) {
  console.log(
    `За последние ${days} дн. ненайденных запросов нет.\n` +
      'Если поиск точно не находил статьи — проверь, что в Метрике заведена цель\n' +
      'типа «JavaScript-событие» с идентификатором search_no_results.',
  );
} else {
  console.log(`Ненайденные запросы за последние ${days} дн. (всего ${rows.length}):\n`);
  for (const r of rows) {
    console.log(`${String(r.visits).padStart(4)}  ${r.query}`);
  }
  console.log('\nЭто и есть очередь тем: сверху — то, что спрашивают чаще всего.');
}
