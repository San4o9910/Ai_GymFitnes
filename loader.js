(() => {
  const parts = Array.from({ length: 7 }, (_, index) =>
    `app-parts/part${String(index).padStart(2, '0')}.txt`
  );
  const flowParts = Array.from({ length: 6 }, (_, index) =>
    `workout-flow-parts/part${String(index).padStart(2, '0')}.txt`
  );

  const fetchText = async (path) => {
    const response = await fetch(path, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`Не удалось загрузить ${path}: ${response.status}`);
    return response.text();
  };

  Promise.all(parts.map(fetchText))
    .then(async (chunks) => {
      // Исходные части иногда разделены прямо внутри строки.
      const mainSource = chunks.join('');

      let mediaPatch = '';
      try {
        mediaPatch = await fetchText('library-media-patch.js');
      } catch (error) {
        console.warn('Дополнительные примеры упражнений временно недоступны:', error);
      }

      let workoutPatch = '';
      try {
        const encoded = (await Promise.all(flowParts.map(fetchText))).join('');
        const bytes = Uint8Array.from(atob(encoded), char => char.charCodeAt(0));
        workoutPatch = new TextDecoder('utf-8').decode(bytes);
      } catch (error) {
        console.warn('Пошаговый режим тренировки временно недоступен:', error);
      }

      // Оба дополнения выполняются в области видимости основного приложения.
      new Function(`${mainSource}\n${mediaPatch}\n${workoutPatch}`)();
    })
    .catch((error) => {
      console.error(error);
      const root = document.getElementById('app');
      if (root) {
        root.innerHTML = `<section class="card"><h2>Не удалось запустить приложение</h2><p class="muted">Обнови страницу. Если ошибка повторится, проверь доступность файлов приложения.</p><pre>${String(error.message || error)}</pre></section>`;
      }
    });
})();
