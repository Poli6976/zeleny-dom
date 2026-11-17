/**
 * Месяцы, для которых есть страница «Лунный календарь садовода на <месяц> <год>»
 * (src/pages/lunnyj-kalendar/[slug].astro). Чтобы добавить месяц — допишите объект сюда.
 *
 * astro.newMoon / astro.fullMoon — даты новолуния и полнолуния (по Москве). Берите их из метки
 * «Новолуние»/«Полнолуние» в таблице месяца и сверяйте с независимым источником: при добавлении
 * месяца проверьте хотя бы эти две даты.
 *
 * intro — абзац о том, чем занят садовод в этом месяце (идёт после «Что делать в лучшие дни»).
 * tasks — «Дела месяца, не зависящие от Луны»: ссылки только на существующие статьи, адрес со слэшем на конце.
 */
export const MONTHS = [
  {
    slug: 'noyabr-2026',
    year: 2026,
    month: 11,
    nom: 'ноябрь',
    gen: 'ноября',
    loc: 'ноябре',
    astro: { newMoon: '9 ноября', fullMoon: '24 ноября' },
    intro:
      'Ноябрь — время ухода и подготовки, а не массовых посадок: на открытом грунте работ мало, зато на подоконнике можно выращивать зелень, выгонять луковичные и ухаживать за комнатными растениями.',
    tasks: [
      { href: '/sad-ogorod/podgotovka-roz-k-zime-osenyu/', text: 'Подготовка роз к зиме', after: ' и укрытие других теплолюбивых растений.' },
      { href: '/sovety/kak-uhazhivat-za-rasteniyami-zimoy/', text: 'Как ухаживать за комнатными растениями зимой', after: ': свет, полив и температура.' },
      { href: '/sovety/suhoy-vozduh-ot-batarey-kak-uberech-komnatnye-rasteniya-zimoy/', text: 'Сухой воздух от батарей', after: ' и как защитить от него растения.' },
      { href: '/sovety/nuzhno-li-peresazhivat-komnatnye-rasteniya-osenyu/', text: 'Нужно ли пересаживать комнатные растения осенью', after: ': пересадка только по необходимости.' },
      { href: '/sovety/kak-chasto-polivat-rasteniya/', text: 'Как часто поливать растения', after: ' в холодное время.' },
    ],
  },
  {
    slug: 'dekabr-2026',
    year: 2026,
    month: 12,
    nom: 'декабрь',
    gen: 'декабря',
    loc: 'декабре',
    // Новолуние 9.12 в 03:51 по Москве, полнолуние 24.12 в 04:28 (travelto.ru, uznayvse.ru; сверено 03.11.2026).
    astro: { newMoon: '9 декабря', fullMoon: '24 декабря' },
    intro:
      'Декабрь — месяц самых коротких дней: на открытом грунте посадок нет, зато на подоконнике можно ухаживать за комнатными растениями, выращивать зелень и следить за урожаем, заготовленным на зиму. Календарь в это время — ориентир для бытовых дел, а не руководство к действию.',
    tasks: [
      { href: '/sovety/kak-uhazhivat-za-rasteniyami-zimoy/', text: 'Как ухаживать за комнатными растениями зимой', after: ': свет, полив и температура.' },
      { href: '/sovety/svet-dlya-rasteniy-pryamoy-i-rasseyannyy/', text: 'Рассеянный свет для растений', after: ': как понять, хватает ли света на подоконнике в короткий день.' },
      { href: '/sovety/suhoy-vozduh-ot-batarey-kak-uberech-komnatnye-rasteniya-zimoy/', text: 'Сухой воздух от батарей', after: ' и как защитить от него растения.' },
      { href: '/sovety/kogda-prekraschat-podkormku-komnatnyh-rasteniy-na-zimu/', text: 'Когда прекращать подкормку комнатных растений на зиму', after: '.' },
      { href: '/sovety/kak-chasto-polivat-rasteniya/', text: 'Как часто поливать растения', after: ' в холодное время.' },
      { href: '/sad-ogorod/kak-hranit-yabloki-zimoy/', text: 'Как хранить яблоки зимой', after: ': проверка запасов.' },
      { href: '/sad-ogorod/kak-hranit-tykvu-zimoy-v-kvartire/', text: 'Как хранить тыкву зимой в квартире', after: '.' },
    ],
  },
  {
    slug: 'yanvar-2027',
    year: 2027,
    month: 1,
    nom: 'январь',
    gen: 'января',
    loc: 'январе',
    // Новолуние 7.01 в 23:24 по Москве, полнолуние 22.01 в 15:17 (starwalk.space, uznayvse.ru; сверено 18.11.2026).
    astro: { newMoon: '7 января', fullMoon: '22 января' },
    intro:
      'Январь — середина зимы: на открытом грунте работ нет, зато на подоконнике идёт уход за комнатными растениями, у некоторых из них в это время цветение, а в конце месяца садоводы южных районов начинают готовиться к посеву рассады. Календарь в это время — ориентир для бытовых дел, а не руководство к действию.',
    tasks: [
      { href: '/sovety/kak-uhazhivat-za-rasteniyami-zimoy/', text: 'Как ухаживать за комнатными растениями зимой', after: ': свет, полив и температура.' },
      { href: '/sovety/suhoy-vozduh-ot-batarey-kak-uberech-komnatnye-rasteniya-zimoy/', text: 'Сухой воздух от батарей', after: ' и как защитить от него растения.' },
      { href: '/sovety/kak-chasto-polivat-rasteniya/', text: 'Как часто поливать растения', after: ' в холодное время.' },
      { href: '/komnatnye/gippeastrum-k-novomu-godu-kak-zastavit-zacvesti/', text: 'Гиппеаструм: посадка и цветение', after: ' в зимние месяцы.' },
      { href: '/bolezni-vrediteli/dekabrist-sbrasyvaet-butony-i-ne-cvetet-chto-delat/', text: 'Декабрист сбрасывает бутоны', after: ': что делать, если цветение идёт не так.' },
      { href: '/sad-ogorod/kak-hranit-urozhay-morkovi-do-vesny/', text: 'Как хранить морковь до весны', after: ': проверка запасов.' },
      { href: '/sad-ogorod/kogda-sazhat-perec-na-rassadu/', text: 'Когда сажать перец на рассаду', after: ': на юге России — с конца января.' },
    ],
  },
];
