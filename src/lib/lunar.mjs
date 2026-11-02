/**
 * Лунный календарь для статических страниц («Лунный календарь на <месяц> <год>»).
 *
 * Расчёт тот же, что в интерактивном инструменте public/lunagarden.html: фаза по реальному
 * углу Луна–Солнце (а не по среднему лунному месяцу), день оценивается на полдень по Москве.
 * Страницы и инструмент должны давать одинаковую оценку дня. Если правите правила там —
 * правьте и здесь. Сверка: 29.10.2026 — на 2026–2027 годы все дни совпали (730 из 730), метки
 * новолуния/полнолуния попадают в день настоящего события.
 *
 * Отличие от инструмента: нет привязки к региону, поэтому риск заморозков не учитывается.
 */

const SIGNS = [
  { n: 'Овен', el: 'fire', p: 'fruit', f: 'barren' },
  { n: 'Телец', el: 'earth', p: 'root', f: 'fertile' },
  { n: 'Близнецы', el: 'air', p: 'flower', f: 'barren' },
  { n: 'Рак', el: 'water', p: 'leaf', f: 'fertile' },
  { n: 'Лев', el: 'fire', p: 'fruit', f: 'barren' },
  { n: 'Дева', el: 'earth', p: 'root', f: 'fertile' },
  { n: 'Весы', el: 'air', p: 'flower', f: 'fertile' },
  { n: 'Скорпион', el: 'water', p: 'leaf', f: 'fertile' },
  { n: 'Стрелец', el: 'fire', p: 'fruit', f: 'fertile' },
  { n: 'Козерог', el: 'earth', p: 'root', f: 'fertile' },
  { n: 'Водолей', el: 'air', p: 'flower', f: 'barren' },
  { n: 'Рыбы', el: 'water', p: 'leaf', f: 'fertile' },
];

// Возраст Луны (сутки от новолуния) считается по реальному углу Луна–Солнце. Границы фаз:
// новолуние и полнолуние занимают ±0,75 суток вокруг точного момента (так метка попадает на тот
// день, когда событие происходит на самом деле); полнолуние — возраст около 14,77 суток.
const SYNODIC = 29.530588861;
const PHASES = [
  { max: 0.75, n: 'new_moon', l: 'Новолуние', w: false },
  { max: 7.38, n: 'waxing_crescent', l: 'Растущий серп', w: true },
  { max: 8.07, n: 'first_quarter', l: 'Первая четверть', w: true },
  { max: 14.0, n: 'waxing_gibbous', l: 'Растущая Луна', w: true },
  { max: 15.52, n: 'full_moon', l: 'Полнолуние', w: false },
  { max: 22.15, n: 'waning_gibbous', l: 'Убывающая Луна', w: false },
  { max: 23.07, n: 'last_quarter', l: 'Последняя четверть', w: false },
  { max: 28.78, n: 'waning_crescent', l: 'Убывающий серп', w: false },
];

const PART_LABELS = { root: 'корень', leaf: 'лист', fruit: 'плод', flower: 'цветок' };

function jd(date) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  let Y = y;
  let M = m;
  if (M <= 2) {
    Y--;
    M += 12;
  }
  const A = Math.floor(Y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (Y + 4716)) + Math.floor(30.6001 * (M + 1)) + d + B - 1524.5;
}

// Каждый день оценивается на полдень по Москве (12:00 МСК = 09:00 UT): jd() даёт 0:00 UT.
const NOON_MSK = 0.375;

/** Долгота Солнца, градусы (упрощённая формула, точность порядка 0,01°). */
function sunLon(J) {
  const T = (J - 2451545) / 36525;
  const rad = Math.PI / 180;
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M = (357.52911 + 35999.05029 * T - 0.0001537 * T * T) * rad;
  const C =
    (1.914602 - 0.004817 * T) * Math.sin(M) + 0.019993 * Math.sin(2 * M) + 0.000289 * Math.sin(3 * M);
  return (((L0 + C) % 360) + 360) % 360;
}

/** Возраст Луны в сутках: угол Луна–Солнце, пересчитанный в долю синодического месяца. */
function moonAge(date) {
  const J = jd(date) + NOON_MSK;
  const angle = (((moonLonAt(J) - sunLon(J)) % 360) + 360) % 360;
  return (angle / 360) * SYNODIC;
}

function moonLon(date) {
  return moonLonAt(jd(date) + NOON_MSK);
}

function moonLonAt(J) {
  const T = (J - 2451545) / 36525;
  const rad = Math.PI / 180;
  const D = (297.85 + 445267.11 * T) * rad;
  const M = (357.53 + 35999.05 * T) * rad;
  const Mp = (134.96 + 477198.87 * T) * rad;
  const F = (93.27 + 483202.02 * T) * rad;
  const L =
    218.3164 +
    481267.8812 * T +
    6.289 * Math.sin(Mp) +
    1.274 * Math.sin(2 * D - Mp) +
    0.658 * Math.sin(2 * D) +
    0.214 * Math.sin(2 * Mp) -
    0.186 * Math.sin(M) -
    0.114 * Math.sin(2 * F) +
    0.059 * Math.sin(2 * D - 2 * Mp) +
    0.053 * Math.sin(2 * D + Mp);
  return ((L % 360) + 360) % 360;
}

function plantPart(sign, phase) {
  if (sign.el === 'earth' && !phase.w) return 'root';
  if (sign.el === 'water' && phase.w) return 'leaf';
  if (sign.el === 'fire' && phase.w) return 'fruit';
  if (sign.el === 'air' && phase.w) return 'flower';
  return sign.p;
}

function isRest(day, phase) {
  return [1, 14, 15, 16, 29, 30].includes(day) || phase.n === 'new_moon' || phase.n === 'full_moon';
}

function rating(sign, phase, day) {
  if (isRest(day, phase)) return 'forbidden';
  if (sign.f === 'barren') return 'bad';
  const match =
    (sign.el === 'earth' && !phase.w) ||
    (sign.el === 'water' && phase.w) ||
    (sign.el === 'fire' && phase.w) ||
    (sign.el === 'air' && phase.w);
  return match ? 'ideal' : 'good';
}

export const RATING_LABELS = {
  ideal: 'Идеальный',
  good: 'Хороший',
  bad: 'Неблагоприятный',
  forbidden: 'День покоя',
};

/** Данные одного дня: new Date(год, месяц - 1, день), как в инструменте. */
export function lunarDay(year, month, day) {
  const date = new Date(year, month - 1, day);
  const age = moonAge(date);
  const lon = moonLon(date);
  const phase = PHASES.find((p) => age < p.max) || PHASES[0];
  const sign = SIGNS[Math.floor((((lon % 360) + 360) % 360) / 30)];
  const lunarDayNumber = Math.floor(age) + 1;
  const weekday = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'][date.getDay()];
  return {
    day,
    weekday,
    phase: phase.l,
    phaseKey: phase.n,
    growing: phase.w,
    lunarDay: lunarDayNumber,
    sign: sign.n,
    fertile: sign.f === 'fertile',
    part: PART_LABELS[plantPart(sign, phase)],
    rating: rating(sign, phase, lunarDayNumber),
  };
}

/** Все дни месяца. */
export function lunarMonth(year, month) {
  const days = new Date(year, month, 0).getDate();
  return Array.from({ length: days }, (_, i) => lunarDay(year, month, i + 1));
}
