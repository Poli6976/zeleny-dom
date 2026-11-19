/**
 * Форматирование для страниц лунного календаря (общее для страниц садовода и цветовода).
 */

/** «9–11, 23–25» из списка чисел месяца. */
export function ranges(list) {
  const out = [];
  let start = null;
  let prev = null;
  for (const d of list) {
    if (start === null) {
      start = prev = d;
    } else if (d === prev + 1) {
      prev = d;
    } else {
      out.push(start === prev ? `${start}` : `${start}–${prev}`);
      start = prev = d;
    }
  }
  if (start !== null) out.push(start === prev ? `${start}` : `${start}–${prev}`);
  return out.join(', ');
}

/** «лучшие дни: 12–13 января (Рыбы); 24–26 января (Дева)»: идеальные дни, склеенные в серии. */
export function groupIdeal(ideal) {
  const groups = [];
  for (const d of ideal) {
    const last = groups[groups.length - 1];
    if (last && last.part === d.part && last.sign === d.sign && d.day === last.days[last.days.length - 1] + 1) {
      last.days.push(d.day);
    } else {
      groups.push({ part: d.part, sign: d.sign, days: [d.day] });
    }
  }
  return groups;
}
