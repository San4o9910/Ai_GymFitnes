(() => {
  const parts = Array.from({ length: 7 }, (_, index) =>
    `app-parts/part${String(index).padStart(2, '0')}.txt`
  );

  Promise.all(parts.map(async (path) => {
    const response = await fetch(path, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`Не удалось загрузить ${path}: ${response.status}`);
    return response.text();
  }))
    .then(async (chunks) => {
      // Части исходного файла могут быть разделены прямо внутри строки,
      // поэтому объединяем их без каких-либо дополнительных символов.
      const mainSource = chunks.join('');

      // Дополнение библиотеки должно выполняться в той же области видимости,
      // что и основной код. Иначе оно не видит exercises, svgIcon,
      // renderLibrary и showTechnique.
      let mediaPatch = '';
      try {
        const response = await fetch('library-media-patch.js', { cache: 'no-cache' });
        if (!response.ok) throw new Error(`Не удалось загрузить library-media-patch.js: ${response.status}`);
        mediaPatch = await response.text();
      } catch (error) {
        console.warn('Дополнительные примеры упражнений временно недоступны:', error);
      }

      // Перевод строки добавляется только после полностью собранного mainSource.
      // Это безопасно и позволяет патчу использовать переменные основного приложения.
      new Function(`${mainSource}\n${mediaPatch}`)();
    })
    .catch((error) => {
      console.error(error);
      const root = document.getElementById('app');
      if (root) {
        root.innerHTML = `<section class="card"><h2>Не удалось запустить приложение</h2><p class="muted">Обнови страницу. Если ошибка повторится, проверь доступность файлов приложения.</p><pre>${String(error.message || error)}</pre></section>`;
      }
    });
})();