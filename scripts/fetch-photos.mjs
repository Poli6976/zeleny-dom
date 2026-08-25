#!/usr/bin/env node
/**
 * Загружает настоящие фотографии растений с Wikimedia Commons и подставляет их
 * как обложки статей вместо нарисованных SVG-заглушек.
 *
 * Почему именно Commons: там у каждого файла указана лицензия и автор, которые
 * можно проверить и показать на сайте. Брать картинки из поиска или скриншоты
 * с чужих видео нельзя — это чужая собственность и риск претензий.
 *
 * Лицензии CC BY / CC BY-SA требуют указания авторства — скрипт записывает автора,
 * лицензию и ссылку на источник в frontmatter (coverCredit), а шаблон статьи
 * показывает их подписью под фотографией.
 *
 * Использование:
 *   node scripts/fetch-photos.mjs                 # только статьи без фото
 *   node scripts/fetch-photos.mjs --force         # перезагрузить все
 *   node scripts/fetch-photos.mjs slug1 slug2     # перезагрузить конкретные
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ARTICLES_DIR = path.join(ROOT, 'src/content/articles');
const OUT_DIR = path.join(ROOT, 'public/images/photos');
const FORCE = process.argv.includes('--force');
// Явно перечисленные slug-и перезагружаем, даже если фото уже стоит.
const ONLY = process.argv.slice(2).filter((a) => !a.startsWith('--'));

// Wikimedia требует осмысленный User-Agent с контактом, иначе блокирует запросы.
const UA = 'RastiDomaBot/1.0 (https://rasti-doma.ru; rastidoma@yandex.com)';

/**
 * Какое фото искать для какой статьи. Латинские названия дают точный результат:
 * по русским запросам Commons часто возвращает случайные снимки.
 */
const PHOTO_QUERIES = {
  // Комнатные растения
  'aloe-vera-uhod-v-domashnih-usloviyah': 'Aloe vera potted plant',
  'anturium-uhod-i-cvetenie': 'Anthurium andraeanum flower',
  'dracena-uhod-poliv-i-obrezka': 'Dracaena marginata plant',
  'fialka-senpoliya-uhod-i-obilnoe-cvetenie': 'Saintpaulia ionantha flower',
  'fikus-benjamina-uhod': 'Ficus benjamina plant',
  'geran-pelargoniya-uhod-i-obilnoe-cvetenie': 'Pelargonium flower pot',
  'hlorofitum-uhod-i-razmnozhenie': 'Chlorophytum comosum plant',
  'kaktus-uhod-v-domashnih-usloviyah': 'Cactus potted houseplant',
  'limon-doma-iz-kostochki-do-plodov': 'Citrus limon potted tree',
  'orhideya-falenopsis-uhod': 'Phalaenopsis orchid flower',
  'uhod-za-orhideey-posle-pokupki': 'Phalaenopsis orchid plant pot',
  'sansevieriya-schuchiy-hvost-uhod-v-domashnih-usloviyah': 'Sansevieria trifasciata plant',
  'spatifillum-uhod-i-pochemu-ne-cvetet': 'Spathiphyllum flower plant',
  'tolstyanka-uhod-za-denezhnym-derevom': 'Crassula ovata plant',
  'zamiokulkas-uhod-za-dollarovym-derevom': 'Zamioculcas zamiifolia plant',
  'begoniya-uhod-v-domashnih-usloviyah': 'Begonia semperflorens',
  'apelsin-doma-uhod-i-plodonoshenie': 'Citrus sinensis Meise',
  'plyusch-komnatnyy-uhod': 'Common ivy in Tuntorp',
  'gibiskus-uhod-i-obilnoe-cvetenie': 'Hibiscus rosa-sinensis blossom',
  'monstera-uhod-v-domashnih-usloviyah': 'Monstera deliciosa plant',

  // Вредители и болезни
  'tlya-na-rasteniyah-kak-vyvesti': 'Aphid on plant leaf',
  'pautinnyy-klesch-priznaki-i-lechenie': 'Tetranychus urticae spider mite',
  'muchnistyy-chervec-kak-izbavitsya': 'Mealybug Pseudococcidae plant',
  'schitovka-na-komnatnyh-rasteniyah-kak-raspoznat-i-vyvesti': 'Scale insect Coccoidea plant',
  'tripsy-na-komnatnyh-rasteniyah-priznaki-i-lechenie': 'Thrips insect plant leaf',
  'fitoftora-na-tomatah-priznaki-i-lechenie': 'Phytophthora infestans tomato blight',
  'fitoftora-na-kartofele-priznaki-i-lechenie': 'Phytophthora infestans potato late blight leaf',
  'vershinnaya-gnil-tomatov-priznaki-i-lechenie': 'Blossom end rot tomato',
  'slizni-na-gryadkah-kak-izbavitsya': 'Deroceras reticulatum',
  'belokrylka-na-rasteniyah-kak-vyvesti': 'Bemisia tabaci under leaf of eggplant',
  'koloradskiy-zhuk-kak-borotsya': 'Colorado potato beetle',
  'muchnistaya-rosa-na-ogurcah-priznaki-i-lechenie':
    'Kürbis Cucurbita Echter Mehltau Golovinomyces',
  'belyy-nalet-na-zemle-v-gorshke-prichiny': 'Overgrown Houseplant Unsplash',
  'kak-izbavitsya-ot-moshek-v-komnatnyh-cvetah': 'Sciaridae fungus gnat',
  'karantin-dlya-novyh-rasteniy': 'Scale on red-stemmed dogwood',
  'kornevaya-gnil-kak-spasti-rastenie': 'Rhododendron Phytophthora Root Rot Jerzy Opioła',
  'orhideya-sbrosila-butony-posle-pokupki-prichiny-i-chto-delat': 'Phalaenopsis buds',
  'pochemu-skruchivayutsya-listya-u-rasteniy': 'Leaf curl of raspberry kędzierzawka maliny',
  'pochemu-sohnut-konchiki-listev': 'Nephrolepis exaltata',
  'pochemu-u-tolstyanki-denezhnogo-dereva-opadayut-listya': 'Crassula ovata jade plant leaves',
  'pochemu-u-zamiokulkasa-zhelteyut-listya': 'Zamioculcas zamiifolia leaves',
  'pochemu-zhelteyut-listya': 'Bed Snake Plant Unsplash',
  'vyanut-i-smorschivayutsya-listya-u-orhidei-prichiny': 'Potteplante-orkideer stuevindu',

  // Сад и огород
  'kogda-sazhat-rassadu-tomatov': 'Tomato seedlings',
  'kogda-sazhat-perec-na-rassadu': 'Pepper seedlings',
  'kogda-sazhat-ogurcy-na-rassadu-sroki-i-uhod': 'Cucumber seedlings',
  'obrezka-yabloni-vesnoy-dlya-nachinayushchih': 'Apple orchard tree spring blossom',
  'posadka-chesnoka-pod-zimu': 'Garlic planting field',
  'mulchirovanie-gryadok-zachem-i-chem': 'Straw mulch garden bed',
  'kak-podgotovit-teplicu-k-vesne': 'Greenhouse garden vegetables',
  'kogda-ubirat-chesnok-i-kak-ego-hranit': 'Garlic Bulbs Unsplash',
  'pochemu-ogurcy-cvetut-no-ne-plodonosyat':
    'Cucumis sativus flowers and young fruit Hydroponics greenhouse',
  'kak-borotsya-s-sornyakami-na-ogorode-bez-himii': 'Chenopodium album weed plant',
  'kak-hranit-urozhay-morkovi-do-vesny': 'Carrot harvest roots',
  'kak-polivat-ogorod-v-zharu-pravilno': 'Watering Corn in the War Garden',
  'klubnika-posle-plodonosheniya-chto-delat-letom':
    'Strawberry plant with fruit Fragaria Trimingham',
  'kogda-sazhat-baklazhany-na-rassadu': 'Solanum melongena eggplant seedlings',
  'kogda-ubirat-luk-s-gryadki-i-kak-ego-hranit': 'Onion harvest drying field',
  'pasynkovanie-tomatov-kak-i-zachem-formirovat-kust': 'Tomato plants being grown in a greenhouse',
  // pochemu-ogurcy-gorchat-i-kak-etogo-izbezhat — стоит своё фото владельца
  'pochemu-opadayut-zavyazi-u-perca-prichiny-i-chto-delat': 'Capsicum annuum pepper plant flowers',
  'sideraty-osenyu-chto-i-kogda-seyat': 'Green manure cover crop field',
  'kak-hranit-yabloki-zimoy': 'Bohemia apples in basket',
  'smorodina-posle-sbora-urozhaya-chto-delat': 'Unripe Blackcurrant berries Trimingham Norfolk',
  'kak-sobrat-semena-tomatov': 'Half of a sliced tomato on a blue background',
  'chto-poseyat-v-avguste-na-gryadke': 'Germinating radish',
  'kogda-vykapyvat-kartofel-sroki-i-priznaki-gotovnosti': 'Potatoes harvest basket',

  // Уход
  'kak-repotit-komnatnoe-rastenie-poshagovo': 'Repotting houseplant',
  'kak-vybrat-grunt-dlya-komnatnyh-rasteniy': 'Potting soil compost',
  'kak-chasto-polivat-rasteniya': 'Houseplants windowsill pots',
  'kak-razmnozhit-komnatnoe-rastenie-cherenkami': 'Basilikum Ocimum basilicum Stecklinge',
  '10-samyh-neprihotlivyh-komnatnyh-rasteniy': 'Epipremnum aureum pothos houseplant',
  'chem-podkormit-komnatnye-rasteniya-vesnoy': 'Decorative Greenery Unsplash',
  'kakoy-gorshok-vybrat-dlya-komnatnogo-rasteniya':
    "Broomhall St Peter's Garden Centre Flower Pots",
  'kak-polivat-komnatnye-rasteniya-vo-vremya-otpuska': 'Green living room corner Unsplash',
  'kak-ponyat-chto-rasteniyu-tesen-gorshok': 'Root bound plant root ball',
  'kak-uhazhivat-za-rasteniyami-zimoy': 'Bright windowsill Unsplash',
  'nuzhno-li-opryskivat-komnatnye-rasteniya': 'Dew-covered plant in macro Unsplash',
  'narodnye-sredstva-dlya-komnatnyh-rasteniy': 'Wood ash.jpg Laurentius',
  'rasteniya-bezopasnye-dlya-koshek-i-sobak': 'Katze Emmy im Blumentopf sitzend',
  'svet-dlya-rasteniy-pryamoy-i-rasseyannyy': 'Houseplant sunlight window',
  'kakoy-vodoy-polivat-komnatnye-rasteniya': 'Watering can',
  'kompost-svoimi-rukami-chto-mozhno-klast': 'Garden compost bin',
  'chem-podkormit-komnatnye-rasteniya-letom': 'Fertilizing houseplant',
  'nuzhno-li-ryhlit-zemlyu-v-gorshke-u-komnatnogo-rasteniya': 'Soil in flower pot',
  'u-apelsina-zhelteyut-i-opadayut-listya': 'Chlorose ferrique sur Citrus aurantium.jpg',
  'kak-razmnozhit-begoniyu-cherenkami-i-listom': 'Begonia rex 1zz.jpg',
  'zanos-komnatnyh-rasteniy-v-dom-s-balkona-osenyu': 'Plants in an apartment.jpg',
  'kogda-prekraschat-podkormku-komnatnyh-rasteniy-na-zimu':
    "Peperomia albovittata 'Napoli Night' kz01.jpg",
  'nuzhno-li-myt-listya-komnatnyh-rasteniy': 'Aglaonema dalam pot.jpg',
  'svekla-kogda-ubirat-s-gryadki-i-kak-hranit-zimoy': 'Beetroots in a basket.jpg',
  'kapusta-kogda-ubirat-s-gryadki-i-kak-hranit-zimoy': 'Filoma-Kohl vor der Ernte.jpg',
  'yablonnaya-plodozhorka-kak-borotsya-i-zaschitit-urozhay': 'Cydia pomonella codling moth apple damage',
  'plodovye-mushki-v-kvartire-prichiny-i-kak-izbavitsya': 'Drosophila melanogaster 53362116.jpg',
  'kak-zagotovit-zelen-na-zimu-zamorozka-i-sushka': 'Liat Portal for Foodie Disorder - Fresh Dill.jpg',
  'zemlya-v-gorshke-peresohla-i-ne-vpityvaet-vodu-chto-delat': 'Neglected office plants Unsplash',
  'zelenye-pomidory-ne-pospevayut-na-kuste-chto-delat-v-konce-leta': 'Organic home-grown tomatoes - unripe to ripe.jpg',
  'kak-hranit-tykvu-zimoy-v-kvartire': 'Pumpkins in baskets Unsplash',
  'kak-hranit-grushi-zimoy': 'Pears in basket 2022 G1.jpg',
  'nuzhno-li-peresazhivat-komnatnye-rasteniya-osenyu': '3 freshly repotted plants.JPG',
  'vinograd-posadka-i-uhod-v-sadu': 'Vitis vinifera grapes on vine vineyard',
  'osy-na-uchastke-v-konce-leta-kak-izbavitsya-i-zaschitit-urozhay': 'Wasps attracted to ripening grapes',
  'kak-podgotovit-teplicu-k-zime-posle-sbora-urozhaya': 'DSC07727 Greenhouse Interior Blumengärten Hirschstetten',
  'suhoy-vozduh-ot-batarey-kak-uberech-komnatnye-rasteniya-zimoy': 'Calathea ornata plant',
  'muravi-v-gorshke-s-komnatnym-rasteniem-prichiny-i-kak-izbavitsya': 'Ants cultivating aphids on the underside of tree leaves Kluizenbos',
  'podgotovka-roz-k-zime-osenyu': 'Rosa hybrid tea garden bush',
  'kryzhovnik-posadka-i-uhod-v-sadu': 'Gooseberry Ribes uva-crispa',
  'kapustnaya-belyanka-i-tlya-na-kapuste-kak-borotsya':
    'Large white caterpillars Pieris brassicae Portuguese kale',
};

/**
 * Обрезает поле автора до имени: в Artist иногда лежит целая простыня с текстом
 * лицензии и просьбами написать на почту, а под фото нужна короткая подпись.
 */
function shortenAuthor(s) {
  let out = String(s || '')
    // Отрезаем всё начиная с типичных зачинов лицензионного текста.
    .split(/\s+(?:I'd appreciate|This file is licensed|You are free|Permission is)/i)[0]
    .trim();
  if (out.length > 60) out = out.slice(0, 60).replace(/\s+\S*$/, '') + '…';
  return out;
}

/** Убирает html-теги из поля автора — Commons отдаёт его со ссылками. */
function stripHtml(s) {
  return String(s || '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// В Commons много исторических материалов: сканы книг, гравюры, картины,
// чёрно-белые архивные снимки. Для современного сайта они не годятся —
// выглядят как низкокачественный контент. Отсекаем их.
const BAD_AUTHORS = /internet archive book images|biodiversity heritage/i;
const BAD_TITLE =
  /\(page|bookplate|illustration|drawing|painting|sketch|engraving|lithograph|botanical art|herbarium|\bplate\b|title page/i;
// Ботанические атласы и старые определители проходили прошлый фильтр: у них
// нет даты съёмки, а в названии стоит только латинское имя растения
// («114 Cucumis sativus L.jpg» из атласа Masclef 1891). Ловим их по описанию,
// источнику и подписи — там книга почти всегда упомянута.
// Осторожно с общими словами: «book» ловит Facebook, «flora» — названия садов.
const BOOKISH =
  /atlas des plantes|flora von|flore de|köhler|kohler's|medizinal|pflanzenfamilien|nouvelle flore|\bfl\. de\b|planches?\b|scanned from|book images/i;
// Слишком маленькие картинки на обложке выглядят мылом: Commons отдаёт
// оригинал, если он уже нашего размера, и так прилетала миниатюра 120 px.
const MIN_WIDTH = 800;

/** Отсеивает исторические материалы: сканы, рисунки, дореволюционные фото. */
function looksHistorical(title, author, meta) {
  if (BAD_AUTHORS.test(author)) return true;
  if (BAD_TITLE.test(title)) return true;
  // Дата съёмки: всё старше 1990 отбраковываем — обычно это архив и ч/б.
  const date = stripHtml(meta.DateTimeOriginal?.value || meta.DateTime?.value || '');
  const year = Number((date.match(/\b(1[6-9]\d{2}|20\d{2})\b/) || [])[1]);
  if (year && year < 1990) return true;
  // Книжные сканы и атласы: смотрим описание, источник и подпись целиком.
  const context = [
    title,
    author,
    stripHtml(meta.ImageDescription?.value),
    stripHtml(meta.Credit?.value),
    stripHtml(meta.ObjectName?.value),
  ].join(' ');
  if (BOOKISH.test(context)) return true;
  return false;
}

/** Ищет подходящее фото в Wikimedia Commons. Возвращает url + данные лицензии. */
async function findPhoto(query) {
  const params = new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrsearch: `File: ${query}`,
    gsrnamespace: '6',
    gsrlimit: '8',
    prop: 'imageinfo',
    iiprop: 'url|extmetadata|size|mime',
    iiurlwidth: '1200',
    format: 'json',
  });
  const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
    headers: { 'User-Agent': UA },
  });
  if (!res.ok) throw new Error(`Commons ответил ${res.status}`);
  const data = await res.json();
  const pages = Object.values(data?.query?.pages ?? {});

  for (const page of pages) {
    const info = page.imageinfo?.[0];
    if (!info) continue;
    // Только растровые фото: svg и рисунки нам не нужны.
    if (!/^image\/(jpeg|png)$/.test(info.mime || '')) continue;
    // Мелкие файлы на обложке выглядят мылом — отсекаем до скачивания.
    if ((info.thumbwidth || info.width || 0) < MIN_WIDTH) continue;
    const meta = info.extmetadata ?? {};
    const license = meta.LicenseShortName?.value ?? '';
    // Отсекаем несвободные лицензии (fair use и подобное).
    if (/fair use|non-free/i.test(license)) continue;

    // Некоторые авторы вписывают в поле Artist весь текст лицензии — в подписи
    // под фото это выглядит как мусор, поэтому берём только начало.
    const author = shortenAuthor(stripHtml(meta.Artist?.value)) || 'Wikimedia Commons';
    if (looksHistorical(page.title, author, meta)) continue;

    return {
      url: info.thumburl || info.url,
      author,
      license: stripHtml(license) || 'CC',
      sourceUrl: info.descriptionurl || '',
      title: page.title,
    };
  }
  return null;
}

/** Скачивает файл на диск. */
async function download(url, dest) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`Скачивание не удалось: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
  return buf.length;
}

/** Заменяет или добавляет поле в frontmatter. */
function setField(fm, name, value) {
  const re = new RegExp(`^${name}:.*$`, 'm');
  return re.test(fm) ? fm.replace(re, `${name}: ${value}`) : `${fm}\n${name}: ${value}`;
}

/** Экранирование для YAML-строки в одинарных кавычках. */
function yaml(s) {
  return `'${String(s).replace(/'/g, "''")}'`;
}

fs.mkdirSync(OUT_DIR, { recursive: true });

const entries = Object.entries(PHOTO_QUERIES);
let done = 0;
let skipped = 0;
const failed = [];

console.log(`Ищу фотографии для ${entries.length} статей…\n`);

for (const [slug, query] of entries) {
  const file = path.join(ARTICLES_DIR, `${slug}.md`);
  if (!fs.existsSync(file)) {
    failed.push(`${slug} — нет такой статьи`);
    continue;
  }

  const raw = fs.readFileSync(file, 'utf8');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) {
    failed.push(`${slug} — битый frontmatter`);
    continue;
  }
  let [, fm, body] = m;

  const requested = ONLY.length > 0 && ONLY.includes(slug);
  if (ONLY.length > 0 && !requested) {
    skipped++;
    continue;
  }
  if (!FORCE && !requested && /^cover:\s*\/images\/photos\//m.test(fm)) {
    skipped++;
    continue;
  }

  try {
    const photo = await findPhoto(query);
    if (!photo) {
      failed.push(`${slug} — подходящее фото не найдено`);
      continue;
    }

    const ext = photo.url.toLowerCase().includes('.png') ? 'png' : 'jpg';
    const filename = `${slug}.${ext}`;
    const bytes = await download(photo.url, path.join(OUT_DIR, filename));

    fm = setField(fm, 'cover', `/images/photos/${filename}`);
    const title = (fm.match(/^title:\s*(.+)$/m)?.[1] ?? slug).replace(/^['"]|['"]$/g, '');
    fm = setField(fm, 'coverAlt', yaml(title));
    // coverCredit — вложенный объект. Удаляем сам ключ ВМЕСТЕ со всеми
    // строками с отступом под ним, иначе остаются осиротевшие author/license
    // и frontmatter перестаёт парситься.
    fm = fm.replace(/^coverCredit:[ \t]*\r?\n(?:[ \t]+\S.*\r?\n?)*/m, '').trimEnd();
    fm += `\ncoverCredit:\n  author: ${yaml(photo.author)}\n  license: ${yaml(photo.license)}\n  sourceUrl: ${yaml(photo.sourceUrl)}`;

    fs.writeFileSync(file, `---\n${fm}\n---\n${body}`, 'utf8');
    done++;
    console.log(`✓ ${slug}\n    ${photo.license} · ${photo.author} · ${Math.round(bytes / 1024)} КБ`);

    // Вежливая пауза, чтобы не долбить API Wikimedia.
    await new Promise((r) => setTimeout(r, 400));
  } catch (err) {
    failed.push(`${slug} — ${err.message}`);
  }
}

console.log(`\nГотово: загружено ${done}, пропущено ${skipped}, не удалось ${failed.length}`);
if (failed.length) {
  console.log('\nНе получилось:');
  failed.forEach((f) => console.log('  ' + f));
}
