
// --- Full exercise library media patch: static photos when available, animated 3-frame fallback for every exercise. ---
const exerciseMediaAliases = {
  warmup: ['dynamic warm up', 'warm up', 'bodyweight warm up'],
  legPress: ['leg press'],
  inclinePress: ['incline dumbbell bench press', 'incline dumbbell press'],
  chestRow: ['chest supported dumbbell row', 'incline bench dumbbell row'],
  rdl: ['dumbbell romanian deadlift', 'romanian deadlift'],
  latPulldown: ['neutral grip lat pulldown', 'lat pulldown'],
  pallof: ['pallof press', 'cable anti rotation press'],
  machinePress: ['machine chest press', 'chest press machine'],
  seatedRow: ['seated cable row', 'cable row'],
  shoulderPress: ['machine shoulder press', 'shoulder press machine'],
  lateralRaise: ['dumbbell lateral raise', 'side lateral raise'],
  hammerCurl: ['alternate hammer curl', 'hammer curl'],
  pushdown: ['rope triceps pushdown', 'triceps pushdown'],
  sidePlank: ['side plank'],
  hackSquat: ['hack squat', 'goblet squat'],
  hipThrust: ['hip thrust', 'glute bridge'],
  legCurl: ['lying leg curl', 'seated leg curl', 'leg curl'],
  stepUp: ['dumbbell step ups', 'step up'],
  calfRaise: ['standing calf raises', 'standing calf raise'],
  deadBug: ['dead bug', 'deadbug'],
  facePull: ['face pull', 'cable face pull'],
  sled: ['sled push', 'prowler sled push', 'rowing machine'],
  pushup: ['push up', 'push-up'],
  trxRow: ['inverted row', 'suspension row', 'body row'],
  farmer: ["farmer's walk", 'farmers walk', 'farmer carry'],
  cardio: ['stationary bike', 'cycling', 'treadmill walking'],
  mobility: ['mobility warm up', 'cat cow stretch', 'bird dog']
};

const remoteExerciseMediaCache = new Map();
let allWgerExercisesPromise = null;

function normalizeExerciseMediaName(value='') {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function wgerNames(item) {
  const names = [];
  if (item && item.name) names.push(item.name);
  if (item && Array.isArray(item.translations)) {
    item.translations.forEach(t => { if (t && t.name) names.push(t.name); });
  }
  return names;
}

function wgerImages(item) {
  if (!item || !Array.isArray(item.images)) return [];
  const urls = [];
  item.images.forEach(img => {
    if (!img) return;
    const url = (img.thumbnails && (img.thumbnails.medium || img.thumbnails.small)) || img.image || img.url;
    if (url && !urls.includes(url)) urls.push(url);
  });
  return urls.slice(0, 3);
}

function wgerMatchScore(item, aliases) {
  const names = wgerNames(item).map(normalizeExerciseMediaName);
  let best = 0;
  aliases.forEach(alias => {
    const query = normalizeExerciseMediaName(alias);
    names.forEach(name => {
      if (!query || !name) return;
      if (name === query) best = Math.max(best, 100);
      else if (name.includes(query) || query.includes(name)) best = Math.max(best, 75);
      else {
        const tokens = query.split(' ').filter(Boolean);
        const hits = tokens.filter(token => name.includes(token)).length;
        best = Math.max(best, hits * 12);
      }
    });
  });
  return best;
}

async function fetchExerciseJson(url) {
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function fetchWgerViaInfoSearch(alias) {
  const encoded = encodeURIComponent(alias);
  const urls = [
    `https://wger.de/api/v2/exerciseinfo/?language=2&status=2&limit=30&search=${encoded}`,
    `https://wger.de/api/v2/exerciseinfo/?language=2&status=2&limit=30&name=${encoded}`
  ];
  for (const url of urls) {
    try {
      const data = await fetchExerciseJson(url);
      const rows = Array.isArray(data.results) ? data.results : (Array.isArray(data) ? data : []);
      const ranked = rows
        .map(item => ({ item, score: wgerMatchScore(item, [alias]) }))
        .sort((a, b) => b.score - a.score);
      const match = ranked.find(entry => entry.score > 0 && wgerImages(entry.item).length);
      if (match) return match.item;
    } catch (_) {}
  }
  return null;
}

async function fetchWgerViaLegacySearch(alias) {
  const encoded = encodeURIComponent(alias);
  try {
    const search = await fetchExerciseJson(`https://wger.de/api/v2/exercise/search/?term=${encoded}&language=english&format=json`);
    const suggestions = Array.isArray(search.suggestions) ? search.suggestions : [];
    for (const suggestion of suggestions.slice(0, 5)) {
      const data = suggestion && suggestion.data ? suggestion.data : suggestion;
      const id = data && (data.id || data.base_id || data.exercise_base);
      if (!id) continue;
      try {
        const info = await fetchExerciseJson(`https://wger.de/api/v2/exerciseinfo/${id}/?format=json`);
        if (wgerImages(info).length) return info;
      } catch (_) {}
    }
  } catch (_) {}
  return null;
}

async function fetchAllWgerExercises() {
  if (!allWgerExercisesPromise) {
    allWgerExercisesPromise = fetchExerciseJson('https://wger.de/api/v2/exerciseinfo/?language=2&status=2&limit=1000')
      .then(data => Array.isArray(data.results) ? data.results : [])
      .catch(() => []);
  }
  return allWgerExercisesPromise;
}

async function resolveRemoteExerciseMedia(id) {
  if (remoteExerciseMediaCache.has(id)) return remoteExerciseMediaCache.get(id);
  const aliases = exerciseMediaAliases[id] || [exercises[id]?.source || exercises[id]?.name || id];
  const task = (async () => {
    for (const alias of aliases) {
      const direct = await fetchWgerViaInfoSearch(alias) || await fetchWgerViaLegacySearch(alias);
      if (direct && wgerImages(direct).length) {
        return { images: wgerImages(direct), names: wgerNames(direct), source: 'wger' };
      }
    }
    const all = await fetchAllWgerExercises();
    const ranked = all
      .map(item => ({ item, score: wgerMatchScore(item, aliases) }))
      .sort((a, b) => b.score - a.score);
    const match = ranked.find(entry => entry.score >= 12 && wgerImages(entry.item).length);
    return match ? { images: wgerImages(match.item), names: wgerNames(match.item), source: 'wger' } : null;
  })();
  remoteExerciseMediaCache.set(id, task);
  return task;
}

function schematicSequence(id) {
  const exercise = exercises[id];
  return `<div class="motion-sequence" aria-label="Трёхкадровая анимация техники">
    <div class="motion-frame motion-one">${svgIcon(exercise.visual, 0)}<small>1 · Старт</small></div>
    <div class="motion-arrow">→</div>
    <div class="motion-frame motion-two">${svgIcon(exercise.visual, 1)}<small>2 · Движение</small></div>
    <div class="motion-arrow">→</div>
    <div class="motion-frame motion-three">${svgIcon(exercise.visual, 0)}<small>3 · Возврат</small></div>
  </div>`;
}

function remoteFramesMarkup(media, id) {
  const exercise = exercises[id];
  const labels = ['1 · Старт', '2 · Движение', '3 · Финиш'];
  const slots = media.images.slice(0, 3).map((url, index) => ({ type: 'image', url, label: labels[index] }));
  while (slots.length < 3) {
    const index = slots.length;
    slots.push({ type: 'schema', phase: index === 1 ? 1 : 0, label: labels[index] });
  }
  return `<div class="remote-sequence">${slots.map((slot, index) => {
    if (slot.type === 'image') {
      return `<figure><img src="${slot.url}" alt="${exercise.name}: кадр ${index + 1}" loading="lazy" referrerpolicy="no-referrer"><figcaption>${slot.label}</figcaption></figure>`;
    }
    return `<figure class="remote-schema">${svgIcon(exercise.visual, slot.phase)}<figcaption>${slot.label}</figcaption></figure>`;
  }).join('')}</div><div class="photo-caption">Статичные кадры из открытой базы wger дополнены встроенной схемой при необходимости. Видео не используется.</div>`;
}

async function hydrateTechniqueMedia(id) {
  const target = document.querySelector(`[data-remote-media="${id}"]`);
  if (!target) return;
  const loading = document.createElement('div');
  loading.className = 'media-loading';
  loading.textContent = 'Ищу статичные фото в открытой библиотеке…';
  target.insertAdjacentElement('afterend', loading);
  try {
    const media = await resolveRemoteExerciseMedia(id);
    if (!document.body.contains(target)) return;
    if (media && media.images.length) {
      target.innerHTML = remoteFramesMarkup(media, id);
      target.classList.add('has-remote-media');
      loading.remove();
    } else {
      loading.textContent = 'Фотографии для этого движения не найдены — остаётся встроенная трёхкадровая анимация.';
    }
  } catch (_) {
    loading.textContent = 'Фото сейчас недоступны. Встроенная анимация продолжает работать офлайн.';
  }
}

renderLibrary = function renderLibraryWithMedia(filter = 'Все') {
  const groups = ['Все', 'Грудь', 'Спина', 'Ноги', 'Плечи', 'Руки', 'Корпус', 'Выносливость', 'Восстановление'];
  const rows = Object.entries(exercises)
    .filter(([, exercise]) => filter === 'Все' || exercise.group === filter)
    .map(([id, exercise]) => `<section class="card exercise-card"><div class="exercise-main"><div class="exercise-thumb">${svgIcon(exercise.visual)}</div><div><h3>${exercise.name}</h3><div class="exercise-meta">${exercise.group} · ${exercise.muscles}</div><div class="photo-badge">◉ Фото / анимация</div></div><button class="mini-btn" data-tech="${id}">Техника</button></div></section>`)
    .join('');

  app.innerHTML = `<div class="section-head"><div><h2>Библиотека упражнений</h2><div class="muted">У каждого упражнения есть три фазы техники: статичные фото или встроенная анимация</div></div></div><div class="library-filter">${groups.map(group => `<button class="btn ${group === filter ? 'primary' : 'secondary'}" data-filter="${group}">${group}</button>`).join('')}</div><div class="exercise-list" style="margin-top:12px">${rows}</div>
  <section class="card source-box" style="margin-top:14px"><b>Без видео</b><p>При открытии техники приложение сразу показывает трёхкадровую анимацию. Затем, если доступны подходящие статичные изображения, подгружает их из открытой базы wger. При отсутствии интернета анимация остаётся доступной.</p></section>`;
  document.querySelectorAll('[data-filter]').forEach(button => {
    button.onclick = () => { renderLibrary(button.dataset.filter); bindCommon(); };
  });
};

showTechnique = function showTechniqueWithFullMedia(id) {
  const exercise = exercises[id];
  const query = encodeURIComponent(exercise.source || exercise.name);
  modalContent.innerHTML = `<h2 id="modalTitle" style="padding-right:42px">${exercise.name}</h2><div class="muted">${exercise.muscles} · ${exercise.reps}</div>
  <div data-remote-media="${id}">${schematicSequence(id)}</div>
  <p class="muted" style="margin-top:10px">Три последовательных фазы помогают быстро понять движение прямо в зале. При наличии подходящих материалов схема автоматически заменится статичными фото.</p>
  <h3>Как выполнять</h3><ol class="tech-list">${exercise.tips.map(item => `<li>${item}</li>`).join('')}</ol>
  <h3>Частые ошибки</h3><ul class="tech-list">${exercise.mistakes.map(item => `<li>${item}</li>`).join('')}</ul>
  ${exercise.substitute ? `<div class="advice"><strong>Безопасная замена</strong><div class="muted" style="margin-top:4px">${exercise.substitute}</div></div>` : ''}
  <div class="source-box" style="margin-top:14px"><b>Дополнительные открытые материалы</b><p>Автоматически запускаемого видео нет — только статичные кадры и короткая схема-анимация.</p><div class="grid-2"><a class="btn secondary" target="_blank" rel="noopener" href="https://commons.wikimedia.org/w/index.php?search=${query}&title=Special:MediaSearch&type=image">Wikimedia Commons</a><a class="btn secondary" target="_blank" rel="noopener" href="https://wger.de/">База wger</a></div></div>`;
  modalBackdrop.hidden = false;
  document.body.style.overflow = 'hidden';
  hydrateTechniqueMedia(id);
};

// Refresh the current screen so every library card immediately receives the new media mode.
render();
