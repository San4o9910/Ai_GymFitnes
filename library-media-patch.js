// Реалистичные статичные примеры техники из открытой public-domain базы Free Exercise DB.
const FREE_EXERCISE_IMAGE_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';

const exercisePhotoIds = {
  warmup: 'Walking_Treadmill',
  legPress: 'Leg_Press',
  inclinePress: 'Incline_Dumbbell_Press',
  chestRow: 'Incline_Bench_Pull',
  rdl: 'Stiff-Legged_Dumbbell_Deadlift',
  latPulldown: 'Close-Grip_Front_Lat_Pulldown',
  pallof: 'Pallof_Press',
  machinePress: 'Machine_Bench_Press',
  seatedRow: 'Seated_Cable_Rows',
  shoulderPress: 'Machine_Shoulder_Military_Press',
  lateralRaise: 'Side_Lateral_Raise',
  hammerCurl: 'Alternate_Hammer_Curl',
  pushdown: 'Triceps_Pushdown_-_Rope_Attachment',
  sidePlank: 'Side_Bridge',
  hackSquat: 'Hack_Squat',
  hipThrust: 'Barbell_Hip_Thrust',
  legCurl: 'Lying_Leg_Curls',
  stepUp: 'Dumbbell_Step_Ups',
  calfRaise: 'Standing_Calf_Raises',
  deadBug: 'Dead_Bug',
  facePull: 'Face_Pull',
  sled: 'Prowler_Sprint',
  pushup: 'Pushups',
  trxRow: 'Inverted_Row_with_Straps',
  farmer: 'Farmers_Walk',
  cardio: 'Bicycling_Stationary',
  mobility: 'Cat_Stretch'
};

function exercisePhotoUrls(id) {
  const photoId = exercisePhotoIds[id];
  if (!photoId) return [];
  return [0, 1].map(index => `${FREE_EXERCISE_IMAGE_BASE}${photoId}/${index}.jpg`);
}

function schematicSequence(id) {
  const exercise = exercises[id];
  return `<div class="motion-sequence" aria-label="Три фазы техники">
    <figure class="motion-frame">${svgIcon(exercise.visual, 0)}<figcaption>1 · Старт</figcaption></figure>
    <div class="motion-arrow">→</div>
    <figure class="motion-frame">${svgIcon(exercise.visual, 1)}<figcaption>2 · Движение</figcaption></figure>
    <div class="motion-arrow">→</div>
    <figure class="motion-frame">${svgIcon(exercise.visual, 0)}<figcaption>3 · Возврат</figcaption></figure>
  </div>`;
}

function realisticSequence(id) {
  const exercise = exercises[id];
  const urls = exercisePhotoUrls(id);
  if (!urls.length) return schematicSequence(id);
  const frames = [
    { url: urls[0], label: '1 · Старт', phase: 0 },
    { url: urls[1], label: '2 · Рабочая позиция', phase: 1 },
    { url: urls[0], label: '3 · Возврат', phase: 0 }
  ];
  return `<div class="real-tech-sequence" data-real-sequence="${id}">${frames.map((frame, index) => `
    <figure data-photo-frame="${index}">
      <img src="${frame.url}" alt="${exercise.name}: ${frame.label}" loading="eager" referrerpolicy="no-referrer">
      <figcaption>${frame.label}</figcaption>
    </figure>`).join('')}</div>
    <div class="photo-caption">Последовательность из реальных фотографий: исходное положение, рабочая фаза и возврат. Видео не используется.</div>`;
}

function bindPhotoFallbacks(root, id) {
  const exercise = exercises[id];
  root.querySelectorAll('figure[data-photo-frame]').forEach((figure, index) => {
    const image = figure.querySelector('img');
    if (!image) return;
    image.addEventListener('error', () => {
      const phase = index === 1 ? 1 : 0;
      const label = index === 0 ? '1 · Старт' : index === 1 ? '2 · Движение' : '3 · Возврат';
      figure.classList.add('photo-fallback');
      figure.innerHTML = `${svgIcon(exercise.visual, phase)}<figcaption>${label}</figcaption>`;
    }, { once: true });
  });
}

function hydrateTechniqueMedia(id) {
  const target = document.querySelector(`[data-remote-media="${id}"]`);
  if (!target) return;
  target.innerHTML = realisticSequence(id);
  bindPhotoFallbacks(target, id);
}

function exerciseLibraryThumb(id, exercise) {
  const url = exercisePhotoUrls(id)[0];
  if (!url) return svgIcon(exercise.visual);
  return `<img class="library-real-thumb" src="${url}" alt="${exercise.name}" loading="lazy" referrerpolicy="no-referrer"><span class="library-thumb-fallback" hidden>${svgIcon(exercise.visual)}</span>`;
}

function bindLibraryThumbFallbacks() {
  document.querySelectorAll('.exercise-thumb .library-real-thumb').forEach(image => {
    image.addEventListener('error', () => {
      image.hidden = true;
      const fallback = image.nextElementSibling;
      if (fallback) fallback.hidden = false;
    }, { once: true });
  });
}

renderLibrary = function renderLibraryWithRealPhotos(filter = 'Все') {
  const groups = ['Все', 'Грудь', 'Спина', 'Ноги', 'Плечи', 'Руки', 'Корпус', 'Выносливость', 'Восстановление'];
  const rows = Object.entries(exercises)
    .filter(([, exercise]) => filter === 'Все' || exercise.group === filter)
    .map(([id, exercise]) => `<section class="card exercise-card"><div class="exercise-main"><div class="exercise-thumb real-thumb-wrap">${exerciseLibraryThumb(id, exercise)}</div><div><h3>${exercise.name}</h3><div class="exercise-meta">${exercise.group} · ${exercise.muscles}</div><div class="photo-badge">◉ Реальные фото</div></div><button class="mini-btn" data-tech="${id}">Техника</button></div></section>`)
    .join('');

  app.innerHTML = `<div class="section-head"><div><h2>Библиотека упражнений</h2><div class="muted">Реальные фотографии техники: старт, рабочая фаза и возврат</div></div></div><div class="library-filter">${groups.map(group => `<button class="btn ${group === filter ? 'primary' : 'secondary'}" data-filter="${group}">${group}</button>`).join('')}</div><div class="exercise-list" style="margin-top:12px">${rows}</div>
  <section class="card source-box" style="margin-top:14px"><b>Источник фотографий</b><p>Используется открытая public-domain база Free Exercise DB. При временной недоступности изображения автоматически заменяются встроенной схемой.</p></section>`;
  document.querySelectorAll('[data-filter]').forEach(button => {
    button.onclick = () => { renderLibrary(button.dataset.filter); bindCommon(); };
  });
  bindLibraryThumbFallbacks();
};

showTechnique = function showTechniqueWithRealPhotos(id) {
  const exercise = exercises[id];
  const query = encodeURIComponent(exercise.source || exercise.name);
  modalContent.innerHTML = `<h2 id="modalTitle" style="padding-right:42px">${exercise.name}</h2><div class="muted">${exercise.muscles} · ${exercise.reps}</div>
  <div data-remote-media="${id}">${realisticSequence(id)}</div>
  <h3>Как выполнять</h3><ol class="tech-list">${exercise.tips.map(item => `<li>${item}</li>`).join('')}</ol>
  <h3>Частые ошибки</h3><ul class="tech-list">${exercise.mistakes.map(item => `<li>${item}</li>`).join('')}</ul>
  ${exercise.substitute ? `<div class="advice"><strong>Безопасная замена</strong><div class="muted" style="margin-top:4px">${exercise.substitute}</div></div>` : ''}
  <div class="source-box" style="margin-top:14px"><b>Дополнительные материалы</b><p>В приложении нет автоматически запускаемого видео — только последовательность фотографий.</p><div class="grid-2"><a class="btn secondary" target="_blank" rel="noopener" href="https://commons.wikimedia.org/w/index.php?search=${query}&title=Special:MediaSearch&type=image">Wikimedia Commons</a><a class="btn secondary" target="_blank" rel="noopener" href="https://yuhonas.github.io/free-exercise-db/">Free Exercise DB</a></div></div>`;
  modalBackdrop.hidden = false;
  document.body.style.overflow = 'hidden';
  const target = document.querySelector(`[data-remote-media="${id}"]`);
  if (target) bindPhotoFallbacks(target, id);
};
