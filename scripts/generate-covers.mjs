#!/usr/bin/env node
/**
 * Генерирует SVG-обложки для статей без cover (вместо эмодзи-заглушки).
 * Свои иллюстрации: не нужно скачивать фото (лицензии, авторские права),
 * лёгкий вес, вписаны в палитру Mocha Earth.
 *
 * Архетип иллюстрации подбирается по category/keywords статьи (растение
 * в горшке / суккулент / цветок / дерево / вредитель / грядка).
 *
 * Использование: node scripts/generate-covers.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ARTICLES_DIR = path.join(ROOT, 'src/content/articles');
const OUT_DIR = path.join(ROOT, 'public/images/covers');

// --- палитра сайта (Mocha Earth) + приглушённые зелёные для растений ---
const BG = ['#ebe0d3', '#efe4d8', '#f3ece2'];
const POT = ['#a47764', '#8a5c46', '#cdb8a0'];
const GREEN = ['#7a8f6b', '#5f7a52', '#94a67f', '#6b8a6f'];
const FLOWER = ['#c99f86', '#d8b49e', '#e0c9b6'];

/** Простой детерминированный хеш строки -> целое число. */
function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}
function pick(arr, seed, salt = 0) {
  return arr[(seed + salt) % arr.length];
}

/** Лист миндалевидной формы, растущий из (cx,cy), повёрнутый на angle градусов. */
function leaf(cx, cy, w, h, angle, fill) {
  const d = `M${cx},${cy} C${cx + w},${cy - h * 0.6} ${cx + w * 1.2},${cy - h * 1.3} ${cx},${cy - h} C${cx - w * 1.2},${cy - h * 1.3} ${cx - w},${cy - h * 0.6} ${cx},${cy}Z`;
  return `<path d="${d}" fill="${fill}" transform="rotate(${angle} ${cx} ${cy})"/>`;
}

function potShape(seed) {
  const fill = pick(POT, seed, 1);
  return `
    <path d="M170,152 L230,152 L216,196 L184,196 Z" fill="${fill}"/>
    <rect x="166" y="146" width="68" height="10" rx="4" fill="${fill}"/>`;
}

function bgShape(seed) {
  const bg = pick(BG, seed, 2);
  const accent = pick(POT, seed, 3);
  return `
    <rect width="400" height="225" fill="${bg}"/>
    <circle cx="330" cy="40" r="90" fill="${accent}" opacity="0.18"/>
    <circle cx="40" cy="190" r="70" fill="${accent}" opacity="0.14"/>`;
}

// --- архетипы иллюстраций ---

function archetypeLeafy(seed) {
  const angles = [-55, -25, 0, 25, 55];
  let out = '';
  angles.forEach((a, i) => {
    const g = pick(GREEN, seed, i);
    const h = 55 + ((seed + i * 7) % 20);
    out += leaf(200, 150, 16, h, a, g);
  });
  return out;
}

function archetypeSucculent(seed) {
  let out = '';
  const rows = [
    { r: 34, count: 6, y: 150 },
    { r: 22, count: 5, y: 138 },
  ];
  rows.forEach((row, ri) => {
    for (let i = 0; i < row.count; i++) {
      const angle = (360 / row.count) * i + ri * 18;
      const rad = (angle * Math.PI) / 180;
      const cx = 200 + Math.cos(rad) * row.r;
      const cy = row.y - Math.sin(rad) * row.r * 0.5;
      const g = pick(GREEN, seed, i + ri);
      out += `<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="16" ry="10" fill="${g}" transform="rotate(${angle.toFixed(0)} ${cx.toFixed(1)} ${cy.toFixed(1)})"/>`;
    }
  });
  return out;
}

function archetypeFlower(seed) {
  let out = archetypeLeafy(seed).replace(/-55|55/g, '-35').slice(0, 0); // не используем, соберём заново
  out = '';
  // пара листьев у основания
  out += leaf(200, 152, 15, 45, -30, pick(GREEN, seed, 0));
  out += leaf(200, 152, 15, 45, 30, pick(GREEN, seed, 1));
  // стебель
  out += `<line x1="200" y1="152" x2="200" y2="95" stroke="${pick(GREEN, seed, 2)}" stroke-width="4" stroke-linecap="round"/>`;
  // лепестки
  const petal = pick(FLOWER, seed, 3);
  for (let i = 0; i < 6; i++) {
    const angle = (360 / 6) * i;
    const rad = (angle * Math.PI) / 180;
    const cx = 200 + Math.cos(rad) * 16;
    const cy = 88 + Math.sin(rad) * 16;
    out += `<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="13" ry="8" fill="${petal}" transform="rotate(${angle.toFixed(0)} ${cx.toFixed(1)} ${cy.toFixed(1)})"/>`;
  }
  out += `<circle cx="200" cy="88" r="9" fill="${pick(POT, seed, 4)}"/>`;
  return out;
}

function archetypeTree(seed) {
  const trunk = pick(POT, seed, 5);
  let out = `<rect x="194" y="90" width="12" height="65" rx="4" fill="${trunk}"/>`;
  const blobs = [
    [200, 75, 42],
    [172, 95, 30],
    [228, 95, 30],
    [200, 110, 34],
  ];
  blobs.forEach(([cx, cy, r], i) => {
    out += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${pick(GREEN, seed, i)}"/>`;
  });
  return out;
}

function archetypeVine(seed) {
  let out = '';
  const stems = [
    { x0: 195, y0: 150, x1: 130, y1: 100 },
    { x0: 205, y0: 150, x1: 270, y1: 110 },
    { x0: 200, y0: 150, x1: 200, y1: 80 },
  ];
  stems.forEach((s, i) => {
    const g = pick(GREEN, seed, i);
    out += `<path d="M${s.x0},${s.y0} Q${(s.x0 + s.x1) / 2},${s.y0 - 40} ${s.x1},${s.y1}" stroke="${g}" stroke-width="3" fill="none"/>`;
    for (let t = 0.35; t <= 1; t += 0.3) {
      const lx = s.x0 + (s.x1 - s.x0) * t;
      const ly = s.y0 + (s.y1 - s.y0) * t - 15 * Math.sin(t * Math.PI);
      out += leaf(lx, ly, 10, 20, 20 * i - 20, g);
    }
  });
  return out;
}

function archetypePest(seed) {
  const g = pick(GREEN, seed, 0);
  // большой лист
  let out = `<path d="M140,180 C140,120 160,80 210,80 C205,130 190,170 140,180Z" fill="${g}"/>`;
  // пятна повреждения
  const dark = pick(POT, seed, 1);
  [
    [175, 130, 5],
    [190, 150, 4],
    [165, 155, 3.5],
  ].forEach(([cx, cy, r]) => {
    out += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${dark}" opacity="0.55"/>`;
  });
  // вредитель (овальное тело + усики)
  out += `
    <ellipse cx="255" cy="140" rx="16" ry="10" fill="${pick(POT, seed, 2)}"/>
    <line x1="248" y1="132" x2="238" y2="122" stroke="${pick(POT, seed, 2)}" stroke-width="2"/>
    <line x1="262" y1="132" x2="270" y2="120" stroke="${pick(POT, seed, 2)}" stroke-width="2"/>`;
  return out;
}

function archetypeGardenRow(seed) {
  const soil = pick(POT, seed, 6);
  let out = `<path d="M90,175 Q200,140 310,175 L310,196 L90,196 Z" fill="${soil}"/>`;
  [130, 200, 270].forEach((x, i) => {
    const g = pick(GREEN, seed, i);
    out += leaf(x, 165, 10, 26, -20, g);
    out += leaf(x, 165, 10, 26, 20, g);
  });
  return out;
}

function pickArchetype(entry) {
  const hay = `${entry.title} ${(entry.keywords || []).join(' ')}`.toLowerCase();
  if (entry.category === 'bolezni-vrediteli') return archetypePest;
  if (/огур|томат|перец|чеснок|морков|рассад|теплиц|сидерат|мульч|яблон|огород/.test(hay))
    return archetypeGardenRow;
  if (/орхиде|фиалк|сенполи|спатифиллум|герань|цвет/.test(hay)) return archetypeFlower;
  if (/суккулент|алоэ|толстянк|замиокулькас|кактус/.test(hay)) return archetypeSucculent;
  if (/лимон|фикус|драцен/.test(hay)) return archetypeTree;
  if (/хлорофитум|плющ|потос|вьющ/.test(hay)) return archetypeVine;
  return archetypeLeafy;
}

function buildSvg(entry) {
  const seed = hash(entry.slug);
  const archetype = pickArchetype(entry);
  const usesPot = archetype !== archetypePest && archetype !== archetypeGardenRow;
  return `<svg viewBox="0 0 400 225" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">
${bgShape(seed)}
${usesPot ? potShape(seed) : ''}
${archetype(seed)}
</svg>`;
}

// --- чтение статей и генерация ---

function parseFrontmatter(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) return null;
  return { fm: m[1], body: m[2] };
}

function getField(fm, name) {
  const re = new RegExp(`^${name}:\\s*(.+)$`, 'm');
  const m = fm.match(re);
  return m ? m[1].trim() : '';
}

fs.mkdirSync(OUT_DIR, { recursive: true });

const files = fs.readdirSync(ARTICLES_DIR).filter((f) => f.endsWith('.md'));
let created = 0;
let skipped = 0;

for (const file of files) {
  const slug = file.replace(/\.md$/, '');
  const full = path.join(ARTICLES_DIR, file);
  const raw = fs.readFileSync(full, 'utf8');
  const parsed = parseFrontmatter(raw);
  if (!parsed) continue;
  const { fm, body } = parsed;

  if (/^cover:\s*\S/m.test(fm)) {
    skipped++;
    continue;
  }

  const title = getField(fm, 'title').replace(/^['"]|['"]$/g, '');
  const category = getField(fm, 'category');
  const kwRaw = getField(fm, 'keywords');
  const keywords = kwRaw
    .replace(/^\[|\]$/g, '')
    .split(',')
    .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean);

  const svg = buildSvg({ slug, title, category, keywords });
  fs.writeFileSync(path.join(OUT_DIR, `${slug}.svg`), svg, 'utf8');

  const coverLine = `cover: /images/covers/${slug}.svg\ncoverAlt: 'Иллюстрация: ${title.replace(/'/g, "''")}'`;
  const newFm = fm.trimEnd() + '\n' + coverLine;
  fs.writeFileSync(full, `---\n${newFm}\n---\n${body}`, 'utf8');
  created++;
}

console.log(`Готово: создано обложек ${created}, пропущено (уже с cover) ${skipped}.`);
